import type {
  ClusterState,
  DeploymentResource,
  Kind,
  Labels,
  NodeResource,
  PodResource,
  Resource,
  ResourceSeed,
} from "./types";

const DAY_MS = 86_400_000;
const K8S_VERSION = "v1.30.2";

export const CLUSTER_SCOPED: Kind[] = ["Node", "Namespace"];

function baseResources(createdAt: number): Resource[] {
  const node = (name: string, roles: string): NodeResource => ({
    kind: "Node",
    name,
    roles,
    version: K8S_VERSION,
    schedulable: true,
    taints: roles === "control-plane" ? ["node-role.kubernetes.io/control-plane:NoSchedule"] : [],
    labels: { "kubernetes.io/hostname": name },
    createdAt,
  });

  const systemPod = (name: string, nodeName: string, owner: string | null = null): PodResource => ({
    kind: "Pod",
    name,
    namespace: "kube-system",
    image: `registry.k8s.io/${name.split("-")[0]}:${K8S_VERSION}`,
    node: nodeName,
    owner,
    labels: {},
    createdAt,
  });

  return [
    node("control-plane", "control-plane"),
    node("worker-1", "<none>"),
    node("worker-2", "<none>"),
    ...["default", "kube-system", "kube-public", "kube-node-lease"].map(
      (name): Resource => ({ kind: "Namespace", name, labels: {}, createdAt })
    ),
    systemPod("etcd-control-plane", "control-plane"),
    systemPod("kube-apiserver-control-plane", "control-plane"),
    systemPod("kube-controller-manager-control-plane", "control-plane"),
    systemPod("kube-scheduler-control-plane", "control-plane"),
    systemPod("coredns-7db6d8ff4d-x2k9p", "worker-1", "ReplicaSet"),
    systemPod("kube-proxy-4hf8s", "worker-1", "DaemonSet"),
    systemPod("kube-proxy-9zq2m", "worker-2", "DaemonSet"),
    {
      kind: "Service",
      name: "kubernetes",
      namespace: "default",
      type: "ClusterIP",
      port: 443,
      targetPort: 6443,
      nodePort: null,
      selector: {},
      clusterIP: "10.96.0.1",
      labels: { component: "apiserver" },
      createdAt,
    },
  ];
}

// Base 3-node cluster plus the resources a lab starts with
export function createInitialState(seeds: ResourceSeed[]): ClusterState {
  const createdAt = Date.now() - 5 * DAY_MS;
  const extra = seeds.map((seed) => ({ labels: {}, ...seed, createdAt }) as Resource);
  return { resources: [...baseResources(createdAt), ...extra], nextId: 1 };
}

export function findResource<K extends Kind>(
  state: ClusterState,
  kind: K,
  name: string,
  namespace?: string
): Extract<Resource, { kind: K }> | undefined {
  return state.resources.find(
    (r): r is Extract<Resource, { kind: K }> =>
      r.kind === kind &&
      r.name === name &&
      (CLUSTER_SCOPED.includes(kind) || ("namespace" in r && r.namespace === namespace))
  );
}

export function matchesSelector(labels: Labels, selector: Labels): boolean {
  return Object.entries(selector).every(([key, value]) => labels[key] === value);
}

// Nodes a new pod can land on: schedulable and without blocking taints (tolerations aren't simulated)
export function schedulableNodes(state: ClusterState): string[] {
  return state.resources
    .filter(
      (r): r is NodeResource =>
        r.kind === "Node" &&
        r.schedulable &&
        r.taints.every((t) => t.endsWith(":NoSchedule") === false && t.endsWith(":NoExecute") === false)
    )
    .map((node) => node.name);
}

// FNV-1a, enough to give stable pseudo-random pod name suffixes
function shortHash(text: string, length: number): string {
  let hash = 0x811c9dc5;
  for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193) >>> 0;
  return hash.toString(36).padStart(length, "0").slice(-length);
}

// Pods managed by deployments are derived from the deployment spec, so they
// reschedule automatically after drains and change name when the image changes
function deploymentPods(state: ClusterState, deployment: DeploymentResource): PodResource[] {
  const nodes = schedulableNodes(state);
  const seed = `${deployment.name}:${deployment.image}`;
  const template = `${shortHash(seed, 5)}${shortHash(`${seed}#`, 5)}`;

  return Array.from({ length: deployment.replicas }, (_, i) => ({
    kind: "Pod",
    name: `${deployment.name}-${template}-${shortHash(`${template}:${i}`, 5)}`,
    namespace: deployment.namespace,
    image: deployment.image,
    node: nodes.length > 0 ? nodes[i % nodes.length] : null,
    owner: "ReplicaSet",
    labels: { ...deployment.labels },
    createdAt: deployment.createdAt,
  }));
}

export function listPods(state: ClusterState): PodResource[] {
  const standalone = state.resources.filter((r): r is PodResource => r.kind === "Pod");
  const managed = state.resources
    .filter((r): r is DeploymentResource => r.kind === "Deployment")
    .flatMap((deployment) => deploymentPods(state, deployment));
  return [...standalone, ...managed];
}

export function podStatus(pod: PodResource): string {
  return pod.node === null ? "Pending" : "Running";
}
