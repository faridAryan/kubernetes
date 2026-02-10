"use client";

import { useState, useRef, useEffect } from "react";
import {
  Terminal as TermIcon,
  Play,
  CheckCircle2,
  Lightbulb,
  ChevronDown,
  ChevronRight,
  Clock,
  Send,
  AlertTriangle,
} from "lucide-react";
import MarkdownRenderer from "@/components/lesson/MarkdownRenderer";

interface LabConfig {
  id: string;
  instructions: string;
  hints: string;
  timeLimit: number;
}

interface Props {
  labConfig: LabConfig;
  lessonContent: string;
  onComplete: () => void;
}

interface TerminalLine {
  type: "input" | "output" | "error" | "system";
  content: string;
}

// Simulated K8s command responses
const K8S_RESPONSES: Record<string, string> = {
  "kubectl get nodes":
    "NAME           STATUS   ROLES           AGE   VERSION\ncontrol-plane  Ready    control-plane   5d    v1.28.0\nworker-1       Ready    <none>          5d    v1.28.0\nworker-2       Ready    <none>          5d    v1.28.0",
  "kubectl get pods":
    "NAME                     READY   STATUS    RESTARTS   AGE\nnginx-7854ff8877-abcde   1/1     Running   0          2m",
  "kubectl get pods -A":
    "NAMESPACE     NAME                                    READY   STATUS    RESTARTS   AGE\nkube-system   coredns-5d78c9869d-xxxxx                  1/1     Running   0          5d\nkube-system   etcd-control-plane                        1/1     Running   0          5d\nkube-system   kube-apiserver-control-plane               1/1     Running   0          5d\nkube-system   kube-controller-manager-control-plane      1/1     Running   0          5d\nkube-system   kube-proxy-xxxxx                          1/1     Running   0          5d\nkube-system   kube-scheduler-control-plane               1/1     Running   0          5d\ndefault       nginx-7854ff8877-abcde                    1/1     Running   0          2m",
  "kubectl get namespaces":
    "NAME              STATUS   AGE\ndefault           Active   5d\nkube-system       Active   5d\nkube-public       Active   5d\nkube-node-lease   Active   5d",
  "kubectl get ns":
    "NAME              STATUS   AGE\ndefault           Active   5d\nkube-system       Active   5d\nkube-public       Active   5d\nkube-node-lease   Active   5d",
  "kubectl get services":
    "NAME         TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)   AGE\nkubernetes   ClusterIP   10.96.0.1    <none>        443/TCP   5d",
  "kubectl get svc":
    "NAME         TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)   AGE\nkubernetes   ClusterIP   10.96.0.1    <none>        443/TCP   5d",
  "kubectl version":
    "Client Version: v1.28.0\nKustomize Version: v5.0.4-0.20230601165947-6ce0bf390ce3\nServer Version: v1.28.0",
  "kubectl cluster-info":
    "Kubernetes control plane is running at https://127.0.0.1:6443\nCoreDNS is running at https://127.0.0.1:6443/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy",
  "kubectl get deployments":
    "NAME    READY   UP-TO-DATE   AVAILABLE   AGE\nnginx   1/1     1            1           2m",
  "kubectl get deploy":
    "NAME    READY   UP-TO-DATE   AVAILABLE   AGE\nnginx   1/1     1            1           2m",
};

function getCommandResponse(command: string): string {
  // Check exact matches first
  if (K8S_RESPONSES[command]) return K8S_RESPONSES[command];

  // Check partial matches
  const cmd = command.trim();

  if (cmd.startsWith("kubectl run ")) {
    const name = cmd.split(" ")[2] || "pod";
    return `pod/${name} created`;
  }
  if (cmd.startsWith("kubectl create namespace ") || cmd.startsWith("kubectl create ns ")) {
    const ns = cmd.split(" ").pop();
    return `namespace/${ns} created`;
  }
  if (cmd.startsWith("kubectl create deployment ")) {
    const name = cmd.split(" ")[3] || "deployment";
    return `deployment.apps/${name} created`;
  }
  if (cmd.startsWith("kubectl apply -f ")) {
    return "resource configured";
  }
  if (cmd.startsWith("kubectl delete ")) {
    return `resource deleted`;
  }
  if (cmd.startsWith("kubectl describe ")) {
    return `Name:         example\nNamespace:    default\nLabels:       app=example\nAnnotations:  <none>\nStatus:       Running`;
  }
  if (cmd.startsWith("kubectl expose ")) {
    return "service/example exposed";
  }
  if (cmd.startsWith("kubectl scale ")) {
    return "deployment.apps/example scaled";
  }
  if (cmd.startsWith("kubectl logs ")) {
    return "Starting server on port 8080...\nReady to accept connections";
  }
  if (cmd.startsWith("kubectl exec ")) {
    return "Connected to pod";
  }
  if (cmd === "clear") return "__CLEAR__";
  if (cmd === "help") {
    return "Available commands: kubectl, clear, help\nThis is a simulated Kubernetes environment for practice.";
  }
  if (cmd.startsWith("kubectl")) {
    return `Command executed: ${cmd}`;
  }

  return `bash: ${cmd.split(" ")[0]}: command not found\nHint: This lab focuses on kubectl commands.`;
}

export default function LabView({ labConfig, lessonContent, onComplete }: Props) {
  const [started, setStarted] = useState(false);
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [input, setInput] = useState("");
  const [commands, setCommands] = useState<string[]>([]);
  const [showHints, setShowHints] = useState(false);
  const [currentHint, setCurrentHint] = useState(0);
  const [timeLeft, setTimeLeft] = useState(labConfig.timeLimit * 60);
  const [validated, setValidated] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hints: string[] = JSON.parse(labConfig.hints);

  useEffect(() => {
    if (!started) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [started]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  const handleStart = () => {
    setStarted(true);
    setLines([
      {
        type: "system",
        content:
          "Welcome to the KubeLearn Lab Environment!",
      },
      {
        type: "system",
        content: "Kubernetes cluster is ready. Type kubectl commands to practice.",
      },
      { type: "system", content: "Type 'help' for available commands.\n" },
    ]);
  };

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const cmd = input.trim();
    setCommands((prev) => [...prev, cmd]);

    const response = getCommandResponse(cmd);

    if (response === "__CLEAR__") {
      setLines([]);
    } else {
      setLines((prev) => [
        ...prev,
        { type: "input", content: `$ ${cmd}` },
        {
          type: response.includes("command not found") ? "error" : "output",
          content: response,
        },
      ]);
    }

    setInput("");
  };

  const handleValidate = async () => {
    const res = await fetch(`/api/labs/${labConfig.id}/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "simulated",
        commands,
      }),
    });

    const data = await res.json();
    setValidated(true);

    setLines((prev) => [
      ...prev,
      { type: "system", content: "\n--- Lab Validation ---" },
      {
        type: data.passed ? "system" : "error",
        content: data.message,
      },
      {
        type: "system",
        content: `Steps completed: ${data.completedSteps}/${data.totalSteps}`,
      },
    ]);

    if (data.passed) {
      onComplete();
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (!started) {
    return (
      <div className="space-y-6 mb-8">
        {/* Instructions */}
        <div className="glass-card p-8">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <TermIcon size={20} className="text-accent-green" />
            Lab Instructions
          </h2>
          <MarkdownRenderer content={labConfig.instructions} />
        </div>

        {/* Context */}
        {lessonContent && (
          <div className="glass-card p-8">
            <h2 className="text-xl font-bold text-white mb-4">Background</h2>
            <MarkdownRenderer content={lessonContent} />
          </div>
        )}

        <div className="text-center">
          <button
            onClick={handleStart}
            className="btn-primary flex items-center gap-2 mx-auto text-lg px-8 py-4"
          >
            <Play size={20} />
            Start Lab
          </button>
          <p className="text-sm text-kube-400 mt-2">
            Time limit: {labConfig.timeLimit} minutes
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 mb-8">
      {/* Timer and controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
              timeLeft < 60
                ? "bg-accent-red/20 text-accent-red"
                : timeLeft < 300
                ? "bg-accent-yellow/20 text-accent-yellow"
                : "bg-kube-800 text-kube-300"
            }`}
          >
            <Clock size={16} />
            <span className="font-mono font-semibold">
              {formatTime(timeLeft)}
            </span>
          </div>
          <span className="text-sm text-kube-400">
            {commands.length} commands executed
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHints(!showHints)}
            className="btn-ghost flex items-center gap-1 text-accent-yellow"
          >
            <Lightbulb size={16} />
            Hints
          </button>
          <button
            onClick={handleValidate}
            className="btn-primary flex items-center gap-2"
          >
            <CheckCircle2 size={16} />
            Validate
          </button>
        </div>
      </div>

      {/* Hints */}
      {showHints && (
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-accent-yellow flex items-center gap-2">
              <Lightbulb size={16} />
              Hint {currentHint + 1} of {hints.length}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setCurrentHint(Math.max(0, currentHint - 1))
                }
                disabled={currentHint === 0}
                className="btn-ghost text-xs disabled:opacity-30"
              >
                Prev
              </button>
              <button
                onClick={() =>
                  setCurrentHint(
                    Math.min(hints.length - 1, currentHint + 1)
                  )
                }
                disabled={currentHint === hints.length - 1}
                className="btn-ghost text-xs disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
          <p className="text-sm text-kube-300">{hints[currentHint]}</p>
        </div>
      )}

      {/* Instructions (collapsible) */}
      <details className="glass-card overflow-hidden">
        <summary className="p-4 cursor-pointer text-sm text-kube-400 hover:text-kube-300 transition">
          View Lab Instructions
        </summary>
        <div className="px-4 pb-4">
          <MarkdownRenderer content={labConfig.instructions} />
        </div>
      </details>

      {/* Terminal */}
      <div className="terminal-container">
        <div className="flex items-center gap-2 px-4 py-2 bg-kube-900 border-b border-kube-700">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-accent-red/80" />
            <div className="w-3 h-3 rounded-full bg-accent-yellow/80" />
            <div className="w-3 h-3 rounded-full bg-accent-green/80" />
          </div>
          <span className="text-xs text-kube-500 ml-2">
            kubelearn-lab ~ kubectl
          </span>
        </div>

        <div
          ref={terminalRef}
          className="p-4 h-96 overflow-y-auto font-mono text-sm"
          onClick={() => inputRef.current?.focus()}
        >
          {lines.map((line, i) => (
            <div
              key={i}
              className={`mb-1 whitespace-pre-wrap ${
                line.type === "input"
                  ? "text-accent-green"
                  : line.type === "error"
                  ? "text-accent-red"
                  : line.type === "system"
                  ? "text-accent-cyan"
                  : "text-gray-300"
              }`}
            >
              {line.content}
            </div>
          ))}

          {/* Input line */}
          <form onSubmit={handleCommand} className="flex items-center gap-2">
            <span className="text-accent-green">$</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-transparent outline-none text-white caret-accent-green"
              autoFocus
              spellCheck={false}
            />
          </form>
        </div>
      </div>

      {timeLeft === 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-accent-red/10 border border-accent-red/30 text-accent-red text-sm">
          <AlertTriangle size={16} />
          Time&apos;s up! You can still validate your work.
        </div>
      )}
    </div>
  );
}
