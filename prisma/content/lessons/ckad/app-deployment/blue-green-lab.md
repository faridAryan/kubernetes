# Lab: Blue/Green Switch

Two versions of the web app are running side by side:

- `web-blue` (`nginx:1.26`): currently receives all traffic through the `web` Service,
- `web-green` (`nginx:1.27`): the new release, tested and ready.

## Tasks

1. Check which Pods the `web` Service sends traffic to (`kubectl get endpoints web`).
2. Switch the `web` Service to the green Pods in one step.
3. Scale `web-blue` to **0** replicas, but keep the Deployment so you can roll back quickly.
4. Confirm `web` now has the 2 green Pods as endpoints.
