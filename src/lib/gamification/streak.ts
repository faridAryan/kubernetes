const DAY_MS = 86_400_000;

function utcDay(date: Date): number {
  return Math.floor(date.getTime() / DAY_MS);
}

// Streak after an activity happening at `now`
export function nextStreak(streak: number, lastActiveAt: Date, now: Date): number {
  const gap = utcDay(now) - utcDay(lastActiveAt);
  if (gap === 0) return Math.max(streak, 1);
  if (gap === 1) return streak + 1;
  return 1;
}

// Streak to display: it is broken once a full day passes without activity
export function currentStreak(streak: number, lastActiveAt: Date, now = new Date()): number {
  return utcDay(now) - utcDay(lastActiveAt) <= 1 ? streak : 0;
}
