# What is Kubernetes?

Kubernetes (K8s) is an open-source container orchestration platform that automates the deployment, scaling, and management of containerized applications.

## Why Kubernetes?

Before Kubernetes, deploying applications was a manual and error-prone process. Kubernetes solves several key challenges:

- **Automated deployment** - Declare your desired state and Kubernetes makes it happen
- **Self-healing** - Failed containers are automatically restarted or replaced
- **Horizontal scaling** - Scale your applications up or down based on demand
- **Service discovery** - Built-in DNS and load balancing for your services
- **Rolling updates** - Update your application with zero downtime

## A Brief History

Kubernetes was originally designed by Google, based on over 15 years of experience running production workloads at scale with an internal system called **Borg**. It was open-sourced in 2014 and is now maintained by the **Cloud Native Computing Foundation (CNCF)**.

## Key Terminology

| Term | Description |
|------|-------------|
| **Cluster** | A set of machines (nodes) running Kubernetes |
| **Node** | A single machine in the cluster |
| **Pod** | The smallest deployable unit, wrapping one or more containers |
| **Service** | An abstraction that exposes pods to network traffic |
| **Namespace** | Virtual cluster for resource isolation |

## The Kubernetes Advantage

> "Kubernetes is to distributed systems what Linux is to operating systems - a foundational platform that everything else builds upon."

Kubernetes provides a **declarative API** - you tell it *what* you want, not *how* to do it. This is defined through YAML manifests:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
      - name: my-app
        image: nginx:1.25
        ports:
        - containerPort: 80
```

This manifest tells Kubernetes: "I want 3 replicas of my nginx app running." Kubernetes handles the rest.
