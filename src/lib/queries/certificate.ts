import { prisma } from "@/lib/prisma";

export function getCertificate(code: string) {
  return prisma.certificate.findUnique({
    where: { code },
    select: {
      code: true,
      examScore: true,
      issuedAt: true,
      user: { select: { name: true } },
      certification: { select: { name: true, shortName: true, icon: true } },
    },
  });
}
