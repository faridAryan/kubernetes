import type { Metadata } from "next";
import Link from "next/link";
import { Terminal, Zap, ChevronRight, Play, Clock } from "lucide-react";
import { getLabCatalog } from "@/lib/queries/labs";
import { formatDuration, getDifficultyBg, getDifficultyColor } from "@/lib/utils";

// Rendered per request so builds never need a database; queries are cached for 5 minutes
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hands-on Labs - KubeLearn",
  description: "Practice kubectl against a simulated Kubernetes cluster with automatic validation.",
};

const FEATURES = [
  {
    icon: <Terminal size={32} className="text-accent-green mx-auto mb-3" />,
    title: "Stateful cluster",
    text: "Every command changes a simulated 3-node cluster: create, scale, drain and taint just like the real thing.",
  },
  {
    icon: <Play size={32} className="text-accent-cyan mx-auto mb-3" />,
    title: "Guided tasks",
    text: "Step-by-step instructions with hints for common CKA, CKAD and CKS tasks.",
  },
  {
    icon: <Zap size={32} className="text-accent-yellow mx-auto mb-3" />,
    title: "State-based validation",
    text: "Validation checks the resulting cluster state on the server, so only real solutions pass.",
  },
];

export default async function LabsPage() {
  const catalog = await getLabCatalog();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <Terminal size={48} className="text-accent-green mx-auto mb-4" />
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">Hands-on Labs</h1>
        <p className="text-kube-400 max-w-2xl mx-auto text-lg">
          Practice Kubernetes in an interactive terminal. Run kubectl commands, change the cluster and
          validate your work.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="glass-card p-6 text-center">
            {feature.icon}
            <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
            <p className="text-sm text-kube-400">{feature.text}</p>
          </div>
        ))}
      </div>

      <h2 className="text-2xl font-bold text-white mb-6">Labs by Certification</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {catalog.map((cert) => {
          const labs = cert.modules.flatMap((module) =>
            module.lessons.map((lab) => ({ ...lab, href: `/learn/${cert.slug}/${module.slug}/${lab.slug}` }))
          );

          return (
            <div key={cert.slug} className="glass-card p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="text-4xl">{cert.icon}</div>
                <div>
                  <h3 className="text-xl font-bold text-white">{cert.shortName}</h3>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${getDifficultyBg(cert.difficulty)} ${getDifficultyColor(cert.difficulty)}`}
                    >
                      {cert.difficulty}
                    </span>
                    <span className="text-xs text-kube-400">
                      {labs.length} {labs.length === 1 ? "lab" : "labs"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                {labs.map((lab) => (
                  <Link
                    key={lab.href}
                    href={lab.href}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-kube-800/50 transition group"
                  >
                    <Terminal size={14} className="text-accent-green shrink-0" />
                    <span className="flex-1 text-sm text-kube-200">{lab.title}</span>
                    <span className="text-xs text-kube-500 flex items-center gap-1">
                      <Clock size={12} />
                      {formatDuration(lab.duration)}
                    </span>
                    <ChevronRight size={14} className="text-kube-500 group-hover:translate-x-1 transition-transform" />
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
