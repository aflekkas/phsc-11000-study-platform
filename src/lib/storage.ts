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

export interface ProgressState {
  sessions: SessionResult[];
  freestyle: SessionResult[];
  flagged: Record<string, boolean>;
  phraseBank: PhraseBankItem[];
}

const key = "phsc-11000-study-progress-v1";

function emptyProgress(): ProgressState {
  return { sessions: [], freestyle: [], flagged: {}, phraseBank: [] };
}

function normalizedPhraseText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
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
              questionId: typeof source.questionId === "string" ? source.questionId : undefined,
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
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "");
    return {
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      freestyle: Array.isArray(parsed.freestyle) ? parsed.freestyle : [],
      flagged: parsed.flagged && typeof parsed.flagged === "object" ? parsed.flagged : {},
      phraseBank: loadPhraseBank(parsed.phraseBank)
    };
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(progress: ProgressState) {
  localStorage.setItem(key, JSON.stringify(progress));
}

export function weakTags(progress: ProgressState, questions: Question[]) {
  const byId = new Map(questions.map((question) => [question.id, question]));
  const misses = new Map<string, number>();
  const seen = new Map<string, number>();
  for (const session of [...progress.sessions, ...progress.freestyle]) {
    for (const answer of session.answers) {
      const question = byId.get(answer.questionId);
      if (!question) continue;
      for (const tag of [question.lecture ?? question.cluster, ...question.tags]) {
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
