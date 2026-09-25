# Services and Cluster Networking

Kubernetes networking follows a few simple rules: every Pod gets its own IP, every Pod can reach every other Pod without NAT, and agents on a node can reach all Pods on that node. A **CNI plugin** (Calico, Cilium, Flannel...) implements those rules.

## Service types

```bash
kubectl expose deployment frontend --port=80 --target-port=8080 --type=NodePort --name=frontend-svc
```

- **port** is the port the Service listens on.
- **targetPort** is the container port traffic is forwarded to.
- **nodePort** (NodePort/LoadBalancer only) is opened on every node, in the 30000-32767 range.

| Type | ClusterIP | NodePort | External LB |
|------|-----------|----------|-------------|
| ClusterIP | yes | no | no |
| NodePort | yes | yes | no |
| LoadBalancer | yes | yes | yes |

## Endpoints

A Service's selector produces an **EndpointSlice**: the list of Pod IPs that currently back it. A Service with no endpoints almost always has a selector that doesn't match any Pod labels.

```bash
kubectl describe svc frontend-svc     # look at Selector and Endpoints
kubectl get pods -l app=frontend      # do the labels match?
```

## DNS

CoreDNS gives every Service a name:

```
<service>.<namespace>.svc.cluster.local
```

Pods in the same namespace can simply use `<service>`.

## kube-proxy

`kube-proxy` runs on every node (as a DaemonSet) and programs iptables or IPVS rules so traffic to a Service's virtual IP reaches a healthy backend Pod.

> **Troubleshooting order**: Pod running? → labels match the Service selector? → Service has endpoints? → targetPort matches the container port? → DNS name resolves?
