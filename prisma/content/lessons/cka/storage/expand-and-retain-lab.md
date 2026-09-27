# Lab: Grow a Volume and Keep Its Data

The `collector` Deployment in `logs` writes to the claim `app-logs` (1Gi, StorageClass `expandable`), and it's almost full.

## Tasks

1. Expand `app-logs` to **3Gi** without recreating it.
2. Compliance requires that the log data survives even if someone deletes the claim. Change the reclaim policy of the PersistentVolume **bound to `app-logs`** to **Retain**.
3. Check the new size and policy with `kubectl get pv,pvc -n logs`.
