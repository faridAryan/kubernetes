# Resources, Limits and Quotas

Every container can declare how much CPU and memory it needs. The scheduler, the kubelet and the API server all use these numbers.

## Requests and limits

```yaml
resources:
  requests:        # what the scheduler reserves on a node
    cpu: 100m
    memory: 128Mi
  limits:          # the hard ceiling at runtime
    memory: 256Mi
```

| | CPU | Memory |
|--|--|--|
| **Request** | Used for scheduling | Used for scheduling |
| **Limit exceeded** | The container is **throttled** | The container is **killed (OOMKilled, exit code 137)** |

```bash
kubectl set resources deployment/web --requests=cpu=100m,memory=128Mi --limits=memory=256Mi
```

> A memory limit below what the app really uses gives a classic `CrashLoopBackOff` with `Last State: Terminated, Reason: OOMKilled` in `kubectl describe pod`.

## QoS classes

| Class | When |
|-------|------|
| **Guaranteed** | Every container has requests = limits for CPU and memory |
| **Burstable** | At least one request or limit is set |
| **BestEffort** | Nothing is set. These Pods are evicted first under node pressure |

## ResourceQuota

A quota caps what a whole namespace may consume.

```bash
kubectl create quota team-quota -n team-a \
  --hard=pods=6,requests.cpu=1,requests.memory=1Gi
kubectl describe quota team-quota -n team-a
```

- When a quota tracks `requests.memory` (or cpu), every new Pod in the namespace **must declare** that request, or it's rejected: `failed quota: team-quota: must specify requests.memory`.
- Pods over the quota are never created. The Deployment stays at, for example, `6/8`, and the reason shows up as a `FailedCreate` event on the ReplicaSet.

```bash
kubectl get events -n team-a      # Error creating: ... exceeded quota: team-quota
```

> **Tip**: A `LimitRange` can give Pods default requests and limits, so teams don't have to set them on every workload.
