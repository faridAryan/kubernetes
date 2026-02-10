import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case "beginner":
      return "text-accent-green";
    case "intermediate":
      return "text-accent-yellow";
    case "advanced":
      return "text-accent-orange";
    case "expert":
      return "text-accent-red";
    default:
      return "text-gray-400";
  }
}

export function getDifficultyBg(difficulty: string): string {
  switch (difficulty) {
    case "beginner":
      return "bg-accent-green/10 border-accent-green/30";
    case "intermediate":
      return "bg-accent-yellow/10 border-accent-yellow/30";
    case "advanced":
      return "bg-accent-orange/10 border-accent-orange/30";
    case "expert":
      return "bg-accent-red/10 border-accent-red/30";
    default:
      return "bg-gray-500/10 border-gray-500/30";
  }
}
