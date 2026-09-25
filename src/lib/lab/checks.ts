import { CLUSTER_SCOPED, findResource, listPods, matchesSelector } from "./cluster";
import { isRunning } from "./container";
import { connect } from "./network";
import { serviceEndpoints } from "./diagnostics";
import { canI, subjectFromAs } from "./rbac";
import type { CheckResult, ClusterState, LabCheck } from "./types";

// Every expected field must match; objects are compared as subsets, arrays by inclusion
function matchesFields(actual: Record<string, unknown>, expected: Record<string, unknown>): boolean {
  return Object.entries(expected).every(([key, want]) => {
    const have = actual[key];
    if (Array.isArray(have)) {
      const wanted = Array.isArray(want) ? want : [want];
      return wanted.every((value) => have.includes(value));
    }
    if (want !== null && typeof want === "object" && have !== null && typeof have === "object") {
      return matchesFields(have as Record<string, unknown>, want as Record<string, unknown>);
    }
    return have === want;
  });
}

// True when any excluded value is still in an array field, or any excluded key in an object field
function hasExcluded(actual: Record<string, unknown>, exclude: Record<string, string[]>): boolean {
  return Object.entries(exclude).some(([key, values]) => {
    const have = actual[key];
    if (Array.isArray(have)) return values.some((value) => have.includes(value));
    if (have !== null && typeof have === "object") return values.some((value) => value in have);
    return false;
  });
}

function evaluate(check: LabCheck, state: ClusterState, commands: string[]): boolean {
  switch (check.type) {
    case "command": {
      const pattern = new RegExp(check.pattern, "i");
      return commands.some((command) => pattern.test(command));
    }
    case "exists": {
      const namespace = CLUSTER_SCOPED.includes(check.kind) ? undefined : check.namespace ?? "default";
      const resource =
        check.kind === "Pod"
          ? listPods(state).find((p) => p.name === check.name && p.namespace === namespace)
          : findResource(state, check.kind, check.name, namespace);
      if (resource === undefined) return false;

      const fields = resource as unknown as Record<string, unknown>;
      return matchesFields(fields, check.match ?? {}) && hasExcluded(fields, check.exclude ?? {}) === false;
    }
    case "absent": {
      const namespace = CLUSTER_SCOPED.includes(check.kind) ? undefined : check.namespace ?? "default";
      return findResource(state, check.kind, check.name, namespace) === undefined;
    }
    case "endpoints": {
      const service = findResource(state, "Service", check.service, check.namespace);
      return service !== undefined && serviceEndpoints(state, service).length >= check.count;
    }
    case "connectivity": {
      // Same path as "kubectl exec <pod> -- nc -z host port" from the first healthy client pod
      const client = listPods(state).find(
        (p) => p.namespace === check.from.namespace && matchesSelector(p.labels, check.from.selector) && isRunning(state, p)
      );
      if (client === undefined) return false;
      return (connect(state, client, check.host, check.port).status === "open") === check.allowed;
    }
    case "can-i":
      return canI(state, subjectFromAs(check.as), check.verb, check.resource, check.namespace) === check.allowed;
    case "pods": {
      const pods = listPods(state).filter(
        (p) => p.namespace === check.namespace && matchesSelector(p.labels, check.selector)
      );
      const running = pods.filter((p) => isRunning(state, p) && p.node !== check.notOnNode);
      return running.length >= check.running && running.length === pods.length;
    }
  }
}

export function runChecks(checks: LabCheck[], state: ClusterState, commands: string[]): CheckResult[] {
  return checks.map((check) => ({
    description: check.description,
    passed: evaluate(check, state, commands),
  }));
}
