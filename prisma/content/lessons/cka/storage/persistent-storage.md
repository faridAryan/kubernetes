# Persistent Storage

Container filesystems vanish with the container. PersistentVolumes give Pods storage that outlives them.

## The pieces

| Object | Scope | Who creates it | What it is |
|--------|-------|----------------|------------|
| **PersistentVolume (PV)** | Cluster | Admin, or a provisioner | A piece of storage (disk, NFS share, cloud volume) |
| **PersistentVolumeClaim (PVC)** | Namespace | Developer | A request: "1Gi, ReadWriteOnce, class X" |
| **StorageClass** | Cluster | Admin | How to create PVs on demand (provisioner, reclaim policy, binding mode) |

A PVC **binds** to exactly one PV. A Pod mounts the PVC, never the PV directly.

## Static provisioning

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: data-pv
spec:
  capacity:
    storage: 1Gi
  accessModes: [ReadWriteOnce]
  persistentVolumeReclaimPolicy: Retain
  storageClassName: manual
  hostPath:
    path: /mnt/data
```

A claim binds to a PV with the **same `storageClassName`**, **enough capacity** and **all requested access modes**. `storageClassName` works as a matching label here: no StorageClass object called `manual` has to exist.

## Dynamic provisioning

Leave out `storageClassName` and the **default StorageClass** (`kubectl get sc`, marked `(default)`) creates a PV for you.

- `volumeBindingMode: WaitForFirstConsumer` delays binding until a Pod uses the claim, so the volume is created where the Pod runs. Until then the claim is `Pending`, which is normal.
- A claim naming a class that doesn't exist stays `Pending` for good: `storageclass.storage.k8s.io "fast-ssd" not found`.

## Using a claim

```yaml
spec:
  containers:
    - name: app
      image: busybox:1.36
      volumeMounts:
        - name: data
          mountPath: /data
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: data-pvc
```

A Pod whose claim is missing or unbound stays `Pending` (`pod has unbound immediate PersistentVolumeClaims`).

## Access modes and reclaim policies

| Access mode | Meaning |
|-------------|---------|
| `ReadWriteOnce` (RWO) | Read-write from one node |
| `ReadOnlyMany` (ROX) | Read-only from many nodes |
| `ReadWriteMany` (RWX) | Read-write from many nodes (NFS, CephFS...) |

| Reclaim policy | When the claim is deleted |
|----------------|---------------------------|
| `Delete` | The PV and its data are deleted (default for dynamic PVs) |
| `Retain` | The PV becomes `Released` and the data is kept for an admin |

```bash
kubectl patch pv <name> -p '{"spec":{"persistentVolumeReclaimPolicy":"Retain"}}'
```

## Changing a claim

A PVC's spec is **immutable** except for its storage request. To switch class or access mode, delete and recreate the claim. To grow it, the class needs `allowVolumeExpansion: true`:

```bash
kubectl patch pvc data -p '{"spec":{"resources":{"requests":{"storage":"3Gi"}}}}'
```
