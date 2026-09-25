# Labels, Selectors and Annotations

Labels are how Kubernetes objects find each other. Deployments find their Pods, Services find their backends and you find your workloads, all through label selectors.

## Adding and changing labels

```bash
kubectl run debug --image=busybox:1.36 --labels=app=debug,env=dev
kubectl label pod api-1 env=prod
kubectl label pod api-1 env=staging --overwrite   # changing requires --overwrite
kubectl label pod api-1 env-                       # remove a label
```

## Querying

```bash
kubectl get pods -l env=prod
kubectl get pods -l app=api,env=prod        # AND
kubectl get pods --show-labels
```

Set-based selectors are available in manifests and with `-l`:

```bash
kubectl get pods -l 'env in (prod,staging)'
```

## Recommended labels

| Label | Example |
|-------|---------|
| `app.kubernetes.io/name` | `checkout` |
| `app.kubernetes.io/version` | `1.4.2` |
| `app.kubernetes.io/component` | `api` |
| `app.kubernetes.io/part-of` | `shop` |

## Annotations

Annotations also hold key/value data, but **can't be used in selectors**. Use them for information tools read: build IDs, contact details, ingress controller settings.

```yaml
metadata:
  annotations:
    team.example.com/owner: "payments@example.com"
```

> **Exam Tip**: Deleting a Pod managed by a Deployment brings it straight back. Labels on those Pods come from the Deployment's Pod template, so edit the template instead of the Pods.
