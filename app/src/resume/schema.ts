import * as z from "zod";

const stringArraySchema = z.array(z.string()).default([]);

export const optimizedResumeSchema = z.object({
  resume: z.object({
    name: z.string().default(""),
    email: z.string().default(""),
    phone: z.string().default(""),
    linkedin: z.string().default(""),
    github: z.string().default(""),
    location: z.string().default(""),
    skills: z
    .object({
      languages: stringArraySchema,
      frameworks: stringArraySchema,
      developerTools: stringArraySchema,
      libraries: stringArraySchema,
    })
    .default({
      languages: [],
      frameworks: [],
      developerTools: [],
      libraries: [],
    }),
    experience: z
      .array(
        z.object({
          title: z.string().default(""),
          company: z.string().default(""),
          location: z.string().default(""),
          startDate: z.string().default(""),
          endDate: z.string().default(""),
          bullets: stringArraySchema,
        }),
      )
      .default([]),
    education: z
      .array(
        z.object({
          school: z.string().default(""),
          location: z.string().default(""),
          degree: z.string().default(""),
          startDate: z.string().default(""),
          endDate: z.string().default(""),
        }),
      )
      .default([]),
    projects: z
      .array(
        z.object({
          name: z.string().default(""),
          technologies: z.string().default(""),
          startDate: z.string().default(""),
          endDate: z.string().default(""),
          bullets: stringArraySchema,
        }),
      )
      .default([]),
  }),
  ats: z.object({
    score: z.number().int().min(0).max(100),
    strengths: stringArraySchema,
    weaknesses: stringArraySchema,
    missing_keywords: stringArraySchema,
  }),
  keywords: stringArraySchema,
});

export type OptimizedResumeResult = z.infer<typeof optimizedResumeSchema>;
