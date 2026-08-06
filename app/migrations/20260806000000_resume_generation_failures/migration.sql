-- Persist terminal failure metadata for asynchronous resume generation jobs.
ALTER TABLE "ResumeGeneration" ADD COLUMN "failureStage" TEXT;
ALTER TABLE "ResumeGeneration" ADD COLUMN "failureMessage" TEXT;
ALTER TABLE "ResumeGeneration" ADD COLUMN "failureInternalMessage" TEXT;
ALTER TABLE "ResumeGeneration" ADD COLUMN "failureStack" TEXT;
ALTER TABLE "ResumeGeneration" ADD COLUMN "completedAt" TIMESTAMP(3);
