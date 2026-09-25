import {
  CLUSTER_SCOPED,
  findResource,
  listPods,
  matchesSelector,
  namespaceLabels,
  schedulableNodes,
} from "./cluster";
import { applyFile, deleteFile } from "./apply";
import { crashReason, podStatus } from "./container";
import { admissionError } from "./quota";
import { createQuota, execCommand, setEnv, setResources } from "./workload-commands";
import {
  KubectlError,
  getFlag,
  getFlags,
  hasFlag,
  parseArgs,
  parseLabels,
  parsePositiveInt,
  tokenize,
  type ParsedArgs,
} from "./parser";
import {
  addResource,
  commaList,
  findPod,
  getExisting,
  resolvePod,
  literals,
  nextId,
  notFound,
  requireFlag,
  requireName,
  requireNamespace,
  resolveKind,
  resolveTarget,
  type Context,
} from "./context";
import { isRunning } from "./container";
import { serviceEndpoints, warningEvents } from "./diagnostics";
import { KIND_PLURAL, KIND_PREFIX, age, describe, printTable, table } from "./printers";
import { canI, subjectFromAs } from "./rbac";
import type {
  ClusterState,
  DeploymentResource,
  Kind,
  NodeResource,
  PodResource,
  Resource,
  ServiceResource,
} from "./types";

const PROTECTED_NAMESPACES = ["default", "kube-system", "kube-public", "kube-node-lease"];

export interface ExecResult {
  output: string;
  isError: boolean;
  state: ClusterState;
}

// ---------- commands ----------

function get(ctx: Context): string {
  const { state, parsed } = ctx;
  const [kindWord, ...names] = ctx.args;
  if (kindWord === undefined) {
    throw new KubectlError("You must specify the type of resource to get. Use \"kubectl api-resources\" for a complete list.");
  }

  const allNamespaces = hasFlag(parsed, "--all-namespaces");
  const selector = parseLabels(getFlag(parsed, "--selector") ?? "");
  const output = getFlag(parsed, "--output");
  const options = {
    wide: output === "wide",
    showLabels: hasFlag(parsed, "--show-labels"),
    withNamespace: allNamespaces,
    prefixKind: false,
  };

  const inScope = (r: Resource) =>
    ("namespace" in r ? allNamespaces || r.namespace === ctx.namespace : true) &&
    matchesSelector(r.labels, selector);

  const listKind = (kind: Kind) =>
    (kind === "Pod" ? listPods(state) : state.resources.filter((r) => r.kind === kind)).filter(inScope);

  // "kubectl get svc,deploy" prints one section per kind, like "get all"
  if (kindWord.includes(",")) {
    return kindWord
      .split(",")
      .filter(Boolean)
      .map((kind) => get({ ...ctx, args: [kind], parsed: { ...parsed, flags: new Map(parsed.flags) } }))
      .join("\n\n");
  }

  const virtualKind = kindWord.split("/")[0].toLowerCase();
  if (["endpoints", "endpoint", "ep"].includes(virtualKind)) return getEndpoints(ctx, kindWord, names);
  if (["events", "event", "ev"].includes(virtualKind)) return getEvents(ctx);

  if (kindWord === "all") {
    const sections = (["Pod", "Service", "Deployment"] as Kind[])
      .map((kind) => listKind(kind))
      .filter((items) => items.length > 0)
      .map((items) => printTable(state, items, { ...options, prefixKind: true }));
    return sections.length > 0 ? sections.join("\n\n") : `No resources found in ${ctx.namespace} namespace.`;
  }

  const target = kindWord.includes("/") ? resolveTarget([kindWord]) : null;
  const kind = target?.kind ?? resolveKind(kindWord);
  const wanted = target ? [target.name] : names;
  const items = listKind(kind);

  if (wanted.length > 0) {
    const missing = wanted.find((name) => items.every((r) => r.name !== name));
    if (missing) throw notFound(kind, missing);
    return printTable(state, items.filter((r) => wanted.includes(r.name)), options);
  }

  if (items.length === 0) {
    const isNamespaced = CLUSTER_SCOPED.includes(kind) === false && allNamespaces === false;
    return isNamespaced ? `No resources found in ${ctx.namespace} namespace.` : "No resources found";
  }
  return printTable(state, items, options);
}

// Endpoints aren't stored: they're computed from Services and the Pods they select
function getEndpoints(ctx: Context, kindWord: string, names: string[]): string {
  const wanted = kindWord.includes("/") ? [kindWord.split("/")[1]] : names;
  const allNamespaces = hasFlag(ctx.parsed, "--all-namespaces");
  const services = ctx.state.resources.filter(
    (r): r is ServiceResource =>
      r.kind === "Service" &&
      (allNamespaces || r.namespace === ctx.namespace) &&
      (wanted.length === 0 || wanted.includes(r.name))
  );

  const missing = wanted.find((name) => services.every((s) => s.name !== name));
  if (missing) throw new KubectlError(`Error from server (NotFound): endpoints "${missing}" not found`);
  if (services.length === 0) return `No resources found in ${ctx.namespace} namespace.`;

  const rows = services.map((service) => {
    // The API server's own endpoint for the "kubernetes" Service
    const endpoints = service.name === "kubernetes" ? ["10.0.0.10:6443"] : serviceEndpoints(ctx.state, service);
    const shown = endpoints.length > 3 ? `${endpoints.slice(0, 3).join(",")} + ${endpoints.length - 3} more...` : endpoints.join(",");
    return [
      ...(allNamespaces ? [service.namespace] : []),
      service.name,
      shown || "<none>",
      age(service.createdAt),
    ];
  });
  return table([[...(allNamespaces ? ["NAMESPACE"] : []), "NAME", "ENDPOINTS", "AGE"], ...rows]);
}

function getEvents(ctx: Context): string {
  const allNamespaces = hasFlag(ctx.parsed, "--all-namespaces");
  const events = warningEvents(ctx.state, allNamespaces ? null : ctx.namespace);
  if (events.length === 0) {
    return allNamespaces ? "No resources found" : `No resources found in ${ctx.namespace} namespace.`;
  }
  const rows = events.map((e) => [...(allNamespaces ? [e.namespace] : []), "10s", e.type, e.reason, e.object, e.message]);
  return table([[...(allNamespaces ? ["NAMESPACE"] : []), "LAST SEEN", "TYPE", "REASON", "OBJECT", "MESSAGE"], ...rows]);
}

function describeCommand(ctx: Context): string {
  const [first, second] = ctx.args;

  // "kubectl describe <kind>" without a name describes every object of that kind
  if (second === undefined && first !== undefined && first.includes("/") === false) {
    const kind = resolveKind(first);
    const items = (kind === "Pod" ? listPods(ctx.state) : ctx.state.resources.filter((r) => r.kind === kind)).filter(
      (r) => ("namespace" in r ? r.namespace === ctx.namespace : true)
    );
    if (items.length === 0) return `No resources found in ${ctx.namespace} namespace.`;
    return items.map((r) => describe(ctx.state, r)).join("\n\n\n");
  }

  const { kind, name } = resolveTarget(ctx.args);
  const resource = kind === "Pod" ? findPod(ctx, name) : getExisting(ctx, kind, name);
  return describe(ctx.state, resource);
}

function run(ctx: Context): string {
  const name = requireName(ctx.args[0], "run");
  const image = requireFlag(ctx.parsed, "--image");
  requireNamespace(ctx.state, ctx.namespace);

  const nodes = schedulableNodes(ctx.state);
  const id = nextId(ctx.state);
  const env = parseLabels(getFlags(ctx.parsed, "--env").join(","));
  const pod: PodResource = {
    kind: "Pod",
    name,
    namespace: ctx.namespace,
    image,
    node: nodes.length > 0 ? nodes[id % nodes.length] : null,
    owner: null,
    labels: getFlag(ctx.parsed, "--labels") ? parseLabels(getFlag(ctx.parsed, "--labels") ?? "") : { run: name },
    createdAt: Date.now(),
    ...(Object.keys(env).length > 0 ? { env } : {}),
  };

  // The API server applies ResourceQuotas when the pod is created
  const quotaError = admissionError(ctx.state, listPods(ctx.state), { ...pod, owner: "ReplicaSet" });
  if (quotaError) throw new KubectlError(`Error from server (Forbidden): ${quotaError}`);

  addResource(ctx.state, pod);
  return `pod/${name} created`;
}

function create(ctx: Context): string {
  const { state, parsed, namespace } = ctx;
  const [type, ...rest] = ctx.args;
  if (hasFlag(parsed, "--filename")) return applyFile(ctx, "create");
  const base = { labels: {}, createdAt: Date.now() };

  switch (type) {
    case "namespace":
    case "ns": {
      const name = requireName(rest[0], "create namespace");
      addResource(state, { kind: "Namespace", name, ...base, labels: namespaceLabels(name) });
      return `namespace/${name} created`;
    }
    case "deployment":
    case "deploy": {
      const name = requireName(rest[0], "create deployment");
      const image = requireFlag(parsed, "--image");
      requireNamespace(state, namespace);
      addResource(state, {
        kind: "Deployment",
        name,
        namespace,
        image,
        replicas: parsePositiveInt(getFlag(parsed, "--replicas") ?? "1", "replicas"),
        revisions: [image],
        ...base,
        labels: { app: name },
      });
      return `deployment.apps/${name} created`;
    }
    case "configmap":
    case "cm": {
      const name = requireName(rest[0], "create configmap");
      requireNamespace(state, namespace);
      addResource(state, { kind: "ConfigMap", name, namespace, data: literals(parsed), ...base });
      return `configmap/${name} created`;
    }
    case "secret": {
      if (rest[0] !== "generic") throw new KubectlError("error: only 'kubectl create secret generic' is supported in this lab");
      const name = requireName(rest[1], "create secret generic");
      requireNamespace(state, namespace);
      addResource(state, { kind: "Secret", name, namespace, data: literals(parsed), ...base });
      return `secret/${name} created`;
    }
    case "serviceaccount":
    case "sa": {
      const name = requireName(rest[0], "create serviceaccount");
      requireNamespace(state, namespace);
      addResource(state, { kind: "ServiceAccount", name, namespace, ...base });
      return `serviceaccount/${name} created`;
    }
    case "quota":
    case "resourcequota":
      return createQuota(ctx, rest[0]);
    case "role": {
      const name = requireName(rest[0], "create role");
      const verbs = commaList(parsed, "--verb");
      const resources = commaList(parsed, "--resource");
      if (verbs.length === 0) throw new KubectlError("error: at least one verb must be specified");
      if (resources.length === 0) throw new KubectlError("error: at least one resource must be specified");
      requireNamespace(state, namespace);
      addResource(state, { kind: "Role", name, namespace, verbs, resources, ...base });
      return `role.rbac.authorization.k8s.io/${name} created`;
    }
    case "rolebinding": {
      const name = requireName(rest[0], "create rolebinding");
      const role = requireFlag(parsed, "--role");
      const subjects = [
        ...getFlags(parsed, "--serviceaccount").map((sa) => `ServiceAccount:${sa}`),
        ...getFlags(parsed, "--user").map((user) => `User:${user}`),
      ];
      requireNamespace(state, namespace);
      addResource(state, { kind: "RoleBinding", name, namespace, role, subjects, ...base });
      return `rolebinding.rbac.authorization.k8s.io/${name} created`;
    }
    default:
      throw new KubectlError(`error: unknown or unsupported resource type "${type ?? ""}" for create`);
  }
}

function expose(ctx: Context): string {
  const { kind, name } = resolveTarget(ctx.args);
  if (kind !== "Deployment" && kind !== "Pod") {
    throw new KubectlError(`error: cannot expose a ${kind}`);
  }
  const source = kind === "Pod" ? findPod(ctx, name) : getExisting(ctx, "Deployment", name);
  const portFlag = getFlag(ctx.parsed, "--port");
  if (portFlag === undefined) {
    throw new KubectlError("error: couldn't find port via --port flag or introspection");
  }
  const port = parsePositiveInt(portFlag, "port");
  const type = getFlag(ctx.parsed, "--type") ?? "ClusterIP";
  if (type !== "ClusterIP" && type !== "NodePort" && type !== "LoadBalancer") {
    throw new KubectlError(`error: invalid service type "${type}"`);
  }

  const id = nextId(ctx.state);
  const serviceName = getFlag(ctx.parsed, "--name") ?? name;
  addResource(ctx.state, {
    kind: "Service",
    name: serviceName,
    namespace: ctx.namespace,
    type,
    port,
    targetPort: parsePositiveInt(getFlag(ctx.parsed, "--target-port") ?? String(port), "target-port"),
    nodePort: type === "ClusterIP" ? null : 30000 + ((id * 7919) % 2768),
    selector: { ...source.labels },
    clusterIP: `10.96.${Math.floor(id / 200) + 1}.${(id % 200) + 10}`,
    labels: { ...source.labels },
    createdAt: Date.now(),
  });
  return `service/${serviceName} exposed`;
}

function scale(ctx: Context): string {
  const { kind, name } = resolveTarget(ctx.args);
  if (kind !== "Deployment") throw new KubectlError(`error: cannot scale a ${kind}`);
  const deployment = getExisting(ctx, "Deployment", name);
  deployment.replicas = parsePositiveInt(requireFlag(ctx.parsed, "--replicas"), "replicas");
  return `deployment.apps/${name} scaled`;
}

function setSelector(ctx: Context, args: string[]): string {
  const { kind, name, rest } = resolveTarget(args);
  if (kind !== "Service") throw new KubectlError("error: only services are supported by set selector in this lab");
  const pairs = rest.filter((arg) => arg.includes("="));
  if (pairs.length === 0) throw new KubectlError("error: a selector like app=web is required");

  // Like kubectl, the new selector replaces the old one entirely
  const service: ServiceResource = getExisting(ctx, "Service", name);
  service.selector = parseLabels(pairs.join(","));
  return `service/${name} selector updated`;
}

function set(ctx: Context): string {
  const [sub, ...rest] = ctx.args;
  if (sub === "selector") return setSelector(ctx, rest);
  if (sub === "env") return setEnv(ctx, rest);
  if (sub === "resources") return setResources(ctx, rest);
  if (sub !== "image") throw new KubectlError(`error: unknown command "set ${sub ?? ""}"`);

  const { kind, name, rest: assignments } = resolveTarget(rest);
  if (kind !== "Deployment") throw new KubectlError("error: only deployments are supported in this lab");
  const assignment = assignments.find((a) => a.includes("="));
  if (assignment === undefined) throw new KubectlError("error: you must specify container=image");

  const deployment = getExisting(ctx, "Deployment", name);
  const image = assignment.slice(assignment.indexOf("=") + 1);
  if (image !== deployment.image) {
    deployment.image = image;
    deployment.revisions.push(image);
  }
  return `deployment.apps/${name} image updated`;
}

function rollout(ctx: Context): string {
  const [sub, ...rest] = ctx.args;
  const { kind, name } = resolveTarget(rest);
  if (kind !== "Deployment") throw new KubectlError("error: only deployments are supported in this lab");
  const deployment: DeploymentResource = getExisting(ctx, "Deployment", name);

  switch (sub) {
    case "status":
      return `deployment "${name}" successfully rolled out`;
    case "history":
      return `deployment.apps/${name}\n${table([
        ["REVISION", "CHANGE-CAUSE"],
        ...deployment.revisions.map((_, i) => [String(i + 1), "<none>"]),
      ])}`;
    case "undo":
      if (deployment.revisions.length < 2) {
        throw new KubectlError(`error: no rollout history found for deployment "${name}"`);
      }
      deployment.revisions.pop();
      deployment.image = deployment.revisions[deployment.revisions.length - 1];
      return `deployment.apps/${name} rolled back`;
    case "restart":
      return `deployment.apps/${name} restarted`;
    default:
      throw new KubectlError(`error: unknown command "rollout ${sub ?? ""}"`);
  }
}

function label(ctx: Context): string {
  const { kind, name, rest } = resolveTarget(ctx.args);
  // "kubectl label pods a b env=prod": extra names come before the label changes
  const isChange = (arg: string) => arg.includes("=") || arg.endsWith("-");
  const names = [name, ...rest.filter((arg) => isChange(arg) === false)];
  const changes = rest.filter(isChange);
  if (changes.length === 0) throw new KubectlError("error: at least one label update is required");

  const overwrite = hasFlag(ctx.parsed, "--overwrite");
  const removedOnly = changes.every((change) => change.endsWith("-"));
  const namespace = CLUSTER_SCOPED.includes(kind) ? undefined : ctx.namespace;

  const targets = names.map((resourceName) => {
    const resource = findResource(ctx.state, kind, resourceName, namespace);
    // Pods owned by a deployment exist, but their labels come from the deployment template
    if (resource === undefined && kind === "Pod") findPod(ctx, resourceName);
    else if (resource === undefined) throw notFound(kind, resourceName);
    return { resourceName, resource };
  });

  for (const { resource } of targets) {
    for (const change of changes) {
      if (change.endsWith("-")) {
        if (resource) delete resource.labels[change.slice(0, -1)];
        continue;
      }
      const key = change.slice(0, change.indexOf("="));
      const value = change.slice(change.indexOf("=") + 1);
      const current = resource?.labels[key];
      if (current !== undefined && current !== value && overwrite === false) {
        throw new KubectlError(`error: '${key}' already has a value (${current}), and --overwrite is false`);
      }
      if (resource) resource.labels[key] = value;
    }
  }

  return targets
    .map(({ resourceName }) => `${KIND_PREFIX[kind]}/${resourceName} ${removedOnly ? "unlabeled" : "labeled"}`)
    .join("\n");
}

function deleteCommand(ctx: Context): string {
  if (hasFlag(ctx.parsed, "--filename")) return deleteFile(ctx);
  const { kind, name, rest } = resolveTarget(ctx.args);
  const names = [name, ...rest];

  return names
    .map((resourceName) => {
      if (kind === "Namespace" && PROTECTED_NAMESPACES.includes(resourceName)) {
        throw new KubectlError(
          `Error from server (Forbidden): namespaces "${resourceName}" is forbidden: this namespace may not be deleted`
        );
      }

      const namespace = CLUSTER_SCOPED.includes(kind) ? undefined : ctx.namespace;
      const resource = findResource(ctx.state, kind, resourceName, namespace);

      if (resource === undefined) {
        // Deleting a deployment-managed pod succeeds, and the deployment recreates it
        if (kind === "Pod") findPod(ctx, resourceName);
        else throw notFound(kind, resourceName);
      }

      ctx.state.resources = ctx.state.resources.filter(
        (r) => r !== resource && (kind !== "Namespace" || ("namespace" in r ? r.namespace !== resourceName : true))
      );
      return `${KIND_PREFIX[kind].split(".")[0]} "${resourceName}" deleted`;
    })
    .join("\n");
}

function getNode(ctx: Context, name: string | undefined): NodeResource {
  return getExisting(ctx, "Node", requireName(name, "node"));
}

function cordon(ctx: Context, schedulable: boolean): string {
  const node = getNode(ctx, ctx.args[0]);
  const action = schedulable ? "uncordoned" : "cordoned";
  if (node.schedulable === schedulable) return `node/${node.name} already ${action}`;
  node.schedulable = schedulable;
  return `node/${node.name} ${action}`;
}

function drain(ctx: Context): string {
  const node = getNode(ctx, ctx.args[0]);
  const podsOnNode = listPods(ctx.state).filter((p) => p.node === node.name);
  const daemonPods = podsOnNode.filter((p) => p.owner === "DaemonSet");
  const unmanaged = podsOnNode.filter((p) => p.owner === null);

  if (daemonPods.length > 0 && hasFlag(ctx.parsed, "--ignore-daemonsets") === false) {
    throw new KubectlError(
      `error: unable to drain node "${node.name}" due to error: cannot delete DaemonSet-managed Pods (use --ignore-daemonsets to ignore): ${daemonPods.map((p) => `${p.namespace}/${p.name}`).join(", ")}`
    );
  }
  if (unmanaged.length > 0 && hasFlag(ctx.parsed, "--force") === false) {
    throw new KubectlError(
      `error: unable to drain node "${node.name}" due to error: cannot delete Pods that declare no controller (use --force to override): ${unmanaged.map((p) => `${p.namespace}/${p.name}`).join(", ")}`
    );
  }

  const evicted = podsOnNode.filter((p) => p.owner !== "DaemonSet");
  node.schedulable = false;
  ctx.state.resources = ctx.state.resources.filter((r) => unmanaged.includes(r as PodResource) === false);

  // Controller-owned pods stored in state get recreated on another node
  const targets = schedulableNodes(ctx.state);
  evicted
    .filter((p) => p.owner === "ReplicaSet")
    .forEach((pod, i) => {
      pod.node = targets.length > 0 ? targets[i % targets.length] : null;
    });

  return [
    `node/${node.name} cordoned`,
    ...(daemonPods.length > 0
      ? [`Warning: ignoring DaemonSet-managed Pods: ${daemonPods.map((p) => `${p.namespace}/${p.name}`).join(", ")}`]
      : []),
    ...evicted.map((p) => `evicting pod ${p.namespace}/${p.name}`),
    ...evicted.map((p) => `pod/${p.name} evicted`),
    `node/${node.name} drained`,
  ].join("\n");
}

function taint(ctx: Context): string {
  const [kindWord, name, ...changes] = ctx.args;
  if (resolveKind(kindWord) !== "Node") throw new KubectlError("error: taints can only be applied to nodes");
  const node = getNode(ctx, name);
  if (changes.length === 0) throw new KubectlError("error: at least one taint update is required");

  let removedOnly = true;
  for (const change of changes) {
    if (change.endsWith("-")) {
      // "key-" removes every taint with that key, "key:Effect-" only the one with that effect
      const [keyPart, effect] = change.slice(0, -1).split(":");
      const key = keyPart.split("=")[0];
      node.taints = node.taints.filter((t) => {
        const [taintKey] = t.split(/[=:]/);
        const taintEffect = t.split(":")[1];
        return taintKey !== key || (effect !== undefined && taintEffect !== effect);
      });
      continue;
    }
    if (/^[^=:]+(=[^:]*)?:(NoSchedule|PreferNoSchedule|NoExecute)$/.test(change) === false) {
      throw new KubectlError(`error: invalid taint spec: ${change}`);
    }
    removedOnly = false;
    const key = change.split(/[=:]/)[0];
    node.taints = [...node.taints.filter((t) => t.split(/[=:]/)[0] !== key), change];
  }
  return `node/${node.name} ${removedOnly ? "untainted" : "tainted"}`;
}

function logs(ctx: Context): string {
  const pod = resolvePod(ctx, requireName(ctx.args[0], "logs"));
  const status = podStatus(ctx.state, pod);
  const waiting = (reason: string) =>
    new KubectlError(`Error from server (BadRequest): container "app" in pod "${pod.name}" is waiting to start: ${reason}`);

  if (status === "Pending") throw waiting("ContainerCreating");
  if (status === "ImagePullBackOff") throw waiting("trying and failing to pull image");
  if (status === "CreateContainerConfigError") throw waiting("CreateContainerConfigError");
  // A crashing container still has the output of its last attempt
  if (status === "CrashLoopBackOff") return crashReason(ctx.state, pod)?.log ?? "";

  if (pod.image.startsWith("nginx")) {
    return "/docker-entrypoint.sh: Configuration complete; ready for start up\n2024/06/01 10:00:00 [notice] 1#1: nginx started";
  }
  return `Starting ${pod.image}...\nReady to accept connections`;
}

function auth(ctx: Context): string {
  const [sub, verb, resource] = ctx.args;
  if (sub !== "can-i" || verb === undefined || resource === undefined) {
    throw new KubectlError("error: usage: kubectl auth can-i <verb> <resource> [--as=<user>] [-n <namespace>]");
  }
  const as = getFlag(ctx.parsed, "--as");
  if (as === undefined) return "yes"; // lab user is cluster-admin

  return canI(ctx.state, subjectFromAs(as), verb, resource, ctx.namespace) ? "yes" : "no";
}

function config(ctx: Context): string {
  if (ctx.args[0] === "current-context") return "kubernetes-admin@kubernetes";
  if (ctx.args[0] === "get-contexts") {
    return table([
      ["CURRENT", "NAME", "CLUSTER", "AUTHINFO", "NAMESPACE"],
      ["*", "kubernetes-admin@kubernetes", "kubernetes", "kubernetes-admin", ""],
    ]);
  }
  throw new KubectlError("error: only 'config current-context' and 'config get-contexts' are supported in this lab");
}

const HANDLERS: Record<string, (ctx: Context) => string> = {
  version: () =>
    "Client Version: v1.30.2\nKustomize Version: v5.0.4-0.20230601165947-6ce0bf390ce3\nServer Version: v1.30.2",
  "cluster-info": () =>
    "Kubernetes control plane is running at https://10.0.0.10:6443\nCoreDNS is running at https://10.0.0.10:6443/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy",
  get,
  describe: describeCommand,
  run,
  create,
  expose,
  scale,
  set,
  rollout,
  label,
  delete: deleteCommand,
  cordon: (ctx) => cordon(ctx, false),
  uncordon: (ctx) => cordon(ctx, true),
  drain,
  taint,
  logs,
  auth,
  config,
  exec: execCommand,
  apply: (ctx) => applyFile(ctx, "apply"),
};

// Tiny shell so "ls" / "cat" work on files saved from the manifest editor
function shellBuiltin(state: ClusterState, program: string, args: string[]): ExecResult | null {
  const files = state.files ?? {};
  switch (program) {
    case "ls": {
      const names = Object.keys(files).sort();
      return { output: names.join("  "), isError: false, state };
    }
    case "cat": {
      const missing = args.find((file) => files[file] === undefined);
      if (missing || args.length === 0) {
        return { output: `cat: ${missing ?? ""}: No such file or directory`, isError: true, state };
      }
      return { output: args.map((file) => files[file]).join("\n"), isError: false, state };
    }
    case "vi":
    case "vim":
    case "nano":
      return { output: "Use the manifest editor above the terminal to write files, then kubectl apply -f <file>.", isError: false, state };
    default:
      return null;
  }
}

// Runs one kubectl command against a copy of the state; the original is untouched on error
export function executeCommand(input: ClusterState, command: string): ExecResult {
  const tokens = tokenize(command);
  // Everything after "--" belongs to the container (kubectl exec pod -- wget ...)
  const separator = tokens.indexOf("--");
  const [program, ...rest] = separator === -1 ? tokens : tokens.slice(0, separator);
  const containerArgs = separator === -1 ? [] : tokens.slice(separator + 1);

  const builtin = program ? shellBuiltin(input, program, rest) : null;
  if (builtin) return builtin;

  if (program !== "kubectl" && program !== "k") {
    return {
      output: `bash: ${program}: command not found\nHint: this lab simulates kubectl plus ls and cat.`,
      isError: true,
      state: input,
    };
  }

  const parsed = parseArgs(rest);
  const [verb, ...args] = parsed.args;
  const handler = verb ? HANDLERS[verb] : undefined;

  if (handler === undefined) {
    return {
      output: verb
        ? `error: unknown command "${verb}" for "kubectl"`
        : `Supported: ${Object.keys(HANDLERS).join(", ")}`,
      isError: true,
      state: input,
    };
  }

  const state = structuredClone(input);
  try {
    const namespace = getFlag(parsed, "--namespace") ?? "default";
    return { output: handler({ state, args, parsed, namespace, containerArgs }), isError: false, state };
  } catch (error) {
    if (error instanceof KubectlError) return { output: error.message, isError: true, state: input };
    throw error;
  }
}
