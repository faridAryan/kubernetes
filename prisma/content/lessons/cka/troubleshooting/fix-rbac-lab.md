# Lab: Fix Broken Permissions

Two identities in the `dev` namespace are getting `Forbidden` errors:

- the user **jane** should be able to **list Pods** (read-only),
- the ServiceAccount **ci** should be able to **create Pods**.

The Roles `pod-reader` and `pod-deployer` already exist and are correct. Something is wrong with the bindings.

## Tasks

1. Use `kubectl auth can-i` and `kubectl describe rolebinding -n dev` to find the mistakes.
2. Fix access so jane can list Pods and ci can create Pods.
3. Don't grant anything extra: jane must **not** be able to delete Pods, and ci must **not** be able to read Secrets.

> `roleRef` can't be changed on an existing RoleBinding: delete it and create a new one.
