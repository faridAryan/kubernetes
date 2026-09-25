import { CLUSTER_SCOPED, findResource, listPods, matchesSelector } from "./cluster";
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

      const data = "data" in resource ? resource.data : {};
      const hasForbiddenKey = (check.absentKeys ?? []).some((key) => key in data);
      return hasForbiddenKey === false && matchesFields(resource as unknown as Record<string, unknown>, check.match ?? {});
    }
    case "absent": {
      const namespace = CLUSTER_SCOPED.includes(check.kind) ? undefined : check.namespace ?? "default";
      return findResource(state, check.kind, check.name, namespace) === undefined;
    }
    case "pods": {
      const pods = listPods(state).filter(
        (p) => p.namespace === check.namespace && matchesSelector(p.labels, check.selector)
      );
      const running = pods.filter((p) => p.node !== null && p.node !== check.notOnNode);
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
