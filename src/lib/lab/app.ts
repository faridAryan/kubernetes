import type { PodResource, Probe } from "./types";

const imageName = (image: string) => image.split("@")[0].split(":")[0].split("/").pop() ?? "";

// Port the app listens on; 0 = doesn't listen (e.g. busybox running sleep)
export function appPort(pod: PodResource): number {
  if (pod.listenPort !== undefined) return pod.listenPort;
  const name = imageName(pod.image);
  const defaults: Record<string, number> = { nginx: 80, httpd: 80, postgres: 5432, redis: 6379, coredns: 53, busybox: 0 };
  return defaults[name] ?? 8080;
}

// HTTP paths that answer 200
export function appPaths(pod: PodResource): string[] {
  if (pod.httpPaths) return pod.httpPaths;
  const name = imageName(pod.image);
  return name === "nginx" || name === "httpd" ? ["/", "/index.html"] : ["/", "/healthz", "/ready"];
}

const startupSeconds = (pod: PodResource) => pod.startupSeconds ?? 2;

// How long the kubelet keeps trying before it gives up on a probe
const probeWindow = (probe: Probe) =>
  (probe.initialDelaySeconds ?? 0) + (probe.failureThreshold ?? 3) * (probe.periodSeconds ?? 10);

function describeTarget(probe: Probe): { port: number; url: string } {
  if (probe.httpGet) return { port: probe.httpGet.port, url: `http://{ip}:${probe.httpGet.port}${probe.httpGet.path}` };
  return { port: probe.tcpSocket?.port ?? 0, url: `{ip}:${probe.tcpSocket?.port ?? 0}` };
}

// Why a probe fails against a running app, or null when it passes
export function probeError(pod: PodResource, probe: Probe, ip: string): string | null {
  const { port, url } = describeTarget(probe);
  const address = url.replace("{ip}", ip);
  if (port !== appPort(pod)) {
    return probe.httpGet
      ? `Get "${address}": dial tcp ${ip}:${port}: connect: connection refused`
      : `dial tcp ${ip}:${port}: connect: connection refused`;
  }
  if (probe.httpGet && appPaths(pod).includes(probe.httpGet.path) === false) {
    return "HTTP probe failed with statuscode: 404";
  }
  return null;
}

export interface ProbeKill {
  probe: "Liveness" | "Startup";
  message: string;
}

// The kubelet restarts the container when liveness (or startup) gives up before the app is healthy
export function probeKill(pod: PodResource, ip: string): ProbeKill | null {
  const notListeningYet = `Get "http://${ip}:${appPort(pod)}": dial tcp ${ip}:${appPort(pod)}: connect: connection refused`;

  if (pod.startupProbe) {
    const error = probeError(pod, pod.startupProbe, ip);
    if (error) return { probe: "Startup", message: error };
    if (probeWindow(pod.startupProbe) < startupSeconds(pod)) return { probe: "Startup", message: notListeningYet };
  }

  if (pod.livenessProbe) {
    const error = probeError(pod, pod.livenessProbe, ip);
    if (error) return { probe: "Liveness", message: error };
    // Without a startup probe, liveness must wait long enough for a slow app to start
    if (pod.startupProbe === undefined && probeWindow(pod.livenessProbe) < startupSeconds(pod)) {
      return { probe: "Liveness", message: notListeningYet };
    }
  }
  return null;
}

export function readinessError(pod: PodResource, ip: string): string | null {
  return pod.readinessProbe ? probeError(pod, pod.readinessProbe, ip) : null;
}
