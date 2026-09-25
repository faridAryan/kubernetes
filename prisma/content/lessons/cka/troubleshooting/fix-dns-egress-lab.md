# Lab: "bad address" After a Security Change

The security team restricted the `worker` Pod in `prod` with an egress NetworkPolicy called `worker-egress`, so it may only call the `api` Service on port 80. Since then the worker's jobs fail:

```
kubectl exec worker -n prod -- wget -qO- -T 2 http://api
wget: bad address 'api'
```

## Tasks

1. Confirm the problem, then try the Service's ClusterIP instead of its name. What's different?
2. Fix it **without** deleting or loosening `worker-egress`. Write an additional policy in the manifest editor and apply it.
3. The worker must still be **blocked** from reaching the `db` Service on port 5432.

> Name resolution goes to CoreDNS (`k8s-app=kube-dns` in `kube-system`) on port 53.
