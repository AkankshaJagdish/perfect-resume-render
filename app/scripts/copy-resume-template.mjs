import { copyFile, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const appRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const source = path.join(appRoot, "src", "resume", "resume.tex");
const destination = path.join(
  appRoot,
  ".wasp",
  "out",
  "server",
  "src",
  "resume",
  "resume.tex",
);

await mkdir(path.dirname(destination), { recursive: true });
await copyFile(source, destination);

console.log(`Copied resume template to ${path.relative(appRoot, destination)}`);
