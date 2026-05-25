import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildFreestyleReward,
  buildSessionRewardSummary,
  buildStudyGameStats,
  currentStreak,
  type RewardEvent,
  type SessionRewardSummary
} from "./lib/gamification";
import {
  masteryForQuestion,
  reinforcementLine,
  selectNextFreestyleQuestion
} from "./lib/freestyleEngine";
import { multipleChoiceQuestions, questionBank, validateQuestionBank, type MultipleChoiceQuestion } from "./lib/questionBank";
import { playRewardSound, playUiSound } from "./lib/sound";
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
  type PhraseSource,
  type ProgressState,
  type SessionResult
} from "./lib/storage";
import {
  canSavePhrase,
  captureSourceFromElement,
  cleanPhraseText,
  formatSignedXp,
  learningProgressFor,
  normalizedPhraseKey,
  presetConfig,
  shuffle,
  shuffledMultipleChoice,
  sourceSignature,
  withShuffledChoices
} from "./lib/studySession";
import { Dashboard } from "./features/dashboard/Dashboard";
import { StudyMusicPlayer } from "./features/music/StudyMusicPlayer";
import { Exam } from "./features/practice/Exam";
import { PhraseCapturePopover } from "./features/phrases/PhraseCapturePopover";
import { Review } from "./features/review/Review";
import { RewardLayer } from "./features/rewards/RewardLayer";
import type { CaptureSource, PhraseSelection, Preset, SessionState, View } from "./types/study";

function App() {
  const [progress, setProgress] = useState<ProgressState>(() => loadProgress());
  const [view, setView] = useState<View>("dashboard");
  const [session, setSession] = useState<SessionState | null>(null);
  const [rewardEvent, setRewardEvent] = useState<RewardEvent | null>(null);
  const [reviewReward, setReviewReward] = useState<SessionRewardSummary | null>(null);
  const [musicState, setMusicState] = useState<StudyMusicState>(() => getStudyMusicState());
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
              captureCount: hasSource ? item.captureCount : item.captureCount + 1,
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
    const reward: RewardEvent = {
      id: `${result.id}-review`,
      title: rewardSummary.leveledUp ? `Level ${rewardSummary.nextLevel}` : "Run complete",
      detail: `${formatSignedXp(rewardSummary.sessionXp)} XP`,
      xp: rewardSummary.sessionXp,
      tone: rewardSummary.sessionXp < 0 ? "red" : rewardSummary.leveledUp ? "amber" : "green",
      confetti: rewardSummary.confetti
    };
    setRewardEvent(reward);
    playRewardSound(reward);
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
        setPhraseSelection({
          text,
          x: Math.min(Math.max(pointer?.x ?? rect.left + rect.width / 2, 92), window.innerWidth - 92),
          y: Math.max((pointer?.y ?? rect.top) - 12, 18),
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
          phrases={progress.phraseBank}
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
          phrases={progress.phraseBank}
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
          phrases={progress.phraseBank}
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
        state={musicState}
        onNext={() => changeStudyTrack(1)}
        onMinimize={() => setMusicMinimized(true)}
        onPrevious={() => changeStudyTrack(-1)}
        onRestore={() => setMusicMinimized(false)}
        onSeek={seekStudyMusicPlayback}
        onToggle={toggleStudyMusicPlayback}
      />
    </main>
  );
}

export default App;
