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

export interface PodResource extends BaseResource {
  kind: "Pod";
  namespace: string;
  image: string;
  node: string | null; // null = Pending (no schedulable node)
  owner: string | null; // "DaemonSet" pods can't be evicted by drain
}

export interface DeploymentResource extends BaseResource {
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
  | RoleBindingResource;

export type Kind = Resource["kind"];

export type NamespacedResource = Exclude<Resource, NodeResource | NamespaceResource>;

export interface ClusterState {
  resources: Resource[];
  nextId: number;
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
