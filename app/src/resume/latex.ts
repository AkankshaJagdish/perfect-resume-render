import { execFile } from "child_process";
import { access, mkdtemp, readFile, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";
import type { OptimizedResumeResult } from "./schema";

const execFileAsync = promisify(execFile);
const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const templateFileName = "resume.tex";

function getResumeTemplateCandidates(): string[] {
  return [
    path.join(moduleDir, templateFileName),
    path.resolve(moduleDir, "..", "src", "resume", templateFileName),
    path.resolve(
      moduleDir,
      "..",
      "..",
      "..",
      "..",
      "src",
      "resume",
      templateFileName,
    ),
  ];
}

async function readResumeTemplate(): Promise<string> {
  const attemptedPaths = getResumeTemplateCandidates();

  for (const templatePath of attemptedPaths) {
    try {
      await access(templatePath);
      return await readFile(templatePath, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  console.error(
    `Resume template not found.\nAttempted:\n${attemptedPaths
      .map((templatePath) => `- ${templatePath}`)
      .join("\n")}`,
  );
  throw new Error("Resume template not found.");
}

type ResumePdfGenerationHooks = {
  onStageStart?: (stage: "latex_generation" | "pdf_compilation") => void;
  onStageComplete?: (stage: "latex_generation" | "pdf_compilation") => void;
};

export async function generateResumePdf(
  result: OptimizedResumeResult,
  hooks: ResumePdfGenerationHooks = {},
): Promise<Buffer> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "resume-pdf-"));

  try {
    const texPath = path.join(tempDir, "resume.tex");
    const pdfPath = path.join(tempDir, "resume.pdf");

    hooks.onStageStart?.("latex_generation");
    const template = await readResumeTemplate();
    const tex = populateResumeTemplate(template, result);
    await writeFile(texPath, tex, "utf8");
    await execFileAsync("tectonic", ["--outdir", tempDir, texPath]);

    return await readFile(pdfPath);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function populateResumeTemplate(
  template: string,
  result: OptimizedResumeResult,
): string {
  const resume = result.resume;
  return template
    .replaceAll("{{NAME}}", latexEscape(resume.name || "Resume"))
    .replaceAll("{{EMAIL}}", latexEscape(resume.email))
    .replaceAll("{{PHONE}}", latexEscape(resume.phone))
    .replaceAll("{{LINKEDIN}}", latexEscape(normalizeUrlLabel(resume.linkedin)))
    .replaceAll("{{GITHUB}}", latexEscape(normalizeUrlLabel(resume.github)))
    .replace("{{EDUCATION}}", buildEducationSection(resume.education))
    .replace("{{EXPERIENCE}}", buildExperienceSection(resume.experience))
    .replace("{{PROJECTS}}", buildProjectsSection(resume.projects))
    .replace("{{SKILLS}}", buildSkillsSection(resume.skills));
}

type Resume = OptimizedResumeResult["resume"];

function buildEducationSection(education: Resume["education"]): string {
  if (education.length === 0) return "";
  return `%-----------EDUCATION-----------
\\section{Education}
  \\resumeSubHeadingListStart
${education
  .map(
    (item) => `    \\resumeSubheading
      {${latexEscape(item.school)}}{${latexEscape(item.location)}}
      {${latexEscape(item.degree)}}{${latexEscape(
        joinDates(item.startDate, item.endDate),
      )}}`,
  )
  .join("\n")}
  \\resumeSubHeadingListEnd`;
}

function buildExperienceSection(experience: Resume["experience"]): string {
  if (experience.length === 0) return "";
  return `%-----------EXPERIENCE-----------
\\section{Experience}
  \\resumeSubHeadingListStart
${experience
  .map(
    (item) => `    \\resumeSubheading
      {${latexEscape(item.title)}}{${latexEscape(
        joinDates(item.startDate, item.endDate),
      )}}
      {${latexEscape(item.company)}}{${latexEscape(item.location)}}
      ${buildBulletList(item.bullets)}`,
  )
  .join("\n\n")}
  \\resumeSubHeadingListEnd`;
}

function buildProjectsSection(projects: Resume["projects"]): string {
  if (projects.length === 0) return "";
  return `%-----------PROJECTS-----------
\\section{Projects}
    \\resumeSubHeadingListStart
${projects
  .map(
    (project) => `      \\resumeProjectHeading
          {\\textbf{${latexEscape(formatProjectTitle(project.name))}}}
          {${latexEscape(joinDates(project.startDate, project.endDate))}}
          {${formatProjectTechnologies(project.technologies)}}
          ${buildBulletList(project.bullets)}`,
  )
  .join("\n")}
    \\resumeSubHeadingListEnd`;
}

function formatProjectTitle(title: string): string {
  const normalizedTitle = title.replace(/\s+/g, " ").trim();
  const maxProjectTitleLength = 58;

  if (normalizedTitle.length <= maxProjectTitleLength) {
    return normalizedTitle;
  }

  const leadingTitle = normalizedTitle.split(/\s[-–—:]\s/)[0]?.trim();
  if (
    leadingTitle &&
    leadingTitle.length >= 10 &&
    leadingTitle.length <= maxProjectTitleLength
  ) {
    return leadingTitle;
  }

  if (
    /federated/i.test(normalizedTitle) &&
    /anomaly detection/i.test(normalizedTitle)
  ) {
    return "Federated Anomaly Detection";
  }

  const withoutLayoutNoise = normalizedTitle
    .replace(/\b(Based|System|Application|Platform|Project)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (withoutLayoutNoise.length <= maxProjectTitleLength) {
    return withoutLayoutNoise;
  }

  return `${withoutLayoutNoise.slice(0, maxProjectTitleLength).trimEnd()}...`;
}

function formatProjectTechnologies(technologies: string): string {
  const normalizedTechnologies = technologies
    .split(/[,;|•]+/)
    .map(normalizeTechnologyName)
    .filter(Boolean);

  return Array.from(new Set(normalizedTechnologies))
    .map(latexEscape)
    .join(" \\textbullet{} ");
}

function normalizeTechnologyName(technology: string): string {
  const normalizedTechnology = technology.replace(/\s+/g, " ").trim();
  const normalizedKey = normalizedTechnology.toLowerCase();

  const aliases: Record<string, string> = {
    javascript: "JavaScript",
    typescript: "TypeScript",
    postgresql: "PostgreSQL",
    postgres: "PostgreSQL",
    restful: "REST APIs",
    "rest api": "REST APIs",
    "rest apis": "REST APIs",
    "restful api": "REST APIs",
    "restful apis": "REST APIs",
    nodejs: "Node.js",
    "node js": "Node.js",
  };

  return aliases[normalizedKey] ?? normalizedTechnology;
}

function buildSkillsSection(skills: Resume["skills"]): string {
  return `%-----------PROGRAMMING SKILLS-----------
\\section{Technical Skills}
 \\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
     \\textbf{Languages}{: ${joinList(skills.languages)}} \\\\
     \\textbf{Frameworks}{: ${joinList(skills.frameworks)}} \\\\
     \\textbf{Developer Tools}{: ${joinList(skills.developerTools)}} \\\\
     \\textbf{Libraries}{: ${joinList(skills.libraries)}}
    }}
 \\end{itemize}`;
}

function buildBulletList(items: string[]): string {
  if (items.length === 0) return "";
  return `\\resumeItemListStart
${items.map((item) => `        \\resumeItem{${latexEscape(item)}}`).join("\n")}
      \\resumeItemListEnd`;
}

function joinList(items: string[]): string {
  return items.map(latexEscape).join(", ");
}

function joinDates(startDate: string, endDate: string): string {
  return [startDate, endDate].filter(Boolean).join(" -- ");
}

function normalizeUrlLabel(value: string): string {
  return value.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function latexEscape(value: string): string {
  return value
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/{/g, "\\{")
    .replace(/}/g, "\\}")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}
