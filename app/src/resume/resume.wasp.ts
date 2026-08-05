import { api, apiNamespace, page, query, route, type Spec } from "@wasp.sh/spec";

import { ResumeOptimizerPage } from "./ResumeOptimizerPage" with { type: "ref" };
import {
  getLatestResumeGeneration,
  optimizeResumeApi,
} from "./operations" with { type: "ref" };
// FIXED: Adjusted import path to point to your serverMiddleware file relative to this file
import { resumeApiMiddlewareConfigFn } from "./serverMiddleware" with { type: "ref" }; 

export const resumeSpec: Spec = [
  route(
    "ResumeOptimizerRoute",
    "/resume-optimizer",
    page(ResumeOptimizerPage, { authRequired: true }),
  ),
  query(getLatestResumeGeneration, { entities: ["ResumeGeneration"] }),
  
  // Custom namespace that hooks up your middleware configuration
  apiNamespace("/resume", { middlewareConfigFn: resumeApiMiddlewareConfigFn }),
  
  // FIXED: Changed route path from "/resume/optimize" to just "/optimize".
  // Wasp automatically combines the namespace path ("/resume") and this path ("/optimize") 
  // into "/resume/optimize" while correctly inheriting the CORS rules.
  api("POST", "/optimize", optimizeResumeApi, {
    entities: ["User", "ResumeGeneration"],
  }),
];
