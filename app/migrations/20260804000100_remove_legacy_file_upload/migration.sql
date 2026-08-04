-- Drop the inherited OpenSaaS sample persistent upload table. PerfectResume processes
-- resumes in memory and only persists resume generation metadata.
DROP TABLE IF EXISTS "File";
