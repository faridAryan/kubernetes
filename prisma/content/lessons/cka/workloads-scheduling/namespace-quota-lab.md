# Lab: Namespace Quotas

Team A shares the cluster, so its namespace `team-a` needs a budget. The `web` Deployment already runs there.

## Tasks

1. Create a ResourceQuota named `team-quota` in `team-a` with the hard limits `pods=6`, `requests.cpu=1` and `requests.memory=1Gi`.
2. Check `web`: with the quota in place its Pods must declare requests. Give the `web` Deployment requests of `cpu=100m` and `memory=128Mi`.
3. Scale `web` to **8** replicas and find out (with events) why only 6 Pods exist.
