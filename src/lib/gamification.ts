import type { Difficulty, Question } from "./questionBank";
import type { AnswerRecord, ProgressState, SessionResult } from "./storage";

type Mood = "stressed" | "warming" | "steady" | "locked";
export type RewardTone = "green" | "amber" | "blue" | "purple" | "red";
export type ConfettiMode = "none" | "small" | "burst";

export interface RewardMilestone {
  id: string;
  label: string;
  value: string;
  tone: RewardTone;
}

export interface StudyGameStats {
  answered: number;
  correct: number;
  missed: number;
  accuracy: number;
  coverage: number;
  prepScore: number;
  streak: number;
  level: number;
  levelTitle: string;
  xp: number;
  currentLevelXp: number;
  nextLevelXp: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  levelProgress: number;
  mood: Mood;
  moodLabel: string;
  moodLine: string;
  focusLine: string;
  nextGoal: string;
  milestones: RewardMilestone[];
}

export interface RewardEvent {
  id: string;
  title: string;
  detail: string;
  xp: number;
  tone: RewardTone;
  confetti: ConfettiMode;
}

export interface SessionRewardSummary {
  sessionXp: number;
  accuracy: number;
  previousLevel: number;
  nextLevel: number;
  previousTitle: string;
  nextTitle: string;
  leveledUp: boolean;
  milestones: RewardMilestone[];
  confetti: ConfettiMode;
}

const difficultyXp: Record<Difficulty, number> = {
  Easy: 0,
  Medium: 4,
  Hard: 8
};

const difficultyPenalty: Record<Difficulty, number> = {
  Easy: 5,
  Medium: 7,
  Hard: 10
};

const levelTitles = [
  "Fresh Core",
  "Layer Reader",
  "Proxy Scout",
  "Strata Climber",
  "Deep-Time Operator",
  "Extinction Analyst",
  "Earth-System Synthesizer",
  "Final Form"
];

function thresholdForLevel(level: number) {
  if (level <= 1) return 0;
  return Math.round(90 * Math.pow(level - 1, 1.42));
}

export function titleForLevel(level: number) {
  return levelTitles[Math.min(level - 1, levelTitles.length - 1)];
}

function levelForXp(xp: number) {
  let level = 1;
  while (level < 40 && xp >= thresholdForLevel(level + 1)) {
    level += 1;
  }
  return level;
}

function moodFor(prepScore: number): Pick<StudyGameStats, "mood" | "moodLabel" | "moodLine"> {
  if (prepScore >= 82) {
    return { mood: "locked", moodLabel: "Locked in", moodLine: "The core is stable. Keep pressure on weak topics." };
  }
  if (prepScore >= 62) {
    return { mood: "steady", moodLabel: "Steady", moodLine: "The layers are holding together. Stack a few more reps." };
  }
  if (prepScore >= 35) {
    return { mood: "warming", moodLabel: "Warming up", moodLine: "Momentum is forming. Coverage is the next lever." };
  }
  return { mood: "stressed", moodLabel: "Low charge", moodLine: "Small reps count. Build the first layer." };
}

function questionMap(questions: Question[]) {
  return new Map(questions.map((question) => [question.id, question]));
}

function attempted(answer: AnswerRecord) {
  return Boolean(answer.selectedChoiceId || (answer.textAnswer ?? "").trim());
}

function streakBonus(streak: number) {
  return Math.min(16, Math.max(0, streak - 1) * 2);
}

export function answerXp(answer: AnswerRecord, question?: Question, streak = 0) {
  const bonus = question ? difficultyXp[question.difficulty] : difficultyXp.Medium;
  const penalty = question ? difficultyPenalty[question.difficulty] : difficultyPenalty.Medium;
  if (answer.correct === true) return 12 + bonus + streakBonus(streak);
  if (answer.correct === false && attempted(answer)) return -penalty;
  if ((answer.textAnswer ?? "").trim().length >= 40) return 10 + bonus;
  return 0;
}

function resultXpWithStreak(result: SessionResult, questionsById: Map<string, Question>, startingStreak = 0) {
  let streak = startingStreak;
  let answerTotal = 0;

  for (const answer of result.answers) {
    if (answer.correct === true) {
      streak += 1;
    } else if (answer.correct === false) {
      streak = 0;
    }
    answerTotal += answerXp(answer, questionsById.get(answer.questionId), streak);
  }

  if (result.preset === "Freestyle" || result.totalMc <= 1) return { total: answerTotal, streak };
  const attemptedCount = result.answers.filter(attempted).length;
  if (attemptedCount === 0) return { total: answerTotal, streak };
  const accuracy = result.totalMc ? result.score / result.totalMc : 0;
  const accuracyBonus = accuracy >= 0.7 ? Math.round(accuracy * 18) : 0;
  const completionBonus = Math.min(result.score, 12);
  return { total: answerTotal + completionBonus + accuracyBonus, streak };
}

export function resultXp(result: SessionResult, questionsById: Map<string, Question>, startingStreak = 0) {
  return resultXpWithStreak(result, questionsById, startingStreak).total;
}

export function answersXp(answers: AnswerRecord[], questionsById: Map<string, Question>, startingStreak = 0) {
  let streak = startingStreak;
  return answers.reduce((sum, answer) => {
    if (answer.correct === true) {
      streak += 1;
    } else if (answer.correct === false) {
      streak = 0;
    }
    return sum + answerXp(answer, questionsById.get(answer.questionId), streak);
  }, 0);
}

export function currentStreak(answers: AnswerRecord[]) {
  let streak = 0;
  for (let index = answers.length - 1; index >= 0; index -= 1) {
    if (answers[index].correct !== true) break;
    streak += 1;
  }
  return streak;
}

export function progressXp(progress: ProgressState, questions: Question[]) {
  return Math.max(0, progressLedger(progress, questions).xp);
}

function progressLedger(progress: ProgressState, questions: Question[]) {
  const byId = questionMap(questions);
  let xp = 0;
  let streak = 0;

  const results = [...progress.sessions, ...progress.freestyle].sort(
    (a, b) => new Date(a.finishedAt).getTime() - new Date(b.finishedAt).getTime()
  );

  for (const result of results) {
    const next = resultXpWithStreak(result, byId, streak);
    xp += next.total;
    streak = next.streak;
  }

  return { xp, streak };
}

function allAnswered(progress: ProgressState) {
  return [...progress.sessions, ...progress.freestyle]
    .sort((a, b) => new Date(a.finishedAt).getTime() - new Date(b.finishedAt).getTime())
    .flatMap((result) => result.answers.filter((answer) => answer.correct !== undefined));
}

function focusLine(answered: number, accuracy: number, coverage: number, streak: number) {
  if (answered === 0) return "Start the first layer with a short freestyle run.";
  if (streak >= 5) return "Use the streak while attention is hot.";
  if (coverage < 45) return "Open new ground: rotate into fresh lectures.";
  if (accuracy < 68) return "Recover misses before adding more volume.";
  return "Good base. Push weak topics and keep the rhythm.";
}

function nextGoal(answered: number, coverage: number, xpForNextLevel: number) {
  if (answered === 0) return "Answer 5 questions";
  if (coverage < 25) return "Reach 25% coverage";
  return `${xpForNextLevel} XP to next level`;
}

function buildMilestones({
  answered,
  accuracy,
  coverage,
  streak,
  level,
  sessions
}: {
  answered: number;
  accuracy: number;
  coverage: number;
  streak: number;
  level: number;
  sessions: number;
}) {
  const milestones: RewardMilestone[] = [];
  if (answered >= 1) milestones.push({ id: "first-rep", label: "First layer", value: `${answered} answered`, tone: "green" });
  if (streak >= 3) milestones.push({ id: "streak-3", label: "Hot streak", value: `${streak} in a row`, tone: "amber" });
  if (accuracy >= 80 && answered >= 10) milestones.push({ id: "sharp", label: "Sharp", value: `${accuracy}% accuracy`, tone: "blue" });
  if (coverage >= 25) milestones.push({ id: "coverage-25", label: "Map opened", value: `${coverage}% coverage`, tone: "purple" });
  if (sessions >= 1) milestones.push({ id: "mock-run", label: "Timed run", value: `${sessions} logged`, tone: "green" });
  if (level >= 3) milestones.push({ id: "level-3", label: "Leveled", value: `Level ${level}`, tone: "amber" });
  return milestones.slice(-4);
}

export function buildStudyGameStats(progress: ProgressState, questions: Question[], multipleChoiceTotal: number): StudyGameStats {
  const answers = allAnswered(progress);
  const multipleChoiceIds = new Set(questions.filter((question) => question.kind === "multiple-choice").map((question) => question.id));
  const answered = answers.length;
  const correct = answers.filter((answer) => answer.correct === true).length;
  const missed = answers.filter((answer) => answer.correct === false).length;
  const accuracy = answered ? Math.round((correct / answered) * 100) : 0;
  const coverage = multipleChoiceTotal
    ? Math.min(
        100,
        Math.round(
          (new Set(answers.filter((answer) => multipleChoiceIds.has(answer.questionId)).map((answer) => answer.questionId)).size /
            multipleChoiceTotal) *
            100
        )
      )
    : 0;
  const volume = Math.min(answered / 70, 1) * 100;
  const prepScore = answered ? Math.min(100, Math.round(accuracy * 0.5 + coverage * 0.35 + volume * 0.15)) : 0;
  const streak = currentStreak(answers);
  const xp = progressXp(progress, questions);
  const level = levelForXp(xp);
  const currentLevelXp = thresholdForLevel(level);
  const nextLevelXp = thresholdForLevel(level + 1);
  const xpIntoLevel = xp - currentLevelXp;
  const xpForNextLevel = Math.max(nextLevelXp - xp, 0);
  const levelProgress = nextLevelXp > currentLevelXp ? Math.round((xpIntoLevel / (nextLevelXp - currentLevelXp)) * 100) : 100;

  return {
    answered,
    correct,
    missed,
    accuracy,
    coverage,
    prepScore,
    streak,
    level,
    levelTitle: titleForLevel(level),
    xp,
    currentLevelXp,
    nextLevelXp,
    xpIntoLevel,
    xpForNextLevel,
    levelProgress,
    ...moodFor(prepScore),
    focusLine: focusLine(answered, accuracy, coverage, streak),
    nextGoal: nextGoal(answered, coverage, xpForNextLevel),
    milestones: buildMilestones({ answered, accuracy, coverage, streak, level, sessions: progress.sessions.length })
  };
}

export function buildFreestyleReward(question: Question, answer: AnswerRecord, streak: number): RewardEvent {
  const xp = answerXp(answer, question, streak);
  if (answer.correct) {
    const milestone = streak >= 10 ? "10-streak" : streak >= 5 ? "5-streak" : streak >= 3 ? "3-streak" : "";
    return {
      id: `${answer.questionId}-${Date.now()}`,
      title: milestone ? `${streak} streak` : "Correct",
      detail: `+${xp} XP`,
      xp,
      tone: streak >= 5 ? "amber" : "green",
      confetti: streak >= 3 ? "burst" : "small"
    };
  }
  return {
    id: `${answer.questionId}-${Date.now()}`,
    title: "XP penalty",
    detail: `${xp} XP`,
    xp,
    tone: "red",
    confetti: "none"
  };
}

export function buildSessionRewardSummary(
  result: SessionResult,
  questions: Question[],
  previousProgress: ProgressState,
  nextProgress: ProgressState
): SessionRewardSummary {
  const byId = questionMap(questions);
  const previousLedger = progressLedger(previousProgress, questions);
  const sessionXp = resultXp(result, byId, previousLedger.streak);
  const previousLevel = levelForXp(progressXp(previousProgress, questions));
  const nextLevel = levelForXp(progressXp(nextProgress, questions));
  const accuracy = result.totalMc ? Math.round((result.score / result.totalMc) * 100) : 0;
  const milestones: RewardMilestone[] = [];
  if (accuracy >= 80) milestones.push({ id: "session-80", label: "Clean run", value: `${accuracy}%`, tone: "green" });
  if (result.score >= 10) milestones.push({ id: "session-volume", label: "Volume", value: `${result.score} correct`, tone: "blue" });
  if (nextLevel > previousLevel) milestones.push({ id: "level-up", label: "Level up", value: `Level ${nextLevel}`, tone: "amber" });

  return {
    sessionXp,
    accuracy,
    previousLevel,
    nextLevel,
    previousTitle: titleForLevel(previousLevel),
    nextTitle: titleForLevel(nextLevel),
    leveledUp: nextLevel > previousLevel,
    milestones,
    confetti: sessionXp <= 0 ? "none" : nextLevel > previousLevel || accuracy >= 80 ? "burst" : "small"
  };
}
