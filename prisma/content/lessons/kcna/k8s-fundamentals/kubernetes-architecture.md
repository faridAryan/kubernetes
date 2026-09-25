# Kubernetes Architecture

A Kubernetes cluster consists of two main types of components: the **Control Plane** and **Worker Nodes**.

## Control Plane Components

The control plane manages the overall state of the cluster:

### kube-apiserver
The API server is the front end of the Kubernetes control plane. All communication (internal and external) goes through the API server.

- Validates and processes REST requests
- Updates the cluster state in etcd
- Serves as the gateway for `kubectl` commands

### etcd
A consistent and highly-available key-value store used as Kubernetes' backing store for all cluster data.

- Stores the entire cluster configuration and state
- Only the API server communicates directly with etcd
- Should always be backed up in production

### kube-scheduler
Watches for newly created Pods with no assigned node and selects a node for them to run on.

- Considers resource requirements, constraints, and affinity rules
- Ensures optimal resource utilization across nodes

### kube-controller-manager
Runs controller processes that regulate the state of the cluster:

- **Node Controller** - Notices and responds when nodes go down
- **Replication Controller** - Maintains the correct number of pods
- **Endpoints Controller** - Populates the Endpoints object
- **Service Account Controller** - Creates default accounts for new namespaces

## Worker Node Components

### kubelet
An agent that runs on each node. It ensures containers are running in a Pod.

- Communicates with the API server
- Manages pod lifecycle on its node
- Reports node and pod status

### kube-proxy
A network proxy that runs on each node, implementing part of the Kubernetes Service concept.

- Maintains network rules on nodes
- Enables communication to your Pods from inside or outside the cluster

### Container Runtime
The software responsible for running containers (e.g., containerd, CRI-O).

## How They Work Together

```
User -> kubectl -> API Server -> etcd (store state)
                                -> Scheduler (assign pods)
                                -> Controllers (maintain state)
                                -> kubelet (run pods on nodes)
```

> **Key Insight**: Kubernetes uses a *reconciliation loop* - controllers constantly compare the desired state (in etcd) with the actual state and take action to make them match.
