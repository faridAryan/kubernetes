import { CLUSTER_SCOPED, findResource, listPods, matchesSelector } from "./cluster";
import { KubectlError, getFlag, getFlags, parseLabels, type ParsedArgs } from "./parser";
import { KIND_PLURAL } from "./printers";
import type { ClusterState, Kind, PodResource, Resource } from "./types";

export const KIND_ALIASES: Record<string, Kind> = {
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
  networkpolicy: "NetworkPolicy", networkpolicies: "NetworkPolicy", netpol: "NetworkPolicy",
  resourcequota: "ResourceQuota", resourcequotas: "ResourceQuota", quota: "ResourceQuota",
};

export interface Context {
  state: ClusterState;
  args: string[];
  parsed: ParsedArgs;
  namespace: string;
  containerArgs: string[]; // everything after "--" (kubectl exec / run)
}

export function resolveKind(word: string | undefined): Kind {
  const kind = word ? KIND_ALIASES[word.toLowerCase().split(".")[0]] : undefined;
  if (kind === undefined) {
    throw new KubectlError(`error: the server doesn't have a resource type "${word ?? ""}"`);
  }
  return kind;
}

// Accepts both "deployment nginx" and "deployment/nginx"
export function resolveTarget(args: string[]): { kind: Kind; name: string; rest: string[] } {
  const [first = "", second, ...others] = args;
  if (first.includes("/")) {
    const [kind, name] = first.split("/");
    return { kind: resolveKind(kind), name, rest: args.slice(1) };
  }
  if (second === undefined) throw new KubectlError("error: resource name may not be empty");
  return { kind: resolveKind(first), name: second, rest: others };
}

export function notFound(kind: Kind, name: string): KubectlError {
  return new KubectlError(`Error from server (NotFound): ${KIND_PLURAL[kind]} "${name}" not found`);
}

export function requireNamespace(state: ClusterState, namespace: string) {
  if (findResource(state, "Namespace", namespace) === undefined) throw notFound("Namespace", namespace);
}

export function requireFlag(parsed: ParsedArgs, flag: string): string {
  const value = getFlag(parsed, flag);
  if (value === undefined || value === "") {
    throw new KubectlError(`error: required flag(s) "${flag.replace(/^--/, "")}" not set`);
  }
  return value;
}

export function requireName(name: string | undefined, what: string): string {
  if (name === undefined) throw new KubectlError(`error: exactly one NAME is required for ${what}`);
  return name;
}

export function addResource(state: ClusterState, resource: Resource) {
  const namespace = "namespace" in resource ? resource.namespace : undefined;
  if (findResource(state, resource.kind, resource.name, namespace)) {
    throw new KubectlError(
      `Error from server (AlreadyExists): ${KIND_PLURAL[resource.kind]} "${resource.name}" already exists`
    );
  }
  state.resources.push(resource);
}

export function getExisting<K extends Kind>(ctx: Context, kind: K, name: string) {
  const namespace = CLUSTER_SCOPED.includes(kind) ? undefined : ctx.namespace;
  const resource = findResource(ctx.state, kind, name, namespace);
  if (resource === undefined) throw notFound(kind, name);
  return resource;
}

export function findPod(ctx: Context, name: string): PodResource {
  const pod = listPods(ctx.state).find((p) => p.name === name && p.namespace === ctx.namespace);
  if (pod === undefined) throw notFound("Pod", name);
  return pod;
}

export function nextId(state: ClusterState): number {
  state.nextId += 1;
  return state.nextId;
}

export function literals(parsed: ParsedArgs): Record<string, string> {
  return parseLabels(getFlags(parsed, "--from-literal").join(","));
}

export function commaList(parsed: ParsedArgs, flag: string): string[] {
  return getFlags(parsed, flag).flatMap((value) => value.split(",")).filter(Boolean);
}

// "web-abc12", "pod/web-abc12" or "deploy/web" (picks one of the deployment's pods, like kubectl)
export function resolvePod(ctx: Context, target: string): PodResource {
  const deployment = target.match(/^(deploy|deployment|deployments)\/(.+)$/);
  if (deployment === null) return findPod(ctx, target.replace(/^(pod|pods|po)\//, ""));

  const owner = getExisting(ctx, "Deployment", deployment[2]);
  const pod = listPods(ctx.state).find(
    (p) => p.namespace === ctx.namespace && p.owner === "ReplicaSet" && matchesSelector(p.labels, owner.labels)
  );
  if (pod === undefined) throw new KubectlError(`error: no pods found for deployment "${deployment[2]}"`);
  return pod;
}
