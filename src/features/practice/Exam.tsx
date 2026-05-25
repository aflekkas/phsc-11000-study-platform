import { ArrowCounterClockwise, ArrowLeft, ArrowRight, ChartBar, CheckCircle, Clock, Fire, Flag, House, Lightning, PaperPlaneTilt, SkipForward, Target, XCircle } from "@phosphor-icons/react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { CountUp, SignedXp } from "../../components/ui/CountUp";
import { StatTile } from "../../components/ui/StatTile";
import { StudyCard } from "../../components/ui/StudyCard";
import { cx } from "../../lib/classes";
import { type MultipleChoiceQuestion } from "../../lib/questionBank";
import { buildSessionRunStats } from "../../lib/studySession";
import type { AnswerRecord, PhraseBankItem, ProgressState } from "../../lib/storage";
import type { FreestyleAnswerHandler, SessionRunStats, SessionState } from "../../types/study";
import { PhraseQuickAdd } from "../phrases/PhraseQuickAdd";

export function Exam({
  session,
  progress,
  phrases,
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
  phrases: PhraseBankItem[];
  onAnswer: (questionId: string, patch: Partial<AnswerRecord>) => void;
  onAddPhrase: (text: string) => void;
  onFreestyleAnswer: FreestyleAnswerHandler;
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
        <Button tone="ghost" onClick={isFreestyle ? onBack : onSubmit} icon={isFreestyle ? <House size={18} weight="duotone" /> : <PaperPlaneTilt size={18} weight="duotone" />}>
          {isFreestyle ? "Dashboard" : "Submit"}
        </Button>
        <div className="progress-text">
          {session.preset} <span>{isFreestyle ? `${sessionStats?.answered ?? 0} adaptive reps` : `${session.index + 1}/${session.questions.length}`}</span>
        </div>
        <Badge tone={isFreestyle ? "warning" : "secondary"} className="badge-lg">
          {isFreestyle && sessionStats ? (
            <>
              <Fire size={16} weight="duotone" /> {sessionStats.streak} streak
            </>
          ) : (
            `${minutes}:${seconds}`
          )}
        </Badge>
      </section>

      <main className="practice-stack">
        <StudyCard
          key={question.id}
          className={cx("question-panel", feedback && (feedback.correct ? "panel-correct" : "panel-wrong"))}
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
            <Badge tone="primary">{question.lectureTitle ?? "Synthesis"}</Badge>
            <Badge tone="accent">{question.cluster}</Badge>
            <Badge tone={question.difficulty === "Hard" ? "error" : question.difficulty === "Medium" ? "warning" : "success"}>
              {question.difficulty}
            </Badge>
          </div>
          <h2>{question.prompt}</h2>

          {question.kind === "multiple-choice" ? (
            <div className="choices">
              {question.choices.map((choice) => (
                <button
                  key={choice.id}
                  className={choiceClass(choice.id, question.correctChoiceId, answer.selectedChoiceId, Boolean(feedback))}
                  aria-disabled={Boolean(feedback)}
                  onClick={() =>
                    !feedback &&
                    (isFreestyle ? onFreestyleAnswer(question as MultipleChoiceQuestion, choice.id) : onAnswer(question.id, { selectedChoiceId: choice.id }))
                  }
                >
                  <span className="radio radio-primary radio-sm" aria-hidden="true" />
                  <span>{choice.text}</span>
                </button>
              ))}
            </div>
          ) : (
            <textarea
              className="textarea textarea-bordered min-h-56 w-full"
              value={answer.textAnswer ?? ""}
              onChange={(event) => onAnswer(question.id, { textAnswer: event.target.value })}
              placeholder="Draft your answer. You will self-check it against the rubric after submitting."
            />
          )}

          {isFreestyle && feedback && (
            <div className={feedback.correct ? "feedback alert alert-success alert-soft" : "feedback alert alert-error alert-soft"}>
              <div className="feedback-head">
                <strong>{feedback.correct ? "Correct" : "Wrong"}</strong>
                <span className="feedback-badges">
                  <Badge tone="accent">{feedback.masteryLabel}</Badge>
                  <Badge tone={feedback.xp >= 0 ? "success" : "error"}>{feedback.xp > 0 ? "+" : ""}{feedback.xp} XP</Badge>
                </span>
              </div>
              {feedback.correct && feedback.streak >= 3 && <Badge tone="warning">{feedback.streak} in a row</Badge>}
              {!feedback.correct && <span>Correct answer: {feedback.correctText}</span>}
              <p>{question.explanation}</p>
              <p className="reinforcement-line">{feedback.reinforcementLine}</p>
              <Button className="justify-self-end" tone="primary" onClick={onSkip} icon={<ArrowRight size={18} weight="bold" />}>
                Next Question
              </Button>
            </div>
          )}

          <div className="question-tools">
            <Button
              className={cx(answer.flagged && "flagged")}
              tone={answer.flagged ? "secondary" : "soft"}
              onClick={() => onAnswer(question.id, { flagged: !answer.flagged })}
              icon={<Flag size={17} weight="duotone" />}
            >
              {answer.flagged ? "Flagged" : "Flag Question"}
            </Button>
            {isFreestyle && !feedback && (
              <Button onClick={onSkip} icon={<SkipForward size={18} weight="duotone" />}>
                Skip Question
              </Button>
            )}
          </div>
        </StudyCard>

        <PhraseQuickAdd onAddPhrase={onAddPhrase} phrases={phrases} variant="dock" />
      </main>

      {sessionStats && <SessionStatsPanel stats={sessionStats} />}

      {!isFreestyle && (
        <section className="nav-row">
          <Button disabled={session.index === 0} onClick={() => onMove(session.index - 1)} icon={<ArrowLeft size={18} weight="bold" />}>
            Previous
          </Button>
          <Button disabled={session.index === session.questions.length - 1} onClick={() => onMove(session.index + 1)} icon={<ArrowRight size={18} weight="bold" />}>
            Next
          </Button>
        </section>
      )}
    </>
  );
}

function SessionStatsPanel({ stats }: { stats: SessionRunStats }) {
  return (
    <section className="session-stat-grid">
      <StatTile icon={<Clock weight="duotone" />} label="This Run" value={<CountUp value={stats.answered} />} tone="teal" />
      <StatTile icon={<Lightning weight="duotone" />} label="Run XP" value={<SignedXp value={stats.xp} />} tone="purple" />
      <StatTile icon={<Fire weight="duotone" />} label="Streak" value={<CountUp value={stats.streak} />} tone="amber" />
      <StatTile icon={<ChartBar weight="duotone" />} label="Accuracy" value={<><CountUp value={stats.accuracy} />%</>} tone="blue" />
      <StatTile icon={<Target weight="duotone" />} label="Mastered" value={<CountUp value={stats.mastered} />} tone="green" />
      <StatTile icon={<ArrowCounterClockwise weight="duotone" />} label="Recovering" value={<CountUp value={stats.recovering} />} tone="amber" />
      <StatTile icon={<CheckCircle weight="duotone" />} label="Correct" value={<CountUp value={stats.correct} />} tone="green" />
      <StatTile icon={<XCircle weight="duotone" />} label="Missed" value={<CountUp value={stats.missed} />} tone="red" />
    </section>
  );
}

function choiceClass(choiceId: string, correctChoiceId: string, selectedChoiceId: string | undefined, showFeedback: boolean) {
  const classes = ["choice", "btn", "btn-soft", "justify-start", "h-auto", "min-h-14", "text-left"];
  if (selectedChoiceId === choiceId) classes.push("selected");
  if (showFeedback && choiceId === correctChoiceId) classes.push("correct-answer");
  if (showFeedback && selectedChoiceId === choiceId && choiceId !== correctChoiceId) classes.push("wrong-answer");
  return classes.join(" ");
}
