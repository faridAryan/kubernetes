# Health Probes

The kubelet can't see inside your app. Probes tell it how to check.

| Probe | Question it answers | When it fails |
|-------|--------------------|---------------|
| **readinessProbe** | Can this Pod take traffic right now? | Removed from Service endpoints. READY shows `0/1`, and the container keeps running |
| **livenessProbe** | Is the app still alive? | Container is **killed and restarted** (restarts pile up into `CrashLoopBackOff`) |
| **startupProbe** | Has the app finished starting? | Liveness and readiness wait until it succeeds. If it gives up, the container is restarted |

## Configuring them

```yaml
containers:
  - name: api
    image: ghcr.io/kubelearn/api:3.2.0
    readinessProbe:
      httpGet:
        path: /ready
        port: 8080
      periodSeconds: 5
    livenessProbe:
      httpGet:
        path: /healthz
        port: 8080
      initialDelaySeconds: 15
    startupProbe:          # for slow starters
      httpGet:
        path: /healthz
        port: 8080
      failureThreshold: 30
      periodSeconds: 10    # allows up to 300s to start
```

`tcpSocket: { port: 5432 }` checks that a port accepts connections, which is useful for databases. `exec` runs a command in the container.

## The timing math

The kubelet gives up after `initialDelaySeconds + failureThreshold × periodSeconds`. If a liveness probe gives up before a slow app has started, the app is killed on every start, forever. Fix it with a **startupProbe** rather than a huge `initialDelaySeconds`.

## Reading the symptoms

```bash
kubectl get pods                 # READY 0/1 but Running → readiness; RESTARTS climbing → liveness
kubectl describe pod <pod>       # Events: "Readiness probe failed: HTTP probe failed with statuscode: 404"
kubectl get endpoints <svc>      # unready Pods are missing here
kubectl exec <client> -- wget -qO- http://<svc>:<port>/healthz   # try the endpoint yourself
```

| Event message | Usual cause |
|---------------|-------------|
| `connect: connection refused` | Wrong port, or the app isn't listening yet |
| `statuscode: 404` | Wrong path |
| `Container ... failed liveness probe, will be restarted` | The liveness probe gave up. Check its port, path and timing |

## Editing a live Deployment

Export the manifest, edit it, and re-apply:

```bash
kubectl get deploy api -o yaml > api.yaml
# edit api.yaml in the manifest editor
kubectl apply -f api.yaml
```

Or generate a fresh one: `kubectl create deployment api --image=... --dry-run=client -o yaml > api.yaml`.
