import { api, page, query, route, type Spec } from "@wasp.sh/spec";

import { ResumeOptimizerPage } from "./ResumeOptimizerPage" with { type: "ref" };
import {
  getLatestResumeGeneration,
  optimizeResumeApi,
} from "./operations" with { type: "ref" };

export const resumeSpec: Spec = [
  route(
    "ResumeOptimizerRoute",
    "/resume-optimizer",
    page(ResumeOptimizerPage, { authRequired: true }),
  ),
  query(getLatestResumeGeneration, { entities: ["ResumeGeneration"] }),
  api("POST", "/resume/optimize", optimizeResumeApi, {
    entities: ["User", "ResumeGeneration"],
  }),
];
