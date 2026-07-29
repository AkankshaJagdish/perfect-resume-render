import * as z from "zod";

export const resumeEnvSchema = z
  .object({
    GEMINI_API_KEY: z.string().optional(),
    GEMINI_API_KEYS: z.string().optional(),
  })
  .refine((env) => env.GEMINI_API_KEY || env.GEMINI_API_KEYS, {
    message:
      "GEMINI_API_KEY or GEMINI_API_KEYS is required for resume optimization",
  });
