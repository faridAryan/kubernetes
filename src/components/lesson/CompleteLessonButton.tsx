"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

interface Props {
  lessonId: string;
  nextHref: string;
}

export default function CompleteLessonButton({ lessonId, nextHref }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleClick = async () => {
    setSaving(true);
    const res = await fetch(`/api/lessons/${lessonId}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    setSaving(false);

    if (res.ok) {
      router.push(nextHref);
      router.refresh();
      return;
    }
    const data = await res.json().catch(() => ({ error: "Something went wrong" }));
    setError(data.error);
  };

  return (
    <div className="text-center mb-8">
      <button
        onClick={handleClick}
        disabled={saving}
        className="btn-primary flex items-center gap-2 mx-auto"
      >
        <CheckCircle2 size={18} />
        {saving ? "Marking complete..." : "Mark as Complete"}
      </button>
      {error && <p className="text-sm text-accent-red mt-2">{error}</p>}
    </div>
  );
}
