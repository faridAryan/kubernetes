-- AlterTable
ALTER TABLE "LabConfig" ADD COLUMN     "solution" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "LabSession" ADD COLUMN     "failedValidations" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "solutionViewed" BOOLEAN NOT NULL DEFAULT false;
