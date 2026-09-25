import { containerEnv } from "./container";
import { connect, canResolveDns, findServiceByName, type ConnectResult } from "./network";
import { KubectlError } from "./parser";
import type { ClusterState, PodResource } from "./types";

type Tool = "curl" | "wget" | "nc" | "nslookup" | "env" | "printenv" | "hostname" | "cat" | "sh";

const BUSYBOX_TOOLS: Tool[] = ["wget", "nc", "nslookup", "env", "printenv", "hostname", "cat", "sh"];
const DEBIAN_TOOLS: Tool[] = ["curl", "env", "printenv", "hostname", "cat", "sh"];
const ALL_TOOLS: Tool[] = ["curl", ...BUSYBOX_TOOLS];

// Roughly what each image ships with, so "curl: not found" in busybox feels real
function toolsFor(image: string): Tool[] {
  const name = image.split("@")[0].split(":")[0].split("/").pop() ?? "";
  if (name === "busybox" || image.includes("alpine")) return BUSYBOX_TOOLS;
  if (name === "nginx" || name === "httpd" || name === "postgres" || name === "node") return DEBIAN_TOOLS;
  return ALL_TOOLS;
}

function httpBody(target: PodResource): string {
  if (target.image.startsWith("nginx")) {
    return "<!DOCTYPE html>\n<html>\n<head>\n<title>Welcome to nginx!</title>\n</head>\n<body>\n<h1>Welcome to nginx!</h1>\n</body>\n</html>";
  }
  if (target.image.startsWith("httpd")) return "<html><body><h1>It works!</h1></body></html>";
  return '{"status":"ok"}';
}

const isHttpServer = (pod: PodResource) => pod.image.startsWith("postgres") === false && pod.image.startsWith("redis") === false;

function parseUrl(raw: string): { host: string; port: number } {
  const match = raw.match(/^(?:https?:\/\/)?([^/:]+)(?::(\d+))?/);
  if (match === null) throw new KubectlError(`curl: (3) URL rejected: Malformed input to a URL function`);
  return { host: match[1], port: match[2] ? Number(match[2]) : raw.startsWith("https") ? 443 : 80 };
}

// Value of "-m 2", "--max-time=2", "-T 2", "-w 2" style options
function option(args: string[], names: string[]): string | undefined {
  for (let i = 0; i < args.length; i++) {
    const [name, inline] = args[i].split("=");
    if (names.includes(name)) return inline ?? args[i + 1];
  }
  return undefined;
}

const positional = (args: string[], valueFlags: string[]) =>
  args.filter((arg, i) => arg.startsWith("-") === false && valueFlags.includes(args[i - 1]) === false);

function curl(state: ClusterState, pod: PodResource, args: string[]): string {
  const url = positional(args, ["-m", "--max-time", "--connect-timeout", "-o", "-H", "-X"])[0];
  if (url === undefined) throw new KubectlError("curl: try 'curl --help' for more information");
  const { host, port } = parseUrl(url);
  const timeoutMs = Number(option(args, ["-m", "--max-time", "--connect-timeout"]) ?? 5) * 1000;
  const result = connect(state, pod, host, port);

  switch (result.status) {
    case "open":
      if (result.target && isHttpServer(result.target)) return httpBody(result.target);
      throw new KubectlError("curl: (52) Empty reply from server\ncommand terminated with exit code 52");
    case "timeout":
      throw new KubectlError(`curl: (28) Connection timed out after ${timeoutMs + 1} milliseconds\ncommand terminated with exit code 28`);
    case "refused":
      throw new KubectlError(`curl: (7) Failed to connect to ${host} port ${port} after 3 ms: Couldn't connect to server\ncommand terminated with exit code 7`);
    default:
      throw new KubectlError(`curl: (6) Could not resolve host: ${host}\ncommand terminated with exit code 6`);
  }
}

function wget(state: ClusterState, pod: PodResource, args: string[]): string {
  const url = positional(args, ["-T", "-O", "-U"])[0];
  if (url === undefined) throw new KubectlError("BusyBox wget: missing URL");
  const { host, port } = parseUrl(url);
  const toStdout = args.some((a) => a === "-O-" || a === "-qO-" || (a === "-O" && args[args.indexOf(a) + 1] === "-"));
  const quiet = args.some((a) => a.startsWith("-q"));
  const result = connect(state, pod, host, port);

  switch (result.status) {
    case "open": {
      const target = result.target as PodResource;
      if (isHttpServer(target) === false) throw new KubectlError("wget: error getting response: Connection reset by peer\ncommand terminated with exit code 1");
      if (toStdout) return quiet ? httpBody(target) : `Connecting to ${host} (${result.ip}:${port})\nwriting to stdout\n${httpBody(target)}\n-                    100% |********************************|   615  0:00:00 ETA\nwritten to stdout`;
      return quiet ? "" : `Connecting to ${host} (${result.ip}:${port})\nsaving to 'index.html'\nindex.html           100% |********************************|   615  0:00:00 ETA\n'index.html' saved`;
    }
    case "timeout":
      throw new KubectlError("wget: download timed out\ncommand terminated with exit code 1");
    case "refused":
      throw new KubectlError(`wget: can't connect to remote host (${result.ip}): Connection refused\ncommand terminated with exit code 1`);
    default:
      throw new KubectlError(`wget: bad address '${host}'\ncommand terminated with exit code 1`);
  }
}

function nc(state: ClusterState, pod: PodResource, args: string[]): string {
  const [host, portText] = positional(args, ["-w"]);
  const port = Number(portText);
  if (host === undefined || Number.isInteger(port) === false) throw new KubectlError("usage: nc -zv -w 2 <host> <port>");
  const result: ConnectResult = connect(state, pod, host, port);

  switch (result.status) {
    case "open":
      return `${host} (${result.ip}:${port}) open`;
    case "timeout":
      throw new KubectlError(`nc: ${host} (${result.ip}:${port}): Connection timed out\ncommand terminated with exit code 1`);
    case "refused":
      throw new KubectlError(`nc: ${host} (${result.ip}:${port}): Connection refused\ncommand terminated with exit code 1`);
    default:
      throw new KubectlError(`nc: bad address '${host}'\ncommand terminated with exit code 1`);
  }
}

function nslookup(state: ClusterState, pod: PodResource, args: string[]): string {
  const host = positional(args, [])[0];
  if (host === undefined) throw new KubectlError("usage: nslookup <host>");
  if (canResolveDns(state, pod) === false) {
    throw new KubectlError(";; connection timed out; no servers could be reached\n\ncommand terminated with exit code 1");
  }
  const service = findServiceByName(state, pod, host);
  const fqdn = host.includes(".svc") ? host : `${host.split(".")[0]}.${host.split(".")[1] ?? pod.namespace}.svc.cluster.local`;
  if (service === undefined) {
    throw new KubectlError(`Server:\t\t10.96.0.10\nAddress:\t10.96.0.10:53\n\n** server can't find ${fqdn}: NXDOMAIN\n\ncommand terminated with exit code 1`);
  }
  return `Server:\t\t10.96.0.10\nAddress:\t10.96.0.10:53\n\nName:\t${fqdn}\nAddress: ${service.clusterIP}`;
}

// Runs a command inside a running container of the pod
export function runInContainer(state: ClusterState, pod: PodResource, argv: string[]): string {
  const [program, ...args] = argv;
  if (program === undefined) throw new KubectlError("error: you must specify at least one command for the container");

  // Unwrap: kubectl exec pod -- sh -c "wget -qO- web"
  if ((program === "sh" || program === "/bin/sh" || program === "bash") && args[0] === "-c" && args[1]) {
    return runInContainer(state, pod, args[1].split(/\s+/).filter(Boolean));
  }

  const tool = program.split("/").pop() as Tool;
  if (toolsFor(pod.image).includes(tool) === false) {
    throw new KubectlError(
      `OCI runtime exec failed: exec failed: unable to start container process: exec: "${program}": executable file not found in $PATH: unknown\ncommand terminated with exit code 126`
    );
  }

  switch (tool) {
    case "curl":
      return curl(state, pod, args);
    case "wget":
      return wget(state, pod, args);
    case "nc":
      return nc(state, pod, args);
    case "nslookup":
      return nslookup(state, pod, args);
    case "hostname":
      return pod.name;
    case "env":
    case "printenv": {
      const env = { HOSTNAME: pod.name, KUBERNETES_SERVICE_HOST: "10.96.0.1", KUBERNETES_SERVICE_PORT: "443", ...containerEnv(state, pod) };
      return Object.entries(env).map(([key, value]) => `${key}=${value}`).join("\n");
    }
    case "cat":
      if (args[0] === "/etc/resolv.conf") {
        return `search ${pod.namespace}.svc.cluster.local svc.cluster.local cluster.local\nnameserver 10.96.0.10\noptions ndots:5`;
      }
      throw new KubectlError(`cat: can't open '${args[0] ?? ""}': No such file or directory\ncommand terminated with exit code 1`);
    default:
      throw new KubectlError("error: interactive shells aren't available in this lab; run a single command instead");
  }
}
