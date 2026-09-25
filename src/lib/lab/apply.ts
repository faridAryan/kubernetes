import { CLUSTER_SCOPED, findResource, namespaceLabels } from "./cluster";
import { requireNamespace, type Context } from "./context";
import { parseManifests, type ParsedResource } from "./manifest";
import { KubectlError, getFlag } from "./parser";
import { KIND_PREFIX } from "./printers";
import { pickNode } from "./workload-commands";
import type { Resource } from "./types";

function readFile(ctx: Context): { file: string; text: string } {
  const file = getFlag(ctx.parsed, "--filename");
  if (file === undefined) throw new KubectlError("error: must specify -f <file>");
  const text = ctx.state.files?.[file];
  if (text === undefined) {
    throw new KubectlError(`error: the path "${file}" does not exist. Write it in the manifest editor above the terminal first.`);
  }
  return { file, text };
}

function nextClusterIp(ctx: Context): string {
  ctx.state.nextId += 1;
  const id = ctx.state.nextId;
  return `10.96.${Math.floor(id / 200) + 1}.${(id % 200) + 10}`;
}

// Turns a parsed manifest into a full cluster resource, keeping server-assigned fields on updates
function build(ctx: Context, parsed: ParsedResource, existing: Resource | undefined): Resource {
  const createdAt = existing?.createdAt ?? Date.now();
  if (parsed.kind === "Namespace") {
    return { kind: "Namespace", name: parsed.name, labels: namespaceLabels(parsed.name, parsed.labels), createdAt };
  }

  const base = { name: parsed.name, namespace: parsed.namespace, labels: parsed.labels, createdAt };
  // Shapes were validated by zod in parseManifests
  const fields = parsed.fields;

  switch (parsed.kind) {
    case "Deployment": {
      const previous = existing?.kind === "Deployment" ? existing : undefined;
      const image = fields.image as string;
      const revisions = previous ? [...previous.revisions, ...(previous.image === image ? [] : [image])] : [image];
      return { kind: "Deployment", ...base, ...fields, revisions } as Resource;
    }
    case "Pod": {
      const node = existing?.kind === "Pod" ? existing.node : pickNode(ctx);
      return { kind: "Pod", ...base, ...fields, node, owner: null } as Resource;
    }
    case "Service": {
      const previous = existing?.kind === "Service" ? existing : undefined;
      const type = fields.type as string;
      const nodePort = type === "ClusterIP" ? null : (fields.nodePort as number | null) ?? previous?.nodePort ?? 30000 + ((ctx.state.nextId * 7919) % 2768);
      return { kind: "Service", ...base, ...fields, nodePort, clusterIP: previous?.clusterIP ?? nextClusterIp(ctx) } as Resource;
    }
    default:
      return { kind: parsed.kind, ...base, ...fields } as Resource;
  }
}

const sameContent = (a: Resource, b: Resource) =>
  JSON.stringify({ ...a, createdAt: 0 }) === JSON.stringify({ ...b, createdAt: 0 });

// kubectl apply -f / create -f
export function applyFile(ctx: Context, mode: "apply" | "create"): string {
  const { file, text } = readFile(ctx);
  const parsed = parseManifests(text, file, ctx.namespace);
  if (parsed.length === 0) throw new KubectlError(`error: no objects passed to ${mode}`);

  return parsed
    .map((item) => {
      const namespace = item.kind === "Namespace" ? undefined : item.namespace;
      if (namespace) requireNamespace(ctx.state, namespace);

      const existing = findResource(ctx.state, item.kind, item.name, namespace);
      const prefix = `${KIND_PREFIX[item.kind]}/${item.name}`;
      if (existing && mode === "create") {
        throw new KubectlError(`Error from server (AlreadyExists): error when creating "${file}": ${item.kind.toLowerCase()}s "${item.name}" already exists`);
      }

      const resource = build(ctx, item, existing);
      if (existing === undefined) {
        ctx.state.resources.push(resource);
        return `${prefix} created`;
      }
      if (sameContent(existing, resource)) return `${prefix} unchanged`;
      ctx.state.resources = ctx.state.resources.map((r) => (r === existing ? resource : r));
      return `${prefix} configured`;
    })
    .join("\n");
}

// kubectl delete -f
export function deleteFile(ctx: Context): string {
  const { file, text } = readFile(ctx);
  return parseManifests(text, file, ctx.namespace)
    .map((item) => {
      const namespace = CLUSTER_SCOPED.includes(item.kind) || item.kind === "Namespace" ? undefined : item.namespace;
      const existing = findResource(ctx.state, item.kind, item.name, namespace);
      if (existing === undefined) {
        throw new KubectlError(`Error from server (NotFound): error when deleting "${file}": ${item.kind.toLowerCase()}s "${item.name}" not found`);
      }
      ctx.state.resources = ctx.state.resources.filter((r) => r !== existing);
      return `${KIND_PREFIX[item.kind].split(".")[0]} "${item.name}" deleted`;
    })
    .join("\n");
}
