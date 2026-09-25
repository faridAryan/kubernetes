import {
  CLUSTER_SCOPED,
  findResource,
  listPods,
  matchesSelector,
  schedulableNodes,
} from "./cluster";
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
import { KIND_PLURAL, KIND_PREFIX, describe, printTable, table } from "./printers";
import type {
  ClusterState,
  DeploymentResource,
  Kind,
  NodeResource,
  PodResource,
  Resource,
  RoleBindingResource,
  RoleResource,
} from "./types";

const KIND_ALIASES: Record<string, Kind> = {
  node: "Node", nodes: "Node", no: "Node",
  namespace: "Namespace", namespaces: "Namespace", ns: "Namespace",
  pod: "Pod", pods: "Pod", po: "Pod",
  deployment: "Deployment", deployments: "Deployment", deploy: "Deployment",
  service: "Service", services: "Service", svc: "Service",
  configmap: "ConfigMap", configmaps: "ConfigMap", cm: "ConfigMap",
  secret: "Secret", secrets: "Secret",
  serviceaccount: "ServiceAccount", serviceaccounts: "ServiceAccount", sa: "ServiceAccount",
  role: "Role", roles: "Role",
  rolebinding: "RoleBinding", rolebindings: "RoleBinding",
};

const PROTECTED_NAMESPACES = ["default", "kube-system", "kube-public", "kube-node-lease"];

interface Context {
  state: ClusterState;
  args: string[];
  parsed: ParsedArgs;
  namespace: string;
}

export interface ExecResult {
  output: string;
  isError: boolean;
  state: ClusterState;
}

// ---------- helpers ----------

function resolveKind(word: string | undefined): Kind {
  const kind = word ? KIND_ALIASES[word.toLowerCase().split(".")[0]] : undefined;
  if (kind === undefined) {
    throw new KubectlError(`error: the server doesn't have a resource type "${word ?? ""}"`);
  }
  return kind;
}

// Accepts both "deployment nginx" and "deployment/nginx"
function resolveTarget(args: string[]): { kind: Kind; name: string; rest: string[] } {
  const [first = "", second, ...others] = args;
  if (first.includes("/")) {
    const [kind, name] = first.split("/");
    return { kind: resolveKind(kind), name, rest: args.slice(1) };
  }
  if (second === undefined) throw new KubectlError("error: resource name may not be empty");
  return { kind: resolveKind(first), name: second, rest: others };
}

function notFound(kind: Kind, name: string): KubectlError {
  return new KubectlError(`Error from server (NotFound): ${KIND_PLURAL[kind]} "${name}" not found`);
}

function requireNamespace(state: ClusterState, namespace: string) {
  if (findResource(state, "Namespace", namespace) === undefined) throw notFound("Namespace", namespace);
}

function requireFlag(parsed: ParsedArgs, flag: string): string {
  const value = getFlag(parsed, flag);
  if (value === undefined || value === "") {
    throw new KubectlError(`error: required flag(s) "${flag.replace(/^--/, "")}" not set`);
  }
  return value;
}

function requireName(name: string | undefined, what: string): string {
  if (name === undefined) throw new KubectlError(`error: exactly one NAME is required for ${what}`);
  return name;
}

function addResource(state: ClusterState, resource: Resource) {
  const namespace = "namespace" in resource ? resource.namespace : undefined;
  if (findResource(state, resource.kind, resource.name, namespace)) {
    throw new KubectlError(
      `Error from server (AlreadyExists): ${KIND_PLURAL[resource.kind]} "${resource.name}" already exists`
    );
  }
  state.resources.push(resource);
}

function getExisting<K extends Kind>(ctx: Context, kind: K, name: string) {
  const namespace = CLUSTER_SCOPED.includes(kind) ? undefined : ctx.namespace;
  const resource = findResource(ctx.state, kind, name, namespace);
  if (resource === undefined) throw notFound(kind, name);
  return resource;
}

function findPod(ctx: Context, name: string): PodResource {
  const pod = listPods(ctx.state).find((p) => p.name === name && p.namespace === ctx.namespace);
  if (pod === undefined) throw notFound("Pod", name);
  return pod;
}

function nextId(state: ClusterState): number {
  state.nextId += 1;
  return state.nextId;
}

function literals(parsed: ParsedArgs): Record<string, string> {
  return parseLabels(getFlags(parsed, "--from-literal").join(","));
}

function commaList(parsed: ParsedArgs, flag: string): string[] {
  return getFlags(parsed, flag).flatMap((value) => value.split(",")).filter(Boolean);
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

function describeCommand(ctx: Context): string {
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
  addResource(ctx.state, {
    kind: "Pod",
    name,
    namespace: ctx.namespace,
    image,
    node: nodes.length > 0 ? nodes[id % nodes.length] : null,
    owner: null,
    labels: getFlag(ctx.parsed, "--labels") ? parseLabels(getFlag(ctx.parsed, "--labels") ?? "") : { run: name },
    createdAt: Date.now(),
  });
  return `pod/${name} created`;
}

function create(ctx: Context): string {
  const { state, parsed, namespace } = ctx;
  const [type, ...rest] = ctx.args;
  const base = { labels: {}, createdAt: Date.now() };

  switch (type) {
    case "namespace":
    case "ns": {
      const name = requireName(rest[0], "create namespace");
      addResource(state, { kind: "Namespace", name, ...base });
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

function set(ctx: Context): string {
  const [sub, ...rest] = ctx.args;
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
  const target = ctx.args[0]?.replace(/^(pod|pods|po)\//, "");
  const pod = findPod(ctx, requireName(target, "logs"));
  if (pod.node === null) {
    throw new KubectlError(`Error from server (BadRequest): container "${pod.name}" in pod "${pod.name}" is waiting to start: ContainerCreating`);
  }
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

  const saMatch = as.match(/^system:serviceaccount:([^:]+):(.+)$/);
  const subject = saMatch ? `ServiceAccount:${saMatch[1]}:${saMatch[2]}` : `User:${as}`;
  const plural = resource.endsWith("s") ? resource : `${resource}s`;

  const roles = ctx.state.resources.filter(
    (r): r is RoleResource => r.kind === "Role" && r.namespace === ctx.namespace
  );
  const allowed = ctx.state.resources
    .filter((r): r is RoleBindingResource => r.kind === "RoleBinding" && r.namespace === ctx.namespace && r.subjects.includes(subject))
    .some((binding) =>
      roles.some(
        (role) =>
          role.name === binding.role &&
          (role.verbs.includes(verb) || role.verbs.includes("*")) &&
          (role.resources.includes(plural) || role.resources.includes("*"))
      )
    );

  return allowed ? "yes" : "no";
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
};

// Runs one kubectl command against a copy of the state; the original is untouched on error
export function executeCommand(input: ClusterState, command: string): ExecResult {
  const tokens = tokenize(command);
  const [program, ...rest] = tokens;

  if (program !== "kubectl" && program !== "k") {
    return {
      output: `bash: ${program}: command not found\nHint: this lab simulates kubectl commands only.`,
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
    return { output: handler({ state, args, parsed, namespace }), isError: false, state };
  } catch (error) {
    if (error instanceof KubectlError) return { output: error.message, isError: true, state: input };
    throw error;
  }
}
