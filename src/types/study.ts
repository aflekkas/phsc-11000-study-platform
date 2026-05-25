import type { MultipleChoiceQuestion, Question } from "../lib/questionBank";
import type { AnswerRecord, ProgressState, SessionResult } from "../lib/storage";

export type View = "dashboard" | "exam" | "review";
export type Preset = "Quick Drill" | "Mock Exam" | "Weak Retake" | "Freestyle";
export type TimedPreset = Exclude<Preset, "Freestyle">;

export interface FreestyleFeedback {
  questionId: string;
  correct: boolean;
  correctText: string;
  xp: number;
  streak: number;
  masteryLabel: string;
  reinforcementLine: string;
}

export interface SessionRunStats {
  answered: number;
  correct: number;
  missed: number;
  accuracy: number;
  streak: number;
  xp: number;
  leftInCycle: number;
  mastered: number;
  recovering: number;
  fresh: number;
}

export interface SessionState {
  id: string;
  preset: Preset;
  startedAt: string;
  questions: Question[];
  answers: Record<string, AnswerRecord>;
  index: number;
  timeLeft: number;
  feedback?: FreestyleFeedback;
  freestyleLog?: AnswerRecord[];
  freestyleBaseProgress?: ProgressState;
  submitted?: SessionResult;
}

export type FreestyleAnswerHandler = (question: MultipleChoiceQuestion, choiceId: string) => void;
