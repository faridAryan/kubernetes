# Cluster Setup with kubeadm

kubeadm is the official Kubernetes tool for creating clusters. It performs the actions necessary to get a minimum viable cluster up and running.

## Prerequisites

- 2+ machines running a supported Linux distro
- 2 GB+ RAM per machine
- 2+ CPUs on the control plane
- Full network connectivity between all machines
- Container runtime (containerd recommended)

## Step-by-Step Setup

### 1. Install Container Runtime

```bash
# Install containerd
apt-get update
apt-get install -y containerd

# Configure containerd
mkdir -p /etc/containerd
containerd config default | tee /etc/containerd/config.toml
systemctl restart containerd
```

### 2. Install kubeadm, kubelet, kubectl

```bash
apt-get update
apt-get install -y apt-transport-https curl

curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.28/deb/Release.key | gpg --dearmor -o /etc/apt/keyrings/kubernetes.gpg

apt-get update
apt-get install -y kubelet kubeadm kubectl
apt-mark hold kubelet kubeadm kubectl
```

### 3. Initialize Control Plane

```bash
kubeadm init --pod-network-cidr=10.244.0.0/16

# Set up kubeconfig
mkdir -p $HOME/.kube
cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
```

### 4. Install Pod Network (CNI)

```bash
# Example: Flannel
kubectl apply -f https://raw.githubusercontent.com/flannel-io/flannel/master/Documentation/kube-flannel.yml
```

### 5. Join Worker Nodes

```bash
# On each worker node, use the join command from kubeadm init output
kubeadm join <control-plane-ip>:6443 --token <token> --discovery-token-ca-cert-hash sha256:<hash>
```

## Upgrading a Cluster

```bash
# On control plane
apt-get update
apt-get install -y kubeadm=1.29.0-*
kubeadm upgrade plan
kubeadm upgrade apply v1.29.0

# Upgrade kubelet and kubectl
apt-get install -y kubelet=1.29.0-* kubectl=1.29.0-*
systemctl restart kubelet
```

> **CKA Tip**: Cluster upgrades are a common exam topic. Remember to drain nodes before upgrading, upgrade control plane first, then workers one at a time.
