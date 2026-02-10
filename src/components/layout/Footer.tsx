import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-kube-800 bg-kube-950 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-kube-500 to-accent-cyan rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">K</span>
              </div>
              <span className="text-lg font-bold text-white">
                Kube<span className="text-kube-400">Learn</span>
              </span>
            </div>
            <p className="text-kube-400 text-sm max-w-md">
              Master Kubernetes through interactive lessons, hands-on labs, and
              gamified learning paths. Prepare for CKA, CKAD, CKS, and KCNA
              certifications.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Learn</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/certifications"
                  className="text-kube-400 hover:text-white transition"
                >
                  Certification Paths
                </Link>
              </li>
              <li>
                <Link
                  href="/labs"
                  className="text-kube-400 hover:text-white transition"
                >
                  Hands-on Labs
                </Link>
              </li>
              <li>
                <Link
                  href="/leaderboard"
                  className="text-kube-400 hover:text-white transition"
                >
                  Leaderboard
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Certifications</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/certifications/kcna"
                  className="text-kube-400 hover:text-white transition"
                >
                  KCNA
                </Link>
              </li>
              <li>
                <Link
                  href="/certifications/cka"
                  className="text-kube-400 hover:text-white transition"
                >
                  CKA
                </Link>
              </li>
              <li>
                <Link
                  href="/certifications/ckad"
                  className="text-kube-400 hover:text-white transition"
                >
                  CKAD
                </Link>
              </li>
              <li>
                <Link
                  href="/certifications/cks"
                  className="text-kube-400 hover:text-white transition"
                >
                  CKS
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-kube-800 mt-8 pt-8 text-center text-sm text-kube-500">
          <p>KubeLearn - Learn Kubernetes the interactive way</p>
        </div>
      </div>
    </footer>
  );
}
