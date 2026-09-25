# ConfigMaps and Secrets

Keep configuration out of container images. The same image should run in dev and prod with different settings.

## ConfigMaps

```bash
kubectl create configmap app-config \
  --from-literal=APP_MODE=production \
  --from-literal=LOG_LEVEL=info
```

Use them as environment variables:

```yaml
envFrom:
  - configMapRef:
      name: app-config
```

or mount them as files:

```yaml
volumes:
  - name: config
    configMap:
      name: app-config
containers:
  - name: app
    volumeMounts:
      - name: config
        mountPath: /etc/app
```

## Secrets

Secrets look like ConfigMaps but are meant for sensitive data.

```bash
kubectl create secret generic db-creds \
  --from-literal=username=shop \
  --from-literal=password=s3cure-pass
```

```yaml
env:
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: db-creds
        key: password
```

> **Important**: Secret values are only **base64-encoded**, not encrypted. Protect them with RBAC, enable encryption at rest in etcd, and avoid printing them in logs.

## Env vars or volumes?

| | Environment variables | Mounted files |
|--|--|--|
| Updates | Need a Pod restart | Refresh automatically (not with `subPath`) |
| Good for | Simple flags | Config files, certificates |

## Namespaces matter

ConfigMaps and Secrets are namespaced. A Pod can only reference ones in its own namespace, so always pass `-n <namespace>` when creating them.
