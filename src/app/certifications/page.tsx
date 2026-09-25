import type { Metadata } from "next";
import CertificationList from "@/components/certifications/CertificationList";
import { getCertificationSummaries } from "@/lib/queries/certifications";

// Rendered per request so builds never need a database; queries are cached for 5 minutes
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Certification Paths - KubeLearn",
  description: "Learning paths for the KCNA, CKA, CKAD and CKS Kubernetes certifications.",
};

export default async function CertificationsPage() {
  const certifications = await getCertificationSummaries();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">Certification Paths</h1>
        <p className="text-kube-400 max-w-2xl mx-auto text-lg">
          Choose a certification path aligned with official CNCF exams. Each path includes lessons,
          quizzes, hands-on labs and a timed mock exam.
        </p>
      </div>
      <CertificationList certifications={certifications} />
    </div>
  );
}
