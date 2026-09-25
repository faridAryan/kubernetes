# Lab: Rolling Update and Rollback

The `api` Deployment runs `nginx:1.25` with 3 replicas.

## Tasks

1. Update the `api` Deployment's container `nginx` to the image `nginx:1.26`.
2. Check the rollout status and history.
3. Scale `api` to **5** replicas to handle load.
4. The new version is misbehaving. **Roll back** to the previous revision.
5. Confirm the Deployment runs `nginx:1.25` with 5 replicas.
