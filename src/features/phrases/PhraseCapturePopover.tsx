import type { CSSProperties } from "react";
import { BookmarkSimple } from "@phosphor-icons/react";
import { Button } from "../../components/ui/Button";
import type { PhraseSelection } from "../../types/study";

export function PhraseCapturePopover({
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
      <Button tone="primary" size="sm" onClick={onAdd} icon={<BookmarkSimple size={16} weight="duotone" />}>
        Save
      </Button>
    </div>
  );
}
