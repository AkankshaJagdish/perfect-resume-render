import {
  api,
  apiNamespace,
  job,
  page,
  query,
  route,
  type Spec,
} from "@wasp.sh/spec";

import { ResumeOptimizerPage } from "./ResumeOptimizerPage" with { type: "ref" };
import {
  generateResumeJob,
  getLatestResumeGeneration,
  getResumeGeneration,
  optimizeResumeApi,
} from "./operations" with { type: "ref" };
// Verified path relative to src/resume/
import { resumeApiMiddlewareConfigFn } from "./serverMiddleware" with { type: "ref" };

export const resumeSpec: Spec = [
  route(
    "ResumeOptimizerRoute",
    "/resume-optimizer",
    page(ResumeOptimizerPage, { authRequired: true }),
  ),
  query(getLatestResumeGeneration, { entities: ["ResumeGeneration"] }),
  query(getResumeGeneration, { entities: ["ResumeGeneration"] }),
  job(generateResumeJob, {
    executor: "PgBoss",
    entities: ["User", "ResumeGeneration"],
  }),

  // 1. Keeps the namespace path prefix definition
  apiNamespace("/resume", { middlewareConfigFn: resumeApiMiddlewareConfigFn }),

  // 2. FIXED: Change this back to "/resume/optimize"
  // Wasp will look for any API routes starting with "/resume" and apply the namespace CORS config to them
  api("POST", "/resume/optimize", optimizeResumeApi, {
    entities: ["User", "ResumeGeneration"],
  }),
];
