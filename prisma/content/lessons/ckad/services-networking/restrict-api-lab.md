# Lab: Only the Frontend May Call the API

In the `shop` namespace, both `frontend` and `batch` Pods can currently call the `api` Service.

## Tasks

1. Check the current behaviour from both clients (`kubectl exec <pod> -n shop -- wget -qO- -T 2 http://api`).
2. Create a NetworkPolicy named `api-allow-frontend` so that **only** Pods labelled `app=frontend` can reach `api` on port **80**.
3. Verify that `batch` now times out while `frontend` still works.
