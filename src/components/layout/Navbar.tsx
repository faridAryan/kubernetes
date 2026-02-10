"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import {
  BookOpen,
  Trophy,
  Terminal,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  Flame,
  Zap,
  User,
} from "lucide-react";

export default function Navbar() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? "bg-kube-950/90 backdrop-blur-xl border-b border-kube-800"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 bg-gradient-to-br from-kube-500 to-accent-cyan rounded-lg flex items-center justify-center group-hover:shadow-lg group-hover:shadow-kube-500/30 transition-all">
              <span className="text-white font-bold text-lg">K</span>
            </div>
            <span className="text-xl font-bold text-white">
              Kube<span className="text-kube-400">Learn</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            <Link href="/certifications" className="btn-ghost flex items-center gap-2">
              <BookOpen size={18} />
              <span>Certifications</span>
            </Link>
            <Link href="/labs" className="btn-ghost flex items-center gap-2">
              <Terminal size={18} />
              <span>Labs</span>
            </Link>
            <Link href="/leaderboard" className="btn-ghost flex items-center gap-2">
              <Trophy size={18} />
              <span>Leaderboard</span>
            </Link>

            {session ? (
              <>
                <Link
                  href="/dashboard"
                  className="btn-ghost flex items-center gap-2"
                >
                  <LayoutDashboard size={18} />
                  <span>Dashboard</span>
                </Link>
                <div className="flex items-center gap-3 ml-4 pl-4 border-l border-kube-700">
                  <div className="flex items-center gap-1 text-accent-orange">
                    <Flame size={16} />
                    <span className="text-sm font-semibold">0</span>
                  </div>
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-kube-800 hover:bg-kube-700 transition"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-kube-500 to-accent-purple flex items-center justify-center">
                      <User size={14} />
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap size={12} className="text-accent-yellow" />
                      <span className="text-sm font-medium text-kube-200">
                        Lv 1
                      </span>
                    </div>
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="btn-ghost text-kube-500"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 ml-4">
                <Link href="/login" className="btn-ghost">
                  Sign In
                </Link>
                <Link href="/register" className="btn-primary text-sm">
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden btn-ghost"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-kube-900/95 backdrop-blur-xl border-b border-kube-800">
          <div className="px-4 py-4 space-y-2">
            <Link
              href="/certifications"
              className="block btn-ghost w-full text-left"
              onClick={() => setIsOpen(false)}
            >
              Certifications
            </Link>
            <Link
              href="/labs"
              className="block btn-ghost w-full text-left"
              onClick={() => setIsOpen(false)}
            >
              Labs
            </Link>
            <Link
              href="/leaderboard"
              className="block btn-ghost w-full text-left"
              onClick={() => setIsOpen(false)}
            >
              Leaderboard
            </Link>
            {session ? (
              <>
                <Link
                  href="/dashboard"
                  className="block btn-ghost w-full text-left"
                  onClick={() => setIsOpen(false)}
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => signOut()}
                  className="block btn-ghost w-full text-left text-accent-red"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="block btn-ghost w-full text-left"
                  onClick={() => setIsOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="block btn-primary w-full text-center"
                  onClick={() => setIsOpen(false)}
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
