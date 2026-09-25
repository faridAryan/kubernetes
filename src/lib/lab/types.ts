export type Labels = Record<string, string>;

interface BaseResource {
  name: string;
  labels: Labels;
  createdAt: number; // epoch ms, used for the AGE column
}

export interface NodeResource extends BaseResource {
  kind: "Node";
  roles: string;
  version: string;
  schedulable: boolean;
  taints: string[]; // "key=value:Effect"
}

export interface NamespaceResource extends BaseResource {
  kind: "Namespace";
}

export interface ResourceList {
  cpu?: string; // "250m", "1"
  memory?: string; // "128Mi", "1Gi"
}

export interface Resources {
  requests?: ResourceList;
  limits?: ResourceList;
}

// How the simulated container behaves; all optional so simple labs stay simple
export interface ContainerConfig {
  env?: Record<string, string>;
  envFrom?: string[]; // ConfigMap names imported with envFrom
  requiredEnv?: string[]; // the app exits (CrashLoopBackOff) unless these variables are set
  resources?: Resources;
  memoryUsage?: string; // real memory the app needs; above the limit it gets OOMKilled
}

export interface PodResource extends BaseResource, ContainerConfig {
  kind: "Pod";
  namespace: string;
  image: string;
  node: string | null; // null = Pending (no schedulable node)
  owner: string | null; // "DaemonSet" pods can't be evicted by drain
}

export interface DeploymentResource extends BaseResource, ContainerConfig {
  kind: "Deployment";
  namespace: string;
  image: string;
  replicas: number;
  revisions: string[]; // image history, newest last
}

export interface ServiceResource extends BaseResource {
  kind: "Service";
  namespace: string;
  type: "ClusterIP" | "NodePort" | "LoadBalancer";
  port: number;
  targetPort: number;
  nodePort: number | null;
  selector: Labels;
  clusterIP: string;
}

export interface ConfigMapResource extends BaseResource {
  kind: "ConfigMap";
  namespace: string;
  data: Record<string, string>;
}

export interface SecretResource extends BaseResource {
  kind: "Secret";
  namespace: string;
  data: Record<string, string>;
}

export interface ServiceAccountResource extends BaseResource {
  kind: "ServiceAccount";
  namespace: string;
}

export interface RoleResource extends BaseResource {
  kind: "Role";
  namespace: string;
  verbs: string[];
  resources: string[];
}

export interface RoleBindingResource extends BaseResource {
  kind: "RoleBinding";
  namespace: string;
  role: string;
  subjects: string[]; // "ServiceAccount:<ns>:<name>" or "User:<name>"
}

// A peer with only podSelector means pods in the policy's namespace;
// with namespaceSelector it means (matching) pods in the matching namespaces
export interface NetworkPolicyPeer {
  podSelector?: Labels;
  namespaceSelector?: Labels;
}

export interface NetworkPolicyRule {
  peers: NetworkPolicyPeer[]; // empty = from/to everywhere
  ports: number[]; // empty = all ports
}

export interface NetworkPolicyResource extends BaseResource {
  kind: "NetworkPolicy";
  namespace: string;
  podSelector: Labels; // empty = every pod in the namespace
  policyTypes: ("Ingress" | "Egress")[];
  ingress: NetworkPolicyRule[];
  egress: NetworkPolicyRule[];
}

export interface ResourceQuotaResource extends BaseResource {
  kind: "ResourceQuota";
  namespace: string;
  hard: Record<string, string>; // e.g. { pods: "6", "requests.memory": "2Gi" }
}

export type Resource =
  | NodeResource
  | NamespaceResource
  | PodResource
  | DeploymentResource
  | ServiceResource
  | ConfigMapResource
  | SecretResource
  | ServiceAccountResource
  | RoleResource
  | RoleBindingResource
  | NetworkPolicyResource
  | ResourceQuotaResource;

export type Kind = Resource["kind"];

export type NamespacedResource = Exclude<Resource, NodeResource | NamespaceResource>;

export interface ClusterState {
  resources: Resource[];
  nextId: number;
  files?: Record<string, string>; // manifests saved from the lab editor
}

// Lab definitions (stored as JSON in LabConfig)
// Omit applied to each member of the union, so kind-specific fields are kept
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export type ResourceSeed = DistributiveOmit<Resource, "createdAt" | "labels"> & { labels?: Labels };

export type LabCheck =
  | { type: "command"; description: string; pattern: string }
  | {
      type: "exists";
      description: string;
      kind: Kind;
      name: string;
      namespace?: string;
      match?: Record<string, unknown>;
      // Values that must NOT be present: array fields (taints) or object keys (data, labels)
      exclude?: Record<string, string[]>;
    }
  | { type: "absent"; description: string; kind: Kind; name: string; namespace?: string }
  | {
      // RBAC outcome, e.g. "jane can list pods in dev" or "anonymous can't read secrets"
      type: "can-i";
      description: string;
      as: string; // kubectl --as value, e.g. "system:serviceaccount:dev:ci"
      verb: string;
      resource: string;
      namespace: string;
      allowed: boolean;
    }
  | {
      // Runs the same request as "kubectl exec <pod> -- nc -z <host> <port>"
      type: "connectivity";
      description: string;
      from: { namespace: string; selector: Labels };
      host: string; // service name, "svc.ns", FQDN or pod IP
      port: number;
      allowed: boolean;
    }
  | { type: "endpoints"; description: string; service: string; namespace: string; count: number }
  | {
      type: "pods";
      description: string;
      namespace: string;
      selector: Labels;
      running: number;
      notOnNode?: string;
    };

export interface CheckResult {
  description: string;
  passed: boolean;
}
