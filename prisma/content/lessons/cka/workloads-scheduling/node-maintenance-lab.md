# Lab: Node Maintenance and Taints

The `shop` Deployment runs 4 replicas spread across both workers. You need to patch `worker-1` and dedicate `worker-2` to GPU jobs.

## Tasks

1. Safely drain `worker-1` (kube-proxy runs there as a DaemonSet).
2. Check where the `shop` Pods are running now (`kubectl get pods -o wide`).
3. Maintenance is finished: make `worker-1` schedulable again.
4. Label `worker-2` with `accelerator=nvidia`.
5. Taint `worker-2` with `gpu=true:NoSchedule` so regular workloads stay off it.
6. Verify all 4 `shop` Pods are running and none of them are on `worker-2`.
