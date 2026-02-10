import Link from "next/link";
import {
  BookOpen,
  Terminal,
  Trophy,
  Zap,
  Shield,
  Target,
  ChevronRight,
  Flame,
  Star,
  Award,
} from "lucide-react";

const certPaths = [
  {
    name: "KCNA",
    full: "Kubernetes and Cloud Native Associate",
    difficulty: "Beginner",
    color: "from-accent-green to-emerald-600",
    icon: "🌱",
    slug: "kcna",
  },
  {
    name: "CKA",
    full: "Certified Kubernetes Administrator",
    difficulty: "Intermediate",
    color: "from-kube-500 to-blue-600",
    icon: "⚙️",
    slug: "cka",
  },
  {
    name: "CKAD",
    full: "Certified Kubernetes App Developer",
    difficulty: "Intermediate",
    color: "from-accent-purple to-violet-600",
    icon: "🚀",
    slug: "ckad",
  },
  {
    name: "CKS",
    full: "Certified Kubernetes Security Specialist",
    difficulty: "Advanced",
    color: "from-accent-red to-rose-600",
    icon: "🛡️",
    slug: "cks",
  },
];

const features = [
  {
    icon: BookOpen,
    title: "Interactive Lessons",
    description:
      "Deep-dive reading materials with real-world examples and best practices for each certification domain.",
    color: "text-kube-400",
  },
  {
    icon: Target,
    title: "Adaptive Quizzes",
    description:
      "Test your knowledge with multiple question types that adapt to your learning pace and identify weak areas.",
    color: "text-accent-purple",
  },
  {
    icon: Terminal,
    title: "Hands-on Labs",
    description:
      "Practice in real Kubernetes environments with guided exercises, validation, and instant feedback.",
    color: "text-accent-green",
  },
  {
    icon: Zap,
    title: "XP & Leveling",
    description:
      "Earn experience points for every activity. Level up from Pod Novice to K8s Grandmaster.",
    color: "text-accent-yellow",
  },
  {
    icon: Flame,
    title: "Daily Streaks",
    description:
      "Build consistency with daily learning streaks. Compete with others and unlock streak badges.",
    color: "text-accent-orange",
  },
  {
    icon: Shield,
    title: "Certification Ready",
    description:
      "Content aligned with official CNCF exam curricula. Track your readiness with mock exams.",
    color: "text-accent-cyan",
  },
];

const stats = [
  { value: "4", label: "Cert Paths" },
  { value: "100+", label: "Lessons" },
  { value: "50+", label: "Labs" },
  { value: "500+", label: "Questions" },
];

export default function HomePage() {
  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-kube-500/5 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-kube-500/10 rounded-full blur-3xl" />
        <div className="absolute top-40 right-1/4 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-kube-800/50 border border-kube-700/50 text-sm text-kube-300 mb-8">
              <Star size={14} className="text-accent-yellow" />
              <span>The gamified way to master Kubernetes</span>
            </div>

            <h1 className="text-5xl sm:text-7xl font-bold mb-6 leading-tight">
              <span className="text-white">Learn Kubernetes</span>
              <br />
              <span className="gradient-text">Like a Game</span>
            </h1>

            <p className="text-xl text-kube-300 mb-10 max-w-2xl mx-auto leading-relaxed">
              Master Kubernetes through interactive certification paths,
              hands-on labs with real clusters, and gamified learning.
              From KCNA to CKS - level up your cloud native skills.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link
                href="/register"
                className="btn-primary text-lg px-8 py-4 flex items-center gap-2"
              >
                Start Learning Free
                <ChevronRight size={20} />
              </Link>
              <Link
                href="/certifications"
                className="btn-secondary text-lg px-8 py-4 flex items-center gap-2"
              >
                <BookOpen size={20} />
                Browse Paths
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl mx-auto">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl font-bold text-white">
                    {stat.value}
                  </div>
                  <div className="text-sm text-kube-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Certification Paths Preview */}
      <section className="relative py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Choose Your Certification Path
            </h2>
            <p className="text-kube-400 max-w-2xl mx-auto">
              Structured learning paths aligned with official CNCF certification
              exams. Start from beginner and work your way to expert.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {certPaths.map((cert) => (
              <Link
                key={cert.slug}
                href={`/certifications/${cert.slug}`}
                className="glass-card-hover p-6 group"
              >
                <div className="text-4xl mb-4">{cert.icon}</div>
                <div
                  className={`inline-block px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${cert.color} text-white mb-3`}
                >
                  {cert.difficulty}
                </div>
                <h3 className="text-xl font-bold text-white mb-1">
                  {cert.name}
                </h3>
                <p className="text-sm text-kube-400 mb-4">{cert.full}</p>
                <div className="flex items-center text-kube-400 text-sm group-hover:text-kube-300 transition">
                  <span>Start path</span>
                  <ChevronRight
                    size={16}
                    className="ml-1 group-hover:translate-x-1 transition-transform"
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-kube-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Everything You Need to Master K8s
            </h2>
            <p className="text-kube-400 max-w-2xl mx-auto">
              A complete learning platform combining theory, practice, and
              gamification to make Kubernetes mastery achievable and fun.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="glass-card p-6 hover:border-kube-600/50 transition-all duration-300"
              >
                <feature.icon size={28} className={`${feature.color} mb-4`} />
                <h3 className="text-lg font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-kube-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              How It Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Choose a Path",
                description:
                  "Select a certification path that matches your goals. Start with KCNA for beginners or jump to CKA/CKAD if you have experience.",
                icon: Target,
              },
              {
                step: "02",
                title: "Learn & Practice",
                description:
                  "Work through interactive lessons, test your knowledge with quizzes, and get hands-on experience in real Kubernetes labs.",
                icon: BookOpen,
              },
              {
                step: "03",
                title: "Level Up & Certify",
                description:
                  "Earn XP, collect badges, climb the leaderboard, and when you're ready - pass the official CNCF certification exam.",
                icon: Award,
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-kube-800 border border-kube-700 mb-6">
                  <item.icon size={28} className="text-kube-400" />
                </div>
                <div className="text-kube-500 font-mono text-sm mb-2">
                  Step {item.step}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">
                  {item.title}
                </h3>
                <p className="text-kube-400 text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="glass-card p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-kube-500/10 via-accent-purple/10 to-accent-cyan/10" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Ready to Master Kubernetes?
              </h2>
              <p className="text-kube-300 mb-8 max-w-lg mx-auto">
                Join thousands of engineers leveling up their Kubernetes skills.
                Start your certification journey today.
              </p>
              <Link
                href="/register"
                className="btn-primary text-lg px-8 py-4 inline-flex items-center gap-2"
              >
                <Zap size={20} />
                Start Free Now
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
