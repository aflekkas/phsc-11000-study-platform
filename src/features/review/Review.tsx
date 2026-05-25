import type { CSSProperties } from "react";
import { ArrowCounterClockwise, CheckCircle, House, Question, Sparkle, XCircle } from "@phosphor-icons/react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { SignedXp } from "../../components/ui/CountUp";
import { PageHeader } from "../../components/ui/PageHeader";
import { StudyCard } from "../../components/ui/StudyCard";
import { cx } from "../../lib/classes";
import type { RewardTone, SessionRewardSummary } from "../../lib/gamification";
import type { PhraseBankItem } from "../../lib/storage";
import type { SessionState } from "../../types/study";
import { PhraseQuickAdd } from "../phrases/PhraseQuickAdd";

const rewardTone: Record<RewardTone, "success" | "warning" | "info" | "accent" | "error"> = {
  green: "success",
  amber: "warning",
  blue: "info",
  purple: "accent",
  red: "error"
};

export function Review({
  session,
  reward,
  phrases,
  onAddPhrase,
  onBack,
  onRetryWeak
}: {
  session: SessionState;
  reward: SessionRewardSummary | null;
  phrases: PhraseBankItem[];
  onAddPhrase: (text: string) => void;
  onBack: () => void;
  onRetryWeak: () => void;
}) {
  const result = session.submitted!;
  const answerById = new Map(result.answers.map((answer) => [answer.questionId, answer]));
  return (
    <>
      <PageHeader
        eyebrow="Review"
        title={`${result.score}/${result.totalMc} correct`}
        actions={
          <>
            <Button onClick={onRetryWeak} icon={<ArrowCounterClockwise size={18} weight="duotone" />}>Retake Weak Topics</Button>
            <Button tone="primary" onClick={onBack} icon={<House size={18} weight="duotone" />}>Dashboard</Button>
          </>
        }
      />

      <PhraseQuickAdd onAddPhrase={onAddPhrase} phrases={phrases} />

      {reward && (
        <section className={cx("review-summary", reward.leveledUp && "level-up")}>
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
          {reward.milestones.length > 0 && (
            <div className="achievement-row">
              {reward.milestones.map((milestone) => (
                <Badge tone={rewardTone[milestone.tone]} key={milestone.id}>
                  <Sparkle size={14} weight="duotone" /> {milestone.label} <strong>{milestone.value}</strong>
                </Badge>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="review-list">
        {session.questions.map((question, index) => {
          const answer = answerById.get(question.id);
          const correct = answer?.correct;
          return (
            <StudyCard
              as="article"
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
                {correct === true && <CheckCircle className="ok" weight="duotone" />}
                {correct === false && <XCircle className="bad" weight="duotone" />}
                {correct === undefined && <Question weight="duotone" />}
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
                  <ul className="list-disc pl-6">{question.rubric.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
              )}
              <p className="explanation">{question.explanation}</p>
              <p className="source">{question.sourcePath}</p>
            </StudyCard>
          );
        })}
      </section>
    </>
  );
}
