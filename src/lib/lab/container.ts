import { appPort, probeKill, readinessError, type ProbeKill } from "./app";
import { findResource, podIp } from "./cluster";
import { isImagePullable } from "./images";
import { volumeProblem } from "./storage";
import { parseMemory } from "./units";
import type { ClusterState, PodResource } from "./types";

export type PodPhase = "Pending" | "ImagePullBackOff" | "CreateContainerConfigError" | "CrashLoopBackOff" | "Running";

export interface CrashReason {
  reason: "Error" | "OOMKilled";
  exitCode: number;
  log: string;
  probe?: ProbeKill; // set when the kubelet killed it for failing a probe
}

// ConfigMaps referenced with envFrom that don't exist yet
export function missingConfigMaps(state: ClusterState, pod: PodResource): string[] {
  return (pod.envFrom ?? []).filter((name) => findResource(state, "ConfigMap", name, pod.namespace) === undefined);
}

// Environment the container actually sees: envFrom first, explicit env wins
export function containerEnv(state: ClusterState, pod: PodResource): Record<string, string> {
  const fromConfigMaps = (pod.envFrom ?? []).map((name) => findResource(state, "ConfigMap", name, pod.namespace)?.data ?? {});
  return Object.assign({}, ...fromConfigMaps, pod.env ?? {});
}

// Why the container keeps exiting, or null when it runs fine
export function crashReason(state: ClusterState, pod: PodResource): CrashReason | null {
  const usage = parseMemory(pod.memoryUsage);
  const limit = parseMemory(pod.resources?.limits?.memory);
  if (usage !== null && limit !== null && usage > limit) {
    return {
      reason: "OOMKilled",
      exitCode: 137,
      log: "Loading image models...\nProcessing batch 1/40\nProcessing batch 2/40",
    };
  }

  const env = containerEnv(state, pod);
  const missing = (pod.requiredEnv ?? []).find((name) => (env[name] ?? "") === "");
  if (missing) {
    return {
      reason: "Error",
      exitCode: 1,
      log: `Starting ${pod.image.split(":")[0]} service...\nFATAL: required environment variable ${missing} is not set\nexit status 1`,
    };
  }
  const kill = probeKill(pod, podIp(pod));
  if (kill) {
    return {
      reason: "Error",
      exitCode: 137,
      log: `Starting ${pod.image.split("/").pop()?.split(":")[0]} on :${appPort(pod)}...\nListening\nReceived SIGTERM, shutting down`,
      probe: kill,
    };
  }
  return null;
}

export function podStatus(state: ClusterState, pod: PodResource): PodPhase {
  if (pod.node === null || volumeProblem(state, pod)) return "Pending";
  if (isImagePullable(pod.image) === false) return "ImagePullBackOff";
  if (missingConfigMaps(state, pod).length > 0) return "CreateContainerConfigError";
  if (crashReason(state, pod)) return "CrashLoopBackOff";
  return "Running";
}

export function isRunning(state: ClusterState, pod: PodResource): boolean {
  return podStatus(state, pod) === "Running";
}

// Running and passing its readiness probe: only these pods receive Service traffic
export function isReady(state: ClusterState, pod: PodResource): boolean {
  return isRunning(state, pod) && readinessError(pod, podIp(pod)) === null;
}
