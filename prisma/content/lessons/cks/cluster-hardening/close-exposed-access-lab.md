# Lab: Close Exposed Access

A security scan of the `data` namespace flagged two findings:

- the `postgres` Service is a **NodePort**, so the database is reachable on every node's IP,
- a RoleBinding lets **unauthenticated users** (`system:anonymous`) read Pods and Secrets.

## Tasks

1. Make Postgres reachable only from inside the cluster: the Service must be named `postgres`, be of type **ClusterIP** and listen on port **5432**.
2. Remove the anonymous access.
3. Verify with `kubectl auth can-i list secrets --as=system:anonymous -n data`.
