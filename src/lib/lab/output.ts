import { stringify } from "yaml";
import { KubectlError } from "./parser";
import { KIND_PREFIX } from "./printers";
import { toManifest } from "./to-manifest";
import type { ClusterState, Resource } from "./types";

export type OutputFormat = "yaml" | "json" | "name";

export function isObjectFormat(format: string | undefined): format is OutputFormat {
  return format === "yaml" || format === "json" || format === "name";
}

export function assertKnownFormat(format: string | undefined) {
  const known = format === undefined || format === "wide" || isObjectFormat(format);
  if (known === false) {
    throw new KubectlError(`error: unable to match a printer suitable for the output format "${format}", allowed formats are: json,name,wide,yaml`);
  }
}

// -o yaml / -o json / -o name, single objects print bare and several print as a List
export function renderObjects(state: ClusterState, resources: Resource[], format: OutputFormat, single: boolean): string {
  if (format === "name") return resources.map((r) => `${KIND_PREFIX[r.kind]}/${r.name}`).join("\n");

  const objects = resources.map((r) => toManifest(state, r));
  const document = single && objects.length === 1
    ? objects[0]
    : { apiVersion: "v1", kind: "List", items: objects, metadata: { resourceVersion: "" } };
  return format === "json" ? JSON.stringify(document, null, 2) : stringify(document, { lineWidth: 0, aliasDuplicateObjects: false }).trimEnd();
}
