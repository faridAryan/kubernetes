import { listPods, matchesSelector, isRunning, podStatus } from "./cluster";
import type { ClusterState, NodeResource, PodResource, ServiceResource } from "./types";

const NODE_SUBNETS: Record<string, number> = { "control-plane": 0, "worker-1": 1, "worker-2": 2 };

function numericHash(text: string): number {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

// Stable pod IP inside the node's pod CIDR (10.244.<node>.0/24)
export function podIp(pod: PodResource): string {
  if (pod.node === null) return "<none>";
  const subnet = NODE_SUBNETS[pod.node] ?? 3;
  return `10.244.${subnet}.${(numericHash(`${pod.namespace}/${pod.name}`) % 240) + 10}`;
}

// Ready pod IPs a Service routes to, formatted like the Endpoints object
export function serviceEndpoints(state: ClusterState, service: ServiceResource): string[] {
  const hasSelector = Object.keys(service.selector).length > 0;
  return listPods(state)
    .filter(
      (p) => hasSelector && p.namespace === service.namespace && isRunning(p) && matchesSelector(p.labels, service.selector)
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
  const status = podStatus(pod);
  if (status === "Pending") {
    return [{ type: "Warning", reason: "FailedScheduling", message: schedulingFailure(state) }];
  }

  const scheduled: PodEvent = {
    type: "Normal",
    reason: "Scheduled",
    message: `Successfully assigned ${pod.namespace}/${pod.name} to ${pod.node}`,
  };
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
  return [
    scheduled,
    { type: "Normal", reason: "Pulled", message: `Container image "${pod.image}" already present on machine` },
    { type: "Normal", reason: "Started", message: "Started container" },
  ];
}

// Warnings shown by "kubectl get events": only pods that are in trouble
export function warningEvents(state: ClusterState, namespace: string | null) {
  return listPods(state)
    .filter((p) => (namespace === null || p.namespace === namespace) && isRunning(p) === false)
    .flatMap((pod) =>
      podEvents(state, pod)
        .filter((event) => event.type === "Warning")
        .map((event) => ({ ...event, namespace: pod.namespace, object: `pod/${pod.name}` }))
    );
}
