# Workloads, Services and Labels

Almost everything you run on Kubernetes is built from three ideas: **workloads** that run containers, **Services** that give them a stable network identity, and **labels** that tie the two together.

## Pods

A Pod is one or more containers that share a network namespace and storage. Pods are *ephemeral*: when a node fails or a Pod is deleted, it is gone for good. You rarely create Pods directly in production.

```bash
kubectl run web --image=nginx:1.27
kubectl get pods -o wide
```

## Deployments

A Deployment manages a ReplicaSet, which keeps a desired number of identical Pods running. If a Pod dies, the ReplicaSet creates a replacement.

```bash
kubectl create deployment hello --image=nginx:1.27 --replicas=2
kubectl scale deployment hello --replicas=3
```

| Workload | Use it for |
|----------|------------|
| **Deployment** | Stateless apps (web servers, APIs) |
| **StatefulSet** | Apps that need stable identity and storage (databases) |
| **DaemonSet** | One Pod per node (log agents, kube-proxy) |
| **Job / CronJob** | Run-to-completion and scheduled tasks |

## Labels and selectors

Labels are key/value pairs attached to any object. Selectors query them.

```bash
kubectl get pods -l app=hello
kubectl get pods --show-labels
```

`kubectl create deployment hello` automatically labels its Pods with `app=hello`, and the Deployment uses that label to find the Pods it owns.

## Services

Pod IPs change every time a Pod is recreated. A **Service** gives a set of Pods one stable virtual IP and DNS name, and load-balances across the Pods that match its selector.

```bash
kubectl expose deployment hello --port=80
kubectl get svc hello
```

| Type | Reachable from |
|------|----------------|
| **ClusterIP** (default) | Inside the cluster only |
| **NodePort** | Every node's IP on a port in 30000-32767 |
| **LoadBalancer** | An external cloud load balancer |

> **Key Insight**: Services don't know about Deployments. They only match labels, so any Pod with the right labels receives traffic.
