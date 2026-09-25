"use client";

import { useState, useRef, useEffect, type ReactNode, type KeyboardEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Terminal as TermIcon,
  Play,
  CheckCircle2,
  Circle,
  Lightbulb,
  Clock,
  AlertTriangle,
  ChevronRight,
  RotateCcw,
} from "lucide-react";

interface Props {
  labConfigId: string;
  hints: string[];
  timeLimit: number;
  instructions: ReactNode;
  background: ReactNode;
  continueHref: string;
}

interface TerminalLine {
  type: "input" | "output" | "error" | "system";
  content: string;
}

interface CheckResult {
  description: string;
  passed: boolean;
}

const LINE_COLORS: Record<TerminalLine["type"], string> = {
  input: "text-accent-green",
  error: "text-accent-red",
  system: "text-accent-cyan",
  output: "text-gray-300",
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function LabView({ labConfigId, hints, timeLimit, instructions, background, continueHref }: Props) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(timeLimit * 60);
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [ended, setEnded] = useState(false);
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [passed, setPassed] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [currentHint, setCurrentHint] = useState(0);
  const [startError, setStartError] = useState("");
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (expiresAt === null) return;
    const tick = () => setTimeLeft(Math.max(0, Math.round((expiresAt - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  useEffect(() => {
    terminalRef.current?.scrollTo({ top: terminalRef.current.scrollHeight });
  }, [lines, busy]);

  const append = (...newLines: TerminalLine[]) => setLines((prev) => [...prev, ...newLines]);

  const handleStart = async () => {
    setBusy(true);
    setStartError("");
    const res = await fetch(`/api/labs/${labConfigId}/start`, { method: "POST" });
    const data = await res.json();
    setBusy(false);

    if (res.ok === false) {
      setStartError(data.error);
      return;
    }

    setSessionId(data.id);
    setExpiresAt(new Date(data.expiresAt).getTime());
    setHistory(data.commands);
    setEnded(false);
    setChecks([]);
    setLines([
      { type: "system", content: "Welcome to the KubeLearn lab cluster (3 nodes, Kubernetes v1.30)." },
      data.commands.length > 0
        ? { type: "system", content: `Resumed your session: ${data.commands.length} commands already run.` }
        : { type: "system", content: "Type kubectl commands to complete the tasks. Type 'help' for tips." },
    ]);
  };

  const handleCommand = async (e: FormEvent) => {
    e.preventDefault();
    const command = input.trim();
    if (command === "" || sessionId === null || busy) return;

    setInput("");
    setHistoryIdx(null);

    if (command === "clear") {
      setLines([]);
      return;
    }
    if (command === "help") {
      append(
        { type: "input", content: `$ ${command}` },
        {
          type: "system",
          content:
            "Commands run against a simulated cluster: get (incl. events, endpoints), describe, run, create,\nexpose, scale, set image, set selector, rollout, label, delete, cordon, uncordon, drain, taint,\nlogs, auth can-i, config. Use 'clear' to clear the screen and Validate when you're done.",
        }
      );
      return;
    }

    setHistory((prev) => [...prev, command]);
    append({ type: "input", content: `$ ${command}` });
    setBusy(true);

    const res = await fetch(`/api/lab-sessions/${sessionId}/exec`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command }),
    });
    const data = await res.json();
    setBusy(false);

    if (res.status === 410) setEnded(true);
    if (res.ok === false) {
      append({ type: "error", content: data.error });
      return;
    }
    append({ type: data.isError ? "error" : "output", content: data.output });
  };

  // Up/down arrows walk through previous commands like a real shell
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (history.length === 0 || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
    e.preventDefault();

    const last = history.length - 1;
    const next =
      e.key === "ArrowUp"
        ? Math.max(0, (historyIdx ?? history.length) - 1)
        : historyIdx === null || historyIdx >= last
          ? null
          : historyIdx + 1;

    setHistoryIdx(next);
    setInput(next === null ? "" : history[next]);
  };

  const handleValidate = async () => {
    if (sessionId === null) return;
    setBusy(true);
    const res = await fetch(`/api/lab-sessions/${sessionId}/validate`, { method: "POST" });
    const data = await res.json();
    setBusy(false);

    if (res.status === 410) setEnded(true);
    if (res.ok === false) {
      append({ type: "error", content: data.error });
      return;
    }

    setChecks(data.checks);
    if (data.passed) {
      setPassed(true);
      router.refresh();
    }
  };

  if (sessionId === null) {
    return (
      <div className="space-y-6 mb-8">
        <div className="glass-card p-8">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <TermIcon size={20} className="text-accent-green" />
            Lab Instructions
          </h2>
          {instructions}
        </div>

        {background && (
          <div className="glass-card p-8">
            <h2 className="text-xl font-bold text-white mb-4">Background</h2>
            {background}
          </div>
        )}

        <div className="text-center">
          <button
            onClick={handleStart}
            disabled={busy}
            className="btn-primary flex items-center gap-2 mx-auto text-lg px-8 py-4"
          >
            <Play size={20} />
            {busy ? "Starting..." : "Start Lab"}
          </button>
          <p className="text-sm text-kube-400 mt-2">Time limit: {timeLimit} minutes</p>
          {startError && <p className="text-sm text-accent-red mt-2">{startError}</p>}
        </div>
      </div>
    );
  }

  if (passed) {
    return (
      <div className="glass-card p-8 text-center mb-8">
        <CheckCircle2 size={64} className="mx-auto text-accent-green mb-4" />
        <h2 className="text-3xl font-bold text-white mb-2">Lab complete!</h2>
        <p className="text-kube-400 mb-6">Every task checked out against the cluster state.</p>
        <Link href={continueHref} className="btn-primary inline-flex items-center gap-2">
          Continue
          <ChevronRight size={16} />
        </Link>
      </div>
    );
  }

  const timerStyle =
    timeLeft < 60
      ? "bg-accent-red/20 text-accent-red"
      : timeLeft < 300
        ? "bg-accent-yellow/20 text-accent-yellow"
        : "bg-kube-800 text-kube-300";

  return (
    <div className="space-y-4 mb-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${timerStyle}`}>
            <Clock size={16} />
            <span className="font-mono font-semibold">{formatTime(timeLeft)}</span>
          </div>
          <span className="text-sm text-kube-400">{history.length} commands run</span>
        </div>
        <div className="flex items-center gap-2">
          {hints.length > 0 && (
            <button onClick={() => setShowHints(!showHints)} className="btn-ghost flex items-center gap-1 text-accent-yellow">
              <Lightbulb size={16} />
              Hints
            </button>
          )}
          <button onClick={handleValidate} disabled={busy || ended} className="btn-primary flex items-center gap-2 disabled:opacity-50">
            <CheckCircle2 size={16} />
            Validate
          </button>
        </div>
      </div>

      {showHints && (
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-accent-yellow flex items-center gap-2">
              <Lightbulb size={16} />
              Hint {currentHint + 1} of {hints.length}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentHint(Math.max(0, currentHint - 1))}
                disabled={currentHint === 0}
                className="btn-ghost text-xs disabled:opacity-30"
              >
                Prev
              </button>
              <button
                onClick={() => setCurrentHint(Math.min(hints.length - 1, currentHint + 1))}
                disabled={currentHint === hints.length - 1}
                className="btn-ghost text-xs disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
          <p className="text-sm text-kube-300 font-mono">{hints[currentHint]}</p>
        </div>
      )}

      {checks.length > 0 && (
        <div className="glass-card p-4 space-y-2">
          <h3 className="text-sm font-semibold text-white">
            {checks.filter((c) => c.passed).length}/{checks.length} tasks complete
          </h3>
          {checks.map((check) => (
            <div key={check.description} className="flex items-center gap-2 text-sm">
              {check.passed ? (
                <CheckCircle2 size={16} className="text-accent-green shrink-0" />
              ) : (
                <Circle size={16} className="text-kube-600 shrink-0" />
              )}
              <span className={check.passed ? "text-kube-300" : "text-white"}>{check.description}</span>
            </div>
          ))}
        </div>
      )}

      <details className="glass-card overflow-hidden">
        <summary className="p-4 cursor-pointer text-sm text-kube-400 hover:text-kube-300 transition">
          View Lab Instructions
        </summary>
        <div className="px-4 pb-4">{instructions}</div>
      </details>

      <div className="terminal-container">
        <div className="flex items-center gap-2 px-4 py-2 bg-kube-900 border-b border-kube-700">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-accent-red/80" />
            <div className="w-3 h-3 rounded-full bg-accent-yellow/80" />
            <div className="w-3 h-3 rounded-full bg-accent-green/80" />
          </div>
          <span className="text-xs text-kube-500 ml-2">kubelearn-lab ~ kubectl</span>
        </div>

        <div
          ref={terminalRef}
          className="p-4 h-96 overflow-y-auto font-mono text-sm"
          onClick={() => inputRef.current?.focus()}
        >
          {lines.map((line, i) => (
            <div key={i} className={`mb-1 whitespace-pre-wrap ${LINE_COLORS[line.type]}`}>
              {line.content}
            </div>
          ))}

          {ended ? null : (
            <form onSubmit={handleCommand} className="flex items-center gap-2">
              <span className="text-accent-green">$</span>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={busy}
                maxLength={500}
                className="flex-1 bg-transparent outline-none text-white caret-accent-green"
                autoFocus
                spellCheck={false}
                autoComplete="off"
                aria-label="kubectl command"
              />
            </form>
          )}
        </div>
      </div>

      {(ended || timeLeft === 0) && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-accent-red/10 border border-accent-red/30 text-accent-red text-sm">
          <span className="flex items-center gap-2">
            <AlertTriangle size={16} />
            Time&apos;s up for this session.
          </span>
          <button onClick={handleStart} className="btn-secondary flex items-center gap-2 text-sm">
            <RotateCcw size={14} />
            Start a fresh cluster
          </button>
        </div>
      )}
    </div>
  );
}
