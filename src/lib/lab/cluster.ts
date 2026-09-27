import { admitPods } from "./quota";
import { CONTAINER_CONFIG_FIELDS } from "./types";
import type {
  ClusterState,
  ContainerConfig,
  DeploymentResource,
  Kind,
  Labels,
  NodeResource,
  PodResource,
  Resource,
  ResourceSeed,
} from "./types";

export const DAY_MS = 86_400_000;
const K8S_VERSION = "v1.30.2";

export const CLUSTER_SCOPED: Kind[] = ["Node", "Namespace", "StorageClass", "PersistentVolume"];

export function baseResources(createdAt: number): Resource[] {
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

  const systemPod = (name: string, nodeName: string, owner: string | null = null, labels: Labels = {}): PodResource => ({
    kind: "Pod",
    name,
    namespace: "kube-system",
    image: `registry.k8s.io/${name.split("-")[0]}:${K8S_VERSION}`,
    node: nodeName,
    owner,
    labels,
    createdAt,
  });

  return [
    node("control-plane", "control-plane"),
    node("worker-1", "<none>"),
    node("worker-2", "<none>"),
    ...["default", "kube-system", "kube-public", "kube-node-lease"].map(
      (name): Resource => ({ kind: "Namespace", name, labels: namespaceLabels(name), createdAt })
    ),
    systemPod("etcd-control-plane", "control-plane"),
    systemPod("kube-apiserver-control-plane", "control-plane"),
    systemPod("kube-controller-manager-control-plane", "control-plane"),
    systemPod("kube-scheduler-control-plane", "control-plane"),
    systemPod("coredns-7db6d8ff4d-x2k9p", "worker-1", "ReplicaSet", { "k8s-app": "kube-dns" }),
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
    {
      kind: "StorageClass",
      name: "standard",
      provisioner: "rancher.io/local-path",
      reclaimPolicy: "Delete",
      volumeBindingMode: "WaitForFirstConsumer",
      allowVolumeExpansion: false,
      isDefault: true,
      labels: {},
      createdAt,
    },
    {
      kind: "Service",
      name: "kube-dns",
      namespace: "kube-system",
      type: "ClusterIP",
      port: 53,
      targetPort: 53,
      nodePort: null,
      selector: { "k8s-app": "kube-dns" },
      clusterIP: "10.96.0.10",
      labels: { "k8s-app": "kube-dns" },
      createdAt,
    },
  ];
}

// Kubernetes labels every namespace with its own name, which namespaceSelectors rely on
export function namespaceLabels(name: string, labels: Labels = {}): Labels {
  return { ...labels, "kubernetes.io/metadata.name": name };
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
  const config = Object.fromEntries(
    CONTAINER_CONFIG_FIELDS.filter((key) => deployment[key] !== undefined).map((key) => [key, deployment[key]])
  ) as ContainerConfig;
  // Any template change (image, env, probes, volumes...) creates a new ReplicaSet hash, like a real rollout
  const seed = `${deployment.name}:${deployment.image}:${JSON.stringify(config)}`;
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
    ...config,
  }));
}

// Every pod the controllers want to exist, before quota admission
export function podCandidates(state: ClusterState): PodResource[] {
  const standalone = state.resources.filter((r): r is PodResource => r.kind === "Pod");
  const managed = state.resources
    .filter((r): r is DeploymentResource => r.kind === "Deployment")
    .flatMap((deployment) => deploymentPods(state, deployment));
  return [...standalone, ...managed];
}

// Pods that actually exist: deployment pods over a ResourceQuota are never created
export function listPods(state: ClusterState): PodResource[] {
  return admitPods(state, podCandidates(state)).admitted;
}

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
