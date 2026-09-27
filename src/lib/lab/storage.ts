import { findResource, podCandidates } from "./cluster";
import { parseMemory } from "./units";
import type {
  ClusterState,
  PersistentVolumeClaimResource,
  PersistentVolumeResource,
  PodResource,
  StorageClassResource,
} from "./types";

export const NO_PROVISIONER = "kubernetes.io/no-provisioner";

const storageClasses = (state: ClusterState) =>
  state.resources.filter((r): r is StorageClassResource => r.kind === "StorageClass");
const volumes = (state: ClusterState) =>
  state.resources.filter((r): r is PersistentVolumeResource => r.kind === "PersistentVolume");
const claims = (state: ClusterState) =>
  state.resources.filter((r): r is PersistentVolumeClaimResource => r.kind === "PersistentVolumeClaim");

// null means "use the default StorageClass"; "" means "static PVs without a class only"
export function effectiveClassName(state: ClusterState, claim: PersistentVolumeClaimResource): string {
  if (claim.storageClassName !== null) return claim.storageClassName;
  return storageClasses(state).find((sc) => sc.isDefault)?.name ?? "";
}

export const claimPhase = (claim: PersistentVolumeClaimResource) => (claim.volumeName ? "Bound" : "Pending");

function usedByPod(state: ClusterState, claim: PersistentVolumeClaimResource): boolean {
  return podCandidates(state).some(
    (pod) => pod.namespace === claim.namespace && (pod.volumes ?? []).some((v) => v.claimName === claim.name)
  );
}

// Deterministic, UID-looking suffix for dynamically provisioned volumes (four independent FNV rounds)
function uid(text: string): string {
  const hex = [0x811c9dc5, 0x050c5d1f, 0x2166136b, 0x6b43a9b5]
    .map((seed) => {
      let hash = seed;
      for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193) >>> 0;
      return hash.toString(16).padStart(8, "0");
    })
    .join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

// What the PV controller does next for an unbound claim: static binding first,
// then dynamic provisioning, otherwise the claim stays Pending with a reason
type Plan =
  | { action: "bind"; volume: PersistentVolumeResource }
  | { action: "provision"; storageClass: StorageClassResource }
  | { action: "wait"; reason: string; message: string };

function plan(state: ClusterState, claim: PersistentVolumeClaimResource): Plan {
  const className = effectiveClassName(state, claim);
  const storageClass = storageClasses(state).find((sc) => sc.name === className);

  if (storageClass?.volumeBindingMode === "WaitForFirstConsumer" && usedByPod(state, claim) === false) {
    return { action: "wait", reason: "WaitForFirstConsumer", message: "waiting for first consumer to be created before binding" };
  }

  // storageClassName on PVs and PVCs is a matching label: no StorageClass object is needed for static binding
  const volume = matchingVolume(state, claim, className);
  if (volume) return { action: "bind", volume };

  if (className === "") {
    return { action: "wait", reason: "FailedBinding", message: "no persistent volumes available for this claim and no storage class is set" };
  }
  if (storageClass === undefined) {
    return { action: "wait", reason: "ProvisioningFailed", message: `storageclass.storage.k8s.io "${className}" not found` };
  }
  if (storageClass.provisioner === NO_PROVISIONER) {
    return { action: "wait", reason: "FailedBinding", message: `no persistent volumes available for this claim with storage class "${className}"` };
  }
  return { action: "provision", storageClass };
}

// Why a claim is still Pending, or null if it will bind on the next reconcile
export function pendingReason(state: ClusterState, claim: PersistentVolumeClaimResource): { reason: string; message: string } | null {
  if (claim.volumeName) return null;
  const next = plan(state, claim);
  return next.action === "wait" ? { reason: next.reason, message: next.message } : null;
}

// Smallest Available PV of the right class with enough capacity and every requested access mode
function matchingVolume(state: ClusterState, claim: PersistentVolumeClaimResource, className: string) {
  const needed = parseMemory(claim.request) ?? 0;
  return volumes(state)
    .filter(
      (pv) =>
        pv.phase === "Available" &&
        pv.storageClassName === className &&
        (parseMemory(pv.capacity) ?? 0) >= needed &&
        claim.accessModes.every((mode) => pv.accessModes.includes(mode))
    )
    .sort((a, b) => (parseMemory(a.capacity) ?? 0) - (parseMemory(b.capacity) ?? 0))[0];
}

// Runs after every change: binds claims, provisions volumes, reclaims volumes of deleted claims
export function reconcileStorage(state: ClusterState): void {
  const existingClaims = new Set(claims(state).map((c) => `${c.namespace}/${c.name}`));

  // Volumes whose claim is gone are deleted or kept as Released, per reclaim policy
  for (const pv of volumes(state)) {
    if (pv.phase !== "Bound" || pv.claimRef === null || existingClaims.has(pv.claimRef)) continue;
    if (pv.reclaimPolicy === "Delete") state.resources = state.resources.filter((r) => r !== pv);
    else pv.phase = "Released";
  }

  for (const claim of claims(state)) {
    if (claim.volumeName) continue;
    const next = plan(state, claim);
    if (next.action === "wait") continue;

    const claimRef = `${claim.namespace}/${claim.name}`;
    const volume: PersistentVolumeResource =
      next.action === "bind"
        ? next.volume
        : {
            kind: "PersistentVolume",
            name: `pvc-${uid(claimRef)}`,
            capacity: claim.request,
            accessModes: [...claim.accessModes],
            storageClassName: next.storageClass.name,
            reclaimPolicy: next.storageClass.reclaimPolicy,
            hostPath: null,
            claimRef: null,
            phase: "Available",
            labels: {},
            createdAt: Date.now(),
          };
    if (next.action === "provision") state.resources.push(volume);

    volume.claimRef = claimRef;
    volume.phase = "Bound";
    claim.volumeName = volume.name;
  }
}

// A pod can't be scheduled until every claim it mounts exists and is bound
export function volumeProblem(state: ClusterState, pod: PodResource): string | null {
  for (const volume of pod.volumes ?? []) {
    const claim = findResource(state, "PersistentVolumeClaim", volume.claimName, pod.namespace);
    if (claim === undefined) return `persistentvolumeclaim "${volume.claimName}" not found`;
    if (claim.volumeName === null) return "pod has unbound immediate PersistentVolumeClaims";
  }
  return null;
}

export function boundCapacity(state: ClusterState, claim: PersistentVolumeClaimResource): string {
  if (claim.volumeName === null) return "";
  return findResource(state, "PersistentVolume", claim.volumeName)?.capacity ?? "";
}
