import { CornersIn, MusicNoteSimple, Pause, Play, SkipBack, SkipForward } from "@phosphor-icons/react";
import type { MouseEvent } from "react";
import { Button, IconButton } from "../../components/ui/Button";
import { cx } from "../../lib/classes";
import type { StudyMusicState } from "../../lib/studyMusic";

export function StudyMusicPlayer({
  minimized,
  state,
  onNext,
  onMinimize,
  onPrevious,
  onRestore,
  onSeek,
  onToggle
}: {
  minimized: boolean;
  state: StudyMusicState;
  onNext: () => void;
  onMinimize: () => void;
  onPrevious: () => void;
  onRestore: () => void;
  onSeek: (ratio: number) => void;
  onToggle: () => void;
}) {
  const playerClassName = cx("music-player", state.playing && "is-playing", minimized && "is-minimized");
  const progress = state.duration > 0 ? Math.min(100, (state.currentTime / state.duration) * 100) : 0;
  const handleSeek = (event: MouseEvent<HTMLInputElement>) => {
    onSeek(Number(event.currentTarget.value) / 100);
  };

  if (minimized) {
    return (
      <aside className={playerClassName} aria-label="Lofi focus music player">
        <Button
          className="music-restore"
          onClick={onRestore}
          tone="ghost"
          aria-label="Expand lofi focus music player"
          title="Expand lofi focus music player"
          icon={<MusicNoteSimple size={15} weight="duotone" />}
        >
          pocket lofi
        </Button>
        <IconButton
          className="music-control music-play"
          label="Play lofi focus music"
          onClick={onToggle}
          aria-pressed={false}
          tone="primary"
        >
          <Play size={17} weight="fill" />
        </IconButton>
      </aside>
    );
  }

  return (
    <aside className={playerClassName} aria-label="Lofi focus music player">
      <span className="music-art" aria-hidden="true">
        <MusicNoteSimple size={18} weight="duotone" />
      </span>
      <div className="music-copy">
        <span className="music-kicker">
          <MusicNoteSimple size={14} weight="duotone" /> pocket lofi
        </span>
        <strong>{state.title}</strong>
        <span>
          {state.artist} · {state.mood} · {state.trackIndex + 1}/{state.trackCount}
        </span>
      </div>
      <div className="music-controls">
        <IconButton className="music-control" label="Previous lofi track" onClick={onPrevious} tone="ghost">
          <SkipBack size={16} weight="duotone" />
        </IconButton>
        <IconButton
          className="music-control music-play"
          label={state.playing ? "Pause lofi focus music" : "Play lofi focus music"}
          onClick={onToggle}
          aria-pressed={state.playing}
          tone="primary"
        >
          {state.playing ? <Pause size={17} weight="fill" /> : <Play size={17} weight="fill" />}
        </IconButton>
        <IconButton className="music-control" label="Next lofi track" onClick={onNext} tone="ghost">
          <SkipForward size={16} weight="duotone" />
        </IconButton>
        <IconButton
          className="music-control music-minimize"
          label="Minimize lofi focus music player"
          onClick={onMinimize}
          tone="ghost"
        >
          <CornersIn size={15} weight="duotone" />
        </IconButton>
      </div>
      <input
        className="range range-primary range-xs music-progress"
        type="range"
        value={Math.round(progress)}
        max={100}
        onChange={handleSeek}
        aria-label="Seek lofi track"
        title="Seek lofi track"
      />
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
