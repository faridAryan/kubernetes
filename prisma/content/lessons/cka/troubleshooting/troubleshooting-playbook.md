# A Troubleshooting Playbook

Troubleshooting is the largest domain of the CKA exam (30%). The trick is to follow the same path every time instead of guessing.

## 1. What state is it in?

```bash
kubectl get pods -o wide
kubectl get events --sort-by=.lastTimestamp
```

| Status | Usually means | Look at |
|--------|---------------|---------|
| `Pending` | The scheduler can't place the Pod | `describe pod` → Events: `FailedScheduling` |
| `ImagePullBackOff` / `ErrImagePull` | Wrong image name/tag, or registry auth | `describe pod` → Events: `Failed to pull image` |
| `CrashLoopBackOff` | The container starts and exits | `kubectl logs <pod> --previous` |
| `Running` but not working | App or networking problem | Service selector, endpoints, ports |

## 2. Pending Pods

The `FailedScheduling` message tells you exactly why every node was rejected:

```
0/3 nodes are available: 1 node(s) were unschedulable,
1 node(s) had untolerated taint {maintenance: true}, ...
```

- **unschedulable** → someone cordoned the node: `kubectl uncordon <node>`
- **untolerated taint** → remove it (`kubectl taint nodes <node> key-`) or add a toleration
- **Insufficient cpu/memory** → lower requests or add capacity

## 3. Image pull errors

```bash
kubectl describe pod <pod>      # Failed to pull image "nginx:1.277": not found
kubectl set image deployment/<name> <container>=<correct-image>
```

A typo in the tag is the most common cause, followed by a private registry without an `imagePullSecret`.

## 4. A Service that doesn't work

```bash
kubectl get endpoints <service>     # <none> is the smoking gun
kubectl describe svc <service>      # compare Selector with the Pod labels
kubectl get pods --show-labels
```

- **No endpoints** → the selector doesn't match any ready Pod's labels. Fix with `kubectl set selector svc <name> app=<label>`.
- **Endpoints exist but connections fail** → `targetPort` doesn't match the container port.

## 5. "Forbidden" errors

```bash
kubectl auth can-i list pods --as=jane -n dev
kubectl describe rolebinding -n dev
```

Check three things: the binding references the right **Role name**, the subject has the right **name and namespace**, and the Role grants the **verb on the resource**. Bindings can't be edited in place (`roleRef` is immutable), so delete and recreate them.

> **Exam Tip**: Read the Events first. They answer most "why isn't this running?" questions in one command.
