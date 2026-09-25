import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export const getLabCatalog = unstable_cache(
  async () =>
    prisma.certificationPath.findMany({
      orderBy: { order: "asc" },
      select: {
        slug: true,
        shortName: true,
        name: true,
        icon: true,
        difficulty: true,
        modules: {
          orderBy: { order: "asc" },
          select: {
            slug: true,
            lessons: {
              where: { type: "lab" },
              orderBy: { order: "asc" },
              select: { slug: true, title: true, duration: true, xpReward: true },
            },
          },
        },
      },
    }),
  ["lab-catalog"],
  { revalidate: 300 }
);
