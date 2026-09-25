"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Award, CheckCircle2, ChevronLeft, ChevronRight, Clock, Lightbulb, Play, XCircle } from "lucide-react";
import OptionButton from "@/components/quiz/OptionButton";
import type { QuizQuestion } from "@/components/quiz/types";

type Answer = string | string[];

interface Props {
  certificationSlug: string;
  questionCount: number;
  durationMinutes: number;
  passPercent: number;
}

interface ExamResult {
  score: number;
  passed: boolean;
  passPercent: number;
  late: boolean;
  certificateCode: string | null;
  results: {
    id: string;
    question: string;
    correctAnswer: string | string[];
    explanation: string;
    answer: Answer | null;
    correct: boolean;
  }[];
}

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export default function ExamView({ certificationSlug, questionCount, durationMinutes, passPercent }: Props) {
  const router = useRouter();
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [current, setCurrent] = useState(0);
  const [expiresAt, setExpiresAt] = useState(0);
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitted = useRef(false);

  const submit = useCallback(async () => {
    if (attemptId === null || submitted.current) return;
    submitted.current = true;
    setBusy(true);

    const res = await fetch(`/api/exams/${attemptId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    const data = await res.json();
    setBusy(false);

    if (res.ok === false) {
      submitted.current = false;
      setError(data.error);
      return;
    }
    setResult(data);
    router.refresh();
  }, [attemptId, answers, router]);

  // Countdown; the exam submits itself when time runs out
  useEffect(() => {
    if (attemptId === null || result) return;
    const tick = () => {
      const left = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
      setTimeLeft(left);
      if (left === 0) submit();
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [attemptId, expiresAt, result, submit]);

  const start = async () => {
    setBusy(true);
    setError("");
    const res = await fetch("/api/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ certificationSlug }),
    });
    const data = await res.json();
    setBusy(false);

    if (res.ok === false) {
      setError(data.error);
      return;
    }
    submitted.current = false;
    setAnswers({});
    setCurrent(0);
    setResult(null);
    setQuestions(data.questions);
    setExpiresAt(new Date(data.expiresAt).getTime());
    setAttemptId(data.id);
  };

  const choose = (question: QuizQuestion, option: string) => {
    setAnswers((prev) => {
      if (question.type !== "multi_select") return { ...prev, [question.id]: option };
      const selected = Array.isArray(prev[question.id]) ? (prev[question.id] as string[]) : [];
      return {
        ...prev,
        [question.id]: selected.includes(option) ? selected.filter((o) => o !== option) : [...selected, option],
      };
    });
  };

  if (result) {
    return (
      <div className="space-y-6">
        <div className="glass-card p-8 text-center">
          {result.passed ? (
            <Award size={64} className="mx-auto text-accent-yellow mb-4" />
          ) : (
            <XCircle size={64} className="mx-auto text-accent-red mb-4" />
          )}
          <h2 className="text-3xl font-bold text-white mb-2">
            {result.passed ? "You passed!" : "Not this time"}
          </h2>
          <p className="text-kube-400 mb-6">
            You scored {result.score}% (pass mark {result.passPercent}%)
            {result.late && " - submitted after the time limit, so answers were not counted"}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {result.certificateCode && (
              <Link href={`/certificates/${result.certificateCode}`} className="btn-primary flex items-center gap-2">
                <Award size={16} />
                View certificate
              </Link>
            )}
            <button onClick={start} disabled={busy} className="btn-secondary">
              Take another exam
            </button>
            <Link href={`/certifications/${certificationSlug}`} className="btn-ghost">
              Back to path
            </Link>
          </div>
          {result.passed && result.certificateCode === null && (
            <p className="text-sm text-kube-400 mt-4">
              Complete every lesson in the path to receive your certificate.
            </p>
          )}
        </div>

        {result.results.map((item, i) => (
          <div key={item.id} className="glass-card p-6">
            <div className="flex items-start gap-2 mb-3">
              {item.correct ? (
                <CheckCircle2 size={18} className="text-accent-green mt-1 shrink-0" />
              ) : (
                <XCircle size={18} className="text-accent-red mt-1 shrink-0" />
              )}
              <h3 className="text-white font-semibold">
                {i + 1}. {item.question}
              </h3>
            </div>
            <p className="text-sm text-kube-400 mb-1">
              Your answer: {item.answer === null ? "(no answer)" : [item.answer].flat().join(", ")}
            </p>
            <p className="text-sm text-accent-green mb-3">
              Correct answer: {[item.correctAnswer].flat().join(", ")}
            </p>
            <p className="text-sm text-kube-300 flex items-start gap-2">
              <Lightbulb size={16} className="text-accent-yellow mt-0.5 shrink-0" />
              {item.explanation}
            </p>
          </div>
        ))}
      </div>
    );
  }

  if (attemptId === null) {
    return (
      <div className="glass-card p-8 text-center">
        <Clock size={48} className="mx-auto text-kube-400 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Timed mock exam</h2>
        <p className="text-kube-400 mb-6">
          {questionCount} random questions from this path · {durationMinutes} minutes · pass mark {passPercent}%
        </p>
        <button onClick={start} disabled={busy} className="btn-primary inline-flex items-center gap-2">
          <Play size={18} />
          {busy ? "Preparing..." : "Start exam"}
        </button>
        {error && <p className="text-sm text-accent-red mt-3">{error}</p>}
      </div>
    );
  }

  const question = questions[current];
  const answer = answers[question.id];
  const answeredCount = questions.filter((q) => answers[q.id] !== undefined && [answers[q.id]].flat().length > 0).length;
  const options = question.type === "true_false" ? ["True", "False"] : question.options;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${timeLeft < 120 ? "bg-accent-red/20 text-accent-red" : "bg-kube-800 text-kube-300"}`}>
          <Clock size={16} />
          <span className="font-mono font-semibold">{formatTime(timeLeft)}</span>
        </div>
        <span className="text-sm text-kube-400">
          {answeredCount}/{questions.length} answered
        </span>
        <button onClick={submit} disabled={busy} className="btn-primary disabled:opacity-50">
          {busy ? "Submitting..." : "Submit exam"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {questions.map((q, i) => (
          <button
            key={q.id}
            onClick={() => setCurrent(i)}
            aria-label={`Question ${i + 1}`}
            className={`w-9 h-9 rounded-lg text-sm font-mono ${
              i === current
                ? "bg-kube-500 text-white"
                : answers[q.id] !== undefined
                  ? "bg-accent-green/20 text-accent-green"
                  : "bg-kube-800 text-kube-400"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className="glass-card p-8">
        <div className="text-xs text-kube-500 mb-2 uppercase tracking-wide">
          Question {current + 1} of {questions.length}
          {question.type === "multi_select" && " · select all that apply"}
        </div>
        <h3 className="text-xl font-semibold text-white mb-6">{question.question}</h3>
        <div className="space-y-3 mb-6">
          {options.map((option) => (
            <OptionButton
              key={option}
              option={option}
              selected={Array.isArray(answer) ? answer.includes(option) : answer === option}
              result={null}
              disabled={busy}
              onClick={() => choose(question, option)}
            />
          ))}
        </div>
        <div className="flex justify-between">
          <button
            onClick={() => setCurrent(current - 1)}
            disabled={current === 0}
            className="btn-ghost flex items-center gap-1 disabled:opacity-30"
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          <button
            onClick={() => setCurrent(current + 1)}
            disabled={current === questions.length - 1}
            className="btn-ghost flex items-center gap-1 disabled:opacity-30"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-accent-red">{error}</p>}
    </div>
  );
}
