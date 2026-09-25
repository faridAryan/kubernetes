# Lab: Canary Release

`web-v1` (image `nginx:1.26`) serves production traffic. Release `nginx:1.27` to a small share of Pods first.

## Tasks

1. Label the `web-v1` Deployment with `track=stable`.
2. Create a Deployment named `web-v2` with the image `nginx:1.27` and **1** replica.
3. Label `web-v2` with `track=canary`.
4. Scale `web-v1` to **3** replicas, so about 25% of the Pods run the canary.
5. List the canary Pods with `kubectl get pods -l track=canary`.
