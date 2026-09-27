# Lab: Add Health Probes

The `api` Deployment in `shop` has no probes, so the Service sends traffic to Pods that are still starting, and a hung Pod is never restarted. The app listens on port **8080** and serves:

- `/ready`: returns 200 when the app can take traffic,
- `/healthz`: returns 200 while the process is healthy.

## Tasks

1. Export the Deployment: `kubectl get deploy api -n shop -o yaml > api.yaml`, then open `api.yaml` in the manifest editor.
2. Add a **readinessProbe** (`httpGet /ready` on 8080) and a **livenessProbe** (`httpGet /healthz` on 8080, `initialDelaySeconds: 15`) to the container.
3. Apply it and check that both Pods are `1/1` Ready and are endpoints of the `api` Service.
