-- Store the asynchronous generation result so the frontend can poll and download it.
ALTER TABLE "ResumeGeneration" ADD COLUMN "resultJson" TEXT;
