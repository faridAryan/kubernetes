import { listPods, matchesSelector } from "./cluster";
import { crashReason, isRunning, podStatus } from "./container";
import { podEvents, podIp, serviceEndpoints } from "./diagnostics";
import { QUOTA_KEYS, quotaUsed } from "./quota";
import { formatQuantity } from "./units";
import type { ClusterState, ContainerConfig, Kind, Labels, NetworkPolicyRule, Resource } from "./types";

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
  NetworkPolicy: "networkpolicy.networking.k8s.io",
  ResourceQuota: "resourcequota",
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
  NetworkPolicy: "networkpolicies.networking.k8s.io",
  ResourceQuota: "resourcequotas",
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
      const base = [r.name, isRunning(state, r) ? "1/1" : "0/1", podStatus(state, r), podStatus(state, r) === "CrashLoopBackOff" ? "5 (40s ago)" : "0", age(r.createdAt)];
      return wide
        ? [["NAME", "READY", "STATUS", "RESTARTS", "AGE", "IP", "NODE"], [...base, podIp(r), r.node ?? "<none>"]]
        : [["NAME", "READY", "STATUS", "RESTARTS", "AGE"], base];
    }
    case "Deployment": {
      const running = listPods(state).filter(
        (p) => p.namespace === r.namespace && p.owner === "ReplicaSet" && matchesSelector(p.labels, r.labels) && isRunning(state, p)
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
    case "NetworkPolicy":
      return [["NAME", "POD-SELECTOR", "AGE"], [r.name, formatSelector(r.podSelector), age(r.createdAt)]];
    case "ResourceQuota": {
      const used = quotaUsed(listPods(state), r);
      const pair = (key: string) => `${key}: ${formatQuantity(key, used[key] ?? 0)}/${r.hard[key]}`;
      const keys = QUOTA_KEYS.filter((key) => key in r.hard);
      return [
        ["NAME", "AGE", "REQUEST", "LIMIT"],
        [
          r.name,
          age(r.createdAt),
          keys.filter((key) => key.startsWith("limits.") === false).map(pair).join(", "),
          keys.filter((key) => key.startsWith("limits.")).map(pair).join(", "),
        ],
      ];
    }
  }
}

// podSelector: {} prints as <none>, like kubectl
function formatSelector(selector: Labels): string {
  const pairs = Object.entries(selector).map(([key, value]) => `${key}=${value}`);
  return pairs.length > 0 ? pairs.join(",") : "<none>";
}

function formatRules(direction: "from" | "to", rules: NetworkPolicyRule[]): string[] {
  if (rules.length === 0) return [`    <none> (all ${direction === "from" ? "incoming" : "outgoing"} traffic is denied)`];
  return rules.flatMap((rule) => [
    `    ${direction === "from" ? "To Port" : "To Port"}: ${rule.ports.length > 0 ? rule.ports.map((p) => `${p}/TCP`).join(", ") : "<any> (traffic allowed to all ports)"}`,
    ...(rule.peers.length === 0
      ? [`    ${direction === "from" ? "From" : "To"}: <any> (traffic not restricted by source)`]
      : rule.peers.map((peer) => {
          const parts = [
            peer.namespaceSelector ? `NamespaceSelector: ${formatSelector(peer.namespaceSelector)}` : "",
            peer.podSelector ? `PodSelector: ${formatSelector(peer.podSelector)}` : "",
          ].filter(Boolean);
          return `    ${direction === "from" ? "From" : "To"}: ${parts.join(" and ")}`;
        })),
    "    ----------",
  ]);
}

function containerLines(config: ContainerConfig): [string, string][] {
  const lines: [string, string][] = [];
  const { requests, limits } = config.resources ?? {};
  if (limits) lines.push(["Limits", Object.entries(limits).map(([k, v]) => `${k}=${v}`).join(", ")]);
  if (requests) lines.push(["Requests", Object.entries(requests).map(([k, v]) => `${k}=${v}`).join(", ")]);
  if (config.envFrom?.length) lines.push(["Environment Variables from", config.envFrom.map((name) => `${name} ConfigMap`).join(", ")]);
  if (config.env && Object.keys(config.env).length > 0) {
    lines.push(["Environment", Object.entries(config.env).map(([k, v]) => `${k}=${v}`).join(", ")]);
  }
  return lines;
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
    case "Pod": {
      const crash = podStatus(state, r) === "CrashLoopBackOff" ? crashReason(state, r) : null;
      lines.push(["Node", r.node ?? "<none>"], ["Status", podStatus(state, r)], ["IP", podIp(r)], ["Image", r.image]);
      if (crash) {
        lines.push(["Last State", `Terminated (Reason: ${crash.reason}, Exit Code: ${crash.exitCode})`], ["Restart Count", "5"]);
      }
      lines.push(...containerLines(r));
      break;
    }
    case "Deployment":
      lines.push(["Replicas", `${r.replicas} desired`], ["Selector", formatLabels(r.labels)], ["Image", r.image], ...containerLines(r));
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
    case "NetworkPolicy":
      lines.push([
        "PodSelector",
        Object.keys(r.podSelector).length > 0
          ? formatSelector(r.podSelector)
          : "<none> (Allowing the specific traffic to all pods in this namespace)",
      ]);
      lines.push(["Policy Types", r.policyTypes.join(", ")]);
      break;
    case "ResourceQuota": {
      const used = quotaUsed(listPods(state), r);
      lines.push(
        ["Resource", "Used / Hard"],
        ...QUOTA_KEYS.filter((key) => key in r.hard).map(
          (key): [string, string] => [`  ${key}`, `${formatQuantity(key, used[key] ?? 0)} / ${r.hard[key]}`]
        )
      );
      break;
    }
  }

  const width = Math.max(...lines.map(([key]) => key.length)) + 2;
  const body = lines.map(([key, value]) => `${`${key}:`.padEnd(width)}${value}`).join("\n");

  if (r.kind === "NetworkPolicy") {
    const sections = [
      ...(r.policyTypes.includes("Ingress") ? ["Allowing ingress traffic:", ...formatRules("from", r.ingress)] : []),
      ...(r.policyTypes.includes("Egress") ? ["Allowing egress traffic:", ...formatRules("to", r.egress)] : []),
    ];
    return `${body}\n${sections.join("\n")}`;
  }
  if (r.kind !== "Pod") return body;

  const events = podEvents(state, r).map((e) => ["  " + e.type, e.reason, "5s", e.message]);
  return `${body}\nEvents:\n${table([["  Type", "Reason", "Age", "Message"], ...events])}`;
}
