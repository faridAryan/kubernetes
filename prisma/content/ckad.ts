import type { CertificationContent } from "./types";

export const ckad: CertificationContent = {
  slug: "ckad",
  name: "Certified Kubernetes Application Developer",
  shortName: "CKAD",
  description:
    "The CKAD exam certifies that candidates can design, build, configure, and expose cloud native applications for Kubernetes. Focus on application design, deployment, observability, and services.",
  icon: "🚀",
  color: "#8B5CF6",
  difficulty: "intermediate",
  estimatedHours: 35,
  order: 3,
  exam: { questions: 15, minutes: 30, passPercent: 66 },
  modules: [
    {
      slug: "app-design-build",
      name: "Application Design and Build",
      description: "Designing and building containerized applications (20% of exam)",
      xp: 250,
      lessons: [
        { type: "reading", slug: "multi-container-pods", title: "Multi-Container Pod Patterns", duration: 15, xp: 50 },
        { type: "reading", slug: "labels-and-selectors", title: "Labels, Selectors and Annotations", duration: 12, xp: 50 },
        {
          type: "quiz",
          slug: "app-design-quiz",
          title: "Application Design Quiz",
          duration: 10,
          xp: 75,
          intro: "Test your knowledge of Pod design and labels.",
          questions: [
            {
              question: "Which multi-container pattern runs a helper container that extends the main container, such as a log shipper?",
              type: "multiple_choice",
              options: ["Sidecar", "Init container", "DaemonSet", "Operator"],
              answer: "Sidecar",
              explanation: "A sidecar runs alongside the main container for the Pod's lifetime and adds functionality such as log shipping or proxying.",
            },
            {
              question: "Init containers run to completion before the app containers start.",
              type: "true_false",
              options: ["True", "False"],
              answer: "True",
              explanation: "Init containers run sequentially, and each must succeed before the next one, and finally the app containers, start.",
            },
            {
              question: "Which can be used in a label selector? (Select all that apply)",
              type: "multi_select",
              options: ["Labels", "Annotations", "Pod names", "Container images"],
              answer: ["Labels"],
              explanation: "Only labels can be selected on. Annotations hold non-identifying metadata.",
            },
            {
              question: "How do you change an existing label value on a Pod?",
              type: "multiple_choice",
              options: [
                "kubectl label pod api env=prod --overwrite",
                "kubectl annotate pod api env=prod",
                "kubectl set label pod api env=prod",
                "kubectl edit label api env=prod",
              ],
              answer: "kubectl label pod api env=prod --overwrite",
              explanation: "kubectl label refuses to change an existing value unless you pass --overwrite.",
            },
            {
              question: "Containers in the same Pod can reach each other on localhost.",
              type: "true_false",
              options: ["True", "False"],
              answer: "True",
              explanation: "All containers in a Pod share one network namespace, so they share an IP and can use localhost.",
            },
          ],
        },
        {
          type: "lab",
          slug: "labels-lab",
          title: "Lab: Organise Pods with Labels",
          duration: 15,
          xp: 100,
          intro: "Use labels to organise and query Pods.",
          solution: {
            explanation: "kubectl label accepts several Pod names at once. kubectl run --labels sets labels at creation, and -l filters by them.",
            commands: [
              "kubectl label pods api-1 api-2 env=prod",
              "kubectl label pod cache env=staging",
              "kubectl run debug --image=busybox:1.36 --labels=app=debug,env=dev",
              "kubectl get pods -l env=prod",
            ],
          },
          timeLimit: 20,
          hints: [
            "kubectl label pods api-1 api-2 env=prod",
            "kubectl label pod cache env=staging",
            "kubectl run debug --image=busybox:1.36 --labels=app=debug,env=dev",
            "kubectl get pods -l env=prod",
          ],
          initialState: [
            { kind: "Pod", name: "api-1", namespace: "default", image: "node:22-alpine", node: "worker-1", owner: null, labels: { app: "api" } },
            { kind: "Pod", name: "api-2", namespace: "default", image: "node:22-alpine", node: "worker-2", owner: null, labels: { app: "api" } },
            { kind: "Pod", name: "cache", namespace: "default", image: "redis:7.4", node: "worker-1", owner: null, labels: { app: "redis" } },
          ],
          checks: [
            { type: "exists", description: "api-1 is labelled env=prod", kind: "Pod", name: "api-1", match: { labels: { env: "prod" } } },
            { type: "exists", description: "api-2 is labelled env=prod", kind: "Pod", name: "api-2", match: { labels: { env: "prod" } } },
            { type: "exists", description: "cache is labelled env=staging", kind: "Pod", name: "cache", match: { labels: { env: "staging" } } },
            { type: "exists", description: "debug runs busybox:1.36 with app=debug,env=dev", kind: "Pod", name: "debug", match: { image: "busybox:1.36", labels: { app: "debug", env: "dev" } } },
            { type: "command", description: "Queried Pods with a label selector", pattern: "get\\s+(pods|pod|po)\\b.*(-l|--selector)[\\s=]+['\"]?env=prod" },
          ],
        },
      ],
    },
    {
      slug: "app-configuration",
      name: "Application Environment & Configuration",
      description: "ConfigMaps, Secrets and configuration best practices (25% of exam)",
      xp: 250,
      lessons: [
        { type: "reading", slug: "configmaps-and-secrets", title: "ConfigMaps and Secrets", duration: 15, xp: 50 },
        {
          type: "quiz",
          slug: "configuration-quiz",
          title: "Configuration Quiz",
          duration: 10,
          xp: 75,
          intro: "Test your knowledge of ConfigMaps and Secrets.",
          questions: [
            {
              question: "By default, how are Secret values stored in etcd?",
              type: "multiple_choice",
              options: ["Base64-encoded, not encrypted", "AES-256 encrypted", "Hashed with bcrypt", "Stored only in memory"],
              answer: "Base64-encoded, not encrypted",
              explanation: "Without an EncryptionConfiguration, Secrets are only base64-encoded in etcd. Enable encryption at rest to protect them.",
            },
            {
              question: "Environment variables injected from a ConfigMap update automatically in a running Pod when the ConfigMap changes.",
              type: "true_false",
              options: ["True", "False"],
              answer: "False",
              explanation: "Environment variables are read at container start. Mounted ConfigMap volumes update, env vars need a restart.",
            },
            {
              question: "Which field injects every key of a ConfigMap as environment variables?",
              type: "multiple_choice",
              options: ["envFrom.configMapRef", "env.valueFrom.configMapKeyRef", "volumes.configMap", "spec.configMap"],
              answer: "envFrom.configMapRef",
              explanation: "envFrom with configMapRef imports all keys. valueFrom.configMapKeyRef imports a single key.",
            },
            {
              question: "Which are good ways to protect Secrets? (Select all that apply)",
              type: "multi_select",
              options: [
                "Restrict get/list on secrets with RBAC",
                "Enable encryption at rest",
                "Commit them to Git as base64",
                "Store them in a ConfigMap instead",
              ],
              answer: ["Restrict get/list on secrets with RBAC", "Enable encryption at rest"],
              explanation: "Limit who can read Secrets and encrypt them in etcd. Base64 is an encoding, not protection.",
            },
            {
              question: "A Pod can reference a ConfigMap from a different namespace.",
              type: "true_false",
              options: ["True", "False"],
              answer: "False",
              explanation: "ConfigMaps and Secrets are namespaced, and Pods can only use ones in their own namespace.",
            },
          ],
        },
        {
          type: "lab",
          slug: "config-lab",
          title: "Lab: Configure an App",
          duration: 15,
          xp: 100,
          intro: "Create configuration and credentials for a new service.",
          solution: {
            explanation: "--from-literal can be repeated for every key. Secrets are created the same way as ConfigMaps, but describe hides their values.",
            commands: [
              "kubectl create configmap app-config --from-literal=APP_MODE=production --from-literal=LOG_LEVEL=info -n shop",
              "kubectl create secret generic db-creds --from-literal=username=shop --from-literal=password=s3cure-pass -n shop",
              "kubectl describe secret db-creds -n shop",
            ],
          },
          timeLimit: 20,
          hints: [
            "kubectl create configmap app-config --from-literal=APP_MODE=production --from-literal=LOG_LEVEL=info -n shop",
            "kubectl create secret generic db-creds --from-literal=username=shop --from-literal=password=s3cure-pass -n shop",
            "kubectl describe secret db-creds -n shop",
          ],
          initialState: [{ kind: "Namespace", name: "shop" }],
          checks: [
            { type: "exists", description: "ConfigMap app-config has APP_MODE and LOG_LEVEL", kind: "ConfigMap", name: "app-config", namespace: "shop", match: { data: { APP_MODE: "production", LOG_LEVEL: "info" } } },
            { type: "exists", description: "Secret db-creds has username and password", kind: "Secret", name: "db-creds", namespace: "shop", match: { data: { username: "shop", password: "s3cure-pass" } } },
          ],
        },
        {
          type: "lab",
          slug: "fix-oom-lab",
          title: "Lab: Right-Size a Crashing App",
          duration: 15,
          xp: 120,
          intro: "Find out why a container keeps restarting and fix its memory settings.",
          solution: {
            explanation: "Last State shows OOMKilled (exit code 137): the app needs about 180Mi but is limited to 64Mi. Raising the limit to 256Mi (with a 128Mi request) stops the restarts.",
            commands: [
              "kubectl get events -n media",
              "kubectl set resources deployment/thumbnailer --requests=memory=128Mi --limits=memory=256Mi -n media",
              "kubectl get pods -n media",
            ],
          },
          timeLimit: 20,
          hints: [
            "kubectl get pods -n media",
            "kubectl describe pod <pod-name> -n media",
            "kubectl set resources deployment/thumbnailer --requests=memory=128Mi --limits=memory=256Mi -n media",
          ],
          initialState: [
            { kind: "Namespace", name: "media" },
            { kind: "Deployment", name: "thumbnailer", namespace: "media", image: "ghcr.io/kubelearn/thumbnailer:2.1.0", replicas: 2, revisions: ["ghcr.io/kubelearn/thumbnailer:2.1.0"], labels: { app: "thumbnailer" }, memoryUsage: "180Mi", resources: { requests: { memory: "32Mi" }, limits: { memory: "64Mi" } } },
          ],
          checks: [
            { type: "exists", description: "thumbnailer requests 128Mi and is limited to 256Mi", kind: "Deployment", name: "thumbnailer", namespace: "media", match: { resources: { requests: { memory: "128Mi" }, limits: { memory: "256Mi" } } } },
            { type: "pods", description: "Both thumbnailer Pods are Running", namespace: "media", selector: { app: "thumbnailer" }, running: 2 },
          ],
        },
      ],
    },
    {
      slug: "app-deployment",
      name: "Application Deployment",
      description: "Rollouts, blue/green and canary releases (20% of exam)",
      xp: 250,
      lessons: [
        { type: "reading", slug: "deployment-strategies", title: "Deployment Strategies", duration: 15, xp: 50 },
        {
          type: "quiz",
          slug: "deployment-quiz",
          title: "Deployment Strategies Quiz",
          duration: 10,
          xp: 75,
          intro: "Test your knowledge of release strategies.",
          questions: [
            {
              question: "Which strategy stops all old Pods before starting new ones?",
              type: "multiple_choice",
              options: ["Recreate", "RollingUpdate", "Canary", "Blue/green"],
              answer: "Recreate",
              explanation: "Recreate terminates every old Pod first, which causes downtime but guarantees two versions never run together.",
            },
            {
              question: "In a blue/green release, how is traffic usually switched to the new version?",
              type: "multiple_choice",
              options: [
                "Change the Service selector to the new version's labels",
                "Delete the old Pods one by one",
                "Restart the kubelet",
                "Scale the Service to zero",
              ],
              answer: "Change the Service selector to the new version's labels",
              explanation: "Both versions run in parallel, and updating the Service selector moves all traffic at once, which also makes rollback instant.",
            },
            {
              question: "With 3 stable replicas and 1 canary replica behind one Service, roughly what share of requests reach the canary?",
              type: "multiple_choice",
              options: ["25%", "50%", "10%", "75%"],
              answer: "25%",
              explanation: "The Service balances across all 4 matching Pods, so about 1 in 4 requests hits the canary.",
            },
            {
              question: "Which commands help during a problematic rollout? (Select all that apply)",
              type: "multi_select",
              options: ["kubectl rollout status", "kubectl rollout undo", "kubectl rollout history", "kubectl rollout delete"],
              answer: ["kubectl rollout status", "kubectl rollout undo", "kubectl rollout history"],
              explanation: "status watches progress, history lists revisions and undo rolls back. There is no 'rollout delete'.",
            },
            {
              question: "Changing only the replica count of a Deployment creates a new rollout revision.",
              type: "true_false",
              options: ["True", "False"],
              answer: "False",
              explanation: "Only changes to the Pod template (such as the image) create a new revision. Scaling does not.",
            },
          ],
        },
        {
          type: "lab",
          slug: "canary-lab",
          title: "Lab: Canary Release",
          duration: 20,
          xp: 120,
          intro: "Release a new version to a small share of Pods.",
          solution: {
            explanation: "Deployment labels become Pod labels, so track=stable/canary lets you select each group. With 3 stable Pods and 1 canary Pod, about a quarter of the traffic hits the canary.",
            commands: [
              "kubectl label deployment web-v1 track=stable",
              "kubectl create deployment web-v2 --image=nginx:1.27 --replicas=1",
              "kubectl label deployment web-v2 track=canary",
              "kubectl scale deployment web-v1 --replicas=3",
              "kubectl get pods -l track=canary",
            ],
          },
          timeLimit: 25,
          hints: [
            "kubectl label deployment web-v1 track=stable",
            "kubectl create deployment web-v2 --image=nginx:1.27 --replicas=1",
            "kubectl label deployment web-v2 track=canary",
            "kubectl scale deployment web-v1 --replicas=3",
            "kubectl get pods -l track=canary",
          ],
          initialState: [
            { kind: "Deployment", name: "web-v1", namespace: "default", image: "nginx:1.26", replicas: 2, revisions: ["nginx:1.26"], labels: { app: "web-v1" } },
          ],
          checks: [
            { type: "exists", description: "web-v1 is labelled track=stable with 3 replicas", kind: "Deployment", name: "web-v1", match: { replicas: 3, labels: { track: "stable" } } },
            { type: "exists", description: "web-v2 runs nginx:1.27 with 1 replica, labelled track=canary", kind: "Deployment", name: "web-v2", match: { image: "nginx:1.27", replicas: 1, labels: { track: "canary" } } },
            { type: "pods", description: "Exactly one canary Pod is running", namespace: "default", selector: { track: "canary" }, running: 1 },
          ],
        },
        {
          type: "lab",
          slug: "blue-green-lab",
          title: "Lab: Blue/Green Switch",
          duration: 15,
          xp: 120,
          intro: "Switch production traffic to a new version in one step.",
          solution: {
            explanation: "Changing only the Service selector moves all traffic at once. Keeping web-blue at 0 replicas makes rollback a single selector change plus a scale-up.",
            commands: [
              "kubectl get endpoints web",
              "kubectl set selector svc web app=web-green",
              "kubectl scale deployment web-blue --replicas=0",
              "kubectl get endpoints web",
            ],
          },
          timeLimit: 20,
          hints: [
            "kubectl get endpoints web",
            "kubectl describe svc web",
            "kubectl set selector svc web app=web-green",
            "kubectl scale deployment web-blue --replicas=0",
          ],
          initialState: [
            { kind: "Deployment", name: "web-blue", namespace: "default", image: "nginx:1.26", replicas: 2, revisions: ["nginx:1.26"], labels: { app: "web-blue" } },
            { kind: "Deployment", name: "web-green", namespace: "default", image: "nginx:1.27", replicas: 2, revisions: ["nginx:1.27"], labels: { app: "web-green" } },
            { kind: "Service", name: "web", namespace: "default", type: "ClusterIP", port: 80, targetPort: 80, nodePort: null, selector: { app: "web-blue" }, clusterIP: "10.96.30.7", labels: { app: "web" } },
          ],
          checks: [
            { type: "exists", description: "Service web selects the green Pods", kind: "Service", name: "web", match: { selector: { app: "web-green" } } },
            { type: "endpoints", description: "web has the 2 green Pods as endpoints", service: "web", namespace: "default", count: 2 },
            { type: "exists", description: "web-blue is scaled to 0 but kept for rollback", kind: "Deployment", name: "web-blue", match: { replicas: 0 } },
          ],
        },
      ],
    },
    {
      slug: "services-networking",
      name: "Services & Networking",
      description: "Services and NetworkPolicies for application developers (20% of exam)",
      xp: 250,
      lessons: [
        { type: "reading", slug: "network-policies-for-developers", title: "NetworkPolicies for Developers", duration: 15, xp: 60 },
        {
          type: "quiz",
          slug: "networking-policies-quiz",
          title: "Services & Networking Quiz",
          duration: 10,
          xp: 75,
          intro: "Test your understanding of NetworkPolicies.",
          questions: [
            {
              question: "What does spec.podSelector: {} select in a NetworkPolicy?",
              type: "multiple_choice",
              options: ["Every Pod in the policy's namespace", "No Pods", "Every Pod in the cluster", "Only Pods without labels"],
              answer: "Every Pod in the policy's namespace",
              explanation: "An empty selector matches all Pods in the namespace where the policy lives.",
            },
            {
              question: "NetworkPolicies can contain explicit deny rules.",
              type: "true_false",
              options: ["True", "False"],
              answer: "False",
              explanation: "Policies only allow traffic. Selecting a Pod isolates it, and the union of all matching rules is what's allowed.",
            },
            {
              question: "A from entry lists namespaceSelector and podSelector in the SAME list item. What does it match?",
              type: "multiple_choice",
              options: [
                "Pods matching podSelector inside namespaces matching namespaceSelector",
                "Any Pod in those namespaces OR any matching Pod in the policy's namespace",
                "Nothing, it is invalid",
                "Only Pods in kube-system",
              ],
              answer: "Pods matching podSelector inside namespaces matching namespaceSelector",
              explanation: "In one item they're ANDed. As two separate list items they would be ORed.",
            },
            {
              question: "Which label does every namespace get automatically, useful in namespaceSelector?",
              type: "multiple_choice",
              options: ["kubernetes.io/metadata.name", "namespace", "k8s-app", "app.kubernetes.io/name"],
              answer: "kubernetes.io/metadata.name",
              explanation: "Since v1.21 every namespace is labelled kubernetes.io/metadata.name=<name>.",
            },
            {
              question: "Which commands can prove a NetworkPolicy works? (Select all that apply)",
              type: "multi_select",
              options: [
                "kubectl exec client -- wget -qO- -T 2 http://api",
                "kubectl exec client -- nc -zv -w 2 api 80",
                "kubectl get netpol",
                "kubectl rollout status deploy/api",
              ],
              answer: ["kubectl exec client -- wget -qO- -T 2 http://api", "kubectl exec client -- nc -zv -w 2 api 80"],
              explanation: "Only a real connection attempt from a client Pod shows whether traffic flows. get netpol just lists policies.",
            },
          ],
        },
        {
          type: "lab",
          slug: "restrict-api-lab",
          title: "Lab: Only the Frontend May Call the API",
          duration: 20,
          xp: 150,
          intro: "Write your first NetworkPolicy.",
          solution: {
            explanation: "Selecting the api Pods for Ingress isolates them. The single rule then admits only Pods labelled app=frontend on port 80, so batch times out.",
            commands: [
              "kubectl apply -f api-allow-frontend.yaml",
              "kubectl exec deploy/frontend -n shop -- wget -qO- -T 2 http://api",
              "kubectl exec deploy/batch -n shop -- wget -qO- -T 2 http://api",
            ],
            files: {
              "api-allow-frontend.yaml": `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-allow-frontend
  namespace: shop
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - port: 80
`,
            },
          },
          timeLimit: 25,
          hints: [
            "kubectl exec deploy/batch -n shop -- wget -qO- -T 2 http://api",
            "Open the manifest editor: kind NetworkPolicy, podSelector app=api, ingress from podSelector app=frontend on port 80",
            "kubectl exec deploy/frontend -n shop -- wget -qO- -T 2 http://api",
          ],
          initialState: [
            { kind: "Namespace", name: "shop" },
            { kind: "Deployment", name: "api", namespace: "shop", image: "nginx:1.27", replicas: 2, revisions: ["nginx:1.27"], labels: { app: "api" } },
            { kind: "Service", name: "api", namespace: "shop", type: "ClusterIP", port: 80, targetPort: 80, nodePort: null, selector: { app: "api" }, clusterIP: "10.96.70.10" },
            { kind: "Deployment", name: "frontend", namespace: "shop", image: "busybox:1.36", replicas: 1, revisions: ["busybox:1.36"], labels: { app: "frontend" } },
            { kind: "Deployment", name: "batch", namespace: "shop", image: "busybox:1.36", replicas: 1, revisions: ["busybox:1.36"], labels: { app: "batch" } },
          ],
          checks: [
            { type: "exists", description: "NetworkPolicy api-allow-frontend exists", kind: "NetworkPolicy", name: "api-allow-frontend", namespace: "shop" },
            { type: "connectivity", description: "frontend can reach api:80", from: { namespace: "shop", selector: { app: "frontend" } }, host: "api", port: 80, allowed: true },
            { type: "connectivity", description: "batch can no longer reach api:80", from: { namespace: "shop", selector: { app: "batch" } }, host: "api", port: 80, allowed: false },
          ],
        },
      ],
    },
    {
      slug: "observability",
      name: "Application Observability and Maintenance",
      description: "Health probes, debugging and keeping apps available (15% of exam)",
      xp: 300,
      lessons: [
        { type: "reading", slug: "probes-and-health", title: "Health Probes", duration: 15, xp: 60 },
        {
          type: "quiz",
          slug: "probes-quiz",
          title: "Health Probes Quiz",
          duration: 10,
          xp: 75,
          intro: "Test your understanding of probes.",
          questions: [
            {
              question: "What happens when a readinessProbe fails?",
              type: "multiple_choice",
              options: [
                "The Pod is removed from Service endpoints, and the container keeps running",
                "The container is restarted",
                "The Pod is deleted",
                "The node is cordoned",
              ],
              answer: "The Pod is removed from Service endpoints, and the container keeps running",
              explanation: "Readiness only controls traffic. The Pod shows READY 0/1 but is not restarted.",
            },
            {
              question: "What happens when a livenessProbe keeps failing?",
              type: "multiple_choice",
              options: [
                "The kubelet kills and restarts the container",
                "The Pod is removed from endpoints only",
                "The Deployment is rolled back",
                "Nothing, it's informational",
              ],
              answer: "The kubelet kills and restarts the container",
              explanation: "Liveness failures restart the container. Repeated restarts show up as CrashLoopBackOff.",
            },
            {
              question: "An app takes 3 minutes to start and its liveness probe kills it. What's the recommended fix?",
              type: "multiple_choice",
              options: [
                "Add a startupProbe that allows at least 3 minutes",
                "Remove the livenessProbe",
                "Set restartPolicy: Never",
                "Increase the replica count",
              ],
              answer: "Add a startupProbe that allows at least 3 minutes",
              explanation: "A startupProbe holds off liveness and readiness until the app has started, while keeping fast liveness checks afterwards.",
            },
            {
              question: "A failing readinessProbe increases the Pod's restart count.",
              type: "true_false",
              options: ["True", "False"],
              answer: "False",
              explanation: "Only liveness (and startup) probe failures restart containers.",
            },
            {
              question: "Which probe handlers does Kubernetes support? (Select all that apply)",
              type: "multi_select",
              options: ["httpGet", "tcpSocket", "exec", "dnsLookup"],
              answer: ["httpGet", "tcpSocket", "exec"],
              explanation: "Probes can make an HTTP request, open a TCP connection, run a command (plus gRPC). There is no dnsLookup handler.",
            },
          ],
        },
        {
          type: "lab",
          slug: "add-probes-lab",
          title: "Lab: Add Health Probes",
          duration: 20,
          xp: 150,
          intro: "Add readiness and liveness probes to a live Deployment.",
          solution: {
            explanation: "Export the live Deployment, add both probes under the container and re-apply. The simulator keeps the app's behaviour, so the probes are evaluated against the real /ready and /healthz paths on 8080.",
            commands: [
              "kubectl get deploy api -n shop -o yaml > api-original.yaml",
              "kubectl apply -f api.yaml",
              "kubectl get pods,ep -n shop",
            ],
            files: {
              "api.yaml": `apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: shop
  labels:
    app: api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: ghcr.io/kubelearn/api:3.2.0
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 15
`,
            },
          },
          timeLimit: 25,
          hints: [
            "kubectl get deploy api -n shop -o yaml > api.yaml",
            "Open api.yaml from 'Saved files' in the manifest editor and add readinessProbe and livenessProbe under the container",
            "kubectl apply -f api.yaml",
            "kubectl get pods,ep -n shop",
          ],
          initialState: [
            { kind: "Namespace", name: "shop" },
            {
              kind: "Deployment",
              name: "api",
              namespace: "shop",
              image: "ghcr.io/kubelearn/api:3.2.0",
              replicas: 2,
              revisions: ["ghcr.io/kubelearn/api:3.2.0"],
              labels: { app: "api" },
              listenPort: 8080,
              httpPaths: ["/", "/healthz", "/ready"],
              startupSeconds: 10,
            },
            {
              kind: "Service",
              name: "api",
              namespace: "shop",
              type: "ClusterIP",
              port: 80,
              targetPort: 8080,
              nodePort: null,
              selector: { app: "api" },
              clusterIP: "10.96.110.10",
            },
          ],
          checks: [
            {
              type: "exists",
              description: "api has a readinessProbe on /ready:8080",
              kind: "Deployment",
              name: "api",
              namespace: "shop",
              match: { readinessProbe: { httpGet: { path: "/ready", port: 8080 } } },
            },
            {
              type: "exists",
              description: "api has a livenessProbe on /healthz:8080 with a 15s initial delay",
              kind: "Deployment",
              name: "api",
              namespace: "shop",
              match: { livenessProbe: { httpGet: { path: "/healthz", port: 8080 }, initialDelaySeconds: 15 } },
            },
            {
              type: "pods",
              description: "Both api Pods are Running and Ready",
              namespace: "shop",
              selector: { app: "api" },
              running: 2,
              ready: true,
            },
            {
              type: "endpoints",
              description: "The api Service has 2 endpoints",
              service: "api",
              namespace: "shop",
              count: 2,
            },
          ],
        },
        {
          type: "lab",
          slug: "fix-probes-lab",
          title: "Lab: Probes Gone Wrong",
          duration: 20,
          xp: 150,
          intro: "Fix a liveness probe that kills healthy Pods and a readiness probe that never passes.",
          solution: {
            explanation: "Liveness probes port 80 but the app listens on 8080 (connection refused → restarts). Readiness probes /readyz but the app serves /ready (404 → never Ready). Correct both and re-apply.",
            commands: [
              "kubectl get events -n payments",
              "kubectl apply -f billing.yaml",
              "kubectl get pods,ep -n payments",
            ],
            files: {
              "billing.yaml": `apiVersion: apps/v1
kind: Deployment
metadata:
  name: billing
  namespace: payments
  labels:
    app: billing
spec:
  replicas: 2
  selector:
    matchLabels:
      app: billing
  template:
    metadata:
      labels:
        app: billing
    spec:
      containers:
        - name: billing
          image: ghcr.io/kubelearn/billing:1.8.0
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
`,
            },
          },
          timeLimit: 25,
          hints: [
            "kubectl get pods -n payments",
            "kubectl get events -n payments",
            "kubectl get deploy billing -n payments -o yaml > billing.yaml",
            "The app listens on 8080 and serves /healthz and /ready: compare with the probes",
          ],
          initialState: [
            { kind: "Namespace", name: "payments" },
            {
              kind: "Deployment",
              name: "billing",
              namespace: "payments",
              image: "ghcr.io/kubelearn/billing:1.8.0",
              replicas: 2,
              revisions: ["ghcr.io/kubelearn/billing:1.8.0"],
              labels: { app: "billing" },
              listenPort: 8080,
              httpPaths: ["/", "/healthz", "/ready"],
              livenessProbe: { httpGet: { path: "/healthz", port: 80 } },
              readinessProbe: { httpGet: { path: "/readyz", port: 8080 } },
            },
            {
              kind: "Service",
              name: "billing",
              namespace: "payments",
              type: "ClusterIP",
              port: 80,
              targetPort: 8080,
              nodePort: null,
              selector: { app: "billing" },
              clusterIP: "10.96.111.10",
            },
          ],
          checks: [
            {
              type: "command",
              description: "Investigated the Pods (describe or events)",
              pattern: "(describe\\s+(pods?|po|deploy)|get\\s+(events|ev))",
            },
            {
              type: "pods",
              description: "Both billing Pods are Running and Ready",
              namespace: "payments",
              selector: { app: "billing" },
              running: 2,
              ready: true,
            },
            {
              type: "endpoints",
              description: "The billing Service has 2 endpoints",
              service: "billing",
              namespace: "payments",
              count: 2,
            },
          ],
        },
        {
          type: "lab",
          slug: "slow-start-lab",
          title: "Lab: The App That Never Starts",
          duration: 20,
          xp: 150,
          intro: "Protect a slow-starting app with a startupProbe.",
          solution: {
            explanation: "The liveness probe gives up after 5 + 3×10 = 35s, but the app needs 90s. A startupProbe with failureThreshold 12 × periodSeconds 10 allows 120s, and liveness only starts once it succeeds.",
            commands: [
              "kubectl get events -n analytics",
              "kubectl apply -f reports.yaml",
              "kubectl get pods -n analytics",
            ],
            files: {
              "reports.yaml": `apiVersion: apps/v1
kind: Deployment
metadata:
  name: reports
  namespace: analytics
  labels:
    app: reports
spec:
  replicas: 2
  selector:
    matchLabels:
      app: reports
  template:
    metadata:
      labels:
        app: reports
    spec:
      containers:
        - name: reports
          image: ghcr.io/kubelearn/reports:2.0.0
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
            failureThreshold: 3
          startupProbe:
            httpGet:
              path: /healthz
              port: 8080
            failureThreshold: 12
            periodSeconds: 10
`,
            },
          },
          timeLimit: 25,
          hints: [
            "kubectl get pods -n analytics",
            "kubectl get events -n analytics",
            "kubectl get deploy reports -n analytics -o yaml > reports.yaml",
            "startupProbe budget = failureThreshold × periodSeconds",
          ],
          initialState: [
            { kind: "Namespace", name: "analytics" },
            {
              kind: "Deployment",
              name: "reports",
              namespace: "analytics",
              image: "ghcr.io/kubelearn/reports:2.0.0",
              replicas: 2,
              revisions: ["ghcr.io/kubelearn/reports:2.0.0"],
              labels: { app: "reports" },
              listenPort: 8080,
              httpPaths: ["/", "/healthz", "/ready"],
              startupSeconds: 90,
              livenessProbe: {
                httpGet: { path: "/healthz", port: 8080 },
                initialDelaySeconds: 5,
                periodSeconds: 10,
                failureThreshold: 3,
              },
            },
          ],
          checks: [
            {
              type: "exists",
              description: "reports has a startupProbe on /healthz:8080",
              kind: "Deployment",
              name: "reports",
              namespace: "analytics",
              match: { startupProbe: { httpGet: { path: "/healthz", port: 8080 } } },
            },
            {
              type: "exists",
              description: "The livenessProbe was kept as it was",
              kind: "Deployment",
              name: "reports",
              namespace: "analytics",
              match: { livenessProbe: { httpGet: { path: "/healthz", port: 8080 }, initialDelaySeconds: 5 } },
            },
            {
              type: "pods",
              description: "Both reports Pods stay Running",
              namespace: "analytics",
              selector: { app: "reports" },
              running: 2,
            },
          ],
        },
      ],
    },
  ],
};
