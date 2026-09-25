import { schedulableNodes } from "./cluster";
import { getExisting, nextId, requireName, requireNamespace, resolvePod, resolveTarget, type Context } from "./context";
import { isRunning } from "./container";
import { runInContainer } from "./exec";
import { KubectlError, getFlag, getFlags, parseLabels } from "./parser";
import { QUOTA_KEYS } from "./quota";
import { parseQuantity } from "./units";
import type { DeploymentResource, ResourceList, Resources } from "./types";

function getDeployment(ctx: Context, args: string[]): { deployment: DeploymentResource; rest: string[] } {
  const { kind, name, rest } = resolveTarget(args);
  if (kind !== "Deployment") throw new KubectlError("error: only deployments are supported in this lab");
  return { deployment: getExisting(ctx, "Deployment", name), rest };
}

// kubectl set env deployment/api KEY=value OTHER- --from=configmap/app-config
export function setEnv(ctx: Context, args: string[]): string {
  const { deployment, rest } = getDeployment(ctx, args);
  const env = { ...(deployment.env ?? {}) };

  for (const change of rest) {
    if (change.endsWith("-")) delete env[change.slice(0, -1)];
    else if (change.includes("=")) env[change.slice(0, change.indexOf("="))] = change.slice(change.indexOf("=") + 1);
  }

  const from = getFlag(ctx.parsed, "--from");
  if (from) {
    const [kind, name] = from.split("/");
    if (kind !== "configmap" && kind !== "cm") throw new KubectlError("error: only --from=configmap/<name> is supported in this lab");
    getExisting(ctx, "ConfigMap", name);
    deployment.envFrom = [...new Set([...(deployment.envFrom ?? []), name])];
  }

  deployment.env = env;
  return `deployment.apps/${deployment.name} env updated`;
}

// "cpu=100m,memory=128Mi" -> { cpu: "100m", memory: "128Mi" }
function parseResourceList(flag: string, text: string | undefined): ResourceList | undefined {
  if (text === undefined) return undefined;
  const pairs = parseLabels(text);
  for (const [key, value] of Object.entries(pairs)) {
    if (key !== "cpu" && key !== "memory") throw new KubectlError(`error: invalid resource name "${key}" in --${flag}`);
    if (parseQuantity(key, value) === null) throw new KubectlError(`error: invalid ${key} quantity "${value}" in --${flag}`);
  }
  return pairs;
}

// kubectl set resources deployment/api --requests=cpu=100m,memory=128Mi --limits=memory=256Mi
export function setResources(ctx: Context, args: string[]): string {
  const { deployment } = getDeployment(ctx, args);
  const requests = parseResourceList("requests", getFlag(ctx.parsed, "--requests"));
  const limits = parseResourceList("limits", getFlag(ctx.parsed, "--limits"));
  if (requests === undefined && limits === undefined) {
    throw new KubectlError("error: you must specify --limits and/or --requests");
  }

  const current: Resources = deployment.resources ?? {};
  deployment.resources = {
    ...(current.requests || requests ? { requests: { ...current.requests, ...requests } } : {}),
    ...(current.limits || limits ? { limits: { ...current.limits, ...limits } } : {}),
  };
  return `deployment.apps/${deployment.name} resource requirements updated`;
}

// kubectl create quota team-quota --hard=pods=6,requests.memory=2Gi -n team-a
export function createQuota(ctx: Context, name: string | undefined): string {
  const quotaName = requireName(name, "create quota");
  const hard = parseLabels(getFlags(ctx.parsed, "--hard").join(","));
  if (Object.keys(hard).length === 0) throw new KubectlError('error: required flag(s) "hard" not set');

  for (const [key, value] of Object.entries(hard)) {
    if (QUOTA_KEYS.includes(key) === false) {
      throw new KubectlError(`error: unsupported quota resource "${key}"; this lab supports ${QUOTA_KEYS.join(", ")}`);
    }
    if (parseQuantity(key, value) === null) throw new KubectlError(`error: invalid quantity "${value}" for ${key}`);
  }

  requireNamespace(ctx.state, ctx.namespace);
  if (ctx.state.resources.some((r) => r.kind === "ResourceQuota" && r.namespace === ctx.namespace && r.name === quotaName)) {
    throw new KubectlError(`Error from server (AlreadyExists): resourcequotas "${quotaName}" already exists`);
  }
  ctx.state.resources.push({ kind: "ResourceQuota", name: quotaName, namespace: ctx.namespace, hard, labels: {}, createdAt: Date.now() });
  nextId(ctx.state);
  return `resourcequota/${quotaName} created`;
}

// kubectl exec <pod> [-n ns] -- <command>
export function execCommand(ctx: Context): string {
  const pod = resolvePod(ctx, requireName(ctx.args[0], "exec"));
  if (ctx.containerArgs.length === 0) {
    throw new KubectlError("error: you must specify at least one command for the container, e.g. kubectl exec web -- wget -qO- http://api");
  }
  if (isRunning(ctx.state, pod) === false) {
    throw new KubectlError(`error: unable to upgrade connection: container not found ("app")`);
  }
  return runInContainer(ctx.state, pod, ctx.containerArgs);
}

// Keeps the node assignment logic for pods created from manifests in one place
export function pickNode(ctx: Context): string | null {
  const nodes = schedulableNodes(ctx.state);
  return nodes.length > 0 ? nodes[nextId(ctx.state) % nodes.length] : null;
}
