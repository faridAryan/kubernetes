"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  ChevronRight,
  Zap,
  Trophy,
  RotateCcw,
  Lightbulb,
} from "lucide-react";
import OptionButton from "./OptionButton";
import type { AnswerResult, QuizQuestion } from "./types";

interface Props {
  questions: QuizQuestion[];
  // Lesson quizzes report completion; review sessions don't
  lessonId?: string;
  continueHref: string;
  continueLabel: string;
}

export default function QuizView({ questions, lessonId, continueHref, continueLabel }: Props) {
  const router = useRouter();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | string[] | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [score, setScore] = useState(0);
  const [totalXp, setTotalXp] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const currentQuestion = questions[currentIdx];
  const isMultiSelect = currentQuestion?.type === "multi_select";
  const hasSelection = Array.isArray(selectedAnswer) ? selectedAnswer.length > 0 : selectedAnswer !== null;

  const handleSubmit = async () => {
    if (hasSelection === false || currentQuestion === undefined) return;
    setSubmitting(true);
    setError("");

    const res = await fetch(`/api/quiz/${currentQuestion.id}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer: selectedAnswer }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (res.ok === false) {
      setError(data.error);
      return;
    }

    setResult(data);
    if (data.correct) {
      setScore((prev) => prev + 1);
      setTotalXp((prev) => prev + data.xpEarned);
    }
  };

  const finish = async () => {
    setIsFinished(true);
    if (lessonId) {
      await fetch(`/api/lessons/${lessonId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
    }
    router.refresh();
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
      setSelectedAnswer(null);
      setResult(null);
      return;
    }
    finish();
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setSelectedAnswer(null);
    setResult(null);
    setScore(0);
    setTotalXp(0);
    setIsFinished(false);
  };

  const toggleOption = (option: string) => {
    if (result) return;
    if (isMultiSelect === false) {
      setSelectedAnswer(option);
      return;
    }
    const current = Array.isArray(selectedAnswer) ? selectedAnswer : [];
    setSelectedAnswer(
      current.includes(option) ? current.filter((a) => a !== option) : [...current, option]
    );
  };

  if (isFinished) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="glass-card p-8 text-center mb-8">
        <div className="mb-6">
          {percentage >= 80 ? (
            <Trophy size={64} className="mx-auto text-accent-yellow mb-4" />
          ) : percentage >= 50 ? (
            <CheckCircle2 size={64} className="mx-auto text-accent-green mb-4" />
          ) : (
            <RotateCcw size={64} className="mx-auto text-accent-orange mb-4" />
          )}
          <h2 className="text-3xl font-bold text-white mb-2">
            {percentage >= 80 ? "Excellent!" : percentage >= 50 ? "Good job!" : "Keep practicing!"}
          </h2>
          {percentage < 100 && (
            <p className="text-sm text-kube-400">
              Questions you missed will come back in your review queue.
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-8">
          <div className="glass-card p-4">
            <div className="text-2xl font-bold text-white">{percentage}%</div>
            <div className="text-xs text-kube-400">Score</div>
          </div>
          <div className="glass-card p-4">
            <div className="text-2xl font-bold text-white">
              {score}/{questions.length}
            </div>
            <div className="text-xs text-kube-400">Correct</div>
          </div>
          <div className="glass-card p-4">
            <div className="text-2xl font-bold text-accent-yellow flex items-center justify-center gap-1">
              <Zap size={18} />
              {totalXp}
            </div>
            <div className="text-xs text-kube-400">XP Earned</div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          {percentage < 100 && lessonId && (
            <button onClick={handleRestart} className="btn-secondary flex items-center gap-2">
              <RotateCcw size={16} />
              Try Again
            </button>
          )}
          <Link href={continueHref} className="btn-primary flex items-center gap-2">
            {continueLabel}
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  if (currentQuestion === undefined) return null;

  const options = currentQuestion.type === "true_false" ? ["True", "False"] : currentQuestion.options;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 xp-bar h-2">
          <div
            className="xp-bar-fill"
            style={{ width: `${((currentIdx + (result ? 1 : 0)) / questions.length) * 100}%` }}
          />
        </div>
        <span className="text-sm text-kube-400">
          {currentIdx + 1}/{questions.length}
        </span>
      </div>

      <div className="glass-card p-8">
        <div className="mb-6">
          <div className="text-xs text-kube-500 mb-2 uppercase tracking-wide">
            Question {currentIdx + 1} of {questions.length}
            {isMultiSelect && " · select all that apply"}
          </div>
          <h3 className="text-xl font-semibold text-white">{currentQuestion.question}</h3>
        </div>

        <div className="space-y-3 mb-6">
          {options.map((option) => (
            <OptionButton
              key={option}
              option={option}
              selected={Array.isArray(selectedAnswer) ? selectedAnswer.includes(option) : selectedAnswer === option}
              result={result}
              disabled={result !== null}
              onClick={() => toggleOption(option)}
            />
          ))}
        </div>

        {result && (
          <div
            className={`p-4 rounded-xl mb-6 ${
              result.correct
                ? "bg-accent-green/10 border border-accent-green/30"
                : "bg-accent-red/10 border border-accent-red/30"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {result.correct ? (
                <>
                  <CheckCircle2 size={18} className="text-accent-green" />
                  <span className="font-semibold text-accent-green">
                    Correct!{result.xpEarned > 0 && ` +${result.xpEarned} XP`}
                  </span>
                </>
              ) : (
                <>
                  <XCircle size={18} className="text-accent-red" />
                  <span className="font-semibold text-accent-red">Incorrect</span>
                </>
              )}
            </div>
            <div className="flex items-start gap-2 text-sm text-kube-300">
              <Lightbulb size={16} className="text-accent-yellow mt-0.5 shrink-0" />
              <span>{result.explanation}</span>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-accent-red mb-4">{error}</p>}

        <div className="flex justify-end gap-3">
          {result === null ? (
            <button
              onClick={handleSubmit}
              disabled={hasSelection === false || submitting}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? "Checking..." : "Submit Answer"}
            </button>
          ) : (
            <button onClick={handleNext} className="btn-primary flex items-center gap-2">
              {currentIdx < questions.length - 1 ? (
                <>
                  Next Question
                  <ChevronRight size={16} />
                </>
              ) : (
                <>
                  <Trophy size={16} />
                  See Results
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
