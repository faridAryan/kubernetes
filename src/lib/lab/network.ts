import { findResource, listPods, matchesSelector } from "./cluster";
import { isRunning } from "./container";
import { podIp } from "./diagnostics";
import type { ClusterState, Labels, NetworkPolicyPeer, NetworkPolicyResource, PodResource, ServiceResource } from "./types";

export type ConnectStatus = "open" | "timeout" | "refused" | "dns-failure" | "nxdomain";

export interface ConnectResult {
  status: ConnectStatus;
  ip: string | null; // address the client ended up talking to
  target: PodResource | null; // pod that answered
}

function namespaceLabelsOf(state: ClusterState, namespace: string): Labels {
  return findResource(state, "Namespace", namespace)?.labels ?? {};
}

// podSelector alone = pods in the policy's namespace; namespaceSelector narrows or widens the namespaces
function peerMatches(state: ClusterState, policy: NetworkPolicyResource, peer: NetworkPolicyPeer, pod: PodResource): boolean {
  const namespaceOk =
    peer.namespaceSelector === undefined
      ? pod.namespace === policy.namespace
      : matchesSelector(namespaceLabelsOf(state, pod.namespace), peer.namespaceSelector);
  const podOk = peer.podSelector === undefined || matchesSelector(pod.labels, peer.podSelector);
  return namespaceOk && podOk;
}

// Policies that select the pod for a direction; none means the pod isn't isolated in that direction
function isolatingPolicies(state: ClusterState, pod: PodResource, type: "Ingress" | "Egress") {
  return state.resources.filter(
    (r): r is NetworkPolicyResource =>
      r.kind === "NetworkPolicy" &&
      r.namespace === pod.namespace &&
      r.policyTypes.includes(type) &&
      matchesSelector(pod.labels, r.podSelector)
  );
}

// Policies are additive: traffic is allowed if any selecting policy has a matching rule
function allows(state: ClusterState, pod: PodResource, type: "Ingress" | "Egress", peer: PodResource, port: number): boolean {
  const policies = isolatingPolicies(state, pod, type);
  if (policies.length === 0) return true;

  return policies.some((policy) =>
    (type === "Ingress" ? policy.ingress : policy.egress).some(
      (rule) =>
        (rule.ports.length === 0 || rule.ports.includes(port)) &&
        (rule.peers.length === 0 || rule.peers.some((p) => peerMatches(state, policy, p, peer)))
    )
  );
}

// A connection needs the client's egress AND the server's ingress to allow it
export function connectionAllowed(state: ClusterState, from: PodResource, to: PodResource, port: number): boolean {
  return allows(state, from, "Egress", to, port) && allows(state, to, "Ingress", from, port);
}

// DNS lookups go to CoreDNS on port 53, so egress policies must allow that too
export function canResolveDns(state: ClusterState, from: PodResource): boolean {
  return listPods(state).some(
    (p) => p.namespace === "kube-system" && p.labels["k8s-app"] === "kube-dns" && isRunning(state, p) && connectionAllowed(state, from, p, 53)
  );
}

const isIp = (host: string) => /^\d{1,3}(\.\d{1,3}){3}$/.test(host);

// "web", "web.prod", "web.prod.svc", "web.prod.svc.cluster.local"
export function findServiceByName(state: ClusterState, from: PodResource, host: string): ServiceResource | undefined {
  const [name, namespace = from.namespace] = host.replace(/\.svc(\.cluster\.local)?$/, "").split(".");
  return findResource(state, "Service", name, namespace);
}

function endpointPods(state: ClusterState, service: ServiceResource): PodResource[] {
  const hasSelector = Object.keys(service.selector).length > 0;
  return listPods(state).filter(
    (p) => hasSelector && p.namespace === service.namespace && isRunning(state, p) && matchesSelector(p.labels, service.selector)
  );
}

// Opens a TCP connection from a pod to host:port, the way kube-proxy and the CNI would route it
export function connect(state: ClusterState, from: PodResource, host: string, port: number): ConnectResult {
  let service: ServiceResource | undefined;
  let pod: PodResource | undefined;

  if (isIp(host)) {
    service = state.resources.find((r): r is ServiceResource => r.kind === "Service" && r.clusterIP === host);
    pod = service ? undefined : listPods(state).find((p) => podIp(p) === host);
    if (service === undefined && pod === undefined) return { status: "timeout", ip: host, target: null };
  } else {
    if (canResolveDns(state, from) === false) return { status: "dns-failure", ip: null, target: null };
    service = findServiceByName(state, from, host);
    if (service === undefined) return { status: "nxdomain", ip: null, target: null };
  }

  if (service) {
    const backends = endpointPods(state, service);
    // kube-proxy rejects traffic for ports the Service doesn't expose or when it has no endpoints
    if (port !== service.port || backends.length === 0) return { status: "refused", ip: service.clusterIP, target: null };
    const reachable = backends.find((backend) => connectionAllowed(state, from, backend, service.targetPort));
    return reachable
      ? { status: "open", ip: service.clusterIP, target: reachable }
      : { status: "timeout", ip: service.clusterIP, target: null };
  }

  const target = pod as PodResource;
  if (isRunning(state, target) === false) return { status: "refused", ip: podIp(target), target: null };
  return connectionAllowed(state, from, target, port)
    ? { status: "open", ip: podIp(target), target }
    : { status: "timeout", ip: podIp(target), target: null };
}
