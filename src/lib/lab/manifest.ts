import { parseAllDocuments } from "yaml";
import { z } from "zod";
import { KubectlError } from "./parser";
import type {
  ContainerConfig,
  Labels,
  NetworkPolicyPeer,
  NetworkPolicyRule,
  Resource,
} from "./types";

const labels = z.record(z.string(), z.coerce.string());
const quantity = z.union([z.string(), z.number()]).transform(String);

const metadata = z.object({
  name: z.string().regex(/^[a-z0-9]([-a-z0-9.]{0,61}[a-z0-9])?$/, "metadata.name must be a lowercase DNS name"),
  namespace: z.string().optional(),
  labels: labels.optional(),
});

// Only matchLabels is simulated
const selector = z
  .object({ matchLabels: labels.optional(), matchExpressions: z.array(z.unknown()).optional() })
  .refine((s) => s.matchExpressions === undefined, "matchExpressions aren't supported in this lab, use matchLabels")
  .transform((s): Labels => s.matchLabels ?? {});

const resourceList = z.object({ cpu: quantity.optional(), memory: quantity.optional() }).optional();

const container = z.object({
  name: z.string(),
  image: z.string().min(1),
  env: z.array(z.object({ name: z.string(), value: z.coerce.string().optional() })).optional(),
  envFrom: z.array(z.object({ configMapRef: z.object({ name: z.string() }).optional() })).optional(),
  resources: z.object({ requests: resourceList, limits: resourceList }).optional(),
});

const podSpec = z.object({ containers: z.array(container).min(1, "spec.containers must have at least one container") });

const port = z.union([z.number().int(), z.string()]).refine((p) => typeof p === "number", "named ports aren't supported in this lab, use numbers");

const peer = z
  .object({ podSelector: selector.optional(), namespaceSelector: selector.optional(), ipBlock: z.unknown().optional() })
  .refine((p) => p.ipBlock === undefined, "ipBlock isn't supported in this lab");

const policyRule = (direction: "from" | "to") =>
  z.object({
    [direction]: z.array(peer).optional(),
    ports: z.array(z.object({ port: port.optional(), protocol: z.string().optional() })).optional(),
  });

const manifests = {
  Namespace: z.object({ metadata }),
  ConfigMap: z.object({ metadata, data: z.record(z.string(), z.coerce.string()).optional() }),
  Secret: z.object({
    metadata,
    data: z.record(z.string(), z.string()).optional(),
    stringData: z.record(z.string(), z.coerce.string()).optional(),
  }),
  Pod: z.object({ metadata, spec: podSpec }),
  Deployment: z.object({
    metadata,
    spec: z.object({
      replicas: z.number().int().min(0).optional(),
      template: z.object({ metadata: z.object({ labels: labels.optional() }).optional(), spec: podSpec }),
    }),
  }),
  Service: z.object({
    metadata,
    spec: z.object({
      type: z.enum(["ClusterIP", "NodePort", "LoadBalancer"]).optional(),
      selector: labels.optional(),
      ports: z.array(z.object({ port: z.number().int(), targetPort: port.optional(), nodePort: z.number().int().optional() })).min(1),
    }),
  }),
  NetworkPolicy: z.object({
    metadata,
    spec: z.object({
      podSelector: selector,
      policyTypes: z.array(z.enum(["Ingress", "Egress"])).optional(),
      ingress: z.array(policyRule("from")).optional(),
      egress: z.array(policyRule("to")).optional(),
    }),
  }),
  ResourceQuota: z.object({ metadata, spec: z.object({ hard: z.record(z.string(), quantity) }) }),
};

type ManifestKind = keyof typeof manifests;

function containerConfig(spec: z.infer<typeof podSpec>): { image: string } & ContainerConfig {
  const [first] = spec.containers;
  const env = Object.fromEntries((first.env ?? []).map((e) => [e.name, e.value ?? ""]));
  const envFrom = (first.envFrom ?? []).flatMap((e) => (e.configMapRef ? [e.configMapRef.name] : []));
  return {
    image: first.image,
    ...(Object.keys(env).length > 0 ? { env } : {}),
    ...(envFrom.length > 0 ? { envFrom } : {}),
    ...(first.resources ? { resources: JSON.parse(JSON.stringify(first.resources)) } : {}),
  };
}

function rules(raw: Record<string, unknown>[] | undefined, direction: "from" | "to"): NetworkPolicyRule[] {
  return (raw ?? []).map((rule) => ({
    peers: ((rule[direction] as z.infer<typeof peer>[] | undefined) ?? []).map(
      (p): NetworkPolicyPeer => ({
        ...(p.podSelector ? { podSelector: p.podSelector } : {}),
        ...(p.namespaceSelector ? { namespaceSelector: p.namespaceSelector } : {}),
      })
    ),
    // A port entry without "port" means every port of that protocol
    ports: ((rule.ports as { port?: number | string }[] | undefined) ?? []).some((p) => p.port === undefined)
      ? []
      : ((rule.ports as { port: number }[] | undefined) ?? []).map((p) => p.port),
  }));
}

// A resource minus the fields the cluster fills in (createdAt, clusterIP, node...)
export type ParsedResource =
  | { kind: "Namespace"; name: string; labels: Labels }
  | { kind: Exclude<ManifestKind, "Namespace">; name: string; namespace: string; labels: Labels; fields: Record<string, unknown> };

function toResource(kind: ManifestKind, doc: unknown, defaultNamespace: string): ParsedResource {
  const parsed = manifests[kind].safeParse(doc);
  if (parsed.success === false) {
    const issue = parsed.error.issues[0];
    throw new KubectlError(`error: error validating data: ${issue.path.join(".")}: ${issue.message}`);
  }
  const data = parsed.data as { metadata: z.infer<typeof metadata>; spec?: Record<string, unknown> } & Record<string, unknown>;
  const { name, namespace = defaultNamespace, labels: metaLabels = {} } = data.metadata;

  if (kind === "Namespace") return { kind, name, labels: metaLabels };
  const base = { kind, name, namespace, labels: metaLabels };

  switch (kind) {
    case "ConfigMap":
      return { ...base, fields: { data: data.data ?? {} } };
    case "Secret": {
      const decoded = Object.fromEntries(
        Object.entries((data.data as Record<string, string>) ?? {}).map(([k, v]) => [k, Buffer.from(v, "base64").toString("utf8")])
      );
      return { ...base, fields: { data: { ...decoded, ...((data.stringData as Record<string, string>) ?? {}) } } };
    }
    case "Pod": {
      const spec = data.spec as z.infer<typeof podSpec>;
      return { ...base, fields: { ...containerConfig(spec) } };
    }
    case "Deployment": {
      const spec = data.spec as z.infer<typeof manifests.Deployment>["spec"];
      const podLabels = spec.template.metadata?.labels ?? { app: name };
      return { ...base, labels: podLabels, fields: { replicas: spec.replicas ?? 1, ...containerConfig(spec.template.spec) } };
    }
    case "Service": {
      const spec = data.spec as z.infer<typeof manifests.Service>["spec"];
      const [first] = spec.ports;
      return {
        ...base,
        fields: {
          type: spec.type ?? "ClusterIP",
          selector: spec.selector ?? {},
          port: first.port,
          targetPort: (first.targetPort as number | undefined) ?? first.port,
          nodePort: first.nodePort ?? null,
        },
      };
    }
    case "NetworkPolicy": {
      const spec = data.spec as z.infer<typeof manifests.NetworkPolicy>["spec"];
      const policyTypes = spec.policyTypes ?? ["Ingress", ...(spec.egress ? (["Egress"] as const) : [])];
      return {
        ...base,
        fields: {
          podSelector: spec.podSelector,
          policyTypes,
          ingress: rules(spec.ingress as Record<string, unknown>[] | undefined, "from"),
          egress: rules(spec.egress as Record<string, unknown>[] | undefined, "to"),
        },
      };
    }
    case "ResourceQuota":
      return { ...base, fields: { hard: (data.spec as { hard: Record<string, string> }).hard } };
  }
}

// Parses a (multi-document) YAML file into resources the simulator understands
export function parseManifests(text: string, file: string, defaultNamespace: string): ParsedResource[] {
  const documents = parseAllDocuments(text);
  const list = Array.isArray(documents) ? documents : [documents];

  return list
    .map((doc) => {
      if (doc.errors.length > 0) {
        throw new KubectlError(`error: error parsing ${file}: ${doc.errors[0].message.split("\n")[0]}`);
      }
      return doc.toJS() as unknown;
    })
    .filter((doc): doc is Record<string, unknown> => doc !== null && typeof doc === "object")
    .map((doc) => {
      const kind = doc.kind as string;
      if (typeof doc.apiVersion !== "string") throw new KubectlError(`error: error validating "${file}": apiVersion not set`);
      if (kind in manifests === false) {
        throw new KubectlError(`error: resource mapping not found for kind "${kind}" in "${file}": this lab supports ${Object.keys(manifests).join(", ")}`);
      }
      return toResource(kind as ManifestKind, doc, defaultNamespace);
    });
}

export type { Resource };
