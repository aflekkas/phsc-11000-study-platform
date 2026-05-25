# PHSC 11000

Environmental History of the Earth, UChicago, Prof. Mark Webster.

This directory is now the Vite app root for the PHSC 11000 study platform. Course-level documents live under `docs/`. Lecture content used by the app lives under `content/lectures/<lecture-id>/`, with `notes.md`, `source.pdf`, and `questions.json` kept together.

## How We Work

This folder is for learning, organizing, and course review. Alex owns any submitted work.

You are not alone in this codebase. Do not revert, clean up, or touch app/source changes made by others unless explicitly asked. Keep documentation edits scoped to the files you own for the task at hand.

Go hard on:

- Explaining lecture concepts in plain language.
- Building study guides, comparison charts, timelines, and practice questions.
- Connecting processes across atmosphere, hydrosphere, geosphere, biosphere, climate, evolution, and extinction.
- Turning lecture PDFs, lecture notes, and labs into review checklists.
- Flagging weak spots and likely confusion points.

Do not:

- Answer live lab or quiz questions as if they are assignments to submit.
- Write any term-paper prose that could be pasted into a submission.
- Treat web sources as stronger than the course PDFs unless the task is explicitly outside the course materials.

If something sits on the edge, do the study-side version and keep going.

## App Commands

Run commands from this PHSC root:

- Install dependencies: `pnpm install`
- Start dev server: `pnpm dev`
- Capture README screenshots: `pnpm screenshots`
- Validate question-bank data: `pnpm validate:questions`
- Build and type-check: `pnpm build`
- Preview production build: `pnpm preview`

Question-bank authoring guidance lives in `docs/question-bank.md`. Add lecture MC questions in the relevant `content/lectures/<lecture-id>/questions.json` file, keep every lecture at 20+ MC questions, and keep `src/data/questions/byLecture.ts` in sync when adding new lecture folders.

## GitHub Publishing

Default to keeping this project published on GitHub. Auto-push is the standing rule for agent-owned work in this project: after making any source, content, documentation, asset, or workflow change, run the narrow relevant validation, commit the completed change, and push it to `origin main`.

Do not stop at a local-only commit unless Alex explicitly says not to push, asks for a read-only or plan-only pass, or the worktree contains unrelated changes that need confirmation. If the change is small and validation is already covered by `pnpm build`, commit and push in the same turn.

Before pushing, check `git status -sb` and avoid staging raw course PDFs, local build output, `node_modules`, or unrelated files. The GitHub Actions workflow validates and publishes the Vite app to GitHub Pages on every push to `main`.

Raw course PDFs are local source material and are intentionally ignored for public publishing. Keep public-facing study content in `content/lectures/**/notes.md`, `content/lectures/**/questions.json`, `src/`, and `docs/`.

## Notes

The course syllabus says use of artificial intelligence to answer lab questions is not permitted. The optional term paper must be original and must not be written, even in part, by artificial intelligence.
