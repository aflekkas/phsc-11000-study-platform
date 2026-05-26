import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { buildPhraseBankMarkdown, phraseBankMarkdownFileName } from "./lib/phraseBankExport";
import type { MultipleChoiceQuestion } from "./lib/questionBank";
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
  buildProgressBackup,
  parseProgressBackupJson,
  progressCore,
  progressBackupFileName,
  saveProgress,
  weakTags,
  type AnswerRecord,
  type PhraseSource,
  type ProgressState,
  type SavedFreestyleRun,
  type SessionResult
} from "./lib/storage";
import {
  canSavePhrase,
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
import { Review } from "./features/review/Review";
import { RewardLayer } from "./features/rewards/RewardLayer";
import type { ProgressTransferStatus } from "./features/settings/ProgressSettings";
import type { Preset, SessionState, View } from "./types/study";

type PhraseInputSource = Omit<PhraseSource, "id" | "capturedAt">;
type QuestionBankModule = typeof import("./lib/questionBank");

function withSavedChoiceOrder(
  savedQuestion: SavedFreestyleRun["questions"][number],
  multipleChoiceById: Map<string, MultipleChoiceQuestion>
) {
  const question = multipleChoiceById.get(savedQuestion.id);
  if (!question) return null;
  const choicesById = new Map(question.choices.map((choice) => [choice.id, choice]));
  const orderedChoices = savedQuestion.choiceOrder
    .map((choiceId) => choicesById.get(choiceId))
    .filter((choice): choice is MultipleChoiceQuestion["choices"][number] => Boolean(choice));
  const missingChoices = question.choices.filter((choice) => !savedQuestion.choiceOrder.includes(choice.id));
  return { ...question, choices: [...orderedChoices, ...missingChoices] };
}

function restoreFreestyleSession(
  savedRun: SavedFreestyleRun | undefined,
  multipleChoiceById: Map<string, MultipleChoiceQuestion>
): SessionState | null {
  if (!savedRun) return null;
  const questions = savedRun.questions
    .map((question) => withSavedChoiceOrder(question, multipleChoiceById))
    .filter((question): question is MultipleChoiceQuestion => Boolean(question));
  if (questions.length === 0) return null;
  return {
    id: savedRun.id,
    preset: "Freestyle",
    startedAt: savedRun.startedAt,
    questions,
    answers: savedRun.answers,
    index: Math.min(savedRun.index, questions.length - 1),
    timeLeft: 0,
    feedback: savedRun.feedback,
    freestyleLog: savedRun.freestyleLog,
    freestyleBaseProgress: savedRun.freestyleBaseProgress
  };
}

function saveFreestyleSession(session: SessionState): SavedFreestyleRun | undefined {
  if (session.preset !== "Freestyle") return undefined;
  return {
    id: session.id,
    startedAt: session.startedAt,
    questions: session.questions
      .filter((question): question is MultipleChoiceQuestion => question.kind === "multiple-choice")
      .map((question) => ({
        id: question.id,
        choiceOrder: question.choices.map((choice) => choice.id)
      })),
    answers: session.answers,
    index: session.index,
    timeLeft: 0,
    feedback: session.feedback,
    freestyleLog: session.freestyleLog ?? [],
    freestyleBaseProgress: progressCore(session.freestyleBaseProgress ?? {
      sessions: [],
      freestyle: [],
      flagged: {},
      phraseBank: []
    })
  };
}

function App() {
  const [questionModule, setQuestionModule] = useState<QuestionBankModule | null>(null);
  const [progress, setProgress] = useState<ProgressState>(() => loadProgress());
  const [view, setView] = useState<View>("dashboard");
  const [session, setSession] = useState<SessionState | null>(null);
  const [rewardEvent, setRewardEvent] = useState<RewardEvent | null>(null);
  const [reviewReward, setReviewReward] = useState<SessionRewardSummary | null>(null);
  const [musicState, setMusicState] = useState<StudyMusicState>(() => getStudyMusicState());
  const [musicMinimized, setMusicMinimized] = useState(true);
  const [progressTransferStatus, setProgressTransferStatus] = useState<ProgressTransferStatus>(null);
  const progressRef = useRef<ProgressState>(progress);
  const lastQuestionSoundId = useRef<string | null>(null);
  const questionBank = questionModule?.questionBank ?? [];
  const multipleChoiceQuestions = questionModule?.multipleChoiceQuestions ?? [];
  const questionBankReady = Boolean(questionModule);
  const multipleChoiceById = useMemo(
    () => new Map(multipleChoiceQuestions.map((question) => [question.id, question])),
    [multipleChoiceQuestions]
  );
  const bankErrors = useMemo(() => questionModule?.validateQuestionBank() ?? [], [questionModule]);
  const weak = useMemo(() => weakTags(progress, questionBank), [progress, questionBank]);
  const game = useMemo(
    () => buildStudyGameStats(progress, questionBank, multipleChoiceQuestions.length),
    [progress, questionBank, multipleChoiceQuestions.length]
  );
  const activeQuestionId = view === "exam" && session ? session.questions[session.index]?.id : undefined;
  const dismissReward = useCallback(() => setRewardEvent(null), []);

  const commitProgress = useCallback((buildNextProgress: (current: ProgressState) => ProgressState) => {
    const nextProgress = buildNextProgress(progressRef.current);
    progressRef.current = nextProgress;
    setProgress(nextProgress);
    return nextProgress;
  }, []);

  const persistFreestyleSession = useCallback((nextSession: SessionState) => {
    const activeFreestyle = saveFreestyleSession(nextSession);
    commitProgress((current) => ({ ...current, activeFreestyle }));
  }, [commitProgress]);

  useEffect(() => {
    let mounted = true;
    void import("./lib/questionBank").then((module) => {
      if (mounted) setQuestionModule(module);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const addPhraseToBank = (rawText: string, source: PhraseInputSource) => {
    const text = cleanPhraseText(rawText);
    if (!canSavePhrase(text)) return;

    const normalizedText = normalizedPhraseKey(text);
    const now = new Date().toISOString();
    const phraseId = crypto.randomUUID();
    const phraseSource: PhraseSource = {
      ...source,
      id: crypto.randomUUID(),
      capturedAt: now
    };
    commitProgress((current) => {
      const existing = current.phraseBank.find((item) => item.normalizedText === normalizedText);
      if (existing) {
        const sourceKeys = new Set(existing.sources.map(sourceSignature));
        const sources = sourceKeys.has(sourceSignature(phraseSource))
          ? existing.sources
          : [...existing.sources, phraseSource];
        return {
          ...current,
          phraseBank: current.phraseBank.map((item) =>
            item.id === existing.id
              ? {
                  ...item,
                  updatedAt: now,
                  sources,
                  captureCount: item.captureCount + 1
                }
              : item
          )
        };
      }
      const phraseBank = [
        {
          id: phraseId,
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
      return { ...current, phraseBank };
    });

    playUiSound("flag");
    setProgressTransferStatus(null);
  };

  const addManualPhrase = (text: string, label = "Manual add", sourceView = view) => {
    addPhraseToBank(text, { type: "manual", label, view: sourceView });
  };

  const deletePhrase = (phraseId: string) => {
    commitProgress((current) => {
      return {
        ...current,
        phraseBank: current.phraseBank.filter((item) => item.id !== phraseId)
      };
    });
    playUiSound("back");
    setProgressTransferStatus(null);
  };

  const togglePhraseStar = (phraseId: string) => {
    commitProgress((current) => {
      const now = new Date().toISOString();
      return {
        ...current,
        phraseBank: current.phraseBank.map((item) =>
          item.id === phraseId ? { ...item, starred: !item.starred, updatedAt: now } : item
        )
      };
    });
    playUiSound("select");
  };

  const updatePhraseNote = (phraseId: string, note: string) => {
    commitProgress((current) => {
      return {
        ...current,
        phraseBank: current.phraseBank.map((item) =>
          item.id === phraseId ? { ...item, note, updatedAt: new Date().toISOString() } : item
        )
      };
    });
  };

  const exportProgress = () => {
    const backup = buildProgressBackup(progressRef.current);
    const blob = new Blob([`${JSON.stringify(backup, null, 2)}\n`], { type: "application/json;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = progressBackupFileName();
    link.style.display = "none";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    setProgressTransferStatus({ tone: "success", message: "Exported progress JSON." });
  };

  const exportPhraseBank = () => {
    const markdown = buildPhraseBankMarkdown(progressRef.current.phraseBank);
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = phraseBankMarkdownFileName();
    link.style.display = "none";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    setProgressTransferStatus({ tone: "success", message: "Exported phrase bank Markdown." });
  };

  const importProgress = async (file: File) => {
    try {
      const nextProgress = parseProgressBackupJson(await file.text());
      progressRef.current = nextProgress;
      setProgress(nextProgress);
      saveProgress(nextProgress);
      setSession(null);
      setReviewReward(null);
      setView("dashboard");
      setProgressTransferStatus({ tone: "success", message: "Imported progress JSON." });
      playUiSound("select");
    } catch (error) {
      setProgressTransferStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "Could not import that progress file."
      });
    }
  };

  const toggleStudyMusicPlayback = () => {
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
    if (!questionBankReady) return;
    playUiSound("start");
    setReviewReward(null);
    if (preset === "Freestyle") {
      const restoredSession = restoreFreestyleSession(progressRef.current.activeFreestyle, multipleChoiceById);
      if (restoredSession) {
        setSession(restoredSession);
        setView("exam");
        return;
      }

      const baseProgress = progressCore(progressRef.current);
      const firstQuestion = selectNextFreestyleQuestion({
        progress: baseProgress,
        questions: multipleChoiceQuestions,
        runLog: [],
        recentQuestionIds: []
      });
      const nextSession: SessionState = {
        id: crypto.randomUUID(),
        preset,
        startedAt: new Date().toISOString(),
        questions: [withShuffledChoices(firstQuestion)],
        answers: {},
        freestyleLog: [],
        freestyleBaseProgress: baseProgress,
        index: 0,
        timeLeft: 0
      };
      setSession(nextSession);
      persistFreestyleSession(nextSession);
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
        flagged: Boolean(progressRef.current.flagged[question.id])
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
    const baseProgress = progressRef.current;
    const nextProgress = commitProgress((current) =>
      current.sessions.some((savedSession) => savedSession.id === result.id)
        ? current
        : { ...current, sessions: [result, ...current.sessions].slice(0, 80) }
    );
    const rewardSummary = buildSessionRewardSummary(result, questionBank, baseProgress, nextProgress);
    setSession((current) =>
      current?.id === session.id && !current.submitted ? { ...current, submitted: result } : current
    );
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
      }),
    []
  );

  useEffect(() => {
    progressRef.current = progress;
    saveProgress(progress);
  }, [progress]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view, activeQuestionId]);

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
    if (!session) return;
    if ("selectedChoiceId" in patch) playUiSound("select");
    if ("flagged" in patch) playUiSound("flag");
    const existing = session.answers[questionId] ?? {
      questionId,
      flagged: Boolean(progressRef.current.flagged[questionId])
    };
    const nextSession = {
      ...session,
      answers: { ...session.answers, [questionId]: { ...existing, ...patch } }
    };
    setSession(nextSession);
    if (nextSession.preset === "Freestyle") persistFreestyleSession(nextSession);
    if ("flagged" in patch) {
      commitProgress((current) => ({
        ...current,
        flagged: { ...current.flagged, [questionId]: Boolean(patch.flagged) }
      }));
      setProgressTransferStatus(null);
    }
  };

  const nextFreestyleQuestion = () => {
    if (!session?.feedback) playUiSound("skip");
    if (!session || session.preset !== "Freestyle") return;
    const runLog = session.freestyleLog ?? [];
    const currentProgress = progressRef.current;
    const nextQuestion = selectNextFreestyleQuestion({
      progress: learningProgressFor(session, currentProgress),
      questions: multipleChoiceQuestions,
      runLog,
      recentQuestionIds: session.questions.slice(-6).map((question) => question.id)
    });
    const nextSession = {
      ...session,
      questions: [...session.questions, withShuffledChoices(nextQuestion)],
      answers: {},
      index: session.questions.length,
      feedback: undefined
    };
    setSession(nextSession);
    persistFreestyleSession(nextSession);
  };

  const answerFreestyle = (question: MultipleChoiceQuestion, choiceId: string) => {
    if (!session || session.preset !== "Freestyle" || session.feedback?.questionId === question.id) return;
    const selectedChoice = question.choices.find((choice) => choice.id === choiceId);
    const correctChoice = question.choices.find((choice) => choice.id === question.correctChoiceId);
    if (!selectedChoice || !correctChoice) return;

    const baseProgress = progressRef.current;
    const correct = choiceId === question.correctChoiceId;
    const answer: AnswerRecord = {
      questionId: question.id,
      selectedChoiceId: choiceId,
      flagged: session.answers[question.id]?.flagged ?? Boolean(baseProgress.flagged[question.id]),
      correct
    };
    const nextLog = [...(session.freestyleLog ?? []), answer];
    const streak = currentStreak(nextLog);
    const reward = buildFreestyleReward(question, answer, streak);
    const mastery = masteryForQuestion(
      learningProgressFor(session, baseProgress),
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
    const feedback = {
      questionId: question.id,
      correct,
      correctText: correctChoice.text,
      xp: reward.xp,
      streak,
      masteryLabel: mastery?.label ?? "New",
      reinforcementLine: reinforcementLine(correct, mastery)
    };
    const nextSession = {
      ...session,
      answers: { ...session.answers, [question.id]: answer },
      freestyleLog: nextLog,
      feedback
    };

    commitProgress((current) => {
      return {
        ...current,
        freestyle: [result, ...current.freestyle].slice(0, 500),
        activeFreestyle: saveFreestyleSession(nextSession)
      };
    });
    setProgressTransferStatus(null);
    setSession(nextSession);
    setRewardEvent(reward);
  };

  if (!questionBankReady) {
    return (
      <main className="app-shell">
        <section className="loading-panel">
          <p className="eyebrow">PHSC 11000</p>
          <h1>Loading Practice Bank</h1>
        </section>
      </main>
    );
  }

  return (
    <main className={`app-shell ${view === "exam" ? "is-exam-view" : ""}`}>
      {view === "dashboard" && (
        <Dashboard
          progress={progress}
          progressTransferStatus={progressTransferStatus}
          game={game}
          weak={weak}
          bankErrors={bankErrors}
          phrases={progress.phraseBank}
          hasActiveFreestyle={Boolean(progress.activeFreestyle)}
          totalMultipleChoice={multipleChoiceQuestions.length}
          onAddPhrase={addManualPhrase}
          onDeletePhrase={deletePhrase}
          onExportPhraseBank={exportPhraseBank}
          onExportProgress={exportProgress}
          onImportProgress={(file) => void importProgress(file)}
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
          questionBank={questionBank}
          multipleChoiceQuestions={multipleChoiceQuestions}
          onAnswer={updateAnswer}
          onAddPhrase={(text) => addManualPhrase(text, `Manual during ${session.preset}`, "exam")}
          onFreestyleAnswer={answerFreestyle}
          onMove={(index) => {
            setSession((current) => current ? { ...current, index } : current);
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
      <RewardLayer event={rewardEvent} onDone={dismissReward} />
      <StudyMusicPlayer
        minimized={musicMinimized}
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
