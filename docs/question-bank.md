# Question Bank

Add multiple-choice course-content questions in the relevant lecture folder:

`content/lectures/<lecture-id>/questions.json`

Each lecture folder keeps the material together:

- `notes.md`
- `source.pdf`
- `questions.json`

Keep each `questions.json` as an array of question objects:

```json
[
  {
    "id": "l12-paleogeography-example",
    "prompt": "Why can continental position affect ancient climate?",
    "choices": [
      "It changes latitude, ocean gateways, and circulation patterns",
      "It fixes the half-life of radioactive isotopes",
      "It removes the need for fossil evidence",
      "It prevents sedimentary rocks from forming"
    ],
    "explanation": "Paleogeography matters because continents move through climate zones and alter ocean-atmosphere circulation.",
    "tags": ["paleogeography", "climate"],
    "difficulty": "Medium"
  }
]
```

Rules:

- Keep at least 20 multiple-choice questions in every lecture folder.
- The first choice is the correct answer in the source JSON. Runtime code can shuffle display order.
- Use four choices. Distractors must be plausible same-domain traps, not random terms from other lectures.
- Set `difficulty` from the task, not the lecture priority:
  - `Easy`: definition or direct recall.
  - `Medium`: one-step mechanism, evidence, or application.
  - `Hard`: compare, infer, or choose among plausible mechanisms/proxies/events.
- Keep the bank harder than a flashcard set: at most five `Easy` questions per lecture and at least five `Hard` questions per lecture.
- A `Hard` question should not be a basic fact with silly distractors. It should force a comparison, causal chain, evidence interpretation, or near-miss distinction.
- Keep visible text course-facing: no meta wording such as study, exam, quiz, final, prep, Canvas, high-yield, or multiple-choice in prompts, choices, or explanations.
- Phrase questions like real course assessment items, but do not mention the assessment itself.
- Do not write lecture-number association prompts. The folder name is metadata, not something the learner should answer from.
- Base questions on the neighboring `notes.md` and `source.pdf`.
- Prefer mechanism-and-evidence questions over trivia.
- Avoid joke distractors and obvious impossibilities such as unrelated animals, modern human causes for ancient events, impossible isotope/plate-tectonic claims, or random terms from distant course units.
- Use stable, unique IDs like `l12-short-topic`.
- If adding a new lecture folder, also add it to `src/data/questions/byLecture.ts`.

Before handing off, run:

```sh
pnpm validate:questions
pnpm build
```
