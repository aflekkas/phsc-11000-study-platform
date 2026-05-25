import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, FormEvent, MouseEvent, ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookmarkPlus,
  CheckCircle2,
  Clock3,
  Flame,
  FileQuestion,
  Flag,
  Home,
  Minimize2,
  Music,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search,
  Send,
  SkipBack,
  SkipForward,
  Shuffle,
  Sparkles,
  Star,
  StickyNote,
  Target,
  Timer,
  Trash2,
  Volume2,
  VolumeX,
  Zap,
  XCircle
} from "lucide-react";
import {
  answersXp,
  buildFreestyleReward,
  buildSessionRewardSummary,
  buildStudyGameStats,
  currentStreak,
  type RewardEvent,
  type SessionRewardSummary,
  type StudyGameStats
} from "./lib/gamification";
import {
  buildAdaptiveFreestyleStats,
  masteryForQuestion,
  reinforcementLine,
  selectNextFreestyleQuestion
} from "./lib/freestyleEngine";
import { multipleChoiceQuestions, questionBank, validateQuestionBank, type MultipleChoiceQuestion, type Question } from "./lib/questionBank";
import {
  getSoundEffectsState,
  playRewardSound,
  playUiSound,
  subscribeSoundEffects,
  toggleSoundEffects,
  type SoundEffectsState
} from "./lib/sound";
import {
  getStudyMusicState,
  seekStudyMusic,
  skipStudyTrack,
  subscribeStudyMusic,
  toggleStudyMusic,
  type StudyMusicState
} from "./lib/studyMusic";
import {
  loadProgress,
  saveProgress,
  weakTags,
  type AnswerRecord,
  type PhraseBankItem,
  type PhraseSource,
  type ProgressState,
  type SessionResult
} from "./lib/storage";

type View = "dashboard" | "exam" | "review";
type Preset = "Quick Drill" | "Mock Exam" | "Weak Retake" | "Freestyle";
type TimedPreset = Exclude<Preset, "Freestyle">;

interface FreestyleFeedback {
  questionId: string;
  correct: boolean;
  correctText: string;
  xp: number;
  streak: number;
  masteryLabel: string;
  reinforcementLine: string;
}

interface SessionRunStats {
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

interface SessionState {
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

interface TapBurst {
  id: string;
  x: number;
  y: number;
  tone: "primary" | "choice" | "music" | "flag" | "default";
}

type CaptureSource = Omit<PhraseSource, "id" | "capturedAt">;

interface PhraseSelection {
  text: string;
  x: number;
  y: number;
  source: CaptureSource;
}

const presetConfig: Record<TimedPreset, { count: number; minutes: number; longAnswers: number }> = {
  "Quick Drill": { count: 15, minutes: 15, longAnswers: 0 },
  "Mock Exam": { count: 40, minutes: 60, longAnswers: 3 },
  "Weak Retake": { count: 20, minutes: 25, longAnswers: 0 }
};

const MAX_PHRASE_LENGTH = 80;

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function shuffledMultipleChoice(pool: MultipleChoiceQuestion[] = multipleChoiceQuestions) {
  return shuffle(pool).map((question) => ({
    ...question,
    choices: shuffle(question.choices)
  }));
}

function withShuffledChoices(question: MultipleChoiceQuestion) {
  return {
    ...question,
    choices: shuffle(question.choices)
  };
}

function formatSignedXp(value: number) {
  if (value > 0) return `+${value}`;
  return `${value}`;
}

function cleanPhraseText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizedPhraseKey(value: string) {
  return cleanPhraseText(value).toLowerCase();
}

function canSavePhrase(value: string) {
  const cleaned = cleanPhraseText(value);
  return cleaned.length > 0 && cleaned.length <= MAX_PHRASE_LENGTH;
}

function sourceSignature(source: Pick<PhraseSource, "type" | "label" | "questionId" | "sourcePath">) {
  return [source.type, source.questionId, source.sourcePath, source.label].filter(Boolean).join("|");
}

function captureSourceFromElement(element: HTMLElement): CaptureSource {
  const type = element.dataset.captureType === "review" ? "review" : "question";
  return {
    type,
    label: element.dataset.captureLabel || (type === "review" ? "Review" : "Practice"),
    view: element.dataset.captureView,
    questionId: element.dataset.questionId,
    questionPrompt: element.dataset.questionPrompt,
    lecture: element.dataset.lecture,
    lectureTitle: element.dataset.lectureTitle,
    cluster: element.dataset.cluster,
    sourcePath: element.dataset.sourcePath
  };
}

function learningProgressFor(session: SessionState, progress: ProgressState): ProgressState {
  if (!session.freestyleBaseProgress) return progress;
  return { ...session.freestyleBaseProgress, flagged: progress.flagged };
}

function buildSessionRunStats(session: SessionState, progress: ProgressState): SessionRunStats {
  const answers = (session.freestyleLog ?? Object.values(session.answers)).filter((answer) => answer.correct !== undefined);
  const answered = answers.length;
  const correct = answers.filter((answer) => answer.correct === true).length;
  const missed = answers.filter((answer) => answer.correct === false).length;
  const byId = new Map(questionBank.map((question) => [question.id, question]));
  const adaptive = buildAdaptiveFreestyleStats(learningProgressFor(session, progress), multipleChoiceQuestions, answers);
  return {
    answered,
    correct,
    missed,
    streak: currentStreak(answers),
    xp: answersXp(answers, byId),
    accuracy: answered ? Math.round((correct / answered) * 100) : 0,
    leftInCycle: Math.max(session.questions.length - session.index - 1, 0),
    mastered: adaptive.mastered,
    recovering: adaptive.recovering,
    fresh: adaptive.fresh
  };
}

function App() {
  const [progress, setProgress] = useState<ProgressState>(() => loadProgress());
  const [view, setView] = useState<View>("dashboard");
  const [session, setSession] = useState<SessionState | null>(null);
  const [rewardEvent, setRewardEvent] = useState<RewardEvent | null>(null);
  const [reviewReward, setReviewReward] = useState<SessionRewardSummary | null>(null);
  const [musicState, setMusicState] = useState<StudyMusicState>(() => getStudyMusicState());
  const [soundEffectsState, setSoundEffectsState] = useState<SoundEffectsState>(() => getSoundEffectsState());
  const [musicMinimized, setMusicMinimized] = useState(false);
  const [phraseSelection, setPhraseSelection] = useState<PhraseSelection | null>(null);
  const lastQuestionSoundId = useRef<string | null>(null);
  const lastSelectionPointer = useRef<{ x: number; y: number } | null>(null);
  const bankErrors = useMemo(() => validateQuestionBank(), []);
  const weak = useMemo(() => weakTags(progress, questionBank), [progress]);
  const game = useMemo(() => buildStudyGameStats(progress, questionBank, multipleChoiceQuestions.length), [progress]);
  const activeQuestionId = view === "exam" && session ? session.questions[session.index]?.id : undefined;

  const addPhraseToBank = (rawText: string, source: CaptureSource) => {
    const text = cleanPhraseText(rawText);
    if (!canSavePhrase(text)) return;

    const normalizedText = normalizedPhraseKey(text);
    const now = new Date().toISOString();
    const phraseSource: PhraseSource = {
      ...source,
      id: crypto.randomUUID(),
      capturedAt: now
    };
    const nextSourceSignature = sourceSignature(phraseSource);

    setProgress((current) => {
      const existing = current.phraseBank.find((item) => item.normalizedText === normalizedText);
      const phraseBank = existing
        ? current.phraseBank.map((item) => {
            if (item.id !== existing.id) return item;
            const hasSource = item.sources.some((itemSource) => sourceSignature(itemSource) === nextSourceSignature);
            return {
              ...item,
              updatedAt: now,
              captureCount: item.captureCount + 1,
              sources: hasSource ? item.sources : [...item.sources, phraseSource]
            };
          })
        : [
            {
              id: crypto.randomUUID(),
              text,
              normalizedText,
              createdAt: now,
              updatedAt: now,
              starred: false,
              note: "",
              sources: [phraseSource],
              captureCount: 1
            },
            ...current.phraseBank
          ];
      const nextProgress = { ...current, phraseBank };
      saveProgress(nextProgress);
      return nextProgress;
    });

    playUiSound("flag");
    setPhraseSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  const addManualPhrase = (text: string, label = "Manual add", sourceView = view) => {
    addPhraseToBank(text, { type: "manual", label, view: sourceView });
  };

  const deletePhrase = (phraseId: string) => {
    setProgress((current) => {
      const nextProgress = {
        ...current,
        phraseBank: current.phraseBank.filter((item) => item.id !== phraseId)
      };
      saveProgress(nextProgress);
      return nextProgress;
    });
    playUiSound("back");
  };

  const togglePhraseStar = (phraseId: string) => {
    setProgress((current) => {
      const now = new Date().toISOString();
      const nextProgress = {
        ...current,
        phraseBank: current.phraseBank.map((item) =>
          item.id === phraseId ? { ...item, starred: !item.starred, updatedAt: now } : item
        )
      };
      saveProgress(nextProgress);
      return nextProgress;
    });
    playUiSound("select");
  };

  const updatePhraseNote = (phraseId: string, note: string) => {
    setProgress((current) => {
      const nextProgress = {
        ...current,
        phraseBank: current.phraseBank.map((item) =>
          item.id === phraseId ? { ...item, note, updatedAt: new Date().toISOString() } : item
        )
      };
      saveProgress(nextProgress);
      return nextProgress;
    });
  };

  const toggleStudyMusicPlayback = () => {
    setMusicMinimized(false);
    setMusicState(toggleStudyMusic());
  };

  const changeStudyTrack = (direction: 1 | -1) => {
    playUiSound("nav");
    setMusicState(skipStudyTrack(direction));
  };

  const seekStudyMusicPlayback = (ratio: number) => {
    setMusicState(seekStudyMusic(ratio));
  };

  const toggleSoundEffectsPlayback = () => {
    const nextState = toggleSoundEffects();
    setSoundEffectsState(nextState);
    if (nextState.enabled) playUiSound("select");
  };

  const startSession = (preset: Preset) => {
    playUiSound("start");
    setReviewReward(null);
    if (preset === "Freestyle") {
      const firstQuestion = selectNextFreestyleQuestion({
        progress,
        questions: multipleChoiceQuestions,
        runLog: [],
        recentQuestionIds: []
      });
      setSession({
        id: crypto.randomUUID(),
        preset,
        startedAt: new Date().toISOString(),
        questions: [withShuffledChoices(firstQuestion)],
        answers: {},
        freestyleLog: [],
        freestyleBaseProgress: progress,
        index: 0,
        timeLeft: 0
      });
      setView("exam");
      return;
    }

    const config = presetConfig[preset];
    let pool: MultipleChoiceQuestion[] = multipleChoiceQuestions;
    if (preset === "Weak Retake" && weak.length > 0) {
      const weakSet = new Set(weak.map((item) => item.tag));
      pool = multipleChoiceQuestions.filter((question) =>
        [question.lecture, question.cluster, ...question.tags].some((tag) => tag && weakSet.has(tag))
      );
    }
    const mc = shuffledMultipleChoice(pool).slice(0, config.count);
    const long = shuffle(questionBank.filter((q) => q.kind === "long-answer")).slice(0, config.longAnswers);
    setSession({
      id: crypto.randomUUID(),
      preset,
      startedAt: new Date().toISOString(),
      questions: [...mc, ...long],
      answers: {},
      index: 0,
      timeLeft: config.minutes * 60
    });
    setView("exam");
  };

  const submitSession = () => {
    if (!session || session.submitted) return;
    const answers = session.questions.map((question) => {
      const existing = session.answers[question.id] ?? {
        questionId: question.id,
        flagged: Boolean(progress.flagged[question.id])
      };
      const correct =
        question.kind === "multiple-choice" ? existing.selectedChoiceId === question.correctChoiceId : undefined;
      return { ...existing, correct };
    });
    const totalMc = answers.filter((answer) => answer.correct !== undefined).length;
    const score = answers.filter((answer) => answer.correct === true).length;
    const result: SessionResult = {
      id: session.id,
      preset: session.preset,
      startedAt: session.startedAt,
      finishedAt: new Date().toISOString(),
      questionIds: session.questions.map((question) => question.id),
      answers,
      score,
      totalMc
    };
    const nextProgress = { ...progress, sessions: [result, ...progress.sessions].slice(0, 80) };
    const rewardSummary = buildSessionRewardSummary(result, questionBank, progress, nextProgress);
    setProgress(nextProgress);
    saveProgress(nextProgress);
    setSession({ ...session, submitted: result });
    setReviewReward(rewardSummary);
    setRewardEvent({
      id: `${result.id}-review`,
      title: rewardSummary.leveledUp ? `Level ${rewardSummary.nextLevel}` : "Run complete",
      detail: `${formatSignedXp(rewardSummary.sessionXp)} XP`,
      xp: rewardSummary.sessionXp,
      tone: rewardSummary.sessionXp < 0 ? "red" : rewardSummary.leveledUp ? "amber" : "green",
      confetti: rewardSummary.confetti
    });
    playRewardSound({
      id: `${result.id}-review-sound`,
      title: rewardSummary.leveledUp ? `Level ${rewardSummary.nextLevel}` : "Run complete",
      detail: `${formatSignedXp(rewardSummary.sessionXp)} XP`,
      xp: rewardSummary.sessionXp,
      tone: rewardSummary.sessionXp < 0 ? "red" : rewardSummary.leveledUp ? "amber" : "green",
      confetti: rewardSummary.confetti
    });
    setView("review");
  };

  useEffect(() => {
    if (view !== "exam" || !session || session.preset === "Freestyle") return;
    const timer = window.setInterval(() => {
      setSession((current) => {
        if (!current || current.submitted) return current;
        if (current.timeLeft <= 1) {
          window.clearInterval(timer);
          return { ...current, timeLeft: 0 };
        }
        return { ...current, timeLeft: current.timeLeft - 1 };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [view, session?.id]);

  useEffect(
    () =>
      subscribeStudyMusic((state) => {
        setMusicState(state);
        if (state.playing) setMusicMinimized(false);
      }),
    []
  );

  useEffect(() => subscribeSoundEffects(setSoundEffectsState), []);

  useEffect(() => {
    let lastInteractive: Element | null = null;
    let lastPlayedAt = 0;

    const canPlayHover = (interactive: Element) => {
      if (interactive instanceof HTMLButtonElement && interactive.disabled) return false;
      if (interactive.getAttribute("aria-disabled") === "true") return false;
      return true;
    };

    const handlePointerOver = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !getSoundEffectsState().enabled) return;
      const target = event.target instanceof Element ? event.target : null;
      const interactive = target?.closest("button, a[href], [role='button']");
      if (!interactive || interactive === lastInteractive || !canPlayHover(interactive)) return;

      const now = performance.now();
      if (now - lastPlayedAt < 80) return;
      lastInteractive = interactive;
      lastPlayedAt = now;
      playUiSound("hover");
    };

    const handlePointerOut = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("button, a[href], [role='button']") === lastInteractive) {
        lastInteractive = null;
      }
    };

    window.addEventListener("pointerover", handlePointerOver, { passive: true });
    window.addEventListener("pointerout", handlePointerOut, { passive: true });
    return () => {
      window.removeEventListener("pointerover", handlePointerOver);
      window.removeEventListener("pointerout", handlePointerOut);
    };
  }, []);

  useEffect(() => {
    let frame = 0;

    const readSelection = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
          setPhraseSelection(null);
          return;
        }

        const text = cleanPhraseText(selection.toString());
        if (!canSavePhrase(text)) {
          setPhraseSelection(null);
          return;
        }

        const range = selection.getRangeAt(0);
        const common = range.commonAncestorContainer;
        const element = common.nodeType === Node.ELEMENT_NODE ? common as Element : common.parentElement;
        if (!element || element.closest("input, select, textarea, [contenteditable='true']")) {
          setPhraseSelection(null);
          return;
        }

        const captureRoot = element.closest("[data-phrase-capture='true']");
        if (!(captureRoot instanceof HTMLElement)) {
          setPhraseSelection(null);
          return;
        }

        const rect = range.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
          setPhraseSelection(null);
          return;
        }

        const pointer = lastSelectionPointer.current;
        const anchorY = Math.min(pointer?.y ?? rect.top, rect.top);
        setPhraseSelection({
          text,
          x: Math.min(Math.max(pointer?.x ?? rect.left + rect.width / 2, 92), window.innerWidth - 92),
          y: Math.max(anchorY - 14, 18),
          source: captureSourceFromElement(captureRoot)
        });
      });
    };

    const hideSelection = () => setPhraseSelection(null);
    const handlePointerUp = (event: PointerEvent) => {
      lastSelectionPointer.current = { x: event.clientX, y: event.clientY };
      readSelection();
    };
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(".phrase-capture-popover")) return;
      if (!target?.closest("[data-phrase-capture='true']")) hideSelection();
    };

    document.addEventListener("selectionchange", readSelection);
    window.addEventListener("keyup", readSelection);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("scroll", hideSelection, true);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("selectionchange", readSelection);
      window.removeEventListener("keyup", readSelection);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("scroll", hideSelection, true);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    if (view !== "exam" || !activeQuestionId) {
      lastQuestionSoundId.current = null;
      return;
    }
    const firstQuestionInSession = lastQuestionSoundId.current === null;
    const questionChanged = lastQuestionSoundId.current !== activeQuestionId;
    lastQuestionSoundId.current = activeQuestionId;
    if (!firstQuestionInSession && questionChanged) playUiSound("question");
  }, [activeQuestionId, view]);

  useEffect(() => {
    if (view === "exam" && session?.preset !== "Freestyle" && session?.timeLeft === 0 && !session.submitted) submitSession();
  }, [session?.timeLeft, view]);

  const updateAnswer = (questionId: string, patch: Partial<AnswerRecord>) => {
    if ("selectedChoiceId" in patch) playUiSound("select");
    if ("flagged" in patch) playUiSound("flag");
    setSession((current) => {
      if (!current) return current;
      const existing = current.answers[questionId] ?? {
        questionId,
        flagged: Boolean(progress.flagged[questionId])
      };
      return {
        ...current,
        answers: { ...current.answers, [questionId]: { ...existing, ...patch } }
      };
    });
    if ("flagged" in patch) {
      const nextProgress = {
        ...progress,
        flagged: { ...progress.flagged, [questionId]: Boolean(patch.flagged) }
      };
      setProgress(nextProgress);
      saveProgress(nextProgress);
    }
  };

  const nextFreestyleQuestion = () => {
    if (!session?.feedback) playUiSound("skip");
    setSession((current) => {
      if (!current || current.preset !== "Freestyle") return current;
      const runLog = current.freestyleLog ?? [];
      const nextQuestion = selectNextFreestyleQuestion({
        progress: learningProgressFor(current, progress),
        questions: multipleChoiceQuestions,
        runLog,
        recentQuestionIds: current.questions.slice(-6).map((question) => question.id)
      });
      return {
        ...current,
        questions: [...current.questions, withShuffledChoices(nextQuestion)],
        answers: {},
        index: current.questions.length,
        feedback: undefined
      };
    });
  };

  const answerFreestyle = (question: MultipleChoiceQuestion, choiceId: string) => {
    if (!session || session.preset !== "Freestyle" || session.feedback?.questionId === question.id) return;
    const selectedChoice = question.choices.find((choice) => choice.id === choiceId);
    const correctChoice = question.choices.find((choice) => choice.id === question.correctChoiceId);
    if (!selectedChoice || !correctChoice) return;

    const correct = choiceId === question.correctChoiceId;
    const answer: AnswerRecord = {
      questionId: question.id,
      selectedChoiceId: choiceId,
      flagged: session.answers[question.id]?.flagged ?? Boolean(progress.flagged[question.id]),
      correct
    };
    const nextLog = [...(session.freestyleLog ?? []), answer];
    const streak = currentStreak(nextLog);
    const reward = buildFreestyleReward(question, answer, streak);
    const mastery = masteryForQuestion(
      learningProgressFor(session, progress),
      multipleChoiceQuestions,
      nextLog,
      question.id
    );
    playRewardSound(reward);
    const result: SessionResult = {
      id: crypto.randomUUID(),
      preset: "Freestyle",
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      questionIds: [question.id],
      answers: [answer],
      score: correct ? 1 : 0,
      totalMc: 1
    };

    setProgress((current) => {
      const nextProgress = {
        ...current,
        freestyle: [result, ...current.freestyle].slice(0, 500)
      };
      saveProgress(nextProgress);
      return nextProgress;
    });
    setSession((current) => {
      if (!current || current.id !== session.id) return current;
      return {
        ...current,
        answers: { ...current.answers, [question.id]: answer },
        freestyleLog: [...(current.freestyleLog ?? []), answer],
        feedback: {
          questionId: question.id,
          correct,
          correctText: correctChoice.text,
          xp: reward.xp,
          streak,
          masteryLabel: mastery?.label ?? "New",
          reinforcementLine: reinforcementLine(correct, mastery)
        }
      };
    });
    setRewardEvent(reward);
  };

  return (
    <main className="app-shell">
      {view === "dashboard" && (
        <Dashboard
          progress={progress}
          game={game}
          weak={weak}
          bankErrors={bankErrors}
          onAddPhrase={addManualPhrase}
          onDeletePhrase={deletePhrase}
          onStart={startSession}
          onTogglePhraseStar={togglePhraseStar}
          onUpdatePhraseNote={updatePhraseNote}
        />
      )}
      {view === "exam" && session && (
        <Exam
          session={session}
          progress={progress}
          onAnswer={updateAnswer}
          onAddPhrase={(text) => addManualPhrase(text, `Manual during ${session.preset}`, "exam")}
          onFreestyleAnswer={answerFreestyle}
          onMove={(index) => {
            setSession({ ...session, index });
          }}
          onSkip={nextFreestyleQuestion}
          onBack={() => {
            playUiSound("back");
            setSession(null);
            setView("dashboard");
          }}
          onSubmit={submitSession}
        />
      )}
      {view === "review" && session?.submitted && (
        <Review
          session={session}
          reward={reviewReward}
          onAddPhrase={(text) => addManualPhrase(text, "Manual during review", "review")}
          onBack={() => {
            playUiSound("back");
            setView("dashboard");
          }}
          onRetryWeak={() => startSession("Weak Retake")}
        />
      )}
      <RewardLayer event={rewardEvent} onDone={() => setRewardEvent(null)} />
      <PhraseCapturePopover
        selection={phraseSelection}
        onAdd={() => {
          if (phraseSelection) addPhraseToBank(phraseSelection.text, phraseSelection.source);
        }}
      />
      <StudyMusicPlayer
        minimized={musicMinimized && !musicState.playing}
        soundEffectsEnabled={soundEffectsState.enabled}
        state={musicState}
        onNext={() => changeStudyTrack(1)}
        onMinimize={() => setMusicMinimized(true)}
        onPrevious={() => changeStudyTrack(-1)}
        onRestore={() => setMusicMinimized(false)}
        onSeek={seekStudyMusicPlayback}
        onToggleSoundEffects={toggleSoundEffectsPlayback}
        onToggle={toggleStudyMusicPlayback}
      />
      <TapBurstLayer />
    </main>
  );
}

function tapToneFor(element: Element): TapBurst["tone"] {
  if (element.classList.contains("primary") || element.classList.contains("music-play")) return "primary";
  if (element.classList.contains("choice")) return "choice";
  if (
    element.classList.contains("music-control") ||
    element.classList.contains("music-progress") ||
    element.classList.contains("music-restore")
  ) return "music";
  if (element.classList.contains("flagged")) return "flag";
  return "default";
}

function TapBurstLayer() {
  const [bursts, setBursts] = useState<TapBurst[]>([]);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let fallbackId = 0;
    const timeouts = new Set<number>();

    const addBurst = (event: PointerEvent) => {
      if (motionQuery.matches || event.button !== 0) return;
      const target = event.target instanceof Element ? event.target : null;
      const interactive = target?.closest("button, a[href], [role='button']");
      if (!interactive) return;
      if (interactive instanceof HTMLButtonElement && interactive.disabled) return;
      if (interactive.getAttribute("aria-disabled") === "true") return;

      const id = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `tap-${Date.now()}-${fallbackId++}`;
      const nextBurst: TapBurst = {
        id,
        x: event.clientX,
        y: event.clientY,
        tone: tapToneFor(interactive)
      };
      setBursts((current) => [...current.slice(-7), nextBurst]);
      const timeout = window.setTimeout(() => {
        setBursts((current) => current.filter((burst) => burst.id !== id));
        timeouts.delete(timeout);
      }, 680);
      timeouts.add(timeout);
    };

    window.addEventListener("pointerdown", addBurst, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", addBurst);
      timeouts.forEach((timeout) => window.clearTimeout(timeout));
    };
  }, []);

  if (bursts.length === 0) return null;

  return (
    <div className="tap-burst-layer" aria-hidden="true">
      {bursts.map((burst) => (
        <span
          className={`tap-burst ${burst.tone}`}
          key={burst.id}
          style={{ "--x": `${burst.x}px`, "--y": `${burst.y}px` } as CSSProperties}
        >
          {Array.from({ length: 7 }).map((_, index) => (
            <i key={index} style={{ "--angle": `${index * 51.4}deg` } as CSSProperties} />
          ))}
        </span>
      ))}
    </div>
  );
}

function PhraseCapturePopover({
  selection,
  onAdd
}: {
  selection: PhraseSelection | null;
  onAdd: () => void;
}) {
  if (!selection) return null;

  return (
    <div
      className="phrase-capture-popover"
      style={{ "--x": `${selection.x}px`, "--y": `${selection.y}px` } as CSSProperties}
      onPointerDown={(event) => event.stopPropagation()}
      role="dialog"
      aria-label="Save highlighted phrase"
    >
      <span>{selection.text}</span>
      <button className="primary" onClick={onAdd}>
        <BookmarkPlus size={16} /> Save
      </button>
    </div>
  );
}

function StudyMusicPlayer({
  minimized,
  soundEffectsEnabled,
  state,
  onNext,
  onMinimize,
  onPrevious,
  onRestore,
  onSeek,
  onToggleSoundEffects,
  onToggle
}: {
  minimized: boolean;
  soundEffectsEnabled: boolean;
  state: StudyMusicState;
  onNext: () => void;
  onMinimize: () => void;
  onPrevious: () => void;
  onRestore: () => void;
  onSeek: (ratio: number) => void;
  onToggleSoundEffects: () => void;
  onToggle: () => void;
}) {
  const playerClassName = [
    "music-player",
    state.playing ? "is-playing" : "",
    minimized ? "is-minimized" : "",
    soundEffectsEnabled ? "sfx-on" : "sfx-muted"
  ]
    .filter(Boolean)
    .join(" ");
  const progress = state.duration > 0 ? Math.min(100, (state.currentTime / state.duration) * 100) : 0;
  const handleSeek = (event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    onSeek((event.clientX - rect.left) / rect.width);
  };
  const soundEffectsLabel = soundEffectsEnabled ? "Mute study sound effects" : "Enable study sound effects";

  if (minimized) {
    return (
      <aside className={playerClassName} aria-label="Lofi focus music player">
        <button
          className="music-restore"
          onClick={onRestore}
          aria-label="Expand lofi focus music player"
          title="Expand lofi focus music player"
        >
          <Music size={15} />
          <span>focus audio</span>
        </button>
        <button
          className="music-control sfx-toggle"
          onClick={onToggleSoundEffects}
          aria-pressed={soundEffectsEnabled}
          aria-label={soundEffectsLabel}
          title={soundEffectsLabel}
        >
          {soundEffectsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
        <button
          className="music-control music-play"
          onClick={onToggle}
          aria-pressed={false}
          aria-label="Play lofi focus music"
          title="Play lofi focus music"
        >
          <Play size={17} />
        </button>
      </aside>
    );
  }

  return (
    <aside className={playerClassName} aria-label="Lofi focus music player">
      <span className="music-art" aria-hidden="true">
        <Music size={18} />
      </span>
      <div className="music-copy">
        <span className="music-kicker">
          <Music size={14} /> focus audio
        </span>
        <strong>{state.title}</strong>
        <span>
          {state.artist} · {state.mood} · {state.trackIndex + 1}/{state.trackCount}
        </span>
      </div>
      <div className="music-controls">
        <button className="music-control" onClick={onPrevious} aria-label="Previous lofi track" title="Previous lofi track">
          <SkipBack size={16} />
        </button>
        <button
          className="music-control music-play"
          onClick={onToggle}
          aria-pressed={state.playing}
          aria-label={state.playing ? "Pause lofi focus music" : "Play lofi focus music"}
          title={state.playing ? "Pause lofi focus music" : "Play lofi focus music"}
        >
          {state.playing ? <Pause size={17} /> : <Play size={17} />}
        </button>
        <button className="music-control" onClick={onNext} aria-label="Next lofi track" title="Next lofi track">
          <SkipForward size={16} />
        </button>
        {!state.playing && (
          <button
            className="music-control music-minimize"
            onClick={onMinimize}
            aria-label="Minimize lofi focus music player"
            title="Minimize lofi focus music player"
          >
            <Minimize2 size={15} />
          </button>
        )}
        <button
          className="music-control sfx-toggle"
          onClick={onToggleSoundEffects}
          aria-pressed={soundEffectsEnabled}
          aria-label={soundEffectsLabel}
          title={soundEffectsLabel}
        >
          {soundEffectsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
      </div>
      <button className="music-progress" onClick={handleSeek} aria-label="Seek lofi track" title="Seek lofi track">
        <span style={{ width: `${progress}%` }} />
      </button>
      <a className="music-source" href={state.sourceUrl} target="_blank" rel="noreferrer" title={`${state.license} source`}>
        {state.loading ? "loading" : state.error ?? "credits"}
      </a>
      <span className="music-bars" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </aside>
  );
}

function Dashboard({
  progress,
  game,
  weak,
  bankErrors,
  onAddPhrase,
  onDeletePhrase,
  onTogglePhraseStar,
  onUpdatePhraseNote,
  onStart
}: {
  progress: ProgressState;
  game: StudyGameStats;
  weak: ReturnType<typeof weakTags>;
  bankErrors: string[];
  onAddPhrase: (text: string) => void;
  onDeletePhrase: (phraseId: string) => void;
  onStart: (preset: Preset) => void;
  onTogglePhraseStar: (phraseId: string) => void;
  onUpdatePhraseNote: (phraseId: string, note: string) => void;
}) {
  return (
    <>
      <section className="topbar">
        <div>
          <p className="eyebrow">PHSC 11000</p>
          <h1>Final Exam Practice</h1>
        </div>
      </section>

      <DashboardHero game={game} />

      {bankErrors.length > 0 && <p className="error">Question bank issue: {bankErrors[0]}</p>}

      <StudySnapshot game={game} />

      <PhraseQuickAdd onAddPhrase={onAddPhrase} />

      <section className="actions command-row">
        <button className="primary" onClick={() => onStart("Mock Exam")}>
          <Timer size={18} /> Start Mock Exam
        </button>
        <button onClick={() => onStart("Freestyle")}>
          <Shuffle size={18} /> Freestyle Practice
        </button>
        <button onClick={() => onStart("Quick Drill")}>
          <CheckCircle2 size={18} /> Start Quick Drill
        </button>
        <button onClick={() => onStart("Weak Retake")}>
          <RotateCcw size={18} /> Retake Weak Topics
        </button>
      </section>

      <section className="dashboard-grid">
        <div className="panel">
          <h2>Weak Topics</h2>
          {weak.length === 0 ? (
            <p className="muted">No weak-topic data yet. Run a drill or mock exam first.</p>
          ) : (
            <div className="tag-list">
              {weak.map((item) => (
                <span key={item.tag}>{item.tag}</span>
              ))}
            </div>
          )}
        </div>
        <div className="panel">
          <h2>Recent Sessions</h2>
          {progress.sessions.length === 0 ? (
            <p className="muted">No sessions yet.</p>
          ) : (
            <ul className="session-list">
              {progress.sessions.slice(0, 6).map((session) => (
                <li key={session.id}>
                  <span>{session.preset}</span>
                  <strong className="score-chip">
                    {session.score}/{session.totalMc}
                  </strong>
                </li>
              ))}
            </ul>
          )}
        </div>
        <PhraseBankPanel
          phrases={progress.phraseBank}
          onDeletePhrase={onDeletePhrase}
          onTogglePhraseStar={onTogglePhraseStar}
          onUpdatePhraseNote={onUpdatePhraseNote}
        />
      </section>
    </>
  );
}

function PhraseQuickAdd({
  onAddPhrase,
  variant = "inline"
}: {
  onAddPhrase: (text: string) => void;
  variant?: "inline" | "dock";
}) {
  const [value, setValue] = useState("");

  const submitPhrase = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSavePhrase(value)) return;
    onAddPhrase(value);
    setValue("");
  };

  const className = variant === "dock" ? "phrase-quick-add is-dock" : "phrase-quick-add";

  return (
    <form className={className} onSubmit={submitPhrase}>
      <span className="phrase-quick-icon">
        <BookmarkPlus size={18} />
      </span>
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        maxLength={MAX_PHRASE_LENGTH}
        placeholder="Type a species, process, or term"
        aria-label="Add phrase to bank"
      />
      <button className="primary" disabled={!canSavePhrase(value)} aria-label="Save phrase">
        <Plus size={17} /> Save
      </button>
    </form>
  );
}

function PhraseBankPanel({
  phrases,
  onDeletePhrase,
  onTogglePhraseStar,
  onUpdatePhraseNote
}: {
  phrases: PhraseBankItem[];
  onDeletePhrase: (phraseId: string) => void;
  onTogglePhraseStar: (phraseId: string) => void;
  onUpdatePhraseNote: (phraseId: string, note: string) => void;
}) {
  const [query, setQuery] = useState("");
  const sortedPhrases = useMemo(
    () =>
      [...phrases].sort(
        (a, b) => Number(b.starred) - Number(a.starred) || b.updatedAt.localeCompare(a.updatedAt)
      ),
    [phrases]
  );
  const visiblePhrases = useMemo(() => {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) return sortedPhrases;
    return sortedPhrases.filter((phrase) => {
      const haystack = [
        phrase.text,
        phrase.note ?? "",
        ...phrase.sources.flatMap((source) => [source.label, source.lectureTitle ?? "", source.cluster ?? ""])
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [query, sortedPhrases]);

  return (
    <div className="panel phrase-bank-panel">
      <div className="phrase-bank-head">
        <div>
          <p className="eyebrow">Phrase Bank</p>
          <h2>
            <BookmarkPlus size={18} /> Terms to remember
          </h2>
        </div>
        <span className="phrase-count">{phrases.length}</span>
      </div>

      <label className="phrase-search">
        <Search size={16} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search bank"
          aria-label="Search phrase bank"
        />
      </label>

      {visiblePhrases.length === 0 ? (
        <p className="muted">{phrases.length === 0 ? "No phrases saved yet." : "No matching phrases."}</p>
      ) : (
        <ul className="phrase-list">
          {visiblePhrases.slice(0, 12).map((phrase) => {
            const latestSource = phrase.sources[phrase.sources.length - 1];
            const sourceLabel = latestSource?.lectureTitle ?? latestSource?.label ?? "Manual add";
            return (
              <li key={phrase.id}>
                <div className="phrase-row">
                  <button
                    className={phrase.starred ? "phrase-icon-button is-starred" : "phrase-icon-button"}
                    onClick={() => onTogglePhraseStar(phrase.id)}
                    aria-label={phrase.starred ? `Unstar ${phrase.text}` : `Star ${phrase.text}`}
                    title={phrase.starred ? "Unstar phrase" : "Star phrase"}
                  >
                    <Star size={16} fill={phrase.starred ? "currentColor" : "none"} />
                  </button>
                  <div className="phrase-main">
                    <strong>{phrase.text}</strong>
                    <span>
                      {sourceLabel}
                      {phrase.captureCount > 1 ? ` x${phrase.captureCount}` : ""}
                    </span>
                  </div>
                  <button
                    className="phrase-icon-button danger"
                    onClick={() => onDeletePhrase(phrase.id)}
                    aria-label={`Delete ${phrase.text}`}
                    title="Delete phrase"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <label className="phrase-note-row">
                  <StickyNote size={15} />
                  <input
                    className="phrase-note"
                    value={phrase.note ?? ""}
                    onChange={(event) => onUpdatePhraseNote(phrase.id, event.target.value)}
                    placeholder="Note"
                    aria-label={`Note for ${phrase.text}`}
                  />
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function DashboardHero({ game }: { game: StudyGameStats }) {
  return (
    <section className="dashboard-hero">
      <div className="hero-copy">
        <p className="eyebrow">Current level</p>
        <h2>
          Level {game.level}: {game.levelTitle}
        </h2>
        <p>{game.focusLine}</p>
        <div className="xp-track" aria-label={`${game.levelProgress}% to next level`}>
          <span style={{ width: `${game.levelProgress}%` }} />
        </div>
        <div className="hero-meta">
          <span>
            <Zap size={16} /> <CountUp value={game.xp} /> XP total
          </span>
          <span>{game.xpForNextLevel} XP to next level</span>
        </div>
      </div>
      <div className="hero-buddy">
        <div className={`rock-mascot ${game.mood}`} aria-label={`Mascot mood: ${game.moodLabel}`}>
          <span className="rock-line line-one" />
          <span className="rock-line line-two" />
          <span className="rock-eye left-eye" />
          <span className="rock-eye right-eye" />
          <span className="rock-mouth" />
        </div>
        <div>
          <p className="eyebrow">Core Buddy</p>
          <h2>{game.moodLabel}</h2>
          <p>{game.moodLine}</p>
        </div>
      </div>
    </section>
  );
}

function StudySnapshot({ game }: { game: StudyGameStats }) {
  const items = [
    { label: "Prepared", value: <><CountUp value={game.prepScore} />%</> },
    { label: "Accuracy", value: <><CountUp value={game.accuracy} />%</> },
    { label: "Coverage", value: <><CountUp value={game.coverage} />%</> },
    { label: "Missed", value: <CountUp value={game.missed} /> }
  ];

  return (
    <section className="snapshot-panel">
      <div className="snapshot-header">
        <div>
          <p className="eyebrow">Progress snapshot</p>
          <h2>{game.correct} correct across {multipleChoiceQuestions.length} questions</h2>
        </div>
      </div>
      <div className="snapshot-list">
        {items.map((item) => (
          <div className="snapshot-item" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function GameStat({ icon, label, value, tone }: { icon: ReactNode; label: string; value: ReactNode; tone: string }) {
  return (
    <div className="game-stat">
      <span className={`stat-icon ${tone}`}>{icon}</span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function AchievementRow({ milestones }: { milestones: StudyGameStats["milestones"] }) {
  return (
    <div className="achievement-row" aria-label="Study milestones">
      {milestones.map((milestone) => (
        <span className={`achievement-chip ${milestone.tone}`} key={milestone.id}>
          <Sparkles size={15} />
          <span>{milestone.label}</span>
          <strong>{milestone.value}</strong>
        </span>
      ))}
    </div>
  );
}

function CountUp({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);

  useEffect(() => {
    const from = previous.current;
    previous.current = value;

    if (from === value || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }

    const startedAt = performance.now();
    const duration = 520;
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [value]);

  return <>{display}</>;
}

function SignedXp({ value }: { value: number }) {
  if (value === 0) return <>0</>;
  return (
    <>
      {value > 0 ? "+" : "-"}
      <CountUp value={Math.abs(value)} />
    </>
  );
}

function Exam({
  session,
  progress,
  onAnswer,
  onAddPhrase,
  onFreestyleAnswer,
  onMove,
  onSkip,
  onBack,
  onSubmit
}: {
  session: SessionState;
  progress: ProgressState;
  onAnswer: (questionId: string, patch: Partial<AnswerRecord>) => void;
  onAddPhrase: (text: string) => void;
  onFreestyleAnswer: (question: MultipleChoiceQuestion, choiceId: string) => void;
  onMove: (index: number) => void;
  onSkip: () => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const question = session.questions[session.index];
  const answer = session.answers[question.id] ?? { questionId: question.id, flagged: Boolean(progress.flagged[question.id]) };
  const isFreestyle = session.preset === "Freestyle";
  const feedback = session.feedback?.questionId === question.id ? session.feedback : undefined;
  const sessionStats = isFreestyle ? buildSessionRunStats(session, progress) : undefined;
  const minutes = Math.floor(session.timeLeft / 60);
  const seconds = String(session.timeLeft % 60).padStart(2, "0");

  return (
    <>
      <section className="exam-header">
        <button className="ghost" onClick={isFreestyle ? onBack : onSubmit}>
          {isFreestyle ? <Home size={18} /> : <Send size={18} />}
          {isFreestyle ? "Back to Dashboard" : "Submit Exam"}
        </button>
        <div className="progress-text">
          {session.preset} | {isFreestyle ? `${sessionStats?.answered ?? 0} adaptive reps` : `${session.index + 1}/${session.questions.length}`}
        </div>
        <div className={isFreestyle ? "combo-pill" : "timer"}>
          {isFreestyle && sessionStats ? (
            <>
              <Flame size={16} /> {sessionStats.streak} streak
            </>
          ) : (
            `${minutes}:${seconds}`
          )}
        </div>
      </section>

      <PhraseQuickAdd onAddPhrase={onAddPhrase} variant="dock" />

      <section
        key={question.id}
        className={`question-panel ${feedback ? (feedback.correct ? "panel-correct" : "panel-wrong") : ""}`}
        data-phrase-capture="true"
        data-capture-type="question"
        data-capture-label={question.lectureTitle ?? "Synthesis"}
        data-capture-view={session.preset}
        data-question-id={question.id}
        data-question-prompt={question.prompt}
        data-lecture={question.lecture}
        data-lecture-title={question.lectureTitle}
        data-cluster={question.cluster}
        data-source-path={question.sourcePath}
      >
        <div className="question-meta">
          <span>{question.lectureTitle ?? "Synthesis"}</span>
          <span>{question.cluster}</span>
          <span>{question.difficulty}</span>
        </div>
        <h2>{question.prompt}</h2>

        {question.kind === "multiple-choice" ? (
          <div className="choices">
            {question.choices.map((choice) => (
              <button
                key={choice.id}
                className={choiceClass(choice.id, question.correctChoiceId, answer.selectedChoiceId, Boolean(feedback))}
                disabled={Boolean(feedback)}
                onClick={() =>
                  isFreestyle ? onFreestyleAnswer(question, choice.id) : onAnswer(question.id, { selectedChoiceId: choice.id })
                }
              >
                {choice.text}
              </button>
            ))}
          </div>
        ) : (
          <textarea
            value={answer.textAnswer ?? ""}
            onChange={(event) => onAnswer(question.id, { textAnswer: event.target.value })}
            placeholder="Draft your answer. You will self-check it against the rubric after submitting."
          />
        )}

        {isFreestyle && feedback && (
          <div className={feedback.correct ? "feedback correct-feedback" : "feedback wrong-feedback"}>
            <div className="feedback-head">
              <strong>{feedback.correct ? "Correct" : "Wrong"}</strong>
              <span className="feedback-badges">
                <span className="mastery-chip">{feedback.masteryLabel}</span>
                <span className="xp-badge">{formatSignedXp(feedback.xp)} XP</span>
              </span>
            </div>
            {feedback.correct && feedback.streak >= 3 && <span className="streak-line">{feedback.streak} in a row</span>}
            {!feedback.correct && <span>Correct answer: {feedback.correctText}</span>}
            <p>{question.explanation}</p>
            <p className="reinforcement-line">{feedback.reinforcementLine}</p>
            <button className="primary feedback-next" onClick={onSkip}>
              Next Question <ArrowRight size={18} />
            </button>
          </div>
        )}

        <div className="question-tools">
          <button
            className={answer.flagged ? "flagged" : ""}
            onClick={() => onAnswer(question.id, { flagged: !answer.flagged })}
          >
            <Flag size={17} /> {answer.flagged ? "Flagged" : "Flag Question"}
          </button>
          {isFreestyle && !feedback && (
            <button onClick={onSkip}>
              <SkipForward size={18} /> Skip Question
            </button>
          )}
        </div>
      </section>

      {sessionStats && <SessionStatsPanel stats={sessionStats} />}

      {!isFreestyle && (
        <section className="nav-row">
          <button disabled={session.index === 0} onClick={() => onMove(session.index - 1)}>
            <ArrowLeft size={18} /> Previous Question
          </button>
          <button disabled={session.index === session.questions.length - 1} onClick={() => onMove(session.index + 1)}>
            Next Question <ArrowRight size={18} />
          </button>
        </section>
      )}
    </>
  );
}

function SessionStatsPanel({ stats }: { stats: SessionRunStats }) {
  return (
    <section className="session-stat-grid">
      <GameStat icon={<Clock3 />} label="This Run" value={<CountUp value={stats.answered} />} tone="teal" />
      <GameStat icon={<Zap />} label="Run XP" value={<SignedXp value={stats.xp} />} tone="purple" />
      <GameStat icon={<Flame />} label="Streak" value={<CountUp value={stats.streak} />} tone="amber" />
      <GameStat icon={<BarChart3 />} label="Accuracy" value={<><CountUp value={stats.accuracy} />%</>} tone="blue" />
      <GameStat icon={<Target />} label="Mastered" value={<CountUp value={stats.mastered} />} tone="green" />
      <GameStat icon={<RotateCcw />} label="Recovering" value={<CountUp value={stats.recovering} />} tone="amber" />
      <GameStat icon={<CheckCircle2 />} label="Correct" value={<CountUp value={stats.correct} />} tone="green" />
      <GameStat icon={<XCircle />} label="Missed" value={<CountUp value={stats.missed} />} tone="red" />
    </section>
  );
}

function choiceClass(choiceId: string, correctChoiceId: string, selectedChoiceId: string | undefined, showFeedback: boolean) {
  const classes = ["choice"];
  if (selectedChoiceId === choiceId) classes.push("selected");
  if (showFeedback && choiceId === correctChoiceId) classes.push("correct-answer");
  if (showFeedback && selectedChoiceId === choiceId && choiceId !== correctChoiceId) classes.push("wrong-answer");
  return classes.join(" ");
}

function Review({
  session,
  reward,
  onAddPhrase,
  onBack,
  onRetryWeak
}: {
  session: SessionState;
  reward: SessionRewardSummary | null;
  onAddPhrase: (text: string) => void;
  onBack: () => void;
  onRetryWeak: () => void;
}) {
  const result = session.submitted!;
  const answerById = new Map(result.answers.map((answer) => [answer.questionId, answer]));
  return (
    <>
      <section className="topbar">
        <div>
          <p className="eyebrow">Review</p>
          <h1>
            {result.score}/{result.totalMc} correct
          </h1>
        </div>
        <div className="actions-inline">
          <button onClick={onRetryWeak}><RotateCcw size={18} /> Retake Weak Topics</button>
          <button className="primary" onClick={onBack}><Home size={18} /> Back to Dashboard</button>
        </div>
      </section>

      <PhraseQuickAdd onAddPhrase={onAddPhrase} variant="dock" />

      {reward && (
        <section className={reward.leveledUp ? "review-summary level-up" : "review-summary"}>
          <div className="reward-copy">
            <p className="eyebrow">{reward.leveledUp ? "Level up" : "Run rewards"}</p>
            <h2><SignedXp value={reward.sessionXp} /> XP</h2>
            <p>
              {reward.leveledUp
                ? `${reward.previousTitle} to ${reward.nextTitle}`
                : reward.sessionXp < 0
                  ? `${reward.accuracy}% accuracy, XP adjusted down`
                  : `${reward.accuracy}% accuracy logged into your progress`}
            </p>
          </div>
          <div className="score-ring" style={{ "--score": reward.accuracy } as CSSProperties}>
            <span>{reward.accuracy}%</span>
          </div>
          {reward.milestones.length > 0 && <AchievementRow milestones={reward.milestones} />}
        </section>
      )}

      <section className="review-list">
        {session.questions.map((question, index) => {
          const answer = answerById.get(question.id);
          const correct = answer?.correct;
          return (
            <article
              key={question.id}
              className="review-item"
              data-phrase-capture="true"
              data-capture-type="review"
              data-capture-label={question.lectureTitle ?? "Synthesis review"}
              data-capture-view="review"
              data-question-id={question.id}
              data-question-prompt={question.prompt}
              data-lecture={question.lecture}
              data-lecture-title={question.lectureTitle}
              data-cluster={question.cluster}
              data-source-path={question.sourcePath}
            >
              <div className="review-heading">
                {correct === true && <CheckCircle2 className="ok" />}
                {correct === false && <XCircle className="bad" />}
                {correct === undefined && <FileQuestion />}
                <strong>{index + 1}. {question.prompt}</strong>
              </div>
              {question.kind === "multiple-choice" ? (
                <div className="review-choices">
                  {question.choices.map((choice) => (
                    <p key={choice.id} className={choice.id === question.correctChoiceId ? "correct-choice" : choice.id === answer?.selectedChoiceId ? "wrong-choice" : ""}>
                      {choice.text}
                    </p>
                  ))}
                </div>
              ) : (
                <div>
                  <p className="muted">{answer?.textAnswer || "No answer written."}</p>
                  <ul>{question.rubric.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
              )}
              <p className="explanation">{question.explanation}</p>
              <p className="source">{question.sourcePath}</p>
            </article>
          );
        })}
      </section>
    </>
  );
}

function RewardLayer({ event, onDone }: { event: RewardEvent | null; onDone: () => void }) {
  useEffect(() => {
    if (!event) return;
    const timeout = window.setTimeout(onDone, 1700);
    return () => window.clearTimeout(timeout);
  }, [event, onDone]);

  if (!event) return null;

  const pieces = event.confetti === "none" ? [] : Array.from({ length: event.confetti === "burst" ? 34 : 16 });

  return (
    <div className="reward-layer" aria-live="polite" aria-atomic="true">
      {pieces.map((_, index) => (
        <span
          className="confetti-piece"
          key={index}
          style={
            {
              "--x": `${8 + ((index * 13) % 84)}vw`,
              "--delay": `${(index % 8) * 42}ms`,
              "--hue": `${120 + ((index * 37) % 170)}`
            } as CSSProperties
          }
        />
      ))}
      <div className={`reward-toast ${event.tone}`}>
        <span className="reward-icon">
          {event.confetti === "none" ? <Target size={18} /> : <Sparkles size={18} />}
        </span>
        <div>
          <strong>{event.title}</strong>
          <p>{event.detail}</p>
        </div>
      </div>
    </div>
  );
}

export default App;
