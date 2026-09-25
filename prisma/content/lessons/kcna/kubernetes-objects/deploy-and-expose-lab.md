# Lab: Deploy and Expose an App

Run a replicated app and give it a stable address.

## Tasks

1. Create a Deployment named `hello` with the image `nginx:1.27` and **2** replicas.
2. Expose the Deployment as a ClusterIP Service on port **80**.
3. Traffic is growing: scale `hello` to **3** replicas.
4. Check that the Service selects the Deployment's Pods (`kubectl describe svc hello`).
