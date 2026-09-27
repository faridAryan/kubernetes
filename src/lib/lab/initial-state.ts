import { DAY_MS, baseResources, namespaceLabels } from "./cluster";
import { reconcileStorage } from "./storage";
import type { ClusterState, Resource, ResourceSeed } from "./types";

const resourceKey = (r: Resource) => `${r.kind}/${"namespace" in r ? r.namespace : ""}/${r.name}`;

// Base 3-node cluster plus the resources a lab starts with.
// A seed with the same kind/namespace/name replaces the base resource (e.g. a cordoned node).
export function createInitialState(seeds: ResourceSeed[]): ClusterState {
  const createdAt = Date.now() - 5 * DAY_MS;
  const extra = seeds.map((seed) => {
    const resource = { labels: {}, ...seed, createdAt } as Resource;
    if (resource.kind === "Namespace") resource.labels = namespaceLabels(resource.name, resource.labels);
    return resource;
  });
  const overridden = new Set(extra.map(resourceKey));
  const base = baseResources(createdAt).filter((r) => overridden.has(resourceKey(r)) === false);
  const state: ClusterState = { resources: [...base, ...extra], nextId: 1 };
  reconcileStorage(state);
  return state;
}
