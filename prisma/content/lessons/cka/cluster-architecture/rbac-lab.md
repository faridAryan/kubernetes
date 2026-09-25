# Lab: RBAC for a Deployment Bot

A CI bot needs to manage Pods in the `dev` namespace, and nothing else.

## Tasks

1. Create a ServiceAccount named `deployer` in the `dev` namespace.
2. Create a Role named `pod-manager` in `dev` that allows the verbs `get`, `list`, `create` and `delete` on `pods`.
3. Bind the Role to the ServiceAccount with a RoleBinding named `deployer-binding`.
4. Prove it works with `kubectl auth can-i`, for example:

```bash
kubectl auth can-i delete pods --as=system:serviceaccount:dev:deployer -n dev
kubectl auth can-i delete deployments --as=system:serviceaccount:dev:deployer -n dev
```
