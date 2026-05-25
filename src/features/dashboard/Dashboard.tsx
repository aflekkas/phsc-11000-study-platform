import { ArrowCounterClockwise, ChartBar, CheckCircle, Fire, Lightning, Shuffle, Sparkle, Target, Timer } from "@phosphor-icons/react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { CountUp } from "../../components/ui/CountUp";
import { PageHeader } from "../../components/ui/PageHeader";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { StatTile } from "../../components/ui/StatTile";
import { StudyCard } from "../../components/ui/StudyCard";
import { multipleChoiceQuestions } from "../../lib/questionBank";
import type { RewardTone, StudyGameStats } from "../../lib/gamification";
import type { PhraseBankItem, ProgressState } from "../../lib/storage";
import type { Preset } from "../../types/study";
import type { weakTags } from "../../lib/storage";
import { PhraseBankPanel } from "../phrases/PhraseBankPanel";
import { PhraseQuickAdd } from "../phrases/PhraseQuickAdd";

const milestoneTone: Record<RewardTone, "success" | "warning" | "info" | "accent" | "error"> = {
  green: "success",
  amber: "warning",
  blue: "info",
  purple: "accent",
  red: "error"
};

const mascotByMood: Record<StudyGameStats["mood"], string> = {
  steady: `${import.meta.env.BASE_URL}images/core-buddy-steady.png`,
  warming: `${import.meta.env.BASE_URL}images/core-buddy-warming.png`,
  stressed: `${import.meta.env.BASE_URL}images/core-buddy-stressed.png`,
  locked: `${import.meta.env.BASE_URL}images/core-buddy-locked.png`
};

export function Dashboard({
  progress,
  game,
  weak,
  bankErrors,
  phrases,
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
  phrases: PhraseBankItem[];
  onAddPhrase: (text: string) => void;
  onDeletePhrase: (phraseId: string) => void;
  onTogglePhraseStar: (phraseId: string) => void;
  onUpdatePhraseNote: (phraseId: string, note: string) => void;
  onStart: (preset: Preset) => void;
}) {
  return (
    <>
      <PageHeader eyebrow="PHSC 11000" title="Final Exam Practice" />

      <DashboardHero game={game} />

      {bankErrors.length > 0 && <div className="alert alert-error">{bankErrors[0]}</div>}

      <StudySnapshot game={game} />

      <PhraseQuickAdd onAddPhrase={onAddPhrase} phrases={phrases} variant="dock" />

      <section className="command-grid" aria-label="Study modes">
        <Button tone="primary" onClick={() => onStart("Mock Exam")} icon={<Timer size={19} weight="duotone" />}>
          Mock Exam
        </Button>
        <Button tone="accent" onClick={() => onStart("Freestyle")} icon={<Shuffle size={19} weight="duotone" />}>
          Freestyle
        </Button>
        <Button onClick={() => onStart("Quick Drill")} icon={<CheckCircle size={19} weight="duotone" />}>
          Quick Drill
        </Button>
        <Button onClick={() => onStart("Weak Retake")} icon={<ArrowCounterClockwise size={19} weight="duotone" />}>
          Weak Retake
        </Button>
      </section>

      <section className="dashboard-grid">
        <StudyCard>
          <h2 className="card-title">Weak Topics</h2>
          {weak.length === 0 ? (
            <p className="muted">No weak-topic data yet. Run a drill or mock exam first.</p>
          ) : (
            <div className="tag-list">
              {weak.map((item) => (
                <Badge key={item.tag} tone="warning">{item.tag}</Badge>
              ))}
            </div>
          )}
        </StudyCard>
        <StudyCard>
          <h2 className="card-title">Recent Sessions</h2>
          {progress.sessions.length === 0 ? (
            <p className="muted">No sessions yet.</p>
          ) : (
            <ul className="session-list">
              {progress.sessions.slice(0, 6).map((session) => (
                <li key={session.id}>
                  <span>{session.preset}</span>
                  <Badge tone="success">
                    {session.score}/{session.totalMc}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </StudyCard>
        <PhraseBankPanel
          phrases={phrases}
          onDeletePhrase={onDeletePhrase}
          onTogglePhraseStar={onTogglePhraseStar}
          onUpdatePhraseNote={onUpdatePhraseNote}
        />
      </section>
    </>
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
        <ProgressBar value={game.levelProgress} label={`${game.levelProgress}% to next level`} />
        <div className="hero-meta">
          <span>
            <Lightning size={16} weight="duotone" /> <CountUp value={game.xp} /> XP total
          </span>
          <span>{game.xpForNextLevel} XP to next level</span>
        </div>
      </div>
      <div className="hero-buddy">
        <div className="mascot-frame">
          <img src={mascotByMood[game.mood]} alt={`Core Buddy mood: ${game.moodLabel}`} />
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
  return (
    <section className="snapshot-grid" aria-label="Progress snapshot">
      <StatTile icon={<Target weight="duotone" />} label="Prepared" value={<><CountUp value={game.prepScore} />%</>} tone="teal" />
      <StatTile icon={<ChartBar weight="duotone" />} label="Accuracy" value={<><CountUp value={game.accuracy} />%</>} tone="blue" />
      <StatTile icon={<Sparkle weight="duotone" />} label="Coverage" value={<><CountUp value={game.coverage} />%</>} tone="purple" />
      <StatTile icon={<Fire weight="duotone" />} label="Missed" value={<CountUp value={game.missed} />} tone="red" />
      <div className="achievement-row">
        <Badge tone="primary">{game.correct} correct across {multipleChoiceQuestions.length}</Badge>
        {game.milestones.map((milestone) => (
          <Badge tone={milestoneTone[milestone.tone]} key={milestone.id}>
            <Sparkle size={14} weight="duotone" /> {milestone.label} <strong>{milestone.value}</strong>
          </Badge>
        ))}
      </div>
    </section>
  );
}
