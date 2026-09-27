# Lab: Static PersistentVolume

Provision storage by hand for an app in the `app` namespace.

## Tasks

Write the manifests in the editor and apply them:

1. A PersistentVolume `data-pv`: **1Gi**, `ReadWriteOnce`, `storageClassName: manual`, reclaim policy **Retain**, `hostPath` `/mnt/data`.
2. A PersistentVolumeClaim `data-pvc` in `app`: **500Mi**, `ReadWriteOnce`, `storageClassName: manual`.
3. A Pod `writer` in `app` (image `busybox:1.36`) that mounts `data-pvc` at `/data`.
4. Check that the claim is `Bound` to `data-pv` and that `writer` is Running.
