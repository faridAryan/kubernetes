"use client";

import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  ChevronRight,
  Zap,
  Trophy,
  RotateCcw,
  Lightbulb,
} from "lucide-react";

interface QuizQuestion {
  id: string;
  question: string;
  type: string;
  options: string;
  explanation: string;
  order: number;
  xpReward: number;
}

interface Props {
  questions: QuizQuestion[];
  lessonId: string;
  onComplete: () => void;
}

interface AnswerResult {
  correct: boolean;
  correctAnswer: string | string[];
  explanation: string;
  xpEarned: number;
}

export default function QuizView({ questions, lessonId, onComplete }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | string[] | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [score, setScore] = useState(0);
  const [totalXp, setTotalXp] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const currentQuestion = questions[currentIdx];
  const options: string[] = currentQuestion
    ? JSON.parse(currentQuestion.options)
    : [];

  const handleSubmit = async () => {
    if (!selectedAnswer || !currentQuestion) return;
    setSubmitting(true);

    const res = await fetch(`/api/quiz/${currentQuestion.id}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer: selectedAnswer }),
    });

    const data: AnswerResult = await res.json();
    setResult(data);
    setAnsweredCount((prev) => prev + 1);

    if (data.correct) {
      setScore((prev) => prev + 1);
      setTotalXp((prev) => prev + data.xpEarned);
    }
    setSubmitting(false);
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
      setSelectedAnswer(null);
      setResult(null);
    } else {
      setIsFinished(true);
      onComplete();
    }
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setSelectedAnswer(null);
    setResult(null);
    setScore(0);
    setTotalXp(0);
    setAnsweredCount(0);
    setIsFinished(false);
  };

  if (isFinished) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="glass-card p-8 text-center mb-8">
        <div className="mb-6">
          {percentage >= 80 ? (
            <Trophy size={64} className="mx-auto text-accent-yellow mb-4" />
          ) : percentage >= 50 ? (
            <CheckCircle2
              size={64}
              className="mx-auto text-accent-green mb-4"
            />
          ) : (
            <RotateCcw
              size={64}
              className="mx-auto text-accent-orange mb-4"
            />
          )}
          <h2 className="text-3xl font-bold text-white mb-2">
            {percentage >= 80
              ? "Excellent!"
              : percentage >= 50
              ? "Good job!"
              : "Keep practicing!"}
          </h2>
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

        {percentage < 80 && (
          <button
            onClick={handleRestart}
            className="btn-secondary flex items-center gap-2 mx-auto"
          >
            <RotateCcw size={16} />
            Try Again
          </button>
        )}
      </div>
    );
  }

  if (!currentQuestion) return null;

  return (
    <div className="mb-8">
      {/* Progress bar */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 xp-bar h-2">
          <div
            className="xp-bar-fill"
            style={{
              width: `${((currentIdx + (result ? 1 : 0)) / questions.length) * 100}%`,
            }}
          />
        </div>
        <span className="text-sm text-kube-400">
          {currentIdx + 1}/{questions.length}
        </span>
      </div>

      <div className="glass-card p-8">
        {/* Question */}
        <div className="mb-6">
          <div className="text-xs text-kube-500 mb-2 uppercase tracking-wide">
            Question {currentIdx + 1} of {questions.length}
          </div>
          <h3 className="text-xl font-semibold text-white">
            {currentQuestion.question}
          </h3>
        </div>

        {/* Options */}
        <div className="space-y-3 mb-6">
          {currentQuestion.type === "true_false"
            ? ["True", "False"].map((opt) => (
                <OptionButton
                  key={opt}
                  option={opt}
                  selected={selectedAnswer === opt}
                  result={result}
                  correctAnswer={result?.correctAnswer}
                  disabled={!!result}
                  onClick={() => !result && setSelectedAnswer(opt)}
                />
              ))
            : options.map((opt, i) => (
                <OptionButton
                  key={i}
                  option={opt}
                  selected={
                    currentQuestion.type === "multi_select"
                      ? (selectedAnswer as string[] | null)?.includes(opt) ?? false
                      : selectedAnswer === opt
                  }
                  result={result}
                  correctAnswer={result?.correctAnswer}
                  disabled={!!result}
                  onClick={() => {
                    if (result) return;
                    if (currentQuestion.type === "multi_select") {
                      const current = (selectedAnswer as string[]) || [];
                      if (current.includes(opt)) {
                        setSelectedAnswer(
                          current.filter((a) => a !== opt)
                        );
                      } else {
                        setSelectedAnswer([...current, opt]);
                      }
                    } else {
                      setSelectedAnswer(opt);
                    }
                  }}
                />
              ))}
        </div>

        {/* Explanation */}
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
                    Correct! +{result.xpEarned} XP
                  </span>
                </>
              ) : (
                <>
                  <XCircle size={18} className="text-accent-red" />
                  <span className="font-semibold text-accent-red">
                    Incorrect
                  </span>
                </>
              )}
            </div>
            <div className="flex items-start gap-2 text-sm text-kube-300">
              <Lightbulb size={16} className="text-accent-yellow mt-0.5 shrink-0" />
              <span>{currentQuestion.explanation}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          {!result ? (
            <button
              onClick={handleSubmit}
              disabled={!selectedAnswer || submitting}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? "Checking..." : "Submit Answer"}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="btn-primary flex items-center gap-2"
            >
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

function OptionButton({
  option,
  selected,
  result,
  correctAnswer,
  disabled,
  onClick,
}: {
  option: string;
  selected: boolean;
  result: AnswerResult | null;
  correctAnswer?: string | string[];
  disabled: boolean;
  onClick: () => void;
}) {
  const isCorrectAnswer = Array.isArray(correctAnswer)
    ? correctAnswer.includes(option)
    : correctAnswer === option;

  let borderColor = "border-kube-700";
  let bgColor = "bg-kube-800/50";

  if (result) {
    if (isCorrectAnswer) {
      borderColor = "border-accent-green/50";
      bgColor = "bg-accent-green/10";
    } else if (selected) {
      borderColor = "border-accent-red/50";
      bgColor = "bg-accent-red/10";
    }
  } else if (selected) {
    borderColor = "border-kube-500";
    bgColor = "bg-kube-500/10";
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left p-4 rounded-xl border ${borderColor} ${bgColor} transition-all ${
        !disabled ? "hover:border-kube-500 hover:bg-kube-800/80" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
            selected ? "border-kube-500" : "border-kube-600"
          }`}
        >
          {selected && (
            <div className="w-2.5 h-2.5 rounded-full bg-kube-500" />
          )}
        </div>
        <span className="text-sm text-kube-200">{option}</span>
        {result && isCorrectAnswer && (
          <CheckCircle2 size={16} className="text-accent-green ml-auto" />
        )}
        {result && selected && !isCorrectAnswer && (
          <XCircle size={16} className="text-accent-red ml-auto" />
        )}
      </div>
    </button>
  );
}
