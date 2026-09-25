# Lab: Expose a Service with NodePort

The `frontend` Deployment in the `web` namespace listens on container port **8080**.

## Tasks

1. Expose `frontend` as a **NodePort** Service named `frontend-svc`, with Service port **80** forwarding to target port **8080**.
2. Scale `frontend` to **3** replicas.
3. Use `kubectl describe svc frontend-svc -n web` to confirm the Service has 3 endpoints.
