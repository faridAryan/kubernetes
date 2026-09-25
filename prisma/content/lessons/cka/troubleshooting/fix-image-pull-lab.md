# Lab: Deployment Not Ready

The `checkout` Deployment in the `store` namespace shows `0/3` ready after a release.

## Tasks

1. Find out why the Pods aren't running.
2. Fix the Deployment's image. The release was meant to ship `nginx:1.27` (the container is named `nginx`).
3. Confirm all 3 Pods are `Running`.
