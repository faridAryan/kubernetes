# Lab: Pods Stuck in Pending

After last night's maintenance window, the `reports` Deployment never came back. All 3 of its Pods are `Pending`.

## Tasks

1. Find out why the scheduler can't place the Pods (hint: Events).
2. Fix the cluster so that **both** workers can run normal workloads again.
3. Confirm all 3 `reports` Pods are `Running`.

Don't delete or recreate the Deployment. The problem isn't the app.
