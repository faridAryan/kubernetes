# Lab: The App That Never Starts

The `reports` Deployment in `analytics` loads a large dataset at start-up and needs about **90 seconds** before it listens on port 8080. Its liveness probe gives up after 35 seconds, so the kubelet kills it before it's ever ready.

## Tasks

1. Confirm the diagnosis (restart count and `Liveness probe failed` events).
2. Add a **startupProbe** (`httpGet /healthz` on 8080) that allows at least 90 seconds, for example `failureThreshold: 12` with `periodSeconds: 10`.
3. Keep the existing livenessProbe as it is: once the startup probe succeeds it protects the running app.
4. Confirm the Pods stay Running.
