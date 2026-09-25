import type { ClusterState, RoleBindingResource, RoleResource } from "./types";

// "system:serviceaccount:<ns>:<name>" -> "ServiceAccount:<ns>:<name>", anything else is a user
export function subjectFromAs(as: string): string {
  const serviceAccount = as.match(/^system:serviceaccount:([^:]+):(.+)$/);
  return serviceAccount ? `ServiceAccount:${serviceAccount[1]}:${serviceAccount[2]}` : `User:${as}`;
}

// Evaluates namespaced Roles/RoleBindings the way the RBAC authorizer does
export function canI(state: ClusterState, subject: string, verb: string, resource: string, namespace: string): boolean {
  const plural = resource.endsWith("s") ? resource : `${resource}s`;
  const roles = state.resources.filter((r): r is RoleResource => r.kind === "Role" && r.namespace === namespace);

  return state.resources
    .filter(
      (r): r is RoleBindingResource => r.kind === "RoleBinding" && r.namespace === namespace && r.subjects.includes(subject)
    )
    .some((binding) =>
      roles.some(
        (role) =>
          role.name === binding.role &&
          (role.verbs.includes(verb) || role.verbs.includes("*")) &&
          (role.resources.includes(plural) || role.resources.includes("*"))
      )
    );
}
