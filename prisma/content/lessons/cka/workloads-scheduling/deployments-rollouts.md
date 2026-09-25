# Deployments and Rolling Updates

A Deployment provides declarative updates for Pods and ReplicaSets.

## Creating a Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 1
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.24
        ports:
        - containerPort: 80
```

## Rolling Update Strategy

- **maxSurge** - Maximum number of pods created above the desired count
- **maxUnavailable** - Maximum number of pods that can be unavailable

```bash
# Update image
kubectl set image deployment/nginx-deployment nginx=nginx:1.25

# Check rollout status
kubectl rollout status deployment/nginx-deployment

# View rollout history
kubectl rollout history deployment/nginx-deployment

# Rollback to previous version
kubectl rollout undo deployment/nginx-deployment

# Rollback to specific revision
kubectl rollout undo deployment/nginx-deployment --to-revision=2

# Scale deployment
kubectl scale deployment/nginx-deployment --replicas=5
```

## Deployment Strategies

| Strategy | Description |
|----------|-------------|
| **RollingUpdate** | Gradually replaces old pods with new ones |
| **Recreate** | Kills all old pods before creating new ones |

> **Best Practice**: Always set resource requests and limits in your deployment specs to ensure proper scheduling and prevent resource contention.
