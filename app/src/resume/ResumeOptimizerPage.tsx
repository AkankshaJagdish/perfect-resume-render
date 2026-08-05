import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { api } from "wasp/client/api";
import {
  getLatestResumeGeneration,
  getResumeGeneration,
  useQuery,
} from "wasp/client/operations";
import { Link, routes } from "wasp/client/router";
import type { User } from "wasp/entities";
import { Alert, AlertDescription } from "../client/components/ui/alert";
import { Button } from "../client/components/ui/button";
import { Card, CardContent, CardTitle } from "../client/components/ui/card";
import { Input } from "../client/components/ui/input";
import { Label } from "../client/components/ui/label";
import { Textarea } from "../client/components/ui/textarea";

const supportedFileTypes = ["pdf", "docx", "txt"] as const;
type SupportedFileType = (typeof supportedFileTypes)[number];

type OptimizeResumeResponse = {
  generationId: string;
  fileName: string;
  pdfBase64?: string;
  atsScore: number;
  keywords: string[];
  strengths: string[];
  weaknesses: string[];
  missingKeywords: string[];
  status?: string;
  message?: string;
};

export function ResumeOptimizerPage({ user }: { user: User }) {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<OptimizeResumeResponse | null>(null);
  const [activeGenerationId, setActiveGenerationId] = useState<string | null>(
    null,
  );
  const { data: latestGeneration } = useQuery(getLatestResumeGeneration);
  const { data: polledGeneration, refetch: refetchGeneration } = useQuery(
    getResumeGeneration,
    { generationId: activeGenerationId ?? "" },
    { enabled: !!activeGenerationId },
  );

  useEffect(() => {
    if (!activeGenerationId || !isGenerating) return;

    const intervalId = window.setInterval(() => {
      void refetchGeneration();
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [activeGenerationId, isGenerating, refetchGeneration]);

  useEffect(() => {
    if (!polledGeneration) return;

    if (polledGeneration.status === "completed") {
      setResult(polledGeneration);
      setIsGenerating(false);
      if (polledGeneration.pdfBase64) {
        downloadPdf(polledGeneration.pdfBase64, polledGeneration.fileName);
      }
      setActiveGenerationId(null);
    }

    if (polledGeneration.status === "failed") {
      setErrorMessage("Unable to optimize resume. Please try again.");
      setIsGenerating(false);
      setActiveGenerationId(null);
    }
  }, [polledGeneration]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setResult(null);

    if (!resumeFile) {
      setErrorMessage("Please upload a resume file.");
      return;
    }

    const fileType = getSupportedFileType(resumeFile.name);
    if (!fileType) {
      setErrorMessage("Please upload a PDF, DOCX, or TXT resume.");
      return;
    }

    try {
      setIsGenerating(true);
      const formData = new FormData();
      formData.append("resumeFile", resumeFile);
      formData.append("jobDescription", jobDescription);

      const pdfResult = await api
        .post("/resume/optimize", { body: formData })
        .json<OptimizeResumeResponse>();
      if (pdfResult.status === "failed") {
        throw new Error(
          pdfResult.message ?? "Unable to queue resume generation.",
        );
      }
      setActiveGenerationId(pdfResult.generationId);
      await refetchGeneration();
    } catch (error: unknown) {
      console.error(error);
      setIsGenerating(false);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to optimize resume. Please try again.",
      );
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Card>
        <CardContent className="space-y-6 p-8">
          <div>
            <CardTitle className="text-2xl font-bold">
              Resume Dashboard
            </CardTitle>
            <p className="text-muted-foreground mt-2">
              Upload your resume, paste a job description, and generate a
              tailored, ATS-friendly PDF. Each successful generation uses one
              credit.
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              Credits remaining:{" "}
              <span className="font-semibold text-foreground">
                {user.credits}
              </span>
              {" · "}
              <Link
                className="text-primary underline"
                to={routes.PricingPageRoute.to}
              >
                Purchase Subscription
              </Link>
            </p>
          </div>

          {errorMessage && (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="resume-file">Resume Upload</Label>
              <Input
                id="resume-file"
                type="file"
                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                onChange={(event) =>
                  setResumeFile(event.currentTarget.files?.[0] ?? null)
                }
                disabled={isGenerating}
              />
              <p className="text-muted-foreground text-sm">
                Supported formats: PDF, DOCX, TXT.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="job-description">Job Description</Label>
              <Textarea
                id="job-description"
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                minLength={50}
                rows={12}
                placeholder="Paste the target job description here..."
                disabled={isGenerating}
                required
              />
            </div>

            <Button type="submit" disabled={isGenerating} className="w-full">
              {isGenerating ? "Generating Resume..." : "Generate Resume"}
            </Button>
          </form>

          {latestGeneration && !result && (
            <div className="rounded-md border p-4">
              <p className="font-semibold">Latest Generated Resume</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {latestGeneration.inputFileName} · {latestGeneration.status}
                {latestGeneration.atsScore !== null
                  ? ` · ATS Score ${latestGeneration.atsScore}`
                  : ""}
              </p>
            </div>
          )}

          {result && (
            <div className="bg-muted rounded-md p-4">
              <p className="font-semibold">Latest Generated Resume</p>
              <p className="mt-1 font-semibold">ATS Score: {result.atsScore}</p>
              <ResultList title="Keywords" items={result.keywords} />
              <ResultList
                title="Missing keywords"
                items={result.missingKeywords}
              />
              <ResultList title="Strengths" items={result.strengths} />
              <ResultList title="Weaknesses" items={result.weaknesses} />
              <Button
                type="button"
                variant="outline"
                className="mt-4"
                onClick={() =>
                  result.pdfBase64 &&
                  downloadPdf(result.pdfBase64, result.fileName)
                }
              >
                Download PDF
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ResultList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="text-sm font-medium">{title}</p>
      <ul className="text-muted-foreground list-disc pl-5 text-sm">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function getSupportedFileType(fileName: string): SupportedFileType | null {
  const extension = fileName.split(".").pop()?.toLowerCase();
  return supportedFileTypes.find((type) => type === extension) ?? null;
}

function downloadPdf(pdfBase64: string, fileName: string) {
  const byteCharacters = window.atob(pdfBase64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const blob = new Blob([new Uint8Array(byteNumbers)], {
    type: "application/pdf",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
