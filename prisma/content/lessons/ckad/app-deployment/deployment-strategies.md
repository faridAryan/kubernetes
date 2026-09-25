# Deployment Strategies

How you roll out a new version decides how much risk users are exposed to.

## Rolling update (default)

Pods are replaced gradually, controlled by `maxSurge` and `maxUnavailable`.

```bash
kubectl set image deployment/web nginx=nginx:1.27
kubectl rollout status deployment/web
kubectl rollout undo deployment/web
```

## Recreate

All old Pods are stopped before new ones start. Simple, but it causes downtime. Use it only when two versions can't run side by side.

## Blue/green

Run the new version (green) next to the old one (blue), then switch the Service selector in one step.

```bash
kubectl create deployment web-green --image=nginx:1.27
# test web-green, then point the Service at it
kubectl patch service web -p '{"spec":{"selector":{"app":"web-green"}}}'
```

Rollback is instant: switch the selector back.

## Canary

Send a small share of traffic to the new version. With plain Kubernetes you do this with **replica ratios** behind one Service that selects a shared label:

| Deployment | Replicas | Labels |
|------------|----------|--------|
| web-v1 | 3 | `role=web`, `track=stable` |
| web-v2 | 1 | `role=web`, `track=canary` |

A Service selecting `role=web` sends roughly 25% of requests to the canary. Watch its errors and latency, then scale v2 up and v1 down.

```bash
kubectl get pods -l track=canary
```

> **Tip**: Service meshes and ingress controllers can split traffic by percentage instead of replica count, but the idea is the same.
