# NetworkPolicies for Developers

By default, every Pod can talk to every other Pod. A NetworkPolicy lets your app say who may call it.

## How selection works

- `spec.podSelector` picks the Pods the policy **protects**. `{}` means every Pod in the namespace.
- Once any policy selects a Pod for `Ingress`, only the traffic some policy allows gets in. The same goes for `Egress`.
- Policies are **additive**. There are no "deny" rules, only allow rules on top of isolation.

## Allow only the frontend to reach the API

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-allow-frontend
  namespace: shop
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes: [Ingress]
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - port: 80
```

## Selecting other namespaces

```yaml
from:
  - namespaceSelector:
      matchLabels:
        kubernetes.io/metadata.name: monitoring
```

Every namespace carries the `kubernetes.io/metadata.name` label automatically.

Putting `namespaceSelector` and `podSelector` in the **same** list item means "these Pods in those namespaces". As **two** items, they mean "those namespaces OR these Pods". Watch the dashes!

## Don't forget DNS

When you restrict **egress**, the Pod can no longer reach CoreDNS, so every lookup fails (`bad address 'api'`). Allow it explicitly:

```yaml
egress:
  - to:
      - namespaceSelector:
          matchLabels:
            kubernetes.io/metadata.name: kube-system
        podSelector:
          matchLabels:
            k8s-app: kube-dns
    ports:
      - port: 53
        protocol: UDP
      - port: 53
        protocol: TCP
```

## Test it

```bash
kubectl exec <client-pod> -n shop -- wget -qO- -T 2 http://api     # allowed
kubectl exec <other-pod>  -n shop -- wget -qO- -T 2 http://api     # download timed out
```
