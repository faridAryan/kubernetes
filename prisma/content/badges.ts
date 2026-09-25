import type { BadgeContent } from "./types";

export const badges: BadgeContent[] = [
  { slug: "first-lesson", name: "First Steps", description: "Complete your first lesson", icon: "👣", category: "achievement", requirement: { type: "lessons_completed", count: 1 }, xp: 25 },
  { slug: "five-lessons", name: "Quick Learner", description: "Complete 5 lessons", icon: "📚", category: "achievement", requirement: { type: "lessons_completed", count: 5 }, xp: 50 },
  { slug: "twenty-lessons", name: "Bookworm", description: "Complete 20 lessons", icon: "🐛", category: "achievement", requirement: { type: "lessons_completed", count: 20 }, xp: 150 },
  { slug: "quiz-master", name: "Quiz Master", description: "Score 100% on any quiz", icon: "🧠", category: "skill", requirement: { type: "perfect_quiz", count: 1 }, xp: 75 },
  { slug: "lab-rat", name: "Lab Rat", description: "Complete your first lab", icon: "🔬", category: "skill", requirement: { type: "labs_completed", count: 1 }, xp: 50 },
  { slug: "kubectl-ninja", name: "kubectl Ninja", description: "Complete 10 labs", icon: "🥷", category: "skill", requirement: { type: "labs_completed", count: 10 }, xp: 200 },
  { slug: "exam-ready", name: "Exam Ready", description: "Pass a mock exam", icon: "📝", category: "skill", requirement: { type: "exams_passed", count: 1 }, xp: 100 },
  { slug: "streak-7", name: "Week Warrior", description: "Maintain a 7-day streak", icon: "🔥", category: "streak", requirement: { type: "streak", count: 7 }, xp: 100 },
  { slug: "streak-30", name: "Monthly Master", description: "Maintain a 30-day streak", icon: "💎", category: "streak", requirement: { type: "streak", count: 30 }, xp: 300 },
  { slug: "level-10", name: "Helm Hero", description: "Reach level 10", icon: "🦸", category: "achievement", requirement: { type: "level", count: 10 }, xp: 250 },
  { slug: "kcna-complete", name: "KCNA Graduate", description: "Complete the KCNA certification path", icon: "🌱", category: "certification", requirement: { type: "cert_complete", cert: "kcna" }, xp: 500 },
  { slug: "cka-complete", name: "CKA Graduate", description: "Complete the CKA certification path", icon: "⚙️", category: "certification", requirement: { type: "cert_complete", cert: "cka" }, xp: 750 },
  { slug: "ckad-complete", name: "CKAD Graduate", description: "Complete the CKAD certification path", icon: "🚀", category: "certification", requirement: { type: "cert_complete", cert: "ckad" }, xp: 750 },
  { slug: "cks-complete", name: "CKS Graduate", description: "Complete the CKS certification path", icon: "🛡️", category: "certification", requirement: { type: "cert_complete", cert: "cks" }, xp: 1000 },
];
