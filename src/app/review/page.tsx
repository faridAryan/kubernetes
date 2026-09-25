import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock, RotateCcw } from "lucide-react";
import QuizView from "@/components/quiz/QuizView";
import { getUserId } from "@/lib/http";
import { getDueReviews, getNextReviewDate } from "@/lib/queries/review";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Review - KubeLearn" };

export default async function ReviewPage() {
  const userId = await getUserId();
  if (userId === null) redirect("/login");

  const questions = await getDueReviews(userId);
  const nextReview = questions.length === 0 ? await getNextReviewDate(userId) : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-10">
        <RotateCcw size={48} className="text-accent-purple mx-auto mb-4" />
        <h1 className="text-4xl font-bold text-white mb-2">Review</h1>
        <p className="text-kube-400 max-w-xl mx-auto">
          Questions you got wrong come back here. Each correct review pushes the question further out
          until you&apos;ve mastered it.
        </p>
      </div>

      {questions.length > 0 ? (
        <QuizView questions={questions} continueHref="/dashboard" continueLabel="Back to dashboard" />
      ) : (
        <div className="glass-card p-12 text-center">
          <CalendarClock size={48} className="text-kube-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Nothing to review right now</h2>
          <p className="text-kube-400 mb-6">
            {nextReview ? `Your next review is due ${formatDate(nextReview)}.` : "Answer some quizzes to build your review queue."}
          </p>
          <Link href="/certifications" className="btn-primary">
            Keep learning
          </Link>
        </div>
      )}
    </div>
  );
}
