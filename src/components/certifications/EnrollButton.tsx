"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlayCircle } from "lucide-react";

export default function EnrollButton({ slug, signedIn }: { slug: string; signedIn: boolean }) {
  const router = useRouter();
  const [enrolling, setEnrolling] = useState(false);

  const handleEnroll = async () => {
    if (signedIn === false) {
      router.push(`/login?callbackUrl=/certifications/${slug}`);
      return;
    }
    setEnrolling(true);
    await fetch(`/api/certifications/${slug}/enroll`, { method: "POST" });
    router.refresh();
    setEnrolling(false);
  };

  return (
    <button onClick={handleEnroll} disabled={enrolling} className="btn-primary flex items-center gap-2">
      <PlayCircle size={18} />
      {enrolling ? "Enrolling..." : "Enroll & Start Learning"}
    </button>
  );
}
