import { execFile } from "child_process";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";
import type { OptimizedResumeResult } from "./schema";

const execFileAsync = promisify(execFile);
const templatePath = path.join(process.cwd(), "src", "resume", "resume.tex");

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
    const template = await readFile(templatePath, "utf8");
    const tex = populateResumeTemplate(template, result);
    await writeFile(texPath, tex, "utf8");
    hooks.onStageComplete?.("latex_generation");

    hooks.onStageStart?.("pdf_compilation");
    await execFileAsync("tectonic", ["--outdir", tempDir, texPath]);
    hooks.onStageComplete?.("pdf_compilation");

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
          {\\textbf{${latexEscape(project.name)}}${
            project.technologies
              ? ` $|$ \\emph{${latexEscape(project.technologies)}}`
              : ""
          }}{${latexEscape(joinDates(project.startDate, project.endDate))}}
          ${buildBulletList(project.bullets)}`,
  )
  .join("\n")}
    \\resumeSubHeadingListEnd`;
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
