import { listPods, matchesSelector, podCandidates, podIp } from "./cluster";

export { podIp };
import { readinessError } from "./app";
import { crashReason, isReady, missingConfigMaps, podStatus } from "./container";
import { pendingReason, volumeProblem } from "./storage";
import type { PersistentVolumeClaimResource } from "./types";
import { admitPods } from "./quota";
import type { ClusterState, NodeResource, PodResource, ServiceResource } from "./types";

// Ready pod IPs a Service routes to, formatted like the Endpoints object
export function serviceEndpoints(state: ClusterState, service: ServiceResource): string[] {
  const hasSelector = Object.keys(service.selector).length > 0;
  return listPods(state)
    .filter(
      (p) => hasSelector && p.namespace === service.namespace && isReady(state, p) && matchesSelector(p.labels, service.selector)
    )
    .map((p) => `${podIp(p)}:${service.targetPort}`);
}

// Same wording as the real scheduler's FailedScheduling event
export function schedulingFailure(state: ClusterState): string {
  const nodes = state.resources.filter((r): r is NodeResource => r.kind === "Node");
  const reasons = new Map<string, number>();
  const add = (reason: string) => reasons.set(reason, (reasons.get(reason) ?? 0) + 1);

  for (const node of nodes) {
    const blocking = node.taints.find((t) => t.endsWith(":NoSchedule") || t.endsWith(":NoExecute"));
    if (node.schedulable === false) add("node(s) were unschedulable");
    else if (blocking) {
      const [keyValue] = blocking.split(":");
      const [key, value = ""] = keyValue.split("=");
      add(`node(s) had untolerated taint {${key}: ${value}}`);
    }
  }

  const detail = [...reasons].map(([reason, count]) => `${count} ${reason}`).join(", ");
  return `0/${nodes.length} nodes are available: ${detail}. preemption: 0/${nodes.length} nodes are available: ${nodes.length} Preemption is not helpful for scheduling.`;
}

export interface PodEvent {
  type: "Normal" | "Warning";
  reason: string;
  message: string;
}

export function podEvents(state: ClusterState, pod: PodResource): PodEvent[] {
  const status = podStatus(state, pod);
  if (status === "Pending") {
    const volume = volumeProblem(state, pod);
    const message = volume
      ? `0/3 nodes are available: ${volume}. preemption: 0/3 nodes are available: 3 Preemption is not helpful for scheduling.`
      : schedulingFailure(state);
    return [{ type: "Warning", reason: "FailedScheduling", message }];
  }

  const scheduled: PodEvent = {
    type: "Normal",
    reason: "Scheduled",
    message: `Successfully assigned ${pod.namespace}/${pod.name} to ${pod.node}`,
  };
  if (status === "CreateContainerConfigError") {
    return [
      scheduled,
      { type: "Normal", reason: "Pulled", message: `Container image "${pod.image}" already present on machine` },
      { type: "Warning", reason: "Failed", message: `Error: configmap "${missingConfigMaps(state, pod)[0]}" not found` },
    ];
  }
  if (status === "CrashLoopBackOff") {
    const crash = crashReason(state, pod);
    const probe = crash?.probe;
    return [
      scheduled,
      { type: "Normal", reason: "Pulled", message: `Container image "${pod.image}" already present on machine` },
      { type: "Normal", reason: "Started", message: "Started container app" },
      ...(probe
        ? [
            { type: "Warning" as const, reason: "Unhealthy", message: `${probe.probe} probe failed: ${probe.message}` },
            { type: "Normal" as const, reason: "Killing", message: `Container app failed ${probe.probe.toLowerCase()} probe, will be restarted` },
          ]
        : []),
      ...(crash?.reason === "OOMKilled"
        ? [{ type: "Warning" as const, reason: "OOMKilling", message: "Memory cgroup out of memory: Killed process 1 (app)" }]
        : []),
      { type: "Warning", reason: "BackOff", message: `Back-off restarting failed container app in pod ${pod.name}_${pod.namespace}` },
    ];
  }
  if (status === "ImagePullBackOff") {
    return [
      scheduled,
      { type: "Normal", reason: "Pulling", message: `Pulling image "${pod.image}"` },
      {
        type: "Warning",
        reason: "Failed",
        message: `Failed to pull image "${pod.image}": rpc error: code = NotFound desc = failed to pull and unpack image "docker.io/library/${pod.image}": not found`,
      },
      { type: "Warning", reason: "BackOff", message: `Back-off pulling image "${pod.image}"` },
    ];
  }
  const notReady = readinessError(pod, podIp(pod));
  return [
    scheduled,
    { type: "Normal", reason: "Pulled", message: `Container image "${pod.image}" already present on machine` },
    { type: "Normal", reason: "Started", message: "Started container" },
    ...(notReady ? [{ type: "Warning" as const, reason: "Unhealthy", message: `Readiness probe failed: ${notReady}` }] : []),
  ];
}

// Events on a claim that can't bind yet
export function claimEvents(state: ClusterState, claim: PersistentVolumeClaimResource): PodEvent[] {
  const pending = pendingReason(state, claim);
  if (pending === null) return [];
  return [{ type: pending.reason === "ProvisioningFailed" ? "Warning" : "Normal", reason: pending.reason, message: pending.message }];
}

// Warnings shown by "kubectl get events": pods in trouble and pods a quota refused to create
export function warningEvents(state: ClusterState, namespace: string | null) {
  const inScope = (ns: string) => namespace === null || ns === namespace;

  const podWarnings = listPods(state)
    .filter((p) => inScope(p.namespace) && isReady(state, p) === false)
    .flatMap((pod) =>
      podEvents(state, pod)
        .filter((event) => event.type === "Warning")
        .map((event) => ({ ...event, namespace: pod.namespace, object: `pod/${pod.name}` }))
    );

  // One FailedCreate per ReplicaSet, like the controller's event
  const seen = new Set<string>();
  const quotaWarnings = admitPods(state, podCandidates(state))
    .rejected.filter((r) => inScope(r.namespace))
    .map((r) => ({ ...r, replicaSet: r.podName.slice(0, r.podName.lastIndexOf("-")) }))
    .filter((r) => (seen.has(r.replicaSet) ? false : Boolean(seen.add(r.replicaSet))))
    .map((r) => ({
      type: "Warning" as const,
      reason: "FailedCreate",
      message: `Error creating: ${r.message}`,
      namespace: r.namespace,
      object: `replicaset/${r.replicaSet}`,
    }));

  const claimWarnings = state.resources
    .filter((r): r is PersistentVolumeClaimResource => r.kind === "PersistentVolumeClaim" && inScope(r.namespace))
    .flatMap((claim) =>
      claimEvents(state, claim).map((event) => ({
        ...event,
        namespace: claim.namespace,
        object: `persistentvolumeclaim/${claim.name}`,
      }))
    );

  return [...podWarnings, ...quotaWarnings, ...claimWarnings];
}
