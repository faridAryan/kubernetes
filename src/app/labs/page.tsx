"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Terminal,
  Clock,
  Zap,
  Search,
  ChevronRight,
  Play,
} from "lucide-react";
import { getDifficultyColor, getDifficultyBg, formatDuration } from "@/lib/utils";

interface Lab {
  id: string;
  slug: string;
  title: string;
  duration: number;
  xpReward: number;
  module: {
    slug: string;
    name: string;
    certification: {
      slug: string;
      shortName: string;
      difficulty: string;
      icon: string;
    };
  };
}

export default function LabsPage() {
  const [labs, setLabs] = useState<Lab[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch all labs from certifications
    fetch("/api/certifications")
      .then((res) => res.json())
      .then((certs) => {
        const allLabs: Lab[] = [];
        for (const cert of certs) {
          for (const module of cert.modules || []) {
            // The modules from the list endpoint don't include lessons, so we'll show certification-level lab info
          }
        }
        setLabs(allLabs);
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <Terminal size={48} className="text-accent-green mx-auto mb-4" />
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
          Hands-on Labs
        </h1>
        <p className="text-kube-400 max-w-2xl mx-auto text-lg">
          Practice Kubernetes in interactive lab environments. Execute real
          kubectl commands, create resources, and validate your work.
        </p>
      </div>

      {/* Lab Feature Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="glass-card p-6 text-center">
          <Terminal size={32} className="text-accent-green mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">
            Interactive Terminal
          </h3>
          <p className="text-sm text-kube-400">
            Built-in terminal with kubectl commands and simulated Kubernetes
            cluster responses.
          </p>
        </div>
        <div className="glass-card p-6 text-center">
          <Play size={32} className="text-accent-cyan mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">
            Guided Exercises
          </h3>
          <p className="text-sm text-kube-400">
            Step-by-step instructions with hints. Learn by doing real
            Kubernetes tasks.
          </p>
        </div>
        <div className="glass-card p-6 text-center">
          <Zap size={32} className="text-accent-yellow mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">
            Auto-Validation
          </h3>
          <p className="text-sm text-kube-400">
            Instant feedback on your work. Validate your solutions and earn
            XP for completing labs.
          </p>
        </div>
      </div>

      {/* Labs by Certification */}
      <h2 className="text-2xl font-bold text-white mb-6">
        Labs by Certification
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          {
            name: "KCNA",
            icon: "🌱",
            slug: "kcna",
            difficulty: "beginner",
            labCount: "5+ labs",
            description:
              "Basic Kubernetes operations - pods, services, namespaces",
          },
          {
            name: "CKA",
            icon: "⚙️",
            slug: "cka",
            difficulty: "intermediate",
            labCount: "15+ labs",
            description:
              "Cluster administration - networking, storage, scheduling",
          },
          {
            name: "CKAD",
            icon: "🚀",
            slug: "ckad",
            difficulty: "intermediate",
            labCount: "12+ labs",
            description:
              "Application development - deployments, services, config",
          },
          {
            name: "CKS",
            icon: "🛡️",
            slug: "cks",
            difficulty: "advanced",
            labCount: "10+ labs",
            description:
              "Security - RBAC, network policies, pod security",
          },
        ].map((cert) => (
          <Link
            key={cert.slug}
            href={`/certifications/${cert.slug}`}
            className="glass-card-hover p-6 group"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="text-4xl">{cert.icon}</div>
              <div>
                <h3 className="text-xl font-bold text-white">{cert.name}</h3>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border ${getDifficultyBg(
                      cert.difficulty
                    )} ${getDifficultyColor(cert.difficulty)}`}
                  >
                    {cert.difficulty}
                  </span>
                  <span className="text-xs text-kube-400">{cert.labCount}</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-kube-400 mb-4">{cert.description}</p>
            <div className="flex items-center text-kube-400 text-sm group-hover:text-accent-green transition">
              <Terminal size={14} className="mr-1" />
              <span>Start Labs</span>
              <ChevronRight
                size={14}
                className="ml-1 group-hover:translate-x-1 transition-transform"
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
