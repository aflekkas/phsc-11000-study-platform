import { Sparkle, Target } from "@phosphor-icons/react";
import { useEffect, type CSSProperties } from "react";
import type { RewardEvent } from "../../lib/gamification";

export function RewardLayer({ event, onDone }: { event: RewardEvent | null; onDone: () => void }) {
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
          {event.confetti === "none" ? <Target size={18} weight="duotone" /> : <Sparkle size={18} weight="duotone" />}
        </span>
        <div>
          <strong>{event.title}</strong>
          <p>{event.detail}</p>
        </div>
      </div>
    </div>
  );
}
