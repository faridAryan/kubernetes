# Lab: Remove Excessive Permissions

The `reporter` ServiceAccount in the `payments` namespace only needs to **read Pods**, but someone bound it to a wildcard Role.

## Tasks

1. Investigate: what can `system:serviceaccount:payments:reporter` do? Try `kubectl auth can-i delete secrets ...`.
2. Delete the RoleBinding `reporter-binding` and the Role `too-broad`.
3. Create a Role `pod-reader` that allows `get`, `list` and `watch` on `pods`.
4. Bind it to the `reporter` ServiceAccount with a RoleBinding named `reporter-read`.
5. Verify that reporter can list Pods but can no longer delete Secrets.
