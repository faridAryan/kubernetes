import { findResource, namespaceLabels } from "./cluster";
import { getExisting, requireNamespace, resolveTarget, type Context } from "./context";
import { parseManifests, parseObjects, type ParsedResource } from "./manifest";
import { KubectlError, getFlag } from "./parser";
import { KIND_PREFIX } from "./printers";
import { effectiveClassName } from "./storage";
import { toManifest } from "./to-manifest";
import { stableStringify } from "./stable";
import { parseMemory } from "./units";
import { pickNode } from "./workload-commands";
import { APP_BEHAVIOUR_FIELDS, type ContainerConfig, type Resource } from "./types";

type Mode = "apply" | "create" | "patch";

function readFile(ctx: Context): { file: string; text: string } {
  const file = getFlag(ctx.parsed, "--filename");
  if (file === undefined) throw new KubectlError("error: must specify -f <file>");
  const text = ctx.state.files?.[file];
  if (text === undefined) {
    throw new KubectlError(`error: the path "${file}" does not exist. Write it in the manifest editor or save it with "> ${file}".`);
  }
  return { file, text };
}

function nextClusterIp(ctx: Context): string {
  ctx.state.nextId += 1;
  const id = ctx.state.nextId;
  return `10.96.${Math.floor(id / 200) + 1}.${(id % 200) + 10}`;
}

// Hidden app behaviour (listen port, start-up time...) belongs to the image, not the YAML
function appBehaviour(existing: Resource | undefined): Partial<ContainerConfig> {
  if (existing?.kind !== "Deployment" && existing?.kind !== "Pod") return {};
  return Object.fromEntries(
    APP_BEHAVIOUR_FIELDS.filter((key) => existing[key] !== undefined).map((key) => [key, existing[key]])
  );
}

const withoutMeta = (r: Resource) => stableStringify({ ...r, createdAt: 0, labels: {} });

// Turns a parsed manifest into a full cluster resource, enforcing the API server's update rules
function build(ctx: Context, parsed: ParsedResource, existing: Resource | undefined): Resource {
  const createdAt = existing?.createdAt ?? Date.now();
  const base = { name: parsed.name, labels: parsed.labels, createdAt };
  const namespaced = { ...base, namespace: parsed.namespace as string };
  // Shapes were validated by zod in parseManifests
  const fields = parsed.fields;

  switch (parsed.kind) {
    case "Namespace":
      return { kind: "Namespace", ...base, labels: namespaceLabels(parsed.name, parsed.labels) };

    case "Deployment": {
      const previous = existing?.kind === "Deployment" ? existing : undefined;
      const image = fields.image as string;
      const revisions = previous ? [...previous.revisions, ...(previous.image === image ? [] : [image])] : [image];
      return { kind: "Deployment", ...namespaced, ...fields, ...appBehaviour(existing), revisions } as Resource;
    }

    case "Pod": {
      const previous = existing?.kind === "Pod" ? existing : undefined;
      const pod = {
        kind: "Pod",
        ...namespaced,
        ...fields,
        ...appBehaviour(existing),
        node: previous ? previous.node : pickNode(ctx),
        owner: previous?.owner ?? null,
      } as Resource;
      // A running pod's spec is immutable apart from the image
      if (previous && withoutMeta({ ...pod, image: previous.image } as Resource) !== withoutMeta(previous)) {
        throw new KubectlError(
          `The Pod "${parsed.name}" is invalid: spec: Forbidden: pod updates may not change fields other than \`spec.containers[*].image\`, \`spec.activeDeadlineSeconds\`, \`spec.tolerations\`. Delete and recreate the Pod instead.`
        );
      }
      return pod;
    }

    case "Service": {
      const previous = existing?.kind === "Service" ? existing : undefined;
      const type = fields.type as string;
      const nodePort = type === "ClusterIP"
        ? null
        : (fields.nodePort as number | null) ?? previous?.nodePort ?? 30000 + ((ctx.state.nextId * 7919) % 2768);
      return { kind: "Service", ...namespaced, ...fields, nodePort, clusterIP: previous?.clusterIP ?? nextClusterIp(ctx) } as Resource;
    }

    case "StorageClass": {
      if (existing?.kind === "StorageClass" && existing.provisioner !== fields.provisioner) {
        throw new KubectlError(`The StorageClass "${parsed.name}" is invalid: provisioner: Forbidden: updates to provisioner are forbidden.`);
      }
      return { kind: "StorageClass", ...base, ...fields } as Resource;
    }

    case "PersistentVolume": {
      const previous = existing?.kind === "PersistentVolume" ? existing : undefined;
      return {
        kind: "PersistentVolume",
        ...base,
        ...fields,
        claimRef: previous?.claimRef ?? null,
        phase: previous?.phase ?? "Available",
      } as Resource;
    }

    case "PersistentVolumeClaim": {
      const previous = existing?.kind === "PersistentVolumeClaim" ? existing : undefined;
      const claim = { kind: "PersistentVolumeClaim", ...namespaced, ...fields, volumeName: previous?.volumeName ?? null } as Resource;
      return previous && claim.kind === "PersistentVolumeClaim" ? updateClaim(ctx, previous, claim) : claim;
    }

    default:
      return { kind: parsed.kind, ...namespaced, ...fields } as Resource;
  }
}

// Only spec.resources.requests.storage may change on a claim, and only upwards when the class allows expansion
function updateClaim(
  ctx: Context,
  previous: Extract<Resource, { kind: "PersistentVolumeClaim" }>,
  next: Extract<Resource, { kind: "PersistentVolumeClaim" }>
): Resource {
  const sameClass = effectiveClassName(ctx.state, previous) === effectiveClassName(ctx.state, next);
  const sameModes = JSON.stringify(previous.accessModes) === JSON.stringify(next.accessModes);
  if (sameClass === false || sameModes === false) {
    throw new KubectlError(
      `The PersistentVolumeClaim "${next.name}" is invalid: spec: Forbidden: spec is immutable after creation except resources.requests and volumeAttributesClassName for bound claims`
    );
  }

  const before = parseMemory(previous.request) ?? 0;
  const after = parseMemory(next.request) ?? 0;
  if (after === before) return next;
  if (after < before) {
    throw new KubectlError(`The PersistentVolumeClaim "${next.name}" is invalid: spec.resources.requests.storage: Forbidden: field can not be less than previous value`);
  }

  const storageClass = findResource(ctx.state, "StorageClass", effectiveClassName(ctx.state, previous));
  if (previous.volumeName === null || storageClass?.allowVolumeExpansion !== true) {
    throw new KubectlError(
      `persistentvolumeclaims "${next.name}" is forbidden: only dynamically provisioned pvc can be resized and the storageclass that provisions the pvc must support resize`
    );
  }
  // The external resizer grows the volume
  const volume = findResource(ctx.state, "PersistentVolume", previous.volumeName);
  if (volume) volume.capacity = next.request;
  return next;
}

const sameContent = (a: Resource, b: Resource) =>
  stableStringify({ ...a, createdAt: 0 }) === stableStringify({ ...b, createdAt: 0 });

function applyParsed(ctx: Context, items: ParsedResource[], mode: Mode, source: string): string {
  if (items.length === 0) throw new KubectlError(`error: no objects passed to ${mode}`);

  return items
    .map((item) => {
      if (item.namespace) requireNamespace(ctx.state, item.namespace);
      const existing = findResource(ctx.state, item.kind, item.name, item.namespace);
      const prefix = `${KIND_PREFIX[item.kind]}/${item.name}`;

      if (existing && mode === "create") {
        throw new KubectlError(`Error from server (AlreadyExists): error when creating "${source}": ${item.kind.toLowerCase()}s "${item.name}" already exists`);
      }

      const resource = build(ctx, item, existing);
      if (existing === undefined) {
        ctx.state.resources.push(resource);
        return `${prefix} created`;
      }
      if (sameContent(existing, resource)) return mode === "patch" ? `${prefix} patched (no change)` : `${prefix} unchanged`;
      ctx.state.resources = ctx.state.resources.map((r) => (r === existing ? resource : r));
      return `${prefix} ${mode === "patch" ? "patched" : "configured"}`;
    })
    .join("\n");
}

// kubectl apply -f / create -f
export function applyFile(ctx: Context, mode: "apply" | "create"): string {
  const { file, text } = readFile(ctx);
  return applyParsed(ctx, parseManifests(text, file, ctx.namespace), mode, file);
}

// RFC 7386 JSON merge patch: objects merge, null deletes, everything else replaces
function mergePatch(target: unknown, patch: unknown): unknown {
  if (patch === null || typeof patch !== "object" || Array.isArray(patch)) return patch;
  const result: Record<string, unknown> =
    target !== null && typeof target === "object" && Array.isArray(target) === false ? { ...(target as Record<string, unknown>) } : {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) delete result[key];
    else result[key] = mergePatch(result[key], value);
  }
  return result;
}

// kubectl patch <kind> <name> -p '<json>' (merge semantics)
export function patchCommand(ctx: Context): string {
  const { kind, name } = resolveTarget(ctx.args);
  const patchText = getFlag(ctx.parsed, "--patch");
  if (patchText === undefined) throw new KubectlError("error: must specify --patch or -p");
  if (getFlag(ctx.parsed, "--type") === "json") {
    throw new KubectlError('error: --type=json patches aren\'t supported in this lab; use a merge patch like -p \'{"spec":{"replicas":3}}\'');
  }

  let patch: unknown;
  try {
    patch = JSON.parse(patchText);
  } catch {
    throw new KubectlError(`error: unable to parse "${patchText}": invalid JSON. Wrap the patch in single quotes.`);
  }

  const existing = getExisting(ctx, kind, name);
  const merged = mergePatch(toManifest(ctx.state, existing), patch) as Record<string, unknown>;
  return applyParsed(ctx, parseObjects([merged], `${kind.toLowerCase()}/${name}`, ctx.namespace), "patch", "patch");
}

// kubectl delete -f
export function deleteFile(ctx: Context): string {
  const { file, text } = readFile(ctx);
  return parseManifests(text, file, ctx.namespace)
    .map((item) => {
      const existing = findResource(ctx.state, item.kind, item.name, item.namespace);
      if (existing === undefined) {
        throw new KubectlError(`Error from server (NotFound): error when deleting "${file}": ${item.kind.toLowerCase()}s "${item.name}" not found`);
      }
      ctx.state.resources = ctx.state.resources.filter((r) => r !== existing);
      return `${KIND_PREFIX[item.kind].split(".")[0]} "${item.name}" deleted`;
    })
    .join("\n");
}

