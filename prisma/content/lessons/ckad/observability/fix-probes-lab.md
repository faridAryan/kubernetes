# Lab: Probes Gone Wrong

Someone added probes to the `billing` Deployment in `payments`, and now it never becomes available: Pods restart constantly and the `billing` Service has no endpoints.

The app listens on **8080** and serves `/healthz` and `/ready`.

## Tasks

1. Use `kubectl get pods`, `kubectl describe pod` and `kubectl get events -n payments` to find what's wrong with **each** probe.
2. Fix the probes (export with `-o yaml > billing.yaml`, edit and apply).
3. Confirm both Pods are Running, `1/1` Ready and listed as endpoints.
