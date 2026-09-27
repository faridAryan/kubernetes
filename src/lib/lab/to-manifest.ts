import { claimPhase, effectiveClassName } from "./storage";
import type { ClusterState, ContainerConfig, NetworkPolicyRule, Probe, Resource } from "./types";

type Manifest = Record<string, unknown>;

const compact = (object: Manifest): Manifest =>
  Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));

function metadata(r: Resource): Manifest {
  return compact({
    name: r.name,
    namespace: "namespace" in r ? r.namespace : undefined,
    labels: Object.keys(r.labels).length > 0 ? r.labels : undefined,
    creationTimestamp: new Date(r.createdAt).toISOString().replace(/\.\d{3}Z$/, "Z"),
  });
}

function probe(p: Probe | undefined): Manifest | undefined {
  if (p === undefined) return undefined;
  return compact({
    httpGet: p.httpGet ? { path: p.httpGet.path, port: p.httpGet.port } : undefined,
    tcpSocket: p.tcpSocket ? { port: p.tcpSocket.port } : undefined,
    initialDelaySeconds: p.initialDelaySeconds,
    periodSeconds: p.periodSeconds,
    failureThreshold: p.failureThreshold,
  });
}

// Container name follows kubectl: pods use their own name, deployments the image name
function container(name: string, image: string, config: ContainerConfig): Manifest {
  return compact({
    name,
    image,
    env: config.env ? Object.entries(config.env).map(([key, value]) => ({ name: key, value })) : undefined,
    envFrom: config.envFrom?.map((cm) => ({ configMapRef: { name: cm } })),
    resources: config.resources ?? {},
    readinessProbe: probe(config.readinessProbe),
    livenessProbe: probe(config.livenessProbe),
    startupProbe: probe(config.startupProbe),
    volumeMounts: config.volumes?.map((v) => ({ name: v.name, mountPath: v.mountPath })),
  });
}

function podSpec(name: string, image: string, config: ContainerConfig): Manifest {
  return compact({
    containers: [container(name, image, config)],
    volumes: config.volumes?.map((v) => ({ name: v.name, persistentVolumeClaim: { claimName: v.claimName } })),
  });
}

const imageName = (image: string) => image.split("@")[0].split(":")[0].split("/").pop() ?? "app";

function policyRules(rules: NetworkPolicyRule[], direction: "from" | "to"): Manifest[] {
  return rules.map((rule) =>
    compact({
      [direction]: rule.peers.length > 0
        ? rule.peers.map((peer) =>
            compact({
              namespaceSelector: peer.namespaceSelector ? { matchLabels: peer.namespaceSelector } : undefined,
              podSelector: peer.podSelector ? { matchLabels: peer.podSelector } : undefined,
            })
          )
        : undefined,
      ports: rule.ports.length > 0 ? rule.ports.map((port) => ({ protocol: "TCP", port })) : undefined,
    })
  );
}

// The object "kubectl get -o yaml" would print, and that "kubectl apply" can read back
export function toManifest(state: ClusterState, r: Resource): Manifest {
  const meta = metadata(r);
  switch (r.kind) {
    case "Namespace":
      return { apiVersion: "v1", kind: "Namespace", metadata: meta, status: { phase: "Active" } };
    case "Node":
      return {
        apiVersion: "v1",
        kind: "Node",
        metadata: meta,
        spec: compact({
          unschedulable: r.schedulable ? undefined : true,
          taints: r.taints.length > 0
            ? r.taints.map((t) => {
                const [keyValue, effect] = t.split(":");
                const [key, value] = keyValue.split("=");
                return compact({ key, value, effect });
              })
            : undefined,
        }),
      };
    case "Pod":
      return { apiVersion: "v1", kind: "Pod", metadata: meta, spec: podSpec(r.name, r.image, r) };
    case "Deployment":
      return {
        apiVersion: "apps/v1",
        kind: "Deployment",
        metadata: meta,
        spec: {
          replicas: r.replicas,
          selector: { matchLabels: r.labels },
          template: { metadata: { labels: r.labels }, spec: podSpec(imageName(r.image), r.image, r) },
        },
      };
    case "Service":
      return {
        apiVersion: "v1",
        kind: "Service",
        metadata: meta,
        spec: compact({
          type: r.type,
          clusterIP: r.clusterIP,
          selector: r.selector,
          ports: [compact({ protocol: "TCP", port: r.port, targetPort: r.targetPort, nodePort: r.nodePort ?? undefined })],
        }),
      };
    case "ConfigMap":
      return { apiVersion: "v1", kind: "ConfigMap", metadata: meta, data: r.data };
    case "Secret":
      return {
        apiVersion: "v1",
        kind: "Secret",
        type: "Opaque",
        metadata: meta,
        data: Object.fromEntries(Object.entries(r.data).map(([k, v]) => [k, Buffer.from(v, "utf8").toString("base64")])),
      };
    case "ServiceAccount":
      return { apiVersion: "v1", kind: "ServiceAccount", metadata: meta };
    case "Role":
      return {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "Role",
        metadata: meta,
        rules: [{ apiGroups: [""], resources: r.resources, verbs: r.verbs }],
      };
    case "RoleBinding":
      return {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "RoleBinding",
        metadata: meta,
        roleRef: { apiGroup: "rbac.authorization.k8s.io", kind: "Role", name: r.role },
        subjects: r.subjects.map((subject) => {
          const [kind, ...rest] = subject.split(":");
          return kind === "ServiceAccount"
            ? { kind, namespace: rest[0], name: rest[1] }
            : { apiGroup: "rbac.authorization.k8s.io", kind: "User", name: rest.join(":") };
        }),
      };
    case "NetworkPolicy":
      return {
        apiVersion: "networking.k8s.io/v1",
        kind: "NetworkPolicy",
        metadata: meta,
        spec: compact({
          podSelector: Object.keys(r.podSelector).length > 0 ? { matchLabels: r.podSelector } : {},
          policyTypes: r.policyTypes,
          ingress: r.policyTypes.includes("Ingress") && r.ingress.length > 0 ? policyRules(r.ingress, "from") : undefined,
          egress: r.policyTypes.includes("Egress") && r.egress.length > 0 ? policyRules(r.egress, "to") : undefined,
        }),
      };
    case "ResourceQuota":
      return { apiVersion: "v1", kind: "ResourceQuota", metadata: meta, spec: { hard: r.hard } };
    case "StorageClass":
      return {
        apiVersion: "storage.k8s.io/v1",
        kind: "StorageClass",
        metadata: compact({
          ...meta,
          annotations: r.isDefault ? { "storageclass.kubernetes.io/is-default-class": "true" } : undefined,
        }),
        provisioner: r.provisioner,
        reclaimPolicy: r.reclaimPolicy,
        volumeBindingMode: r.volumeBindingMode,
        allowVolumeExpansion: r.allowVolumeExpansion,
      };
    case "PersistentVolume":
      return {
        apiVersion: "v1",
        kind: "PersistentVolume",
        metadata: meta,
        spec: compact({
          capacity: { storage: r.capacity },
          accessModes: r.accessModes,
          persistentVolumeReclaimPolicy: r.reclaimPolicy,
          storageClassName: r.storageClassName,
          hostPath: r.hostPath ? { path: r.hostPath } : undefined,
          claimRef: r.claimRef ? { namespace: r.claimRef.split("/")[0], name: r.claimRef.split("/")[1] } : undefined,
        }),
        status: { phase: r.phase },
      };
    case "PersistentVolumeClaim":
      return {
        apiVersion: "v1",
        kind: "PersistentVolumeClaim",
        metadata: meta,
        spec: compact({
          accessModes: r.accessModes,
          resources: { requests: { storage: r.request } },
          storageClassName: r.storageClassName ?? effectiveClassName(state, r),
          volumeName: r.volumeName ?? undefined,
        }),
        status: { phase: claimPhase(r) },
      };
  }
}
