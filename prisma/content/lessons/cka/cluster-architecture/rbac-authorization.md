# Role-Based Access Control (RBAC)

RBAC is a method of regulating access to Kubernetes resources based on the roles of individual users within your organization.

## RBAC API Objects

### Role and ClusterRole
A **Role** sets permissions within a specific namespace. A **ClusterRole** sets permissions cluster-wide.

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: default
  name: pod-reader
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "watch", "list"]
```

### RoleBinding and ClusterRoleBinding
Binds a Role/ClusterRole to a user, group, or service account.

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: default
subjects:
- kind: User
  name: jane
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

## Common RBAC Patterns

- **Least Privilege** - Grant only the permissions needed
- **Namespace Isolation** - Use Roles for namespace-scoped access
- **Service Accounts** - Create dedicated service accounts for applications
- **Aggregated ClusterRoles** - Combine multiple roles

## Key kubectl Commands

```bash
# Check if you can perform an action
kubectl auth can-i create deployments --namespace dev

# Create a role
kubectl create role pod-reader --verb=get,list,watch --resource=pods

# Create a rolebinding
kubectl create rolebinding pod-reader-binding --role=pod-reader --user=jane

# View roles
kubectl get roles -A
kubectl describe role pod-reader
```

> **CKA Tip**: RBAC questions are very common on the CKA exam. Practice creating roles and bindings quickly using both YAML and imperative commands.
