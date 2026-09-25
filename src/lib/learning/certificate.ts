import { Prisma } from "@prisma/client";

// A certificate needs the whole path completed and a passed mock exam
export async function issueCertificateIfEligible(
  tx: Prisma.TransactionClient,
  userId: string,
  certificationId: string
) {
  const [enrollment, bestExam, existing] = await Promise.all([
    tx.enrollment.findUnique({
      where: { userId_certificationId: { userId, certificationId } },
      select: { completedAt: true },
    }),
    tx.examAttempt.findFirst({
      where: { userId, certificationId, passed: true },
      orderBy: { score: "desc" },
      select: { score: true },
    }),
    tx.certificate.findUnique({
      where: { userId_certificationId: { userId, certificationId } },
      select: { code: true },
    }),
  ]);

  const isEligible = enrollment?.completedAt && bestExam?.score && existing === null;
  if (isEligible) {
    return tx.certificate.create({
      data: { userId, certificationId, examScore: bestExam.score ?? 0 },
      select: { code: true },
    });
  }
  return existing;
}
