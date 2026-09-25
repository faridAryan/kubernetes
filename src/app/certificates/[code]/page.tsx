import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Award, ShieldCheck } from "lucide-react";
import { getCertificate } from "@/lib/queries/certificate";
import { formatDate } from "@/lib/utils";

interface Props {
  params: { code: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const certificate = await getCertificate(params.code);
  return {
    title: certificate
      ? `${certificate.user.name} - ${certificate.certification.shortName} certificate - KubeLearn`
      : "Certificate not found - KubeLearn",
  };
}

// Public page so anyone with the link can verify the certificate
export default async function CertificatePage({ params }: Props) {
  const certificate = await getCertificate(params.code);
  if (certificate === null) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="glass-card p-10 sm:p-14 text-center border-2 border-accent-yellow/30">
        <Award size={64} className="mx-auto text-accent-yellow mb-6" />
        <p className="uppercase tracking-[0.3em] text-xs text-kube-400 mb-4">Certificate of completion</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-6">{certificate.user.name}</h1>
        <p className="text-kube-300 mb-2">has completed the KubeLearn learning path</p>
        <p className="text-2xl font-semibold gradient-text mb-8">
          {certificate.certification.icon} {certificate.certification.name}
        </p>
        <div className="flex flex-wrap justify-center gap-8 text-sm text-kube-400 mb-8">
          <div>
            <div className="text-white font-semibold">{formatDate(certificate.issuedAt)}</div>
            Issued
          </div>
          <div>
            <div className="text-white font-semibold">{certificate.examScore}%</div>
            Mock exam score
          </div>
        </div>
        <p className="text-xs text-kube-500 flex items-center justify-center gap-1">
          <ShieldCheck size={14} className="text-accent-green" />
          Verified credential ID {certificate.code}
        </p>
        <p className="text-xs text-kube-600 mt-4">
          This is a KubeLearn practice credential, not an official CNCF certification.
        </p>
      </div>
    </div>
  );
}
