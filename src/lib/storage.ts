import type { Question } from "./questionBank";

export interface AnswerRecord {
  questionId: string;
  selectedChoiceId?: string;
  textAnswer?: string;
  flagged: boolean;
  correct?: boolean;
}

export interface SessionResult {
  id: string;
  preset: string;
  startedAt: string;
  finishedAt: string;
  questionIds: string[];
  answers: AnswerRecord[];
  score: number;
  totalMc: number;
}

export interface ProgressStateCore {
  sessions: SessionResult[];
  freestyle: SessionResult[];
  flagged: Record<string, boolean>;
  phraseBank: PhraseBankItem[];
}

export type PhraseSourceType = "question" | "review" | "manual";

export interface PhraseSource {
  id: string;
  type: PhraseSourceType;
  label: string;
  capturedAt: string;
  view?: string;
  questionId?: string;
  questionPrompt?: string;
  lecture?: string;
  lectureTitle?: string;
  cluster?: string;
  sourcePath?: string;
}

export interface PhraseBankItem {
  id: string;
  text: string;
  normalizedText: string;
  createdAt: string;
  updatedAt: string;
  starred: boolean;
  note?: string;
  sources: PhraseSource[];
  captureCount: number;
}

export interface SavedFreestyleFeedback {
  questionId: string;
  correct: boolean;
  correctText: string;
  xp: number;
  streak: number;
  masteryLabel: string;
  reinforcementLine: string;
}

export interface SavedFreestyleQuestion {
  id: string;
  choiceOrder: string[];
}

export interface SavedFreestyleRun {
  id: string;
  startedAt: string;
  questions: SavedFreestyleQuestion[];
  answers: Record<string, AnswerRecord>;
  index: number;
  timeLeft: 0;
  feedback?: SavedFreestyleFeedback;
  freestyleLog: AnswerRecord[];
  freestyleBaseProgress: ProgressStateCore;
}

export interface ProgressState extends ProgressStateCore {
  activeFreestyle?: SavedFreestyleRun;
}

const STORAGE_KEY = "phsc-11000-study-progress-v1";
const PROGRESS_BACKUP_APP = "phsc-11000-study-platform";
const PROGRESS_BACKUP_VERSION = 1;
const QUESTION_ID_MIGRATIONS: Record<string, string> = {
  "l13-feedback": "l13b-feedback",
  "l13-carbon-reservoir": "l13b-carbon-reservoir"
};

export interface ProgressBackup {
  app: typeof PROGRESS_BACKUP_APP;
  schemaVersion: typeof PROGRESS_BACKUP_VERSION;
  exportedAt: string;
  progress: ProgressState;
}

function emptyProgress(): ProgressState {
  return { sessions: [], freestyle: [], flagged: {}, phraseBank: [] };
}

export function progressCore(progress: ProgressState): ProgressStateCore {
  return {
    sessions: progress.sessions,
    freestyle: progress.freestyle,
    flagged: progress.flagged,
    phraseBank: progress.phraseBank
  };
}

function normalizedPhraseText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function currentQuestionId(questionId: string) {
  return QUESTION_ID_MIGRATIONS[questionId] ?? questionId;
}

function currentQuestionScopedId(id: string) {
  for (const [legacyQuestionId, currentId] of Object.entries(QUESTION_ID_MIGRATIONS)) {
    if (id === legacyQuestionId) return currentId;
    if (id.startsWith(`${legacyQuestionId}-`)) return `${currentId}${id.slice(legacyQuestionId.length)}`;
  }
  return id;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function readStoredProgress() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function loadFlagged(value: unknown): Record<string, boolean> {
  if (!isRecord(value)) return {};
  const flaggedQuestions: Record<string, boolean> = {};
  for (const [questionId, flagged] of Object.entries(value)) {
    if (typeof flagged === "boolean") flaggedQuestions[currentQuestionId(questionId)] = flagged;
  }
  return flaggedQuestions;
}

function loadAnswerRecords(value: unknown): AnswerRecord[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((answer): answer is Record<string, unknown> & { questionId: string } =>
      isRecord(answer) && typeof answer.questionId === "string"
    )
    .map((answer) => ({
      questionId: currentQuestionId(answer.questionId),
      selectedChoiceId: typeof answer.selectedChoiceId === "string"
        ? currentQuestionScopedId(answer.selectedChoiceId)
        : undefined,
      textAnswer: typeof answer.textAnswer === "string" ? answer.textAnswer : undefined,
      flagged: Boolean(answer.flagged),
      correct: typeof answer.correct === "boolean" ? answer.correct : undefined
    }));
}

function loadSessionResults(value: unknown): SessionResult[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((session): session is Record<string, unknown> & { id: string } =>
      isRecord(session) && typeof session.id === "string"
    )
    .map((session) => {
      const answers = loadAnswerRecords(session.answers);
      const questionIds = Array.isArray(session.questionIds)
        ? session.questionIds
            .filter((questionId): questionId is string => typeof questionId === "string")
            .map(currentQuestionId)
        : answers.map((answer) => answer.questionId);
      const totalMc = typeof session.totalMc === "number" && Number.isFinite(session.totalMc)
        ? session.totalMc
        : answers.filter((answer) => answer.correct !== undefined).length;
      const score = typeof session.score === "number" && Number.isFinite(session.score)
        ? session.score
        : answers.filter((answer) => answer.correct === true).length;
      const now = new Date().toISOString();

      return {
        id: session.id,
        preset: typeof session.preset === "string" ? session.preset : "Study session",
        startedAt: typeof session.startedAt === "string" ? session.startedAt : now,
        finishedAt: typeof session.finishedAt === "string" ? session.finishedAt : now,
        questionIds,
        answers,
        score,
        totalMc
      };
    });
}

function loadAnswersById(value: unknown): Record<string, AnswerRecord> {
  if (!isRecord(value)) return {};
  const answers: Record<string, AnswerRecord> = {};
  for (const answer of loadAnswerRecords(Object.values(value))) {
    answers[answer.questionId] = answer;
  }
  return answers;
}

function loadSavedFreestyleFeedback(value: unknown): SavedFreestyleFeedback | undefined {
  if (!isRecord(value) || typeof value.questionId !== "string") return undefined;
  return {
    questionId: currentQuestionId(value.questionId),
    correct: Boolean(value.correct),
    correctText: typeof value.correctText === "string" ? value.correctText : "",
    xp: typeof value.xp === "number" && Number.isFinite(value.xp) ? value.xp : 0,
    streak: typeof value.streak === "number" && Number.isFinite(value.streak) ? value.streak : 0,
    masteryLabel: typeof value.masteryLabel === "string" ? value.masteryLabel : "New",
    reinforcementLine: typeof value.reinforcementLine === "string" ? value.reinforcementLine : ""
  };
}

function loadSavedFreestyleQuestions(value: unknown): SavedFreestyleQuestion[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((question): question is Record<string, unknown> & { id: string } =>
      isRecord(question) && typeof question.id === "string"
    )
    .map((question) => ({
      id: currentQuestionId(question.id),
      choiceOrder: Array.isArray(question.choiceOrder)
        ? question.choiceOrder
            .filter((choiceId): choiceId is string => typeof choiceId === "string")
            .map(currentQuestionScopedId)
        : []
    }));
}

function normalizeProgressCore(value: unknown): ProgressStateCore {
  if (!isRecord(value)) return emptyProgress();
  return {
    sessions: loadSessionResults(value.sessions),
    freestyle: loadSessionResults(value.freestyle),
    flagged: loadFlagged(value.flagged),
    phraseBank: loadPhraseBank(value.phraseBank)
  };
}

function loadSavedFreestyleRun(value: unknown): SavedFreestyleRun | undefined {
  if (!isRecord(value) || typeof value.id !== "string") return undefined;
  const questions = loadSavedFreestyleQuestions(value.questions);
  if (questions.length === 0) return undefined;

  return {
    id: value.id,
    startedAt: typeof value.startedAt === "string" ? value.startedAt : new Date().toISOString(),
    questions,
    answers: loadAnswersById(value.answers),
    index: typeof value.index === "number" && Number.isFinite(value.index)
      ? Math.min(Math.max(0, Math.floor(value.index)), questions.length - 1)
      : 0,
    timeLeft: 0,
    feedback: loadSavedFreestyleFeedback(value.feedback),
    freestyleLog: loadAnswerRecords(value.freestyleLog),
    freestyleBaseProgress: normalizeProgressCore(value.freestyleBaseProgress)
  };
}

function normalizeProgress(value: unknown): ProgressState {
  const core = normalizeProgressCore(value);
  return {
    ...core,
    activeFreestyle: isRecord(value) ? loadSavedFreestyleRun(value.activeFreestyle) : undefined
  };
}

function looksLikeProgress(value: unknown) {
  return (
    isRecord(value) &&
    ("sessions" in value || "freestyle" in value || "flagged" in value || "phraseBank" in value)
  );
}

function loadPhraseSourceType(value: unknown): PhraseSourceType {
  if (value === "review" || value === "manual") return value;
  return "question";
}

function loadPhraseBank(value: unknown): PhraseBankItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> & { text: string } => isRecord(item) && typeof item.text === "string")
    .map((item) => {
      const now = new Date().toISOString();
      const sources = Array.isArray(item.sources)
        ? item.sources
            .filter((source): source is Record<string, unknown> & { label: string } => isRecord(source) && typeof source.label === "string")
            .map((source) => ({
              id: typeof source.id === "string" ? source.id : crypto.randomUUID(),
              type: loadPhraseSourceType(source.type),
              label: source.label,
              capturedAt: typeof source.capturedAt === "string" ? source.capturedAt : now,
              view: typeof source.view === "string" ? source.view : undefined,
              questionId: typeof source.questionId === "string" ? currentQuestionId(source.questionId) : undefined,
              questionPrompt: typeof source.questionPrompt === "string" ? source.questionPrompt : undefined,
              lecture: typeof source.lecture === "string" ? source.lecture : undefined,
              lectureTitle: typeof source.lectureTitle === "string" ? source.lectureTitle : undefined,
              cluster: typeof source.cluster === "string" ? source.cluster : undefined,
              sourcePath: typeof source.sourcePath === "string" ? source.sourcePath : undefined
            }))
        : [];
      return {
        id: typeof item.id === "string" ? item.id : crypto.randomUUID(),
        text: item.text,
        normalizedText: typeof item.normalizedText === "string" ? item.normalizedText : normalizedPhraseText(item.text),
        createdAt: typeof item.createdAt === "string" ? item.createdAt : now,
        updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : now,
        starred: Boolean(item.starred),
        note: typeof item.note === "string" ? item.note : "",
        sources,
        captureCount: typeof item.captureCount === "number" ? item.captureCount : Math.max(1, sources.length)
      };
    });
}

export function loadProgress(): ProgressState {
  const rawProgress = readStoredProgress();
  if (!rawProgress) return emptyProgress();

  try {
    return normalizeProgress(JSON.parse(rawProgress));
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(progress: ProgressState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Progress is nice-to-have local state; the in-memory React state still works when storage is blocked.
  }
}

export function buildProgressBackup(progress: ProgressState): ProgressBackup {
  return {
    app: PROGRESS_BACKUP_APP,
    schemaVersion: PROGRESS_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    progress
  };
}

export function progressBackupFileName(now = new Date()) {
  return `phsc-11000-progress-${now.toISOString().slice(0, 10)}.json`;
}

export function parseProgressBackupJson(rawJson: string): ProgressState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error("Choose a valid JSON progress file.");
  }

  if (isRecord(parsed) && parsed.app === PROGRESS_BACKUP_APP && looksLikeProgress(parsed.progress)) {
    return normalizeProgress(parsed.progress);
  }

  if (looksLikeProgress(parsed)) return normalizeProgress(parsed);

  throw new Error("Choose a PHSC progress export or compatible progress JSON file.");
}

export function weakTags(progress: ProgressState, questions: Question[]) {
  const byId = new Map(questions.map((question) => [question.id, question]));
  const misses = new Map<string, number>();
  const seen = new Map<string, number>();
  for (const session of [...progress.sessions, ...progress.freestyle]) {
    for (const answer of session.answers) {
      const question = byId.get(answer.questionId);
      if (!question) continue;
      const answerTags = new Set([question.lecture ?? question.cluster, ...question.tags].filter(Boolean));
      for (const tag of answerTags) {
        seen.set(tag, (seen.get(tag) ?? 0) + 1);
        if (answer.correct === false || answer.flagged === true) {
          misses.set(tag, (misses.get(tag) ?? 0) + 1);
        }
      }
    }
  }
  return Array.from(misses.entries())
    .map(([tag, missed]) => ({ tag, missed, seen: seen.get(tag) ?? missed }))
    .sort((a, b) => b.missed / b.seen - a.missed / a.seen || b.missed - a.missed)
    .slice(0, 8);
}
