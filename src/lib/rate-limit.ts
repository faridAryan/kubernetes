import { prisma } from "@/lib/prisma";

// Fixed-window limiter stored in Postgres so every app instance shares the same counters
export async function isRateLimited(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSeconds * 1000);

  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "windowStart")
    VALUES (${key}, 1, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."windowStart" < ${windowStart} THEN 1 ELSE "RateLimit"."count" + 1 END,
      "windowStart" = CASE WHEN "RateLimit"."windowStart" < ${windowStart} THEN ${now} ELSE "RateLimit"."windowStart" END
    RETURNING "count"`;

  return rows[0].count > limit;
}

// CloudFront sets CloudFront-Viewer-Address ("ip:port") and clients can't forge it,
// unlike the first X-Forwarded-For entry. Fall back to X-Forwarded-For locally.
export function getClientIp(getHeader: (name: string) => string | null | undefined): string {
  const viewer = getHeader("cloudfront-viewer-address");
  if (viewer) return viewer.slice(0, viewer.lastIndexOf(":"));
  return getHeader("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
