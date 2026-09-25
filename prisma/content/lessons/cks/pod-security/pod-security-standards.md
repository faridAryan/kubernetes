# Pod Security Standards

Pod Security Admission (PSA) is built into Kubernetes (stable since v1.25). It enforces the **Pod Security Standards** per namespace using labels, and it replaced the removed PodSecurityPolicy.

## The three levels

| Level | Allows |
|-------|--------|
| **privileged** | Everything, no restrictions |
| **baseline** | Blocks known privilege escalations: privileged containers, hostNetwork, hostPath and similar |
| **restricted** | Hardened: must run as non-root, drop ALL capabilities, seccomp `RuntimeDefault`, no privilege escalation |

## The three modes

| Mode | Effect on violating Pods |
|------|--------------------------|
| `enforce` | Rejected |
| `audit` | Allowed, recorded in the audit log |
| `warn` | Allowed, the user gets a warning |

## Applying them

```bash
kubectl label namespace prod pod-security.kubernetes.io/enforce=restricted
kubectl label namespace sandbox \
  pod-security.kubernetes.io/enforce=baseline \
  pod-security.kubernetes.io/warn=restricted
```

A safe rollout for an existing namespace:

1. Add `warn=restricted` and `audit=restricted` first.
2. Fix the workloads that trigger warnings.
3. Switch to `enforce=restricted`.

## A restricted-compliant container

```yaml
securityContext:
  runAsNonRoot: true
  allowPrivilegeEscalation: false
  capabilities:
    drop: ["ALL"]
  seccompProfile:
    type: RuntimeDefault
```

> **Exam Tip**: PSA only checks Pods when they are created or updated. Existing Pods keep running after you label a namespace, so restart them to find violations.
