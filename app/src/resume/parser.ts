import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export const resumeFileTypes = ["pdf", "docx", "txt"] as const;
export type ResumeFileType = (typeof resumeFileTypes)[number];

export async function extractResumeText({
  fileBuffer,
  fileType,
}: {
  fileBuffer: Buffer;
  fileType: ResumeFileType;
}): Promise<string> {
  switch (fileType) {
    case "pdf":
      return extractPdfText(fileBuffer);
    case "docx":
      return extractDocxText(fileBuffer);
    case "txt":
      return fileBuffer.toString("utf8");
    default:
      throw new Error(`Unsupported resume file type: ${fileType}`);
  }
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}
