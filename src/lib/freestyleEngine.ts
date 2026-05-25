import type { MultipleChoiceQuestion } from "./questionBank";
import type { AnswerRecord, ProgressState, SessionResult } from "./storage";

export type MasteryLabel = "New" | "Recovering" | "Strengthening" | "Mastered";

export interface FreestyleMastery {
  questionId: string;
  attempts: number;
  correct: number;
  missed: number;
  currentRunAttempts: number;
  correctStreak: number;
  lastSeenAgo: number;
  flagged: boolean;
  due: boolean;
  label: MasteryLabel;
}

export interface AdaptiveFreestyleStats {
  mastered: number;
  recovering: number;
  fresh: number;
}

export interface FreestyleSelectionInput {
  progress: ProgressState;
  questions: MultipleChoiceQuestion[];
  runLog: AnswerRecord[];
  recentQuestionIds: string[];
}

const initialSpacing = 3;
const reinforcingSpacing = 6;
const masteredSpacing = 12;

function completedAttempts(progress: ProgressState) {
  return [...progress.sessions, ...progress.freestyle]
    .sort((a, b) => new Date(a.finishedAt).getTime() - new Date(b.finishedAt).getTime())
    .flatMap((result) => result.answers.filter((answer) => answer.correct !== undefined));
}

function spacingFor(correctStreak: number) {
  if (correctStreak >= 3) return masteredSpacing;
  if (correctStreak >= 2) return reinforcingSpacing;
  return initialSpacing;
}

function labelFor(attempts: number, missed: number, correctStreak: number): MasteryLabel {
  if (attempts === 0) return "New";
  if (missed > 0 && correctStreak < 2) return "Recovering";
  if (correctStreak >= 3) return "Mastered";
  return "Strengthening";
}

function masteryFromAnswers(questionId: string, answers: AnswerRecord[], flagged: boolean): FreestyleMastery {
  const attempts = answers.filter((answer) => answer.questionId === questionId);
  let lastSeenIndex = -1;
  for (let index = answers.length - 1; index >= 0; index -= 1) {
    if (answers[index].questionId === questionId) {
      lastSeenIndex = index;
      break;
    }
  }
  const missed = attempts.filter((answer) => answer.correct === false).length;
  const correct = attempts.filter((answer) => answer.correct === true).length;
  let correctStreak = 0;

  for (let index = attempts.length - 1; index >= 0; index -= 1) {
    if (attempts[index].correct !== true) break;
    correctStreak += 1;
  }

  const lastSeenAgo = lastSeenIndex === -1 ? Number.POSITIVE_INFINITY : answers.length - lastSeenIndex - 1;
  const due = attempts.length === 0 || flagged || lastSeenAgo >= spacingFor(correctStreak);

  return {
    questionId,
    attempts: attempts.length,
    correct,
    missed,
    currentRunAttempts: 0,
    correctStreak,
    lastSeenAgo,
    flagged,
    due,
    label: labelFor(attempts.length, missed, correctStreak)
  };
}

export function buildFreestyleMastery(
  progress: ProgressState,
  questions: MultipleChoiceQuestion[],
  runLog: AnswerRecord[] = []
) {
  const storedAnswers = completedAttempts(progress);
  const answers = [...storedAnswers, ...runLog.filter((answer) => answer.correct !== undefined)];
  const runAttempts = new Map<string, number>();

  for (const answer of runLog) {
    runAttempts.set(answer.questionId, (runAttempts.get(answer.questionId) ?? 0) + 1);
  }

  return new Map(
    questions.map((question) => {
      const mastery = masteryFromAnswers(question.id, answers, Boolean(progress.flagged[question.id]));
      return [question.id, { ...mastery, currentRunAttempts: runAttempts.get(question.id) ?? 0 }];
    })
  );
}

function latestAnsweredQuestion(progress: ProgressState, runLog: AnswerRecord[]) {
  if (runLog.length > 0) return runLog[runLog.length - 1]?.questionId;
  const latestStored = [...progress.sessions, ...progress.freestyle]
    .sort((a: SessionResult, b: SessionResult) => new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime())
    .find((result) => result.answers.some((answer) => answer.correct !== undefined));
  return latestStored?.answers.find((answer) => answer.correct !== undefined)?.questionId;
}

function scoreQuestion(
  question: MultipleChoiceQuestion,
  mastery: FreestyleMastery,
  recentQuestionIds: string[],
  lastQuestion: MultipleChoiceQuestion | undefined,
  relaxCooldown: boolean
) {
  let score = 0;
  const recentSet = new Set(recentQuestionIds);

  if (mastery.attempts === 0) score += 42;
  if (mastery.flagged) score += 38;
  if (mastery.missed > 0) score += 24 + Math.min(mastery.missed, 4) * 8;
  if (mastery.correctStreak === 0 && mastery.attempts > 0) score += 16;
  if (mastery.correctStreak === 1) score += 12;
  if (mastery.correctStreak === 2) score += 4;
  if (mastery.correctStreak >= 3) score -= 32;

  score += Math.min(Number.isFinite(mastery.lastSeenAgo) ? mastery.lastSeenAgo : 10, 10) * 3;
  score -= mastery.currentRunAttempts * 8;

  if (!mastery.due && !relaxCooldown) score -= 70;
  if (recentSet.has(question.id) && !relaxCooldown) score -= 120;

  if (lastQuestion) {
    if (question.lecture === lastQuestion.lecture) score -= 24;
    if (question.cluster === lastQuestion.cluster) score -= mastery.flagged || mastery.missed > mastery.correct ? 4 : 14;
  }

  if (question.difficulty === "Hard") {
    score += mastery.correctStreak >= 2 ? 8 : 3;
  } else if (question.difficulty === "Easy" && mastery.missed > mastery.correct) {
    score += 10;
  } else if (question.difficulty === "Medium") {
    score += 5;
  }

  return score + Math.random() * 4;
}

export function selectNextFreestyleQuestion({
  progress,
  questions,
  runLog,
  recentQuestionIds
}: FreestyleSelectionInput) {
  const mastery = buildFreestyleMastery(progress, questions, runLog);
  const byId = new Map(questions.map((question) => [question.id, question]));
  const lastQuestion = byId.get(latestAnsweredQuestion(progress, runLog) ?? "");
  const candidates = questions.map((question) => ({
    question,
    mastery: mastery.get(question.id)!
  }));
  const scored = candidates.map((candidate) => ({
    ...candidate,
    score: scoreQuestion(candidate.question, candidate.mastery, recentQuestionIds, lastQuestion, false)
  }));
  const best = scored.sort((a, b) => b.score - a.score)[0];

  if (best && best.score > -20) return best.question;

  return candidates
    .map((candidate) => ({
      ...candidate,
      score: scoreQuestion(candidate.question, candidate.mastery, recentQuestionIds.slice(0, 1), lastQuestion, true)
    }))
    .sort((a, b) => b.score - a.score)[0].question;
}

export function masteryForQuestion(
  progress: ProgressState,
  questions: MultipleChoiceQuestion[],
  runLog: AnswerRecord[],
  questionId: string
) {
  return buildFreestyleMastery(progress, questions, runLog).get(questionId);
}

export function buildAdaptiveFreestyleStats(
  progress: ProgressState,
  questions: MultipleChoiceQuestion[],
  runLog: AnswerRecord[] = []
): AdaptiveFreestyleStats {
  const mastery = buildFreestyleMastery(progress, questions, runLog);
  const values = Array.from(mastery.values());
  return {
    mastered: values.filter((item) => item.label === "Mastered").length,
    recovering: values.filter((item) => item.label === "Recovering").length,
    fresh: values.filter((item) => item.label === "New").length
  };
}

export function reinforcementLine(correct: boolean, mastery: FreestyleMastery | undefined) {
  if (!mastery) return correct ? "Logged." : "This idea will come back soon.";
  if (!correct) return "This idea will come back after a few different cards.";
  if (mastery.correctStreak >= 3) return "Strong recall. This card will show up less often now.";
  if (mastery.correctStreak >= 2) return "Good retrieval. One more spaced hit will lock it in.";
  return "First clean retrieval. The card will return later to make it stick.";
}
