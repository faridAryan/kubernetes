# Least-Privilege RBAC

Every identity (user, group or ServiceAccount) should have only the permissions it needs, and no more.

## Common mistakes

- Binding `cluster-admin` to a workload's ServiceAccount "to make it work".
- Roles with `verbs: ["*"]` or `resources: ["*"]`.
- Granting `secrets` read access broadly. Anyone who can read Secrets can read every credential in the namespace.
- Using the `default` ServiceAccount for everything.

## Audit what an identity can do

```bash
kubectl auth can-i --list --as=system:serviceaccount:payments:reporter -n payments
kubectl auth can-i delete pods --as=system:serviceaccount:payments:reporter -n payments
kubectl get rolebindings -n payments
kubectl describe role too-broad -n payments
```

## Fix it

1. Remove the over-permissive binding.
2. Create a narrow Role.
3. Bind it to exactly the subject that needs it.

```bash
kubectl delete rolebinding reporter-binding -n payments
kubectl create role pod-reader --verb=get,list,watch --resource=pods -n payments
kubectl create rolebinding reporter-read --role=pod-reader \
  --serviceaccount=payments:reporter -n payments
```

## ServiceAccount token hygiene

- Set `automountServiceAccountToken: false` on Pods that never call the API.
- Prefer short-lived projected tokens (the default since v1.24) over long-lived Secret-based tokens.

> **Exam Tip**: Prefer `Role` + `RoleBinding` (namespaced) over `ClusterRole` + `ClusterRoleBinding` unless access really must span namespaces.
