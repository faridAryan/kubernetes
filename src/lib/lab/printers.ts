import { isRunning, listPods, matchesSelector, podStatus } from "./cluster";
import { podEvents, podIp, serviceEndpoints } from "./diagnostics";
import type { ClusterState, Kind, Labels, Resource } from "./types";

export const KIND_PREFIX: Record<Kind, string> = {
  Node: "node",
  Namespace: "namespace",
  Pod: "pod",
  Deployment: "deployment.apps",
  Service: "service",
  ConfigMap: "configmap",
  Secret: "secret",
  ServiceAccount: "serviceaccount",
  Role: "role.rbac.authorization.k8s.io",
  RoleBinding: "rolebinding.rbac.authorization.k8s.io",
};

export const KIND_PLURAL: Record<Kind, string> = {
  Node: "nodes",
  Namespace: "namespaces",
  Pod: "pods",
  Deployment: "deployments.apps",
  Service: "services",
  ConfigMap: "configmaps",
  Secret: "secrets",
  ServiceAccount: "serviceaccounts",
  Role: "roles.rbac.authorization.k8s.io",
  RoleBinding: "rolebindings.rbac.authorization.k8s.io",
};

export function table(rows: string[][]): string {
  const widths = rows[0].map((_, col) => Math.max(...rows.map((row) => row[col].length)));
  return rows
    .map((row) => row.map((cell, col) => cell.padEnd(widths[col])).join("   ").trimEnd())
    .join("\n");
}

export function age(createdAt: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - createdAt) / 1000));
  if (seconds < 120) return `${seconds}s`;
  if (seconds < 7200) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 172_800) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86_400)}d`;
}

function formatLabels(labels: Labels): string {
  const pairs = Object.entries(labels).map(([key, value]) => `${key}=${value}`);
  return pairs.length > 0 ? pairs.join(",") : "<none>";
}

function servicePorts(r: Extract<Resource, { kind: "Service" }>): string {
  return r.nodePort === null ? `${r.port}/TCP` : `${r.port}:${r.nodePort}/TCP`;
}

// Columns for `kubectl get <kind>`
function columns(state: ClusterState, r: Resource, wide: boolean): [string[], string[]] {
  switch (r.kind) {
    case "Node":
      return [
        ["NAME", "STATUS", "ROLES", "AGE", "VERSION"],
        [r.name, r.schedulable ? "Ready" : "Ready,SchedulingDisabled", r.roles, age(r.createdAt), r.version],
      ];
    case "Namespace":
      return [["NAME", "STATUS", "AGE"], [r.name, "Active", age(r.createdAt)]];
    case "Pod": {
      const base = [r.name, isRunning(r) ? "1/1" : "0/1", podStatus(r), "0", age(r.createdAt)];
      return wide
        ? [["NAME", "READY", "STATUS", "RESTARTS", "AGE", "IP", "NODE"], [...base, podIp(r), r.node ?? "<none>"]]
        : [["NAME", "READY", "STATUS", "RESTARTS", "AGE"], base];
    }
    case "Deployment": {
      const running = listPods(state).filter(
        (p) => p.namespace === r.namespace && p.owner === "ReplicaSet" && matchesSelector(p.labels, r.labels) && isRunning(p)
      ).length;
      return [
        ["NAME", "READY", "UP-TO-DATE", "AVAILABLE", "AGE"],
        [r.name, `${running}/${r.replicas}`, String(r.replicas), String(running), age(r.createdAt)],
      ];
    }
    case "Service":
      return [
        ["NAME", "TYPE", "CLUSTER-IP", "EXTERNAL-IP", "PORT(S)", "AGE"],
        [r.name, r.type, r.clusterIP, r.type === "LoadBalancer" ? "<pending>" : "<none>", servicePorts(r), age(r.createdAt)],
      ];
    case "ConfigMap":
      return [["NAME", "DATA", "AGE"], [r.name, String(Object.keys(r.data).length), age(r.createdAt)]];
    case "Secret":
      return [["NAME", "TYPE", "DATA", "AGE"], [r.name, "Opaque", String(Object.keys(r.data).length), age(r.createdAt)]];
    case "ServiceAccount":
      return [["NAME", "SECRETS", "AGE"], [r.name, "0", age(r.createdAt)]];
    case "Role":
      return [["NAME", "CREATED AT"], [r.name, new Date(r.createdAt).toISOString().slice(0, 19) + "Z"]];
    case "RoleBinding":
      return [["NAME", "ROLE", "AGE"], [r.name, `Role/${r.role}`, age(r.createdAt)]];
  }
}

export function printTable(
  state: ClusterState,
  resources: Resource[],
  options: { wide: boolean; showLabels: boolean; withNamespace: boolean; prefixKind: boolean }
): string {
  const rows = resources.map((r) => {
    const [header, values] = columns(state, r, options.wide);
    const name = options.prefixKind ? `${KIND_PREFIX[r.kind].split(".")[0]}/${values[0]}` : values[0];
    const namespace = "namespace" in r ? r.namespace : "";
    return {
      header: [
        ...(options.withNamespace ? ["NAMESPACE"] : []),
        ...header,
        ...(options.showLabels ? ["LABELS"] : []),
      ],
      values: [
        ...(options.withNamespace ? [namespace] : []),
        name,
        ...values.slice(1),
        ...(options.showLabels ? [formatLabels(r.labels)] : []),
      ],
    };
  });
  return table([rows[0].header, ...rows.map((row) => row.values)]);
}

export function describe(state: ClusterState, r: Resource): string {
  const lines: [string, string][] = [["Name", r.name]];
  if ("namespace" in r) lines.push(["Namespace", r.namespace]);
  lines.push(["Labels", formatLabels(r.labels)]);

  switch (r.kind) {
    case "Node":
      lines.push(["Roles", r.roles], ["Taints", r.taints.join(", ") || "<none>"], ["Unschedulable", String(r.schedulable === false)]);
      break;
    case "Pod":
      lines.push(["Node", r.node ?? "<none>"], ["Status", podStatus(r)], ["IP", podIp(r)], ["Image", r.image]);
      break;
    case "Deployment":
      lines.push(["Replicas", `${r.replicas} desired`], ["Selector", formatLabels(r.labels)], ["Image", r.image]);
      break;
    case "Service": {
      const endpoints = serviceEndpoints(state, r);
      lines.push(
        ["Type", r.type],
        ["IP", r.clusterIP],
        ["Port", `${r.port}/TCP`],
        ["TargetPort", `${r.targetPort}/TCP`],
        ["NodePort", r.nodePort === null ? "<none>" : `${r.nodePort}/TCP`],
        ["Selector", formatLabels(r.selector)],
        ["Endpoints", endpoints.length > 0 ? endpoints.join(",") : "<none>"]
      );
      break;
    }
    case "ConfigMap":
      lines.push(["Data", Object.entries(r.data).map(([k, v]) => `${k}=${v}`).join(", ") || "<none>"]);
      break;
    case "Secret":
      lines.push(["Data", Object.entries(r.data).map(([k, v]) => `${k}: ${v.length} bytes`).join(", ") || "<none>"]);
      break;
    case "Role":
      lines.push(["Resources", r.resources.join(", ")], ["Verbs", r.verbs.join(", ")]);
      break;
    case "RoleBinding":
      lines.push(["Role", `Role/${r.role}`], ["Subjects", r.subjects.join(", ")]);
      break;
  }

  const width = Math.max(...lines.map(([key]) => key.length)) + 2;
  const body = lines.map(([key, value]) => `${`${key}:`.padEnd(width)}${value}`).join("\n");
  if (r.kind !== "Pod") return body;

  const events = podEvents(state, r).map((e) => ["  " + e.type, e.reason, "5s", e.message]);
  return `${body}\nEvents:\n${table([["  Type", "Reason", "Age", "Message"], ...events])}`;
}
