# Network Policies

Network Policies are Kubernetes resources that control traffic flow between pods at the IP address or port level (OSI layer 3 or 4).

## Default Behavior

By default, all pods in a cluster can communicate with any other pod. Network Policies allow you to restrict this.

## Creating a Network Policy

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-ingress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Ingress
```

This policy denies ALL ingress traffic to ALL pods in the "production" namespace.

## Allow Specific Traffic

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 8080
```

## Key Concepts

- **podSelector** - Which pods the policy applies to
- **policyTypes** - Ingress, Egress, or both
- **ingress.from** - Allowed sources (podSelector, namespaceSelector, ipBlock)
- **egress.to** - Allowed destinations

## Best Practices for Security

1. Start with a **deny-all** policy per namespace
2. Add specific allow rules as needed
3. Use **namespaceSelector** for cross-namespace policies
4. Remember: Network Policies are **additive** - they never remove access granted by another policy
5. Ensure your CNI plugin supports Network Policies (Calico, Cilium, etc.)

> **CKS Tip**: Network Policies are heavily tested. Practice writing policies from scratch, especially deny-all + selective allow patterns.
