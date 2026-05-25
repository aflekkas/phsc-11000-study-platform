import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const esbuildCandidates = [
  "node_modules/.bin/esbuild",
  "node_modules/.pnpm/node_modules/.bin/esbuild"
];

const esbuild = esbuildCandidates.find((candidate) => existsSync(candidate));
if (!esbuild) {
  console.error("Could not find esbuild. Run pnpm install before validating the question bank.");
  process.exit(1);
}

const outdir = join(tmpdir(), `phsc-question-bank-${process.pid}`);
const outfile = join(outdir, "questionBank.mjs");
mkdirSync(outdir, { recursive: true });

try {
  const bundle = spawnSync(
    esbuild,
    [
      "src/lib/questionBank.ts",
      "--bundle",
      "--platform=node",
      "--format=esm",
      `--outfile=${outfile}`,
      "--log-level=error"
    ],
    { stdio: "inherit" }
  );

  if (bundle.status !== 0) process.exit(bundle.status ?? 1);

  const questionBank = await import(pathToFileURL(outfile).href);
  const errors = questionBank.validateQuestionBank();
  const lectureEntries = await readdir("content/lectures", { withFileTypes: true });
  const discoveredLectureIds = new Set(
    lectureEntries
      .filter((entry) => entry.isDirectory() && existsSync(join("content/lectures", entry.name, "questions.json")))
      .map((entry) => entry.name)
  );
  const bundledLectureIds = new Set(questionBank.multipleChoiceQuestions.map((question) => question.lecture));

  for (const lectureId of discoveredLectureIds) {
    if (!bundledLectureIds.has(lectureId)) errors.push(`Lecture ${lectureId} has questions.json but is missing from the app registry`);
  }

  for (const lectureId of bundledLectureIds) {
    if (!discoveredLectureIds.has(lectureId)) errors.push(`Lecture ${lectureId} is bundled but has no content/lectures/${lectureId}/questions.json`);
  }

  if (errors.length > 0) {
    console.error(`Question bank validation failed with ${errors.length} issue(s):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(
    `Question bank OK: ${questionBank.multipleChoiceQuestions.length} multiple-choice, ${questionBank.longAnswerQuestions.length} long-answer`
  );
} finally {
  rmSync(outdir, { recursive: true, force: true });
}
