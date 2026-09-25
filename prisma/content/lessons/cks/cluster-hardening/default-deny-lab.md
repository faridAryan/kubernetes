# Lab: Default Deny and Allow-List

The `prod` namespace runs a three-tier app: `frontend` → `api` → `db`. At the moment, every Pod in the cluster can reach every tier, including the database.

## Tasks

Write the policies in the manifest editor and apply them:

1. A policy named `default-deny-ingress` that blocks **all** ingress to every Pod in `prod`.
2. `frontend` stays reachable on port **80** from anywhere (users come in through it).
3. `api` accepts traffic on port **80** only from `frontend` Pods.
4. `db` accepts traffic on port **5432** only from `api` Pods.

Test with the `outsider` Pod in `default` and with the tiers themselves, for example:

```bash
kubectl exec outsider -- wget -qO- -T 2 http://api.prod
kubectl exec deploy/frontend -n prod -- curl -m 2 http://db.prod:5432
```

> Reading the results: `Empty reply from server` from curl on port 5432 means the connection **succeeded** (Postgres just doesn't speak HTTP). `Connection timed out` means a policy blocked it.
