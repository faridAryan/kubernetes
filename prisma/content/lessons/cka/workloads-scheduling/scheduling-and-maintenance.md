# Scheduling and Node Maintenance

The **kube-scheduler** picks a node for every new Pod. As an administrator you influence those decisions and safely take nodes out of service.

## How scheduling works

1. **Filtering** removes nodes that can't run the Pod (not enough CPU/memory, taints not tolerated, node selector mismatch).
2. **Scoring** ranks the remaining nodes (spread, resource balance, affinity).
3. The Pod is **bound** to the highest-scoring node.

If no node passes filtering, the Pod stays `Pending`.

## Node labels and nodeSelector

```bash
kubectl label node worker-2 accelerator=nvidia
```

```yaml
spec:
  nodeSelector:
    accelerator: nvidia
```

## Taints and tolerations

A **taint** repels Pods from a node unless they **tolerate** it.

```bash
kubectl taint nodes worker-2 gpu=true:NoSchedule     # add
kubectl taint nodes worker-2 gpu=true:NoSchedule-    # remove
```

| Effect | Behaviour |
|--------|-----------|
| `NoSchedule` | New Pods without a toleration aren't scheduled here |
| `PreferNoSchedule` | The scheduler tries to avoid the node |
| `NoExecute` | New Pods are blocked and existing ones are evicted |

The control plane node carries `node-role.kubernetes.io/control-plane:NoSchedule`, which is why your workloads land on workers.

## Maintenance: cordon, drain, uncordon

```bash
kubectl cordon worker-1                         # stop new Pods landing here
kubectl drain worker-1 --ignore-daemonsets      # evict Pods (implies cordon)
# ... patch, reboot, upgrade ...
kubectl uncordon worker-1                       # allow scheduling again
```

- DaemonSet Pods (like `kube-proxy`) are recreated immediately on the same node, so `drain` refuses to continue unless you pass `--ignore-daemonsets`.
- Pods without a controller are lost forever when evicted, so `drain` needs `--force` for them.
- Pods managed by a Deployment are recreated on other nodes.

> **Exam Tip**: `kubectl get nodes` shows `SchedulingDisabled` on a cordoned node. Forgetting to `uncordon` after maintenance is a classic mistake.
