import {
  answersXp,
  currentStreak
} from "./gamification";
import {
  buildAdaptiveFreestyleStats
} from "./freestyleEngine";
import type { MultipleChoiceQuestion, Question } from "./questionBank";
import type { AnswerRecord, PhraseSource, ProgressState } from "./storage";
import type { Preset, SessionRunStats, SessionState, TimedPreset } from "../types/study";

export const presetConfig: Record<TimedPreset, { count: number; minutes: number; longAnswers: number }> = {
  "Quick Drill": { count: 15, minutes: 15, longAnswers: 0 },
  "Mock Exam": { count: 40, minutes: 60, longAnswers: 3 },
  "Weak Retake": { count: 20, minutes: 25, longAnswers: 0 }
};

export const MAX_PHRASE_LENGTH = 80;

export function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

export function shuffledMultipleChoice(pool: MultipleChoiceQuestion[]) {
  return shuffle(pool).map((question) => ({
    ...question,
    choices: shuffle(question.choices)
  }));
}

export function withShuffledChoices(question: MultipleChoiceQuestion) {
  return {
    ...question,
    choices: shuffle(question.choices)
  };
}

export function formatSignedXp(value: number) {
  if (value > 0) return `+${value}`;
  return `${value}`;
}

export function cleanPhraseText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizedPhraseKey(value: string) {
  return cleanPhraseText(value).toLowerCase();
}

export function canSavePhrase(value: string) {
  const cleaned = cleanPhraseText(value);
  return cleaned.length > 0 && cleaned.length <= MAX_PHRASE_LENGTH;
}

export function sourceSignature(source: Pick<PhraseSource, "type" | "label" | "questionId" | "sourcePath">) {
  return [source.type, source.questionId, source.sourcePath, source.label].filter(Boolean).join("|");
}

export function learningProgressFor(session: SessionState, progress: ProgressState): ProgressState {
  if (!session.freestyleBaseProgress) return progress;
  return { ...session.freestyleBaseProgress, flagged: progress.flagged };
}

export function buildSessionRunStats(
  session: SessionState,
  progress: ProgressState,
  questions: Question[],
  multipleChoiceQuestions: MultipleChoiceQuestion[]
): SessionRunStats {
  const answers = (session.freestyleLog ?? Object.values(session.answers)).filter((answer) => answer.correct !== undefined);
  const answered = answers.length;
  const correct = answers.filter((answer) => answer.correct === true).length;
  const missed = answers.filter((answer) => answer.correct === false).length;
  const byId = new Map(questions.map((question) => [question.id, question]));
  const adaptive = buildAdaptiveFreestyleStats(learningProgressFor(session, progress), multipleChoiceQuestions, answers as AnswerRecord[]);
  return {
    answered,
    correct,
    missed,
    streak: currentStreak(answers as AnswerRecord[]),
    xp: answersXp(answers as AnswerRecord[], byId),
    accuracy: answered ? Math.round((correct / answered) * 100) : 0,
    leftInCycle: Math.max(session.questions.length - session.index - 1, 0),
    mastered: adaptive.mastered,
    recovering: adaptive.recovering,
    fresh: adaptive.fresh
  };
}

export function isTimedPreset(preset: Preset): preset is TimedPreset {
  return preset !== "Freestyle";
}
