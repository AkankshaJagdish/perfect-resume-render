import { GoogleGenAI } from "@google/genai";
import multer from "multer";
import type { ResumeGeneration, User } from "wasp/entities";
import { env, HttpError, prisma } from "wasp/server";
import type { OptimizeResumeApi } from "wasp/server/api";
import { generateResumeJob as submitGenerateResumeJob } from "wasp/server/jobs";
import type { GenerateResumeJob } from "wasp/server/jobs";
import type {
  GetLatestResumeGeneration,
  GetResumeGeneration,
} from "wasp/server/operations";
import * as z from "zod";
import { optimizeResumePrompt } from "../ai/prompts/optimizeResume";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { generateResumePdf } from "./latex";
import {
  extractResumeText,
  resumeFileTypes,
  type ResumeFileType,
} from "./parser";
import { optimizedResumeSchema } from "./schema";

const geminiModel = "gemini-2.5-flash";
const geminiApiKeys = getGeminiApiKeys();

export type OptimizeResumeOutput = {
  generationId: string;
  fileName: string;
  pdfBase64?: string;
  atsScore: number;
  keywords: string[];
  strengths: string[];
  weaknesses: string[];
  missingKeywords: string[];
  status?: string;
  failureReason?: string | null;
  userMessage?: string | null;
};

type ResumeGenerationFailureStage =
  | "queue_submission"
  | "job_started"
  | "resume_parsing"
  | "job_description_validation"
  | "gemini_request"
  | "json_validation"
  | "latex_generation"
  | "pdf_compilation"
  | "credit_deduction"
  | "job_completion";

type ResumeGenerationLogStage = ResumeGenerationFailureStage | "job_completed";

const maxStoredStackLength = 8000;

export const getLatestResumeGeneration: GetLatestResumeGeneration<
  void,
  Pick<
    ResumeGeneration,
    "id" | "createdAt" | "status" | "inputFileName" | "atsScore"
  > | null
> = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  return context.entities.ResumeGeneration.findFirst({
    where: { userId: context.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      status: true,
      inputFileName: true,
      atsScore: true,
    },
  });
};

export const getResumeGeneration: GetResumeGeneration<
  { generationId: string },
  OptimizeResumeOutput | null
> = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const generation = await context.entities.ResumeGeneration.findFirst({
    where: { id: args.generationId, userId: context.user.id },
  });

  if (!generation) {
    return null;
  }

  const result = parseGenerationResult(generation.resultJson);
  const failureMessage =
    generation.status === "failed"
      ? generation.failureMessage ??
        getUserFriendlyFailureMessage(generation.failureStage)
      : null;

  return {
    generationId: generation.id,
    fileName: result?.fileName ?? buildPdfFileName(generation.inputFileName),
    pdfBase64: result?.pdfBase64,
    atsScore: generation.atsScore ?? result?.atsScore ?? 0,
    keywords: result?.keywords ?? [],
    strengths: result?.strengths ?? [],
    weaknesses: result?.weaknesses ?? [],
    missingKeywords: result?.missingKeywords ?? [],
    status: generation.status,
    failureReason: generation.failureStage,
    userMessage: failureMessage,
  };
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const multipartFieldsSchema = z.object({
  jobDescription: z.string().min(50),
});

export const optimizeResumeApi: OptimizeResumeApi = async (
  request,
  response,
  context,
) => {
  const user = context.user;
  if (!user) {
    return response.status(401).json({ message: "Authentication required" });
  }

  upload.single("resumeFile")(request, response, async (uploadError) => {
    try {
      if (uploadError) {
        throw uploadError;
      }

      if (user.credits <= 0) {
        throw new HttpError(402, "User is out of credits");
      }

      const file = request.file;
      if (!file) {
        throw new HttpError(400, "Please upload a resume file.");
      }

      const fileType = getSupportedResumeFileType(file.originalname);
      if (!fileType) {
        throw new HttpError(400, "Please upload a PDF, DOCX, or TXT resume.");
      }

      const fields = ensureArgsSchemaOrThrowHttpError(
        multipartFieldsSchema,
        request.body,
      );

      const generation = await context.entities.ResumeGeneration.create({
        data: {
          status: "pending",
          inputFileName: file.originalname,
          user: { connect: { id: user.id } },
        },
      });

      try {
        await submitGenerateResumeJob.submit({
          generationId: generation.id,
          userId: user.id,
          fileName: file.originalname,
          fileType,
          fileBase64: file.buffer.toString("base64"),
          jobDescription: fields.jobDescription,
        });
      } catch (error) {
        await markGenerationFailed({
          generationId: generation.id,
          userId: user.id,
          stage: "queue_submission",
          error,
          resumeGenerationDelegate: context.entities.ResumeGeneration,
          startedAt: Date.now(),
        });
        logResumeGenerationError({
          generationId: generation.id,
          userId: user.id,
          stage: "queue_submission",
          error,
          startedAt: Date.now(),
        });
        return response.status(202).json({
          generationId: generation.id,
          status: "failed",
          message: "Resume generation was created, but queueing failed.",
        });
      }

      return response.status(202).json({
        generationId: generation.id,
        status: generation.status,
      });
    } catch (error) {
      console.error(error);
      if (error instanceof HttpError) {
        return response
          .status(error.statusCode)
          .json({ message: error.message });
      }
      return response.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Unable to optimize resume. Please try again.",
      });
    }
  });
};

export type GenerateResumeJobInput = {
  generationId: string;
  userId: string;
  fileName: string;
  fileType: ResumeFileType;
  fileBase64: string;
  jobDescription: string;
};

export const generateResumeJob: GenerateResumeJob<
  GenerateResumeJobInput,
  void
> = async (args, context) => {
  await runResumeOptimization({
    generationId: args.generationId,
    fileName: args.fileName,
    fileType: args.fileType,
    fileBuffer: Buffer.from(args.fileBase64, "base64"),
    jobDescription: args.jobDescription,
    userId: args.userId,
    resumeGenerationDelegate: context.entities.ResumeGeneration,
  });
};

async function runResumeOptimization({
  generationId,
  fileName,
  fileType,
  fileBuffer,
  jobDescription,
  userId,
  resumeGenerationDelegate,
}: {
  generationId: string;
  fileName: string;
  fileType: ResumeFileType;
  fileBuffer: Buffer;
  jobDescription: string;
  userId: User["id"];
  resumeGenerationDelegate: typeof prisma.resumeGeneration;
}): Promise<void> {
  const startedAt = Date.now();
  let currentStage: ResumeGenerationFailureStage = "job_started";

  logResumeGenerationStage({
    generationId,
    userId,
    stage: "job_started",
    event: "started",
    startedAt,
  });

  const claim = await resumeGenerationDelegate.updateMany({
    where: { id: generationId, userId, status: "pending" },
    data: { status: "running" },
  });

  if (claim.count === 0) {
    const generation = await resumeGenerationDelegate.findUnique({
      where: { id: generationId },
      select: { status: true },
    });

    if (
      generation?.status === "completed" ||
      generation?.status === "running" ||
      generation?.status === "failed"
    ) {
      console.info(
        `Resume generation ${generationId} is already ${generation.status}; skipping duplicate job.`,
      );
      return;
    }

    throw new Error(`Resume generation ${generationId} is not pending.`);
  }

  try {
    currentStage = "resume_parsing";
    logResumeGenerationStage({
      generationId,
      userId,
      stage: currentStage,
      event: "started",
      startedAt,
    });
    const resumeText = await extractResumeText({ fileBuffer, fileType });
    logResumeGenerationStage({
      generationId,
      userId,
      stage: currentStage,
      event: "completed",
      startedAt,
    });

    currentStage = "job_description_validation";
    logResumeGenerationStage({
      generationId,
      userId,
      stage: currentStage,
      event: "started",
      startedAt,
    });
    validateJobDescriptionForGeneration(jobDescription);
    logResumeGenerationStage({
      generationId,
      userId,
      stage: currentStage,
      event: "completed",
      startedAt,
    });

    const optimizedResult = await optimizeResumeWithGemini({
      resumeText,
      jobDescription,
      generationId,
      userId,
      startedAt,
      setCurrentStage: (stage) => {
        currentStage = stage;
      },
    });
    const pdf = await generateResumePdf(optimizedResult, {
      onStageStart: (stage) => {
        currentStage = stage;
        logResumeGenerationStage({
          generationId,
          userId,
          stage,
          event: "started",
          startedAt,
        });
      },
      onStageComplete: (stage) => {
        logResumeGenerationStage({
          generationId,
          userId,
          stage,
          event: "completed",
          startedAt,
        });
      },
    });
    const result: OptimizeResumeOutput = {
      generationId,
      fileName: buildPdfFileName(fileName),
      pdfBase64: pdf.toString("base64"),
      atsScore: optimizedResult.ats.score,
      keywords: optimizedResult.keywords,
      strengths: optimizedResult.ats.strengths,
      weaknesses: optimizedResult.ats.weaknesses,
      missingKeywords: optimizedResult.ats.missing_keywords,
      status: "completed",
    };

    currentStage = "credit_deduction";
    logResumeGenerationStage({
      generationId,
      userId,
      stage: currentStage,
      event: "started",
      startedAt,
    });
    await markGenerationCompletedAndDecrementCredit({
      generationId,
      userId,
      atsScore: optimizedResult.ats.score,
      resultJson: JSON.stringify(result),
    });
    logResumeGenerationStage({
      generationId,
      userId,
      stage: currentStage,
      event: "completed",
      startedAt,
    });
    currentStage = "job_completion";
    logResumeGenerationStage({
      generationId,
      userId,
      stage: currentStage,
      event: "started",
      startedAt,
    });
    logResumeGenerationStage({
      generationId,
      userId,
      stage: currentStage,
      event: "completed",
      startedAt,
    });
    logResumeGenerationStage({
      generationId,
      userId,
      stage: "job_completed",
      event: "completed",
      startedAt,
    });
  } catch (error) {
    logResumeGenerationError({
      generationId,
      userId,
      stage: currentStage,
      error,
      startedAt,
    });
    await markGenerationFailed({
      generationId,
      userId,
      stage: currentStage,
      error,
      resumeGenerationDelegate,
      startedAt,
    });
    throw error;
  }
}

async function optimizeResumeWithGemini({
  resumeText,
  jobDescription,
  generationId,
  userId,
  startedAt,
  setCurrentStage,
}: {
  resumeText: string;
  jobDescription: string;
  generationId: ResumeGeneration["id"];
  userId: User["id"];
  startedAt: number;
  setCurrentStage: (stage: ResumeGenerationFailureStage) => void;
}) {
  setCurrentStage("gemini_request");
  logResumeGenerationStage({
    generationId,
    userId,
    stage: "gemini_request",
    event: "started",
    startedAt,
  });
  const response = await generateGeminiContentWithFailover({
    model: geminiModel,
    contents: `${optimizeResumePrompt}\n\nResume:\n${resumeText}\n\nJob Description:\n${jobDescription}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: z.toJSONSchema(optimizedResumeSchema),
    },
  });
  logResumeGenerationStage({
    generationId,
    userId,
    stage: "gemini_request",
    event: "completed",
    startedAt,
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini did not return resume optimization JSON");
  }

  setCurrentStage("json_validation");
  logResumeGenerationStage({
    generationId,
    userId,
    stage: "json_validation",
    event: "started",
    startedAt,
  });
  const parsedResult = optimizedResumeSchema.parse(JSON.parse(text));
  logResumeGenerationStage({
    generationId,
    userId,
    stage: "json_validation",
    event: "completed",
    startedAt,
  });

  return parsedResult;
}

function getGeminiApiKeys(): string[] {
  const configuredKeys = env.GEMINI_API_KEYS ?? env.GEMINI_API_KEY ?? "";

  const keys = configuredKeys
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);

  if (keys.length === 0) {
    throw new Error(
      "GEMINI_API_KEY or GEMINI_API_KEYS is required for resume optimization",
    );
  }

  return keys;
}

async function generateGeminiContentWithFailover(
  request: Parameters<GoogleGenAI["models"]["generateContent"]>[0],
) {
  let lastRetryableError: unknown;

  for (const apiKey of geminiApiKeys) {
    try {
      return await new GoogleGenAI({ apiKey }).models.generateContent(request);
    } catch (error) {
      if (!isRetryableGeminiError(error)) {
        throw error;
      }

      lastRetryableError = error;
      console.warn(
        "Gemini request failed with a retryable error; trying next configured key.",
      );
    }
  }

  throw lastRetryableError instanceof Error
    ? new Error(
        `Gemini request failed for all configured API keys: ${lastRetryableError.message}`,
      )
    : new Error("Gemini request failed for all configured API keys");
}

function isRetryableGeminiError(error: unknown): boolean {
  const status = getErrorStatus(error);

  if (status) {
    return status === 408 || status === 409 || status === 429 || status >= 500;
  }

  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return [
    "rate limit",
    "quota",
    "resource_exhausted",
    "temporarily unavailable",
    "service unavailable",
    "timeout",
  ].some((retryableMessage) => message.includes(retryableMessage));
}

function getErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const maybeError = error as { status?: unknown; code?: unknown };
  const status = maybeError.status ?? maybeError.code;

  return typeof status === "number" ? status : null;
}

async function markGenerationCompletedAndDecrementCredit({
  generationId,
  userId,
  atsScore,
  resultJson,
}: {
  generationId: ResumeGeneration["id"];
  userId: User["id"];
  atsScore: number;
  resultJson: string;
}) {
  await prisma.$transaction(async (tx) => {
    const creditUpdate = await tx.user.updateMany({
      where: { id: userId, credits: { gt: 0 } },
      data: { credits: { decrement: 1 } },
    });

    if (creditUpdate.count === 0) {
      throw new HttpError(402, "User is out of credits");
    }

    await tx.resumeGeneration.update({
      where: { id: generationId },
      data: {
        status: "completed",
        atsScore,
        resultJson,
        completedAt: new Date(),
      },
    });
  });
}

async function markGenerationFailed({
  generationId,
  userId,
  stage,
  error,
  resumeGenerationDelegate,
  startedAt,
}: {
  generationId: ResumeGeneration["id"];
  userId: User["id"];
  stage: ResumeGenerationFailureStage;
  error: unknown;
  resumeGenerationDelegate: typeof prisma.resumeGeneration;
  startedAt: number;
}) {
  const errorInfo = normalizeError(error);
  await resumeGenerationDelegate.update({
    where: { id: generationId },
    data: {
      status: "failed",
      failureStage: stage,
      failureMessage: getUserFriendlyFailureMessage(stage),
      failureInternalMessage: errorInfo.message,
      failureStack: errorInfo.stack?.slice(0, maxStoredStackLength),
      completedAt: new Date(),
    },
  });
  logResumeGenerationStage({
    generationId,
    userId,
    stage,
    event: "failed",
    startedAt,
  });
}

function validateJobDescriptionForGeneration(jobDescription: string) {
  multipartFieldsSchema.shape.jobDescription.parse(jobDescription);
}

function logResumeGenerationStage({
  generationId,
  userId,
  stage,
  event,
  startedAt,
}: {
  generationId: ResumeGeneration["id"];
  userId: User["id"];
  stage: ResumeGenerationLogStage;
  event: "started" | "completed" | "failed";
  startedAt: number;
}) {
  console.info(
    JSON.stringify({
      component: "resume-generation",
      generationId,
      userId,
      stage,
      event,
      elapsedMs: Date.now() - startedAt,
    }),
  );
}

function logResumeGenerationError({
  generationId,
  userId,
  stage,
  error,
  startedAt,
}: {
  generationId: ResumeGeneration["id"];
  userId: User["id"];
  stage: ResumeGenerationFailureStage;
  error: unknown;
  startedAt: number;
}) {
  const errorInfo = normalizeError(error);
  console.error(
    JSON.stringify({
      component: "resume-generation",
      generationId,
      userId,
      stage,
      event: "error",
      errorMessage: errorInfo.message,
      stack: errorInfo.stack,
      elapsedMs: Date.now() - startedAt,
    }),
  );
}

function normalizeError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }

  return { message: String(error) };
}

function getUserFriendlyFailureMessage(
  stage: string | null | undefined,
): string {
  switch (stage) {
    case "resume_parsing":
      return "Resume parsing failed. Your free credit was not consumed because generation did not complete.";
    case "gemini_request":
      return "Unable to contact the AI service. Your free credit was not consumed because generation did not complete.";
    case "json_validation":
      return "The AI service returned an unexpected response. Your free credit was not consumed because generation did not complete.";
    case "latex_generation":
    case "pdf_compilation":
      return "PDF generation failed. Your free credit was not consumed because generation did not complete.";
    case "credit_deduction":
      return "Your resume was generated, but we could not confirm your credit balance. Please try again.";
    default:
      return "Something went wrong while generating your resume. Please try again. Your free credit was not consumed because generation did not complete.";
  }
}

function getSupportedResumeFileType(fileName: string): ResumeFileType | null {
  const extension = fileName.split(".").pop()?.toLowerCase();
  return resumeFileTypes.find((type) => type === extension) ?? null;
}

function buildPdfFileName(fileName: string): string {
  return `${fileName.replace(/\.[^/.]+$/, "") || "resume"}-optimized.pdf`;
}

function parseGenerationResult(
  resultJson: string | null,
): OptimizeResumeOutput | null {
  if (!resultJson) return null;
  try {
    return JSON.parse(resultJson) as OptimizeResumeOutput;
  } catch {
    return null;
  }
}
