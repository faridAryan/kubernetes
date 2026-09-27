import type { CertificationContent } from "./types";

export const cka: CertificationContent = {
  slug: "cka",
  name: "Certified Kubernetes Administrator",
  shortName: "CKA",
  description:
    "The CKA program provides assurance that CKAs have the skills, knowledge, and competency to perform the responsibilities of Kubernetes administrators. Focus on cluster architecture, workloads, services, networking, storage, and troubleshooting.",
  icon: "⚙️",
  color: "#326CE5",
  difficulty: "intermediate",
  estimatedHours: 40,
  order: 2,
  exam: { questions: 15, minutes: 30, passPercent: 66 },
  modules: [
    {
      slug: "cluster-architecture",
      name: "Cluster Architecture, Installation & Configuration",
      description: "Setting up and configuring Kubernetes clusters (25% of exam)",
      xp: 300,
      lessons: [
        { type: "reading", slug: "rbac-authorization", title: "RBAC Authorization", duration: 20, xp: 60 },
        { type: "reading", slug: "kubeadm-cluster-setup", title: "Cluster Setup with kubeadm", duration: 20, xp: 60 },
        {
          type: "quiz",
          slug: "cluster-architecture-quiz",
          title: "Cluster Architecture Quiz",
          duration: 10,
          xp: 75,
          intro: "Test your knowledge of RBAC and cluster installation.",
          questions: [
            {
              question: "Which object grants the permissions of a Role to a user or ServiceAccount?",
              type: "multiple_choice",
              options: ["RoleBinding", "ClusterRole", "ServiceAccount", "NetworkPolicy"],
              answer: "RoleBinding",
              explanation: "A RoleBinding attaches a Role (or ClusterRole) to subjects within one namespace.",
            },
            {
              question: "A Role can grant access to resources in every namespace of the cluster.",
              type: "true_false",
              options: ["True", "False"],
              answer: "False",
              explanation: "Roles are namespaced. Use a ClusterRole with a ClusterRoleBinding for cluster-wide access.",
            },
            {
              question: "Which command initialises a new control plane node with kubeadm?",
              type: "multiple_choice",
              options: ["kubeadm init", "kubeadm join", "kubeadm start", "kubectl init"],
              answer: "kubeadm init",
              explanation: "kubeadm init bootstraps the control plane. Worker nodes are added with kubeadm join.",
            },
            {
              question: "Which of these are valid RBAC verbs? (Select all that apply)",
              type: "multi_select",
              options: ["get", "list", "watch", "execute"],
              answer: ["get", "list", "watch"],
              explanation: "Kubernetes RBAC verbs include get, list, watch, create, update, patch and delete. 'execute' isn't one of them.",
            },
            {
              question: "How do you check whether a ServiceAccount 'ci' in namespace 'dev' may create Pods?",
              type: "multiple_choice",
              options: [
                "kubectl auth can-i create pods --as=system:serviceaccount:dev:ci -n dev",
                "kubectl get rolebindings --user=ci",
                "kubectl describe sa ci --permissions",
                "kubeadm check permissions ci",
              ],
              answer: "kubectl auth can-i create pods --as=system:serviceaccount:dev:ci -n dev",
              explanation: "kubectl auth can-i with --as impersonates a subject and asks the API server whether the action is allowed.",
            },
          ],
        },
        {
          type: "lab",
          slug: "rbac-lab",
          title: "Lab: RBAC for a Deployment Bot",
          duration: 20,
          xp: 120,
          intro: "Give a CI ServiceAccount exactly the permissions it needs.",
          solution: {
            explanation: "A Role lists verbs on resources inside one namespace, and a RoleBinding grants it to a subject. ServiceAccounts are written namespace:name in --serviceaccount.",
            commands: [
              "kubectl create serviceaccount deployer -n dev",
              "kubectl create role pod-manager --verb=get,list,create,delete --resource=pods -n dev",
              "kubectl create rolebinding deployer-binding --role=pod-manager --serviceaccount=dev:deployer -n dev",
              "kubectl auth can-i delete pods --as=system:serviceaccount:dev:deployer -n dev",
            ],
          },
          timeLimit: 25,
          hints: [
            "kubectl create serviceaccount deployer -n dev",
            "kubectl create role pod-manager --verb=get,list,create,delete --resource=pods -n dev",
            "kubectl create rolebinding deployer-binding --role=pod-manager --serviceaccount=dev:deployer -n dev",
            "kubectl auth can-i delete pods --as=system:serviceaccount:dev:deployer -n dev",
          ],
          initialState: [{ kind: "Namespace", name: "dev" }],
          checks: [
            { type: "exists", description: "ServiceAccount deployer exists in dev", kind: "ServiceAccount", name: "deployer", namespace: "dev" },
            { type: "exists", description: "Role pod-manager allows get/list/create/delete on pods", kind: "Role", name: "pod-manager", namespace: "dev", match: { verbs: ["get", "list", "create", "delete"], resources: ["pods"] } },
            { type: "exists", description: "RoleBinding deployer-binding binds pod-manager to deployer", kind: "RoleBinding", name: "deployer-binding", namespace: "dev", match: { role: "pod-manager", subjects: ["ServiceAccount:dev:deployer"] } },
            { type: "command", description: "Verified access with kubectl auth can-i", pattern: "auth\\s+can-i" },
          ],
        },
      ],
    },
    {
      slug: "workloads-scheduling",
      name: "Workloads & Scheduling",
      description: "Managing pods, deployments, and scheduling (15% of exam)",
      xp: 250,
      lessons: [
        { type: "reading", slug: "deployments-rollouts", title: "Deployments and Rolling Updates", duration: 15, xp: 50 },
        { type: "reading", slug: "scheduling-and-maintenance", title: "Scheduling and Node Maintenance", duration: 20, xp: 60 },
        { type: "reading", slug: "resources-and-quotas", title: "Resources, Limits and Quotas", duration: 15, xp: 60 },
        {
          type: "quiz",
          slug: "workloads-quiz",
          title: "Workloads & Scheduling Quiz",
          duration: 10,
          xp: 75,
          intro: "Test your knowledge of rollouts, taints and node maintenance.",
          questions: [
            {
              question: "Which command reverts a Deployment to its previous revision?",
              type: "multiple_choice",
              options: ["kubectl rollout undo deployment/web", "kubectl rollback deployment/web", "kubectl revert deployment/web", "kubectl set image --previous"],
              answer: "kubectl rollout undo deployment/web",
              explanation: "kubectl rollout undo returns to the previous revision, or to a specific one with --to-revision.",
            },
            {
              question: "Which taint effect also evicts Pods that are already running on the node?",
              type: "multiple_choice",
              options: ["NoSchedule", "PreferNoSchedule", "NoExecute", "NoEvict"],
              answer: "NoExecute",
              explanation: "NoExecute blocks new Pods and evicts running Pods that don't tolerate the taint.",
            },
            {
              question: "kubectl drain automatically marks the node unschedulable.",
              type: "true_false",
              options: ["True", "False"],
              answer: "True",
              explanation: "drain cordons the node first, then evicts its Pods. You must uncordon it afterwards.",
            },
            {
              question: "Why does kubectl drain fail without --ignore-daemonsets on most nodes?",
              type: "multiple_choice",
              options: [
                "DaemonSet Pods would be recreated on the same node immediately",
                "DaemonSets can't be deleted",
                "The node is still Ready",
                "The scheduler is paused",
              ],
              answer: "DaemonSet Pods would be recreated on the same node immediately",
              explanation: "The DaemonSet controller ignores cordons and puts its Pods back, so drain asks you to explicitly ignore them.",
            },
            {
              question: "Which settings control a rolling update's pace? (Select all that apply)",
              type: "multi_select",
              options: ["maxSurge", "maxUnavailable", "replicas", "revisionHistoryLimit"],
              answer: ["maxSurge", "maxUnavailable"],
              explanation: "maxSurge limits extra Pods above the desired count, and maxUnavailable limits how many can be down during the update.",
            },
            {
              question: "A namespace has a ResourceQuota on requests.memory. What happens to a new Pod that sets no memory request?",
              type: "multiple_choice",
              options: [
                "It is rejected: failed quota ... must specify requests.memory",
                "It gets a default request of 0",
                "It is scheduled on the control plane",
                "It runs as BestEffort",
              ],
              answer: "It is rejected: failed quota ... must specify requests.memory",
              explanation: "When a quota tracks a compute resource, every new Pod must declare it (or get it from a LimitRange default).",
            },
            {
              question: "A container exceeds its memory limit. What happens?",
              type: "multiple_choice",
              options: ["It is OOMKilled (exit code 137)", "It is throttled", "The node is drained", "The limit is raised automatically"],
              answer: "It is OOMKilled (exit code 137)",
              explanation: "Memory can't be throttled, so the kernel kills the process. CPU over the limit is throttled instead.",
            },
          ],
        },
        {
          type: "lab",
          slug: "rolling-update-lab",
          title: "Lab: Rolling Update and Rollback",
          duration: 20,
          xp: 120,
          intro: "Update a Deployment, scale it and roll back a bad release.",
          solution: {
            explanation: "Each image change is a new revision. Scaling isn't, so after scaling to 5 a rollout undo brings back nginx:1.25 and keeps 5 replicas.",
            commands: [
              "kubectl set image deployment/api nginx=nginx:1.26",
              "kubectl rollout status deployment/api",
              "kubectl rollout history deployment/api",
              "kubectl scale deployment api --replicas=5",
              "kubectl rollout undo deployment/api",
            ],
          },
          timeLimit: 25,
          hints: [
            "kubectl set image deployment/api nginx=nginx:1.26",
            "kubectl rollout status deployment/api and kubectl rollout history deployment/api",
            "kubectl scale deployment api --replicas=5",
            "kubectl rollout undo deployment/api",
          ],
          initialState: [
            { kind: "Deployment", name: "api", namespace: "default", image: "nginx:1.25", replicas: 3, revisions: ["nginx:1.25"], labels: { app: "api" } },
          ],
          checks: [
            { type: "command", description: "Updated the image with kubectl set image", pattern: "set\\s+image\\s+(deployment|deploy)[\\s/]+api\\b.*nginx:1\\.26" },
            { type: "command", description: "Rolled back with kubectl rollout undo", pattern: "rollout\\s+undo" },
            { type: "exists", description: "api runs nginx:1.25 with 5 replicas", kind: "Deployment", name: "api", namespace: "default", match: { image: "nginx:1.25", replicas: 5 } },
          ],
        },
        {
          type: "lab",
          slug: "node-maintenance-lab",
          title: "Lab: Node Maintenance and Taints",
          duration: 25,
          xp: 150,
          intro: "Drain a node for maintenance and dedicate another to GPU workloads.",
          solution: {
            explanation: "drain cordons the node and evicts its Pods (DaemonSet Pods need --ignore-daemonsets). After maintenance, uncordon it. The NoSchedule taint keeps regular Pods off worker-2.",
            commands: [
              "kubectl drain worker-1 --ignore-daemonsets",
              "kubectl get pods -o wide",
              "kubectl uncordon worker-1",
              "kubectl label node worker-2 accelerator=nvidia",
              "kubectl taint nodes worker-2 gpu=true:NoSchedule",
            ],
          },
          timeLimit: 30,
          hints: [
            "kubectl drain worker-1 --ignore-daemonsets",
            "kubectl get pods -o wide",
            "kubectl uncordon worker-1",
            "kubectl label node worker-2 accelerator=nvidia",
            "kubectl taint nodes worker-2 gpu=true:NoSchedule",
          ],
          initialState: [
            { kind: "Deployment", name: "shop", namespace: "default", image: "nginx:1.27", replicas: 4, revisions: ["nginx:1.27"], labels: { app: "shop" } },
          ],
          checks: [
            { type: "command", description: "Drained worker-1", pattern: "drain\\s+worker-1\\b.*--ignore-daemonsets" },
            { type: "exists", description: "worker-1 is schedulable again", kind: "Node", name: "worker-1", match: { schedulable: true } },
            { type: "exists", description: "worker-2 is labelled and tainted for GPUs", kind: "Node", name: "worker-2", match: { labels: { accelerator: "nvidia" }, taints: ["gpu=true:NoSchedule"] } },
            { type: "pods", description: "4 shop Pods run, none on worker-2", namespace: "default", selector: { app: "shop" }, running: 4, notOnNode: "worker-2" },
          ],
        },
        {
          type: "lab",
          slug: "namespace-quota-lab",
          title: "Lab: Namespace Quotas",
          duration: 20,
          xp: 150,
          intro: "Give a team a resource budget and see how it's enforced.",
          solution: {
            explanation: "Once a quota tracks requests, every Pod must declare them, so web first needs requests. Then the pods=6 limit caps the Deployment and the ReplicaSet reports FailedCreate events for the rest.",
            commands: [
              "kubectl create quota team-quota --hard=pods=6,requests.cpu=1,requests.memory=1Gi -n team-a",
              "kubectl get events -n team-a",
              "kubectl set resources deployment/web --requests=cpu=100m,memory=128Mi -n team-a",
              "kubectl scale deployment web --replicas=8 -n team-a",
              "kubectl describe quota team-quota -n team-a",
            ],
          },
          timeLimit: 25,
          hints: [
            "kubectl create quota team-quota --hard=pods=6,requests.cpu=1,requests.memory=1Gi -n team-a",
            "kubectl get events -n team-a",
            "kubectl set resources deployment/web --requests=cpu=100m,memory=128Mi -n team-a",
            "kubectl scale deployment web --replicas=8 -n team-a",
            "kubectl describe quota team-quota -n team-a",
          ],
          initialState: [
            { kind: "Namespace", name: "team-a" },
            { kind: "Deployment", name: "web", namespace: "team-a", image: "nginx:1.27", replicas: 3, revisions: ["nginx:1.27"], labels: { app: "web" } },
          ],
          checks: [
            { type: "exists", description: "team-quota limits pods, requests.cpu and requests.memory", kind: "ResourceQuota", name: "team-quota", namespace: "team-a", match: { hard: { pods: "6", "requests.cpu": "1", "requests.memory": "1Gi" } } },
            { type: "exists", description: "web requests cpu=100m, memory=128Mi and wants 8 replicas", kind: "Deployment", name: "web", namespace: "team-a", match: { replicas: 8, resources: { requests: { cpu: "100m", memory: "128Mi" } } } },
            { type: "pods", description: "The quota caps web at 6 running Pods", namespace: "team-a", selector: { app: "web" }, running: 6 },
            { type: "command", description: "Checked why Pods were refused (events or describe quota)", pattern: "(get\\s+(events|ev)|describe\\s+(quota|resourcequota))" },
          ],
        },
      ],
    },
    {
      slug: "services-networking",
      name: "Services & Networking",
      description: "Service types, endpoints, DNS and kube-proxy (20% of exam)",
      xp: 250,
      lessons: [
        { type: "reading", slug: "services-and-networking", title: "Services and Cluster Networking", duration: 20, xp: 60 },
        {
          type: "quiz",
          slug: "networking-quiz",
          title: "Services & Networking Quiz",
          duration: 10,
          xp: 75,
          intro: "Test your understanding of Services and cluster networking.",
          questions: [
            {
              question: "What is the default NodePort range?",
              type: "multiple_choice",
              options: ["30000-32767", "1-1024", "8000-9000", "20000-25000"],
              answer: "30000-32767",
              explanation: "NodePorts are allocated from 30000-32767 unless the API server's --service-node-port-range is changed.",
            },
            {
              question: "What is the fully qualified DNS name of Service 'api' in namespace 'shop'?",
              type: "multiple_choice",
              options: ["api.shop.svc.cluster.local", "shop.api.cluster.local", "api.svc.shop.local", "api.cluster.shop"],
              answer: "api.shop.svc.cluster.local",
              explanation: "Service DNS names follow <service>.<namespace>.svc.cluster.local.",
            },
            {
              question: "A Service shows no endpoints. What are the most likely causes? (Select all that apply)",
              type: "multi_select",
              options: [
                "The selector doesn't match any Pod labels",
                "The matching Pods aren't ready",
                "The Service type is ClusterIP",
                "The namespace has too many Services",
              ],
              answer: ["The selector doesn't match any Pod labels", "The matching Pods aren't ready"],
              explanation: "Endpoints only include ready Pods whose labels match the selector. The Service type doesn't affect endpoints.",
            },
            {
              question: "Which component programs iptables or IPVS rules for Services on each node?",
              type: "multiple_choice",
              options: ["kube-proxy", "kubelet", "CoreDNS", "kube-controller-manager"],
              answer: "kube-proxy",
              explanation: "kube-proxy watches Services and EndpointSlices and programs the node's forwarding rules.",
            },
            {
              question: "A LoadBalancer Service also gets a ClusterIP and a NodePort.",
              type: "true_false",
              options: ["True", "False"],
              answer: "True",
              explanation: "LoadBalancer builds on NodePort, which builds on ClusterIP. The cloud load balancer forwards to the node ports.",
            },
          ],
        },
        {
          type: "lab",
          slug: "expose-service-lab",
          title: "Lab: Expose a Service with NodePort",
          duration: 15,
          xp: 100,
          intro: "Expose an application outside the cluster.",
          solution: {
            explanation: "--port is the Service port and --target-port the container port. NodePort also opens a port in 30000-32767 on every node.",
            commands: [
              "kubectl expose deployment frontend --type=NodePort --name=frontend-svc --port=80 --target-port=8080 -n web",
              "kubectl scale deployment frontend --replicas=3 -n web",
              "kubectl describe svc frontend-svc -n web",
            ],
          },
          timeLimit: 20,
          hints: [
            "kubectl expose deployment frontend --type=NodePort --name=frontend-svc --port=80 --target-port=8080 -n web",
            "kubectl scale deployment frontend --replicas=3 -n web",
            "kubectl describe svc frontend-svc -n web",
          ],
          initialState: [
            { kind: "Namespace", name: "web" },
            { kind: "Deployment", name: "frontend", namespace: "web", image: "nginx:1.27", replicas: 2, revisions: ["nginx:1.27"], labels: { app: "frontend" }, listenPort: 8080 },
          ],
          checks: [
            { type: "exists", description: "frontend-svc is a NodePort on port 80 to 8080", kind: "Service", name: "frontend-svc", namespace: "web", match: { type: "NodePort", port: 80, targetPort: 8080, selector: { app: "frontend" } } },
            { type: "exists", description: "frontend runs 3 replicas", kind: "Deployment", name: "frontend", namespace: "web", match: { replicas: 3 } },
          ],
        },
      ],
    },
    {
      slug: "storage",
      name: "Storage",
      description: "PersistentVolumes, claims and StorageClasses (10% of exam)",
      xp: 300,
      lessons: [
        { type: "reading", slug: "persistent-storage", title: "Persistent Storage", duration: 20, xp: 60 },
        {
          type: "quiz",
          slug: "storage-quiz",
          title: "Storage Quiz",
          duration: 10,
          xp: 75,
          intro: "Test your knowledge of PVs, PVCs and StorageClasses.",
          questions: [
            {
              question: "A PVC doesn't set storageClassName. Which class does it use?",
              type: "multiple_choice",
              options: [
                "The cluster's default StorageClass",
                "None: it only binds static PVs",
                "The class of the first PV created",
                "local-storage",
              ],
              answer: "The cluster's default StorageClass",
              explanation: "Leaving storageClassName out means 'use the default class' (the one marked default in kubectl get sc). Setting it to an empty string means no class at all.",
            },
            {
              question: "A bound PV has persistentVolumeReclaimPolicy: Retain. What happens when its claim is deleted?",
              type: "multiple_choice",
              options: [
                "The PV becomes Released and keeps its data",
                "The PV and its data are deleted",
                "The claim can't be deleted",
                "The PV immediately binds to another claim",
              ],
              answer: "The PV becomes Released and keeps its data",
              explanation: "Retain keeps the volume for an administrator to clean up or reuse. Delete removes it with the claim.",
            },
            {
              question: "What does volumeBindingMode: WaitForFirstConsumer do?",
              type: "multiple_choice",
              options: [
                "Delays binding and provisioning until a Pod uses the claim",
                "Waits until the claim is at least 1Gi",
                "Waits for an admin to approve the claim",
                "Prevents more than one Pod using the volume",
              ],
              answer: "Delays binding and provisioning until a Pod uses the claim",
              explanation: "The volume is created where the Pod is scheduled. Until then the claim is Pending, which is expected.",
            },
            {
              question: "You can change the storageClassName of a bound PVC with kubectl patch.",
              type: "true_false",
              options: ["True", "False"],
              answer: "False",
              explanation: "A PVC's spec is immutable except for the storage request (expansion). Recreate the claim to change its class.",
            },
            {
              question: "Which must match for a PVC to bind to an existing PV? (Select all that apply)",
              type: "multi_select",
              options: ["storageClassName", "Enough capacity", "The requested access modes", "The PV's namespace"],
              answer: ["storageClassName", "Enough capacity", "The requested access modes"],
              explanation: "PVs are cluster-scoped, so they have no namespace. Class, capacity and access modes must all fit.",
            },
          ],
        },
        {
          type: "lab",
          slug: "static-pv-lab",
          title: "Lab: Static PersistentVolume",
          duration: 20,
          xp: 150,
          intro: "Create a PV, claim it and mount it in a Pod.",
          solution: {
            explanation: "The claim binds to data-pv because the class names match (no StorageClass object called manual is needed), 1Gi covers 500Mi and both use ReadWriteOnce. The Pod references the claim, never the PV.",
            commands: ["kubectl apply -f storage.yaml", "kubectl get pv,pvc -n app", "kubectl get pods -n app"],
            files: {
              "storage.yaml": `apiVersion: v1
kind: PersistentVolume
metadata:
  name: data-pv
spec:
  capacity:
    storage: 1Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: manual
  hostPath:
    path: /mnt/data
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data-pvc
  namespace: app
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: manual
  resources:
    requests:
      storage: 500Mi
---
apiVersion: v1
kind: Pod
metadata:
  name: writer
  namespace: app
spec:
  containers:
    - name: writer
      image: busybox:1.36
      volumeMounts:
        - name: data
          mountPath: /data
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: data-pvc
`,
            },
          },
          timeLimit: 25,
          hints: [
            "Write a PersistentVolume, a PersistentVolumeClaim and a Pod in one file separated by ---",
            "PV: capacity.storage 1Gi, accessModes [ReadWriteOnce], storageClassName manual, persistentVolumeReclaimPolicy Retain, hostPath.path /mnt/data",
            "kubectl get pv,pvc -n app",
          ],
          initialState: [{ kind: "Namespace", name: "app" }],
          checks: [
            {
              type: "exists",
              description: "data-pv is 1Gi RWO, class manual, Retain, hostPath /mnt/data",
              kind: "PersistentVolume",
              name: "data-pv",
              match: {
                capacity: "1Gi",
                accessModes: ["ReadWriteOnce"],
                storageClassName: "manual",
                reclaimPolicy: "Retain",
                hostPath: "/mnt/data",
              },
            },
            {
              type: "exists",
              description: "data-pvc requests 500Mi and is bound to data-pv",
              kind: "PersistentVolumeClaim",
              name: "data-pvc",
              namespace: "app",
              match: { request: "500Mi", volumeName: "data-pv" },
            },
            {
              type: "exists",
              description: "writer mounts data-pvc at /data",
              kind: "Pod",
              name: "writer",
              namespace: "app",
              match: { volumes: [{ claimName: "data-pvc", mountPath: "/data" }] },
            },
            { type: "pods", description: "writer is Running", namespace: "app", selector: {}, running: 1 },
          ],
        },
        {
          type: "lab",
          slug: "fix-pending-pvc-lab",
          title: "Lab: Database Stuck in Pending",
          duration: 20,
          xp: 150,
          intro: "Find out why a claim never binds and fix it.",
          solution: {
            explanation: "The claim asks for StorageClass fast-ssd, which doesn't exist, so it stays Pending and the Pod can't be scheduled. The class is immutable: delete the claim and recreate it without storageClassName, so the default class (standard) provisions it once postgres uses it.",
            commands: [
              "kubectl get events -n db",
              "kubectl get sc",
              "kubectl delete pvc db-data -n db",
              "kubectl apply -f db-data.yaml",
              "kubectl get pvc,pods -n db",
            ],
            files: {
              "db-data.yaml": `apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: db-data
  namespace: db
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 2Gi
`,
            },
          },
          timeLimit: 25,
          hints: [
            "kubectl get pvc,pods -n db",
            "kubectl get events -n db",
            "kubectl get sc",
            "kubectl get pvc db-data -n db -o yaml > db-data.yaml",
          ],
          initialState: [
            { kind: "Namespace", name: "db" },
            {
              kind: "PersistentVolumeClaim",
              name: "db-data",
              namespace: "db",
              storageClassName: "fast-ssd",
              accessModes: ["ReadWriteOnce"],
              request: "2Gi",
              volumeName: null,
            },
            {
              kind: "Deployment",
              name: "postgres",
              namespace: "db",
              image: "postgres:16",
              replicas: 1,
              revisions: ["postgres:16"],
              labels: { app: "postgres" },
              volumes: [{ name: "data", claimName: "db-data", mountPath: "/var/lib/postgresql/data" }],
            },
          ],
          checks: [
            {
              type: "exists",
              description: "db-data still requests 2Gi ReadWriteOnce",
              kind: "PersistentVolumeClaim",
              name: "db-data",
              namespace: "db",
              match: { request: "2Gi", accessModes: ["ReadWriteOnce"] },
            },
            {
              type: "claim-volume",
              description: "db-data is bound to a volume from the default class",
              claim: "db-data",
              namespace: "db",
              match: { storageClassName: "standard" },
            },
            {
              type: "pods",
              description: "postgres is Running",
              namespace: "db",
              selector: { app: "postgres" },
              running: 1,
            },
          ],
        },
        {
          type: "lab",
          slug: "expand-and-retain-lab",
          title: "Lab: Grow a Volume and Keep Its Data",
          duration: 20,
          xp: 150,
          intro: "Expand a claim in place and protect its volume from deletion.",
          solution: {
            explanation: "The expandable class allows volume expansion, so patching the claim's request grows the bound volume in place. The reclaim policy belongs to the PV, not the claim: look up the volume name and patch it to Retain.",
            commands: [
              "kubectl get pvc app-logs -n logs",
              "kubectl patch pvc app-logs -n logs -p '{\"spec\":{\"resources\":{\"requests\":{\"storage\":\"3Gi\"}}}}'",
              "kubectl patch pv pvc-b1dd0182-d7f2-c50c-7c9a-6310cd3aa8d2 -p '{\"spec\":{\"persistentVolumeReclaimPolicy\":\"Retain\"}}'",
              "kubectl get pv,pvc -n logs",
            ],
          },
          timeLimit: 25,
          hints: [
            "kubectl get sc expandable",
            "kubectl patch pvc app-logs -n logs -p '{\"spec\":{\"resources\":{\"requests\":{\"storage\":\"3Gi\"}}}}'",
            "kubectl get pvc app-logs -n logs (the VOLUME column names the PV)",
            "kubectl patch pv <volume> -p '{\"spec\":{\"persistentVolumeReclaimPolicy\":\"Retain\"}}'",
          ],
          initialState: [
            {
              kind: "StorageClass",
              name: "expandable",
              provisioner: "rancher.io/local-path",
              reclaimPolicy: "Delete",
              volumeBindingMode: "Immediate",
              allowVolumeExpansion: true,
              isDefault: false,
            },
            { kind: "Namespace", name: "logs" },
            {
              kind: "PersistentVolumeClaim",
              name: "app-logs",
              namespace: "logs",
              storageClassName: "expandable",
              accessModes: ["ReadWriteOnce"],
              request: "1Gi",
              volumeName: null,
            },
            {
              kind: "Deployment",
              name: "collector",
              namespace: "logs",
              image: "busybox:1.36",
              replicas: 1,
              revisions: ["busybox:1.36"],
              labels: { app: "collector" },
              volumes: [{ name: "logs", claimName: "app-logs", mountPath: "/var/log/app" }],
            },
          ],
          checks: [
            {
              type: "exists",
              description: "app-logs requests 3Gi",
              kind: "PersistentVolumeClaim",
              name: "app-logs",
              namespace: "logs",
              match: { request: "3Gi" },
            },
            {
              type: "claim-volume",
              description: "The volume behind app-logs is 3Gi with reclaim policy Retain",
              claim: "app-logs",
              namespace: "logs",
              match: { capacity: "3Gi", reclaimPolicy: "Retain" },
            },
            {
              type: "pods",
              description: "collector keeps running",
              namespace: "logs",
              selector: { app: "collector" },
              running: 1,
            },
          ],
        },
      ],
    },
    {
      slug: "troubleshooting",
      name: "Troubleshooting",
      description: "Diagnosing and fixing broken workloads, scheduling, networking and access (30% of exam)",
      xp: 400,
      lessons: [
        { type: "reading", slug: "troubleshooting-playbook", title: "A Troubleshooting Playbook", duration: 20, xp: 60 },
        {
          type: "quiz",
          slug: "troubleshooting-quiz",
          title: "Troubleshooting Quiz",
          duration: 10,
          xp: 75,
          intro: "Test your diagnostic instincts.",
          questions: [
            {
              question: "A Pod is Pending and its events say \"1 node(s) were unschedulable\". What is the most likely fix?",
              type: "multiple_choice",
              options: ["kubectl uncordon <node>", "kubectl delete pod <pod>", "kubectl rollout undo", "Increase the replica count"],
              answer: "kubectl uncordon <node>",
              explanation: "\"unschedulable\" means the node was cordoned (directly or by drain). Uncordon it once maintenance is done.",
            },
            {
              question: "Which command shows why an image failed to pull?",
              type: "multiple_choice",
              options: ["kubectl describe pod <pod>", "kubectl logs <pod>", "kubectl get nodes", "kubectl top pod <pod>"],
              answer: "kubectl describe pod <pod>",
              explanation: "Pull failures appear in the Pod's Events. logs fails because the container never started.",
            },
            {
              question: "A Service has no endpoints but its Pods are Running. What should you compare? (Select all that apply)",
              type: "multi_select",
              options: ["The Service selector", "The Pod labels", "The node taints", "The etcd version"],
              answer: ["The Service selector", "The Pod labels"],
              explanation: "Endpoints come from ready Pods whose labels match the selector. A single typo leaves the Service empty.",
            },
            {
              question: "You can change the roleRef of an existing RoleBinding with kubectl edit.",
              type: "true_false",
              options: ["True", "False"],
              answer: "False",
              explanation: "roleRef is immutable. Delete the RoleBinding and create a new one that references the right Role.",
            },
            {
              question: "A container keeps restarting (CrashLoopBackOff). Which command shows the output of the crashed attempt?",
              type: "multiple_choice",
              options: ["kubectl logs <pod> --previous", "kubectl get events --previous", "kubectl describe node", "kubectl rollout history"],
              answer: "kubectl logs <pod> --previous",
              explanation: "--previous prints the logs of the last terminated container instance, which usually contain the crash reason.",
            },
            {
              question: "What does the Pod status CreateContainerConfigError usually mean?",
              type: "multiple_choice",
              options: [
                "A referenced ConfigMap or Secret doesn't exist",
                "The image tag is wrong",
                "No node has enough CPU",
                "The container ran out of memory",
              ],
              answer: "A referenced ConfigMap or Secret doesn't exist",
              explanation: "The kubelet can't build the container's environment or volumes. The event says which ConfigMap or Secret is missing.",
            },
            {
              question: "After adding an egress NetworkPolicy, a Pod gets \"bad address 'api'\" but connecting to the Service IP works. Why?",
              type: "multiple_choice",
              options: [
                "Egress to CoreDNS on port 53 isn't allowed",
                "The Service has no endpoints",
                "kube-proxy crashed",
                "The Pod's image has no DNS client",
              ],
              answer: "Egress to CoreDNS on port 53 isn't allowed",
              explanation: "Name lookups are egress traffic to kube-dns pods in kube-system. Allow port 53 to them in an egress policy.",
            },
          ],
        },
        {
          type: "lab",
          slug: "fix-pending-pods-lab",
          title: "Lab: Pods Stuck in Pending",
          duration: 20,
          xp: 150,
          intro: "Diagnose and fix Pods the scheduler can't place.",
          solution: {
            explanation: "The FailedScheduling event lists why each node was rejected: worker-1 is still cordoned and worker-2 kept its maintenance taint. Remove both.",
            commands: [
              "kubectl get events",
              "kubectl uncordon worker-1",
              "kubectl taint nodes worker-2 maintenance-",
              "kubectl get pods -o wide",
            ],
          },
          timeLimit: 20,
          hints: [
            "kubectl get events",
            "kubectl get nodes",
            "kubectl describe node worker-2",
            "kubectl uncordon worker-1",
            "kubectl taint nodes worker-2 maintenance-",
          ],
          initialState: [
            { kind: "Node", name: "worker-1", roles: "<none>", version: "v1.30.2", schedulable: false, taints: [], labels: { "kubernetes.io/hostname": "worker-1" } },
            { kind: "Node", name: "worker-2", roles: "<none>", version: "v1.30.2", schedulable: true, taints: ["maintenance=true:NoSchedule"], labels: { "kubernetes.io/hostname": "worker-2" } },
            { kind: "Deployment", name: "reports", namespace: "default", image: "nginx:1.27", replicas: 3, revisions: ["nginx:1.27"], labels: { app: "reports" } },
          ],
          checks: [
            { type: "exists", description: "worker-1 is schedulable again", kind: "Node", name: "worker-1", match: { schedulable: true } },
            { type: "exists", description: "The maintenance taint is gone from worker-2", kind: "Node", name: "worker-2", exclude: { taints: ["maintenance=true:NoSchedule"] } },
            { type: "pods", description: "All 3 reports Pods are Running", namespace: "default", selector: { app: "reports" }, running: 3 },
          ],
        },
        {
          type: "lab",
          slug: "fix-image-pull-lab",
          title: "Lab: Deployment Not Ready",
          duration: 15,
          xp: 120,
          intro: "Find out why a Deployment's Pods never start.",
          solution: {
            explanation: "The events show the pull failing for nginx:1.277, a typo. Setting the intended nginx:1.27 image rolls out working Pods.",
            commands: [
              "kubectl get pods -n store",
              "kubectl get events -n store",
              "kubectl set image deployment/checkout nginx=nginx:1.27 -n store",
              "kubectl get pods -n store",
            ],
          },
          timeLimit: 20,
          hints: [
            "kubectl get pods -n store",
            "kubectl describe pod <pod-name> -n store",
            "kubectl set image deployment/checkout nginx=nginx:1.27 -n store",
          ],
          initialState: [
            { kind: "Namespace", name: "store" },
            { kind: "Deployment", name: "checkout", namespace: "store", image: "nginx:1.277", replicas: 3, revisions: ["nginx:1.26", "nginx:1.277"], labels: { app: "checkout" } },
          ],
          checks: [
            { type: "command", description: "Investigated the Pods (describe, events or logs)", pattern: "(describe\\s+(pods?|po)|get\\s+(events|ev)|logs)\\b" },
            { type: "exists", description: "checkout runs nginx:1.27 with 3 replicas", kind: "Deployment", name: "checkout", namespace: "store", match: { image: "nginx:1.27", replicas: 3 } },
            { type: "pods", description: "All 3 checkout Pods are Running", namespace: "store", selector: { app: "checkout" }, running: 3 },
          ],
        },
        {
          type: "lab",
          slug: "fix-service-endpoints-lab",
          title: "Lab: Service Has No Endpoints",
          duration: 15,
          xp: 120,
          intro: "Fix a Service that routes traffic to nothing.",
          solution: {
            explanation: "The Service selects app=carts but the Pods are labelled app=cart, so it has no endpoints. kubectl set selector fixes it without touching the Deployment or the ports.",
            commands: [
              "kubectl get endpoints cart -n shop",
              "kubectl get pods -n shop --show-labels",
              "kubectl set selector svc cart app=cart -n shop",
              "kubectl get endpoints cart -n shop",
            ],
          },
          timeLimit: 20,
          hints: [
            "kubectl get endpoints cart -n shop",
            "kubectl describe svc cart -n shop",
            "kubectl get pods -n shop --show-labels",
            "kubectl set selector svc cart app=cart -n shop",
          ],
          initialState: [
            { kind: "Namespace", name: "shop" },
            { kind: "Deployment", name: "cart", namespace: "shop", image: "nginx:1.27", replicas: 2, revisions: ["nginx:1.27"], labels: { app: "cart" }, listenPort: 8080 },
            { kind: "Service", name: "cart", namespace: "shop", type: "ClusterIP", port: 80, targetPort: 8080, nodePort: null, selector: { app: "carts" }, clusterIP: "10.96.40.12", labels: { app: "cart" } },
          ],
          checks: [
            { type: "endpoints", description: "Service cart has 2 endpoints", service: "cart", namespace: "shop", count: 2 },
            { type: "exists", description: "Service cart still maps port 80 to 8080", kind: "Service", name: "cart", namespace: "shop", match: { port: 80, targetPort: 8080 } },
            { type: "exists", description: "The cart Deployment was kept", kind: "Deployment", name: "cart", namespace: "shop", match: { replicas: 2 } },
          ],
        },
        {
          type: "lab",
          slug: "fix-rbac-lab",
          title: "Lab: Fix Broken Permissions",
          duration: 20,
          xp: 150,
          intro: "Repair RoleBindings without granting extra access.",
          solution: {
            explanation: "jane-read points at a Role called pod-reeder (typo), and ci-deploy binds the ci ServiceAccount from the default namespace instead of dev. roleRef can't be edited, so recreate both bindings.",
            commands: [
              "kubectl describe rolebinding -n dev",
              "kubectl delete rolebinding jane-read -n dev",
              "kubectl create rolebinding jane-read --role=pod-reader --user=jane -n dev",
              "kubectl delete rolebinding ci-deploy -n dev",
              "kubectl create rolebinding ci-deploy --role=pod-deployer --serviceaccount=dev:ci -n dev",
              "kubectl auth can-i list pods --as=jane -n dev",
            ],
          },
          timeLimit: 25,
          hints: [
            "kubectl auth can-i list pods --as=jane -n dev",
            "kubectl describe rolebinding -n dev",
            "kubectl delete rolebinding jane-read -n dev",
            "kubectl create rolebinding jane-read --role=pod-reader --user=jane -n dev",
            "kubectl delete rolebinding ci-deploy -n dev",
            "kubectl create rolebinding ci-deploy --role=pod-deployer --serviceaccount=dev:ci -n dev",
          ],
          initialState: [
            { kind: "Namespace", name: "dev" },
            { kind: "ServiceAccount", name: "ci", namespace: "dev" },
            { kind: "Role", name: "pod-reader", namespace: "dev", verbs: ["get", "list", "watch"], resources: ["pods"] },
            { kind: "Role", name: "pod-deployer", namespace: "dev", verbs: ["get", "list", "create"], resources: ["pods"] },
            { kind: "RoleBinding", name: "jane-read", namespace: "dev", role: "pod-reeder", subjects: ["User:jane"] },
            { kind: "RoleBinding", name: "ci-deploy", namespace: "dev", role: "pod-deployer", subjects: ["ServiceAccount:default:ci"] },
          ],
          checks: [
            { type: "can-i", description: "jane can list Pods in dev", as: "jane", verb: "list", resource: "pods", namespace: "dev", allowed: true },
            { type: "can-i", description: "jane still can't delete Pods", as: "jane", verb: "delete", resource: "pods", namespace: "dev", allowed: false },
            { type: "can-i", description: "ci can create Pods in dev", as: "system:serviceaccount:dev:ci", verb: "create", resource: "pods", namespace: "dev", allowed: true },
            { type: "can-i", description: "ci still can't read Secrets", as: "system:serviceaccount:dev:ci", verb: "get", resource: "secrets", namespace: "dev", allowed: false },
          ],
        },
        {
          type: "lab",
          slug: "fix-crashloop-lab",
          title: "Lab: CrashLoopBackOff",
          duration: 20,
          xp: 150,
          intro: "Get a crashing Deployment running by fixing its configuration.",
          solution: {
            explanation: "First the Pods can't start because the ConfigMap they import doesn't exist (CreateContainerConfigError). With only DB_HOST they start and exit (CrashLoopBackOff, see logs --previous). The ConfigMap needs both keys.",
            commands: [
              "kubectl get events -n shop",
              "kubectl create configmap orders-config --from-literal=DB_HOST=postgres.data.svc.cluster.local --from-literal=DB_PORT=5432 -n shop",
              "kubectl get pods -n shop",
            ],
          },
          timeLimit: 25,
          hints: [
            "kubectl get pods -n shop",
            "kubectl get events -n shop",
            "kubectl create configmap orders-config --from-literal=DB_HOST=postgres.data.svc.cluster.local --from-literal=DB_PORT=5432 -n shop",
            "kubectl logs deploy/orders -n shop --previous",
          ],
          initialState: [
            { kind: "Namespace", name: "shop" },
            { kind: "Deployment", name: "orders", namespace: "shop", image: "ghcr.io/kubelearn/orders:1.4.0", replicas: 2, revisions: ["ghcr.io/kubelearn/orders:1.4.0"], labels: { app: "orders" }, envFrom: ["orders-config"], requiredEnv: ["DB_HOST", "DB_PORT"] },
          ],
          checks: [
            { type: "exists", description: "orders-config holds DB_HOST and DB_PORT", kind: "ConfigMap", name: "orders-config", namespace: "shop", match: { data: { DB_HOST: "postgres.data.svc.cluster.local", DB_PORT: "5432" } } },
            { type: "pods", description: "Both orders Pods are Running", namespace: "shop", selector: { app: "orders" }, running: 2 },
          ],
        },
        {
          type: "lab",
          slug: "fix-dns-egress-lab",
          title: "Lab: \"bad address\" After a Security Change",
          duration: 20,
          xp: 150,
          intro: "Repair name resolution broken by an egress NetworkPolicy.",
          solution: {
            explanation: "worker-egress only allows port 80 to the api Pods, so DNS lookups to CoreDNS are dropped. Name lookups fail while the ClusterIP works. A second egress policy for DNS fixes it, and db stays blocked because policies only add allowances.",
            commands: [
              "kubectl apply -f allow-dns.yaml",
              "kubectl exec worker -n prod -- wget -qO- -T 2 http://api",
              "kubectl exec worker -n prod -- nc -zv -w 2 db 5432",
            ],
            files: {
              "allow-dns.yaml": `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: worker-allow-dns
  namespace: prod
spec:
  podSelector:
    matchLabels:
      app: worker
  policyTypes:
    - Egress
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
`,
            },
          },
          timeLimit: 25,
          hints: [
            "kubectl exec worker -n prod -- wget -qO- -T 2 http://api",
            "kubectl get svc api -n prod",
            "kubectl describe netpol worker-egress -n prod",
            "Write a policy for app=worker with policyTypes [Egress] allowing port 53 to namespaceSelector kubernetes.io/metadata.name=kube-system + podSelector k8s-app=kube-dns",
          ],
          initialState: [
            { kind: "Namespace", name: "prod" },
            { kind: "Deployment", name: "api", namespace: "prod", image: "nginx:1.27", replicas: 2, revisions: ["nginx:1.27"], labels: { app: "api" } },
            { kind: "Service", name: "api", namespace: "prod", type: "ClusterIP", port: 80, targetPort: 80, nodePort: null, selector: { app: "api" }, clusterIP: "10.96.60.10" },
            { kind: "Deployment", name: "db", namespace: "prod", image: "postgres:16", replicas: 1, revisions: ["postgres:16"], labels: { app: "db" } },
            { kind: "Service", name: "db", namespace: "prod", type: "ClusterIP", port: 5432, targetPort: 5432, nodePort: null, selector: { app: "db" }, clusterIP: "10.96.60.20" },
            { kind: "Pod", name: "worker", namespace: "prod", image: "busybox:1.36", node: "worker-2", owner: null, labels: { app: "worker" } },
            { kind: "NetworkPolicy", name: "worker-egress", namespace: "prod", podSelector: { app: "worker" }, policyTypes: ["Egress"], ingress: [], egress: [{ peers: [{ podSelector: { app: "api" } }], ports: [80] }] },
          ],
          checks: [
            { type: "exists", description: "worker-egress is still in place", kind: "NetworkPolicy", name: "worker-egress", namespace: "prod", match: { policyTypes: ["Egress"], podSelector: { app: "worker" } } },
            { type: "connectivity", description: "worker reaches http://api by name", from: { namespace: "prod", selector: { app: "worker" } }, host: "api", port: 80, allowed: true },
            { type: "connectivity", description: "worker is still blocked from db:5432", from: { namespace: "prod", selector: { app: "worker" } }, host: "db", port: 5432, allowed: false },
          ],
        },
      ],
    },
  ],
};
