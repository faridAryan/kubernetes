# Lab: Database Stuck in Pending

The `postgres` Deployment in `db` has been `Pending` since it was created.

## Tasks

1. Find out why (`get pods`, `get pvc`, `get events -n db`, `get sc`).
2. Fix the claim `db-data` so it uses the cluster's **default** StorageClass. Keep the name, the size (**2Gi**) and `ReadWriteOnce`.
3. Confirm `db-data` is Bound and `postgres` is Running.

> A claim's storage class can't be changed after creation. Save it with `-o yaml`, delete it, fix the file and apply it.
