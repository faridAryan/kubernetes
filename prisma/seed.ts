import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create demo user
  const hashedPassword = await bcrypt.hash("demo123", 12);
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@kubelearn.dev" },
    update: {},
    create: {
      name: "Demo User",
      email: "demo@kubelearn.dev",
      password: hashedPassword,
      xp: 350,
      level: 1,
      streak: 3,
      longestStreak: 7,
    },
  });

  // ========== KCNA Certification Path ==========
  const kcna = await prisma.certificationPath.upsert({
    where: { slug: "kcna" },
    update: {},
    create: {
      slug: "kcna",
      name: "Kubernetes and Cloud Native Associate",
      shortName: "KCNA",
      description:
        "A pre-professional certification designed for candidates interested in advancing to the professional level through a demonstrated understanding of Kubernetes and cloud native technologies.",
      icon: "🌱",
      color: "#10B981",
      difficulty: "beginner",
      totalXp: 2000,
      estimatedHours: 20,
      order: 1,
    },
  });

  // KCNA Module 1: Kubernetes Fundamentals
  const kcnaM1 = await prisma.module.upsert({
    where: { certificationId_slug: { certificationId: kcna.id, slug: "k8s-fundamentals" } },
    update: {},
    create: {
      slug: "k8s-fundamentals",
      name: "Kubernetes Fundamentals",
      description: "Core concepts of Kubernetes architecture and components",
      order: 1,
      certificationId: kcna.id,
      xpReward: 200,
    },
  });

  // Lesson 1.1: What is Kubernetes?
  const kcnaL1 = await prisma.lesson.upsert({
    where: { moduleId_slug: { moduleId: kcnaM1.id, slug: "what-is-kubernetes" } },
    update: {},
    create: {
      slug: "what-is-kubernetes",
      title: "What is Kubernetes?",
      type: "reading",
      order: 1,
      moduleId: kcnaM1.id,
      xpReward: 50,
      duration: 10,
      content: `# What is Kubernetes?

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

\`\`\`yaml
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
\`\`\`

This manifest tells Kubernetes: "I want 3 replicas of my nginx app running." Kubernetes handles the rest.`,
    },
  });

  // Lesson 1.2: Kubernetes Architecture
  const kcnaL2 = await prisma.lesson.upsert({
    where: { moduleId_slug: { moduleId: kcnaM1.id, slug: "kubernetes-architecture" } },
    update: {},
    create: {
      slug: "kubernetes-architecture",
      title: "Kubernetes Architecture",
      type: "reading",
      order: 2,
      moduleId: kcnaM1.id,
      xpReward: 50,
      duration: 15,
      content: `# Kubernetes Architecture

A Kubernetes cluster consists of two main types of components: the **Control Plane** and **Worker Nodes**.

## Control Plane Components

The control plane manages the overall state of the cluster:

### kube-apiserver
The API server is the front end of the Kubernetes control plane. All communication (internal and external) goes through the API server.

- Validates and processes REST requests
- Updates the cluster state in etcd
- Serves as the gateway for \`kubectl\` commands

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

\`\`\`
User -> kubectl -> API Server -> etcd (store state)
                                -> Scheduler (assign pods)
                                -> Controllers (maintain state)
                                -> kubelet (run pods on nodes)
\`\`\`

> **Key Insight**: Kubernetes uses a *reconciliation loop* - controllers constantly compare the desired state (in etcd) with the actual state and take action to make them match.`,
    },
  });

  // Lesson 1.3: Quiz on Fundamentals
  const kcnaL3 = await prisma.lesson.upsert({
    where: { moduleId_slug: { moduleId: kcnaM1.id, slug: "fundamentals-quiz" } },
    update: {},
    create: {
      slug: "fundamentals-quiz",
      title: "Kubernetes Fundamentals Quiz",
      type: "quiz",
      order: 3,
      moduleId: kcnaM1.id,
      xpReward: 75,
      duration: 10,
      content: "Test your understanding of Kubernetes fundamentals.",
    },
  });

  // Quiz questions for Lesson 1.3
  const questions = [
    {
      lessonId: kcnaL3.id,
      question: "Which component stores all cluster data in Kubernetes?",
      type: "multiple_choice",
      options: JSON.stringify(["kube-apiserver", "etcd", "kube-scheduler", "kubelet"]),
      correctAnswer: JSON.stringify("etcd"),
      explanation: "etcd is the consistent and highly-available key-value store that serves as Kubernetes' backing store for all cluster data.",
      order: 1,
      xpReward: 15,
    },
    {
      lessonId: kcnaL3.id,
      question: "What is the smallest deployable unit in Kubernetes?",
      type: "multiple_choice",
      options: JSON.stringify(["Container", "Pod", "Deployment", "Node"]),
      correctAnswer: JSON.stringify("Pod"),
      explanation: "A Pod is the smallest deployable unit in Kubernetes. It can contain one or more containers that share storage and network resources.",
      order: 2,
      xpReward: 15,
    },
    {
      lessonId: kcnaL3.id,
      question: "Kubernetes was originally designed by Google based on their internal system called Borg.",
      type: "true_false",
      options: JSON.stringify(["True", "False"]),
      correctAnswer: JSON.stringify("True"),
      explanation: "Kubernetes was indeed based on Google's internal Borg system, which managed containerized workloads at scale for over 15 years.",
      order: 3,
      xpReward: 10,
    },
    {
      lessonId: kcnaL3.id,
      question: "Which components run on every worker node? (Select all that apply)",
      type: "multi_select",
      options: JSON.stringify(["kubelet", "kube-proxy", "Container Runtime", "kube-scheduler", "etcd"]),
      correctAnswer: JSON.stringify(["kubelet", "kube-proxy", "Container Runtime"]),
      explanation: "kubelet, kube-proxy, and the Container Runtime all run on every worker node. kube-scheduler and etcd are control plane components.",
      order: 4,
      xpReward: 20,
    },
    {
      lessonId: kcnaL3.id,
      question: "What does the kube-scheduler do?",
      type: "multiple_choice",
      options: JSON.stringify([
        "Stores cluster state",
        "Assigns newly created pods to nodes",
        "Manages network rules",
        "Runs containers on nodes",
      ]),
      correctAnswer: JSON.stringify("Assigns newly created pods to nodes"),
      explanation: "The kube-scheduler watches for newly created Pods with no assigned node and selects the best node for them to run on based on resource requirements and constraints.",
      order: 5,
      xpReward: 15,
    },
  ];

  for (const q of questions) {
    await prisma.quizQuestion.create({ data: q });
  }

  // Lesson 1.4: First Lab - Exploring a Cluster
  const kcnaL4 = await prisma.lesson.upsert({
    where: { moduleId_slug: { moduleId: kcnaM1.id, slug: "explore-cluster-lab" } },
    update: {},
    create: {
      slug: "explore-cluster-lab",
      title: "Lab: Explore a Kubernetes Cluster",
      type: "lab",
      order: 4,
      moduleId: kcnaM1.id,
      xpReward: 100,
      duration: 15,
      content: "In this lab, you'll connect to a Kubernetes cluster and explore its components using kubectl.",
    },
  });

  await prisma.labConfig.upsert({
    where: { lessonId: kcnaL4.id },
    update: {},
    create: {
      lessonId: kcnaL4.id,
      instructions: `# Lab: Explore a Kubernetes Cluster

In this hands-on lab, you will practice basic kubectl commands to explore a running Kubernetes cluster.

## Objectives

1. Check the cluster version
2. List all nodes in the cluster
3. View all namespaces
4. List pods across all namespaces
5. Get cluster information

## Tasks

### Task 1: Check Cluster Version
Run the command to check the kubectl and server version.

### Task 2: List Nodes
View all the nodes in your cluster and their status.

### Task 3: Explore Namespaces
List all namespaces in the cluster.

### Task 4: View System Pods
List all pods running in all namespaces.

### Task 5: Cluster Info
Display the cluster endpoint information.`,
      initScript: "echo 'Cluster ready'",
      validationScript: JSON.stringify([
        { command: "kubectl version", pattern: "version" },
        { command: "kubectl get nodes", pattern: "get nodes" },
        { command: "kubectl get namespaces", pattern: "get namespace" },
        { command: "kubectl get pods -A", pattern: "get pods" },
        { command: "kubectl cluster-info", pattern: "cluster-info" },
      ]),
      hints: JSON.stringify([
        "Use 'kubectl version' to check the cluster version",
        "Use 'kubectl get nodes' to list all nodes",
        "Use 'kubectl get namespaces' or 'kubectl get ns' to list namespaces",
        "Use 'kubectl get pods -A' to list pods in all namespaces",
        "Use 'kubectl cluster-info' to see cluster endpoint info",
      ]),
      timeLimit: 15,
    },
  });

  // KCNA Module 2: Cloud Native Concepts
  const kcnaM2 = await prisma.module.upsert({
    where: { certificationId_slug: { certificationId: kcna.id, slug: "cloud-native-concepts" } },
    update: {},
    create: {
      slug: "cloud-native-concepts",
      name: "Cloud Native Concepts",
      description: "Understanding containers, microservices, and cloud native principles",
      order: 2,
      certificationId: kcna.id,
      xpReward: 200,
    },
  });

  await prisma.lesson.upsert({
    where: { moduleId_slug: { moduleId: kcnaM2.id, slug: "containers-101" } },
    update: {},
    create: {
      slug: "containers-101",
      title: "Containers 101",
      type: "reading",
      order: 1,
      moduleId: kcnaM2.id,
      xpReward: 50,
      duration: 12,
      content: `# Containers 101

## What are Containers?

Containers are lightweight, standalone, executable packages that include everything needed to run a piece of software: code, runtime, system tools, libraries, and settings.

## Containers vs Virtual Machines

| Feature | Containers | VMs |
|---------|-----------|-----|
| **Boot time** | Seconds | Minutes |
| **Size** | MBs | GBs |
| **OS** | Shares host kernel | Full OS per VM |
| **Isolation** | Process-level | Hardware-level |
| **Density** | 1000s per host | Tens per host |

## Container Images

A container image is a lightweight, standalone, and executable software package that includes:

- Application code
- Runtime environment
- System libraries
- Configuration files

\`\`\`dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
\`\`\`

## Container Registries

Container images are stored in **registries**:

- **Docker Hub** - Public registry with millions of images
- **Google Container Registry (GCR)** - Google's managed registry
- **Amazon ECR** - AWS managed registry
- **GitHub Container Registry** - GitHub's registry

## The OCI Standard

The **Open Container Initiative (OCI)** defines industry standards for container formats and runtimes, ensuring portability across different platforms.

> **Key Takeaway**: Containers solve the "it works on my machine" problem by packaging applications with all their dependencies.`,
    },
  });

  await prisma.lesson.upsert({
    where: { moduleId_slug: { moduleId: kcnaM2.id, slug: "microservices-architecture" } },
    update: {},
    create: {
      slug: "microservices-architecture",
      title: "Microservices Architecture",
      type: "reading",
      order: 2,
      moduleId: kcnaM2.id,
      xpReward: 50,
      duration: 12,
      content: `# Microservices Architecture

## Monolith vs Microservices

### Monolithic Architecture
A monolithic application is built as a single, unified unit. All components are interconnected and interdependent.

### Microservices Architecture
An application is composed of small, independent services that communicate over well-defined APIs.

## Key Principles

- **Single Responsibility** - Each service does one thing well
- **Independently Deployable** - Services can be updated without affecting others
- **Decentralized Data** - Each service manages its own data
- **Fault Isolation** - A failure in one service doesn't cascade
- **Technology Agnostic** - Different services can use different tech stacks

## Communication Patterns

### Synchronous
- **REST APIs** - HTTP-based request/response
- **gRPC** - High-performance RPC framework

### Asynchronous
- **Message Queues** - RabbitMQ, Apache Kafka
- **Event-Driven** - Services react to events

## Why Kubernetes for Microservices?

Kubernetes is the ideal platform for microservices because it provides:

1. **Service Discovery** - Services find each other automatically
2. **Load Balancing** - Traffic distributed across service instances
3. **Scaling** - Scale individual services based on demand
4. **Health Checks** - Automatic restart of unhealthy services
5. **Rolling Updates** - Deploy new versions with zero downtime

> **Cloud Native Principle**: Design for failure, automate everything, and treat infrastructure as code.`,
    },
  });

  // ========== CKA Certification Path ==========
  const cka = await prisma.certificationPath.upsert({
    where: { slug: "cka" },
    update: {},
    create: {
      slug: "cka",
      name: "Certified Kubernetes Administrator",
      shortName: "CKA",
      description:
        "The CKA program provides assurance that CKAs have the skills, knowledge, and competency to perform the responsibilities of Kubernetes administrators. Focus on cluster architecture, workloads, services, networking, storage, and troubleshooting.",
      icon: "⚙️",
      color: "#326CE5",
      difficulty: "intermediate",
      totalXp: 5000,
      estimatedHours: 40,
      order: 2,
    },
  });

  const ckaM1 = await prisma.module.upsert({
    where: { certificationId_slug: { certificationId: cka.id, slug: "cluster-architecture" } },
    update: {},
    create: {
      slug: "cluster-architecture",
      name: "Cluster Architecture, Installation & Configuration",
      description: "Setting up and configuring Kubernetes clusters (25% of exam)",
      order: 1,
      certificationId: cka.id,
      xpReward: 300,
    },
  });

  await prisma.lesson.upsert({
    where: { moduleId_slug: { moduleId: ckaM1.id, slug: "rbac-authorization" } },
    update: {},
    create: {
      slug: "rbac-authorization",
      title: "RBAC Authorization",
      type: "reading",
      order: 1,
      moduleId: ckaM1.id,
      xpReward: 60,
      duration: 20,
      content: `# Role-Based Access Control (RBAC)

RBAC is a method of regulating access to Kubernetes resources based on the roles of individual users within your organization.

## RBAC API Objects

### Role and ClusterRole
A **Role** sets permissions within a specific namespace. A **ClusterRole** sets permissions cluster-wide.

\`\`\`yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: default
  name: pod-reader
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "watch", "list"]
\`\`\`

### RoleBinding and ClusterRoleBinding
Binds a Role/ClusterRole to a user, group, or service account.

\`\`\`yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: default
subjects:
- kind: User
  name: jane
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
\`\`\`

## Common RBAC Patterns

- **Least Privilege** - Grant only the permissions needed
- **Namespace Isolation** - Use Roles for namespace-scoped access
- **Service Accounts** - Create dedicated service accounts for applications
- **Aggregated ClusterRoles** - Combine multiple roles

## Key kubectl Commands

\`\`\`bash
# Check if you can perform an action
kubectl auth can-i create deployments --namespace dev

# Create a role
kubectl create role pod-reader --verb=get,list,watch --resource=pods

# Create a rolebinding
kubectl create rolebinding pod-reader-binding --role=pod-reader --user=jane

# View roles
kubectl get roles -A
kubectl describe role pod-reader
\`\`\`

> **CKA Tip**: RBAC questions are very common on the CKA exam. Practice creating roles and bindings quickly using both YAML and imperative commands.`,
    },
  });

  await prisma.lesson.upsert({
    where: { moduleId_slug: { moduleId: ckaM1.id, slug: "kubeadm-cluster-setup" } },
    update: {},
    create: {
      slug: "kubeadm-cluster-setup",
      title: "Cluster Setup with kubeadm",
      type: "reading",
      order: 2,
      moduleId: ckaM1.id,
      xpReward: 60,
      duration: 20,
      content: `# Cluster Setup with kubeadm

kubeadm is the official Kubernetes tool for creating clusters. It performs the actions necessary to get a minimum viable cluster up and running.

## Prerequisites

- 2+ machines running a supported Linux distro
- 2 GB+ RAM per machine
- 2+ CPUs on the control plane
- Full network connectivity between all machines
- Container runtime (containerd recommended)

## Step-by-Step Setup

### 1. Install Container Runtime

\`\`\`bash
# Install containerd
apt-get update
apt-get install -y containerd

# Configure containerd
mkdir -p /etc/containerd
containerd config default | tee /etc/containerd/config.toml
systemctl restart containerd
\`\`\`

### 2. Install kubeadm, kubelet, kubectl

\`\`\`bash
apt-get update
apt-get install -y apt-transport-https curl

curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.28/deb/Release.key | gpg --dearmor -o /etc/apt/keyrings/kubernetes.gpg

apt-get update
apt-get install -y kubelet kubeadm kubectl
apt-mark hold kubelet kubeadm kubectl
\`\`\`

### 3. Initialize Control Plane

\`\`\`bash
kubeadm init --pod-network-cidr=10.244.0.0/16

# Set up kubeconfig
mkdir -p $HOME/.kube
cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
\`\`\`

### 4. Install Pod Network (CNI)

\`\`\`bash
# Example: Flannel
kubectl apply -f https://raw.githubusercontent.com/flannel-io/flannel/master/Documentation/kube-flannel.yml
\`\`\`

### 5. Join Worker Nodes

\`\`\`bash
# On each worker node, use the join command from kubeadm init output
kubeadm join <control-plane-ip>:6443 --token <token> --discovery-token-ca-cert-hash sha256:<hash>
\`\`\`

## Upgrading a Cluster

\`\`\`bash
# On control plane
apt-get update
apt-get install -y kubeadm=1.29.0-*
kubeadm upgrade plan
kubeadm upgrade apply v1.29.0

# Upgrade kubelet and kubectl
apt-get install -y kubelet=1.29.0-* kubectl=1.29.0-*
systemctl restart kubelet
\`\`\`

> **CKA Tip**: Cluster upgrades are a common exam topic. Remember to drain nodes before upgrading, upgrade control plane first, then workers one at a time.`,
    },
  });

  const ckaM2 = await prisma.module.upsert({
    where: { certificationId_slug: { certificationId: cka.id, slug: "workloads-scheduling" } },
    update: {},
    create: {
      slug: "workloads-scheduling",
      name: "Workloads & Scheduling",
      description: "Managing pods, deployments, and scheduling (15% of exam)",
      order: 2,
      certificationId: cka.id,
      xpReward: 250,
    },
  });

  await prisma.lesson.upsert({
    where: { moduleId_slug: { moduleId: ckaM2.id, slug: "deployments-rollouts" } },
    update: {},
    create: {
      slug: "deployments-rollouts",
      title: "Deployments and Rolling Updates",
      type: "reading",
      order: 1,
      moduleId: ckaM2.id,
      xpReward: 50,
      duration: 15,
      content: `# Deployments and Rolling Updates

A Deployment provides declarative updates for Pods and ReplicaSets.

## Creating a Deployment

\`\`\`yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 1
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.24
        ports:
        - containerPort: 80
\`\`\`

## Rolling Update Strategy

- **maxSurge** - Maximum number of pods created above the desired count
- **maxUnavailable** - Maximum number of pods that can be unavailable

\`\`\`bash
# Update image
kubectl set image deployment/nginx-deployment nginx=nginx:1.25

# Check rollout status
kubectl rollout status deployment/nginx-deployment

# View rollout history
kubectl rollout history deployment/nginx-deployment

# Rollback to previous version
kubectl rollout undo deployment/nginx-deployment

# Rollback to specific revision
kubectl rollout undo deployment/nginx-deployment --to-revision=2

# Scale deployment
kubectl scale deployment/nginx-deployment --replicas=5
\`\`\`

## Deployment Strategies

| Strategy | Description |
|----------|-------------|
| **RollingUpdate** | Gradually replaces old pods with new ones |
| **Recreate** | Kills all old pods before creating new ones |

> **Best Practice**: Always set resource requests and limits in your deployment specs to ensure proper scheduling and prevent resource contention.`,
    },
  });

  // ========== CKAD Certification Path ==========
  const ckad = await prisma.certificationPath.upsert({
    where: { slug: "ckad" },
    update: {},
    create: {
      slug: "ckad",
      name: "Certified Kubernetes Application Developer",
      shortName: "CKAD",
      description:
        "The CKAD exam certifies that candidates can design, build, configure, and expose cloud native applications for Kubernetes. Focus on application design, deployment, observability, and services.",
      icon: "🚀",
      color: "#8B5CF6",
      difficulty: "intermediate",
      totalXp: 4500,
      estimatedHours: 35,
      order: 3,
    },
  });

  const ckadM1 = await prisma.module.upsert({
    where: { certificationId_slug: { certificationId: ckad.id, slug: "app-design-build" } },
    update: {},
    create: {
      slug: "app-design-build",
      name: "Application Design and Build",
      description: "Designing and building containerized applications (20% of exam)",
      order: 1,
      certificationId: ckad.id,
      xpReward: 250,
    },
  });

  await prisma.lesson.upsert({
    where: { moduleId_slug: { moduleId: ckadM1.id, slug: "multi-container-pods" } },
    update: {},
    create: {
      slug: "multi-container-pods",
      title: "Multi-Container Pod Patterns",
      type: "reading",
      order: 1,
      moduleId: ckadM1.id,
      xpReward: 50,
      duration: 15,
      content: `# Multi-Container Pod Patterns

Pods can contain multiple containers that work together. There are three main patterns:

## 1. Sidecar Pattern

A sidecar container enhances the main container's functionality.

\`\`\`yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-with-logging
spec:
  containers:
  - name: web
    image: nginx
    volumeMounts:
    - name: logs
      mountPath: /var/log/nginx
  - name: log-shipper
    image: fluentd
    volumeMounts:
    - name: logs
      mountPath: /var/log/nginx
  volumes:
  - name: logs
    emptyDir: {}
\`\`\`

**Use cases**: Logging agents, monitoring, sync processes

## 2. Ambassador Pattern

An ambassador container proxies network connections to the main container.

**Use cases**: Database proxy, API gateway, connection pooling

## 3. Adapter Pattern

An adapter container transforms the main container's output.

**Use cases**: Log format conversion, monitoring data adaptation

## Shared Resources

Containers in a pod share:
- **Network namespace** - Same IP address, communicate via localhost
- **Storage volumes** - Can mount the same volumes
- **Process namespace** (optional) - Can see each other's processes

> **CKAD Tip**: Know all three patterns and when to use each. Exam questions often describe a scenario and ask you to implement the right pattern.`,
    },
  });

  // ========== CKS Certification Path ==========
  const cks = await prisma.certificationPath.upsert({
    where: { slug: "cks" },
    update: {},
    create: {
      slug: "cks",
      name: "Certified Kubernetes Security Specialist",
      shortName: "CKS",
      description:
        "The CKS program provides assurance that a CKS has the skills, knowledge, and competency to secure container-based applications and Kubernetes platforms. Covers cluster setup, system hardening, supply chain security, and runtime security.",
      icon: "🛡️",
      color: "#EF4444",
      difficulty: "advanced",
      totalXp: 6000,
      estimatedHours: 50,
      order: 4,
    },
  });

  const cksM1 = await prisma.module.upsert({
    where: { certificationId_slug: { certificationId: cks.id, slug: "cluster-hardening" } },
    update: {},
    create: {
      slug: "cluster-hardening",
      name: "Cluster Hardening",
      description: "Securing the Kubernetes cluster (15% of exam)",
      order: 1,
      certificationId: cks.id,
      xpReward: 350,
    },
  });

  await prisma.lesson.upsert({
    where: { moduleId_slug: { moduleId: cksM1.id, slug: "network-policies" } },
    update: {},
    create: {
      slug: "network-policies",
      title: "Network Policies",
      type: "reading",
      order: 1,
      moduleId: cksM1.id,
      xpReward: 60,
      duration: 20,
      content: `# Network Policies

Network Policies are Kubernetes resources that control traffic flow between pods at the IP address or port level (OSI layer 3 or 4).

## Default Behavior

By default, all pods in a cluster can communicate with any other pod. Network Policies allow you to restrict this.

## Creating a Network Policy

\`\`\`yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-ingress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Ingress
\`\`\`

This policy denies ALL ingress traffic to ALL pods in the "production" namespace.

## Allow Specific Traffic

\`\`\`yaml
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
\`\`\`

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

> **CKS Tip**: Network Policies are heavily tested. Practice writing policies from scratch, especially deny-all + selective allow patterns.`,
    },
  });

  // ========== Badges ==========
  const badges = [
    {
      slug: "first-lesson",
      name: "First Steps",
      description: "Complete your first lesson",
      icon: "🎯",
      category: "achievement",
      requirement: JSON.stringify({ type: "lessons_completed", count: 1 }),
      xpReward: 25,
    },
    {
      slug: "five-lessons",
      name: "Quick Learner",
      description: "Complete 5 lessons",
      icon: "📚",
      category: "achievement",
      requirement: JSON.stringify({ type: "lessons_completed", count: 5 }),
      xpReward: 50,
    },
    {
      slug: "quiz-master",
      name: "Quiz Master",
      description: "Score 100% on any quiz",
      icon: "🧠",
      category: "skill",
      requirement: JSON.stringify({ type: "perfect_quiz", count: 1 }),
      xpReward: 75,
    },
    {
      slug: "lab-rat",
      name: "Lab Rat",
      description: "Complete your first lab",
      icon: "🔬",
      category: "skill",
      requirement: JSON.stringify({ type: "labs_completed", count: 1 }),
      xpReward: 50,
    },
    {
      slug: "streak-7",
      name: "Week Warrior",
      description: "Maintain a 7-day streak",
      icon: "🔥",
      category: "streak",
      requirement: JSON.stringify({ type: "streak", count: 7 }),
      xpReward: 100,
    },
    {
      slug: "streak-30",
      name: "Monthly Master",
      description: "Maintain a 30-day streak",
      icon: "💎",
      category: "streak",
      requirement: JSON.stringify({ type: "streak", count: 30 }),
      xpReward: 300,
    },
    {
      slug: "kcna-complete",
      name: "KCNA Graduate",
      description: "Complete the KCNA certification path",
      icon: "🌱",
      category: "certification",
      requirement: JSON.stringify({ type: "cert_complete", cert: "kcna" }),
      xpReward: 500,
    },
    {
      slug: "cka-complete",
      name: "CKA Graduate",
      description: "Complete the CKA certification path",
      icon: "⚙️",
      category: "certification",
      requirement: JSON.stringify({ type: "cert_complete", cert: "cka" }),
      xpReward: 750,
    },
    {
      slug: "kubectl-ninja",
      name: "kubectl Ninja",
      description: "Complete 10 labs",
      icon: "🥷",
      category: "skill",
      requirement: JSON.stringify({ type: "labs_completed", count: 10 }),
      xpReward: 200,
    },
    {
      slug: "level-10",
      name: "Helm Hero",
      description: "Reach level 10",
      icon: "🦸",
      category: "achievement",
      requirement: JSON.stringify({ type: "level", count: 10 }),
      xpReward: 250,
    },
  ];

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { slug: badge.slug },
      update: {},
      create: badge,
    });
  }

  console.log("Seeding complete!");
  console.log(`
Demo credentials:
  Email: demo@kubelearn.dev
  Password: demo123
  `);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
