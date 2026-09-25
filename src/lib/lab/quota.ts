import { formatQuantity, parseQuantity } from "./units";
import type { ClusterState, PodResource, ResourceQuotaResource } from "./types";

// Quota keys the simulator enforces
export const QUOTA_KEYS = ["pods", "requests.cpu", "requests.memory", "limits.cpu", "limits.memory"];

export interface QuotaRejection {
  namespace: string;
  podName: string;
  message: string;
}

// What one pod consumes for each quota key; null when the pod doesn't set that resource
function podUsage(pod: PodResource): Record<string, number | null> {
  return {
    pods: 1,
    "requests.cpu": parseQuantity("cpu", pod.resources?.requests?.cpu),
    "requests.memory": parseQuantity("memory", pod.resources?.requests?.memory),
    "limits.cpu": parseQuantity("cpu", pod.resources?.limits?.cpu),
    "limits.memory": parseQuantity("memory", pod.resources?.limits?.memory),
  };
}

function quotasIn(state: ClusterState, namespace: string): ResourceQuotaResource[] {
  return state.resources.filter(
    (r): r is ResourceQuotaResource => r.kind === "ResourceQuota" && r.namespace === namespace
  );
}

// Why the API server would refuse this pod given what is already running, or null if it fits
function rejection(pod: PodResource, quota: ResourceQuotaResource, used: Record<string, number>): string | null {
  const need = podUsage(pod);
  const tracked = QUOTA_KEYS.filter((key) => key in quota.hard);

  const unspecified = tracked.filter((key) => key !== "pods" && need[key] === null);
  if (unspecified.length > 0) {
    return `pods "${pod.name}" is forbidden: failed quota: ${quota.name}: must specify ${unspecified.join(",")}`;
  }

  const exceeded = tracked.filter((key) => (used[key] ?? 0) + (need[key] ?? 0) > (parseQuantity(key, quota.hard[key]) ?? Infinity));
  if (exceeded.length === 0) return null;

  const list = (values: (key: string) => number) => exceeded.map((key) => `${key}=${formatQuantity(key, values(key))}`).join(",");
  return `pods "${pod.name}" is forbidden: exceeded quota: ${quota.name}, requested: ${list((k) => need[k] ?? 0)}, used: ${list((k) => used[k] ?? 0)}, limited: ${list((k) => parseQuantity(k, quota.hard[k]) ?? 0)}`;
}

// Runs every candidate pod through quota admission in order, like the ReplicaSet controller would.
// Pods that already exist on their own (created by "kubectl run") were admitted at creation time.
export function admitPods(state: ClusterState, candidates: PodResource[]) {
  const usage = new Map<string, Record<string, number>>();
  const admitted: PodResource[] = [];
  const rejected: QuotaRejection[] = [];

  for (const pod of candidates) {
    const quotas = quotasIn(state, pod.namespace);
    const reasons = pod.owner === "ReplicaSet"
      ? quotas.map((quota) => rejection(pod, quota, usage.get(quota.name) ?? {})).filter((r): r is string => r !== null)
      : [];

    if (reasons.length > 0) {
      rejected.push({ namespace: pod.namespace, podName: pod.name, message: reasons[0] });
      continue;
    }

    admitted.push(pod);
    const need = podUsage(pod);
    for (const quota of quotas) {
      const used = usage.get(quota.name) ?? {};
      for (const key of QUOTA_KEYS) used[key] = (used[key] ?? 0) + (need[key] ?? 0);
      usage.set(quota.name, used);
    }
  }
  return { admitted, rejected };
}

// Checks a brand-new standalone pod against the pods already running
export function admissionError(state: ClusterState, running: PodResource[], pod: PodResource): string | null {
  const inNamespace = running.filter((p) => p.namespace === pod.namespace);
  for (const quota of quotasIn(state, pod.namespace)) {
    const used: Record<string, number> = {};
    for (const existing of inNamespace) {
      const need = podUsage(existing);
      for (const key of QUOTA_KEYS) used[key] = (used[key] ?? 0) + (need[key] ?? 0);
    }
    const reason = rejection(pod, quota, used);
    if (reason) return reason;
  }
  return null;
}

// "Used" column of kubectl describe quota
export function quotaUsed(pods: PodResource[], quota: ResourceQuotaResource): Record<string, number> {
  const used: Record<string, number> = {};
  for (const pod of pods.filter((p) => p.namespace === quota.namespace)) {
    const need = podUsage(pod);
    for (const key of QUOTA_KEYS) used[key] = (used[key] ?? 0) + (need[key] ?? 0);
  }
  return used;
}
