import { GoogleGenAI } from "@google/genai";
import multer from "multer";
import type { ResumeGeneration, User } from "wasp/entities";
import { env, HttpError, prisma } from "wasp/server";
import type { OptimizeResumeApi } from "wasp/server/api";
import type { GetLatestResumeGeneration } from "wasp/server/operations";
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
  pdfBase64: string;
  atsScore: number;
  keywords: string[];
  strengths: string[];
  weaknesses: string[];
  missingKeywords: string[];
};

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

      const result = await runResumeOptimization({
        fileName: file.originalname,
        fileType,
        fileBuffer: file.buffer,
        jobDescription: fields.jobDescription,
        user,
        resumeGenerationDelegate: context.entities.ResumeGeneration,
      });

      return response.json(result);
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

async function runResumeOptimization({
  fileName,
  fileType,
  fileBuffer,
  jobDescription,
  user,
  resumeGenerationDelegate,
}: {
  fileName: string;
  fileType: ResumeFileType;
  fileBuffer: Buffer;
  jobDescription: string;
  user: User;
  resumeGenerationDelegate: typeof prisma.resumeGeneration;
}): Promise<OptimizeResumeOutput> {
  const generation = await resumeGenerationDelegate.create({
    data: {
      status: "processing",
      inputFileName: fileName,
      user: { connect: { id: user.id } },
    },
  });

  try {
    const resumeText = await extractResumeText({ fileBuffer, fileType });
    const optimizedResult = await optimizeResumeWithGemini({
      resumeText,
      jobDescription,
    });
    const pdf = await generateResumePdf(optimizedResult);

    await markGenerationCompletedAndDecrementCredit({
      generationId: generation.id,
      userId: user.id,
      atsScore: optimizedResult.ats.score,
    });

    return {
      generationId: generation.id,
      fileName: buildPdfFileName(fileName),
      pdfBase64: pdf.toString("base64"),
      atsScore: optimizedResult.ats.score,
      keywords: optimizedResult.keywords,
      strengths: optimizedResult.ats.strengths,
      weaknesses: optimizedResult.ats.weaknesses,
      missingKeywords: optimizedResult.ats.missing_keywords,
    };
  } catch (error) {
    await markGenerationFailed(generation.id, resumeGenerationDelegate);
    throw error;
  }
}

async function optimizeResumeWithGemini({
  resumeText,
  jobDescription,
}: {
  resumeText: string;
  jobDescription: string;
}) {
  const response = await generateGeminiContentWithFailover({
    model: geminiModel,
    contents: `${optimizeResumePrompt}\n\nResume:\n${resumeText}\n\nJob Description:\n${jobDescription}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: z.toJSONSchema(optimizedResumeSchema),
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini did not return resume optimization JSON");
  }

  return optimizedResumeSchema.parse(JSON.parse(text));
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
}: {
  generationId: ResumeGeneration["id"];
  userId: User["id"];
  atsScore: number;
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
      data: { status: "completed", atsScore },
    });
  });
}

async function markGenerationFailed(
  generationId: ResumeGeneration["id"],
  resumeGenerationDelegate: typeof prisma.resumeGeneration,
) {
  await resumeGenerationDelegate.update({
    where: { id: generationId },
    data: { status: "failed" },
  });
}

function getSupportedResumeFileType(fileName: string): ResumeFileType | null {
  const extension = fileName.split(".").pop()?.toLowerCase();
  return resumeFileTypes.find((type) => type === extension) ?? null;
}

function buildPdfFileName(fileName: string): string {
  return `${fileName.replace(/\.[^/.]+$/, "") || "resume"}-optimized.pdf`;
}
