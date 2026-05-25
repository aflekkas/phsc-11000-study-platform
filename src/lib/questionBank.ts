import { lectures, type Cluster, type Priority } from "../data/courseData";
import { rawContentQuestionGroups } from "../data/questions/byLecture";
import rawLongAnswerQuestions from "../data/questions/longAnswer.json";

export type QuestionKind = "multiple-choice" | "long-answer";
export type Difficulty = "Easy" | "Medium" | "Hard";

export interface Choice {
  id: string;
  text: string;
}

export interface BaseQuestion {
  id: string;
  kind: QuestionKind;
  prompt: string;
  lecture?: string;
  lectureTitle?: string;
  cluster: Cluster;
  difficulty: Difficulty;
  priority?: Priority;
  explanation: string;
  tags: string[];
  sourcePath: string;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  kind: "multiple-choice";
  choices: Choice[];
  correctChoiceId: string;
  distractorRationales: Record<string, string>;
}

export interface LongAnswerQuestion extends BaseQuestion {
  kind: "long-answer";
  rubric: string[];
}

export type Question = MultipleChoiceQuestion | LongAnswerQuestion;

type RawContentQuestion = {
  id: string;
  prompt: string;
  choices: [string, string, string, string];
  explanation: string;
  tags: string[];
  difficulty: Difficulty;
};

type RawContentQuestionGroup = {
  lecture: string;
  questions: RawContentQuestion[];
};

type RawLongAnswerQuestion = {
  id: string;
  prompt: string;
  explanation: string;
  tags: string[];
  cluster: Cluster;
  sourcePath: string;
  difficulty: Difficulty;
};

type McSpec = RawContentQuestion & {
  lecture: string;
};

const contentQuestionGroups = rawContentQuestionGroups as RawContentQuestionGroup[];
const rawLongAnswers = rawLongAnswerQuestions as RawLongAnswerQuestion[];
const lectureByNumber = new Map(lectures.map((lecture) => [lecture.number, lecture]));
const MIN_MULTIPLE_CHOICE_PER_LECTURE = 20;
const MAX_EASY_MULTIPLE_CHOICE_PER_LECTURE = 5;
const MIN_HARD_MULTIPLE_CHOICE_PER_LECTURE = 5;

function requireLecture(number: string) {
  const lecture = lectureByNumber.get(number);
  if (!lecture) throw new Error(`Unknown lecture number for question bank: ${number}`);
  return lecture;
}

function contentQuestionSpecs(): McSpec[] {
  return contentQuestionGroups.flatMap((group) =>
    group.questions.map((question) => ({
      ...question,
      lecture: group.lecture
    }))
  );
}

function makeMc(spec: McSpec): MultipleChoiceQuestion {
  const lecture = requireLecture(spec.lecture);
  const choices = spec.choices.map((text, index) => ({
    id: `${spec.id}-${index}`,
    text
  }));

  return {
    id: spec.id,
    kind: "multiple-choice",
    prompt: spec.prompt,
    lecture: lecture.number,
    lectureTitle: lecture.title,
    cluster: lecture.cluster,
    difficulty: spec.difficulty,
    priority: lecture.priority,
    choices,
    correctChoiceId: choices[0].id,
    explanation: spec.explanation,
    distractorRationales: Object.fromEntries(
      choices.slice(1).map((choice) => [choice.id, `${choice.text} is not the target answer for this prompt.`])
    ),
    tags: [lecture.cluster, lecture.number, ...spec.tags],
    sourcePath: lecture.sourcePath
  };
}

function longAnswerQuestion(prompt: RawLongAnswerQuestion): LongAnswerQuestion {
  return {
    id: prompt.id,
    kind: "long-answer",
    prompt: prompt.prompt,
    cluster: prompt.cluster,
    difficulty: prompt.difficulty,
    explanation: prompt.explanation,
    tags: prompt.tags,
    sourcePath: prompt.sourcePath,
    rubric: [
      "Places the topic in the correct part of the environmental-history sequence.",
      "States a mechanism instead of only naming an event.",
      "Names evidence or a figure type.",
      "Explains a consequence.",
      "Connects to another event, lab, or recurring theme."
    ]
  };
}

const curatedMultipleChoiceQuestions = contentQuestionSpecs().map(makeMc);

export const questionBank: Question[] = [
  ...curatedMultipleChoiceQuestions,
  ...rawLongAnswers.map(longAnswerQuestion)
];

export const multipleChoiceQuestions = questionBank.filter(
  (question): question is MultipleChoiceQuestion => question.kind === "multiple-choice"
);

export const longAnswerQuestions = questionBank.filter(
  (question): question is LongAnswerQuestion => question.kind === "long-answer"
);

function normalized(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function visibleTextFor(question: Question) {
  const values = [question.prompt, question.explanation];
  if (question.kind === "multiple-choice") {
    values.push(...question.choices.map((choice) => choice.text));
    values.push(...Object.values(question.distractorRationales));
  } else {
    values.push(...question.rubric);
  }
  return values;
}

export function validateQuestionBank() {
  const errors: string[] = [];
  const ids = new Set<string>();
  const lectureNumberReference = /\bL\d{1,2}[a-z]?(?:\s*[-–]\s*L?\d{1,2}[a-z]?)?\b/i;
  const metaStudyLanguage = /\b(final|exam|study|prep|quiz|high-yield|canvas|multiple-choice)\b/i;
  const bannedPromptPatterns = [
    /which topic is most directly connected/i,
    /which term matches this process/i,
    /which statement best links/i
  ];
  const implausibleDistractorLanguage = [
    /\bmodern political borders\b/i,
    /\bmagnetic field stores incoming solar radiation\b/i,
    /\bocean tides reverse the direction of incoming sunlight\b/i,
    /\bcontains no visible wavelengths\b/i,
    /\bcreates more radioactive decay\b/i,
    /\bspeeds radioactive decay\b/i,
    /\bhalf-life decreases because salt\b/i,
    /\bstops plate motion\b/i,
    /\bradioactive isotopes decay more slowly\b/i,
    /\bchanges isotope half-lives\b/i,
    /\breverse axial tilt\b/i,
    /\bDNA sequence\b/i,
    /\bdinosaurs stirred shallow seafloor sediment\b/i,
    /\bevolved directly from dinosaurs\b/i,
    /\ball dinosaurs were direct ancestors\b/i,
    /\bselected directly for feathered flight\b/i,
    /\ball mammals, birds, and turtles disappeared\b/i,
    /\bneither process can affect climate or ecosystems\b/i,
    /\bmammals originated suddenly from diapsid reptiles\b/i,
    /\bmammals outcompeted all dinosaurs\b/i,
    /\bdinosaurs had no effect on mammal ecology\b/i,
    /\bhumans caused the Cambrian Radiation\b/i,
    /\bmarine adaptation.*durophagous predators\b/i,
    /\bmodern mammals\b/i,
    /\bindustrial fossil-fuel burning.*Ordovician\b/i
  ];

  for (const group of contentQuestionGroups) {
    if (group.questions.length < MIN_MULTIPLE_CHOICE_PER_LECTURE) {
      errors.push(
        `Lecture ${group.lecture} has ${group.questions.length} multiple-choice questions; minimum is ${MIN_MULTIPLE_CHOICE_PER_LECTURE}`
      );
    }

    const easyCount = group.questions.filter((question) => question.difficulty === "Easy").length;
    const hardCount = group.questions.filter((question) => question.difficulty === "Hard").length;
    if (easyCount > MAX_EASY_MULTIPLE_CHOICE_PER_LECTURE) {
      errors.push(
        `Lecture ${group.lecture} has ${easyCount} Easy questions; maximum is ${MAX_EASY_MULTIPLE_CHOICE_PER_LECTURE}`
      );
    }
    if (hardCount < MIN_HARD_MULTIPLE_CHOICE_PER_LECTURE) {
      errors.push(
        `Lecture ${group.lecture} has ${hardCount} Hard questions; minimum is ${MIN_HARD_MULTIPLE_CHOICE_PER_LECTURE}`
      );
    }
  }

  for (const question of questionBank) {
    if (ids.has(question.id)) errors.push(`Duplicate question id: ${question.id}`);
    ids.add(question.id);

    for (const text of visibleTextFor(question)) {
      if (lectureNumberReference.test(text)) errors.push(`${question.id} references lecture numbers`);
      if (metaStudyLanguage.test(text)) errors.push(`${question.id} uses meta study language`);
    }

    for (const pattern of bannedPromptPatterns) {
      if (pattern.test(question.prompt)) errors.push(`${question.id} uses a banned prompt template`);
    }

    if (question.kind === "multiple-choice") {
      if (question.choices.length !== 4) errors.push(`${question.id} has ${question.choices.length} choices`);
      if (!["Easy", "Medium", "Hard"].includes(question.difficulty)) {
        errors.push(`${question.id} has invalid difficulty: ${question.difficulty}`);
      }
      const correctMatches = question.choices.filter((choice) => choice.id === question.correctChoiceId);
      if (correctMatches.length !== 1) errors.push(`${question.id} does not have exactly one correct answer`);

      const uniqueChoices = new Set(question.choices.map((choice) => normalized(choice.text)));
      if (uniqueChoices.size !== question.choices.length) errors.push(`${question.id} has duplicate choice text`);

      for (const choice of question.choices.filter((choice) => choice.id !== question.correctChoiceId)) {
        if (!question.distractorRationales[choice.id]) errors.push(`${question.id} is missing rationale for ${choice.id}`);
        for (const pattern of implausibleDistractorLanguage) {
          if (pattern.test(choice.text)) errors.push(`${question.id} has an implausible distractor: ${choice.text}`);
        }
      }
    }
  }
  return errors;
}
