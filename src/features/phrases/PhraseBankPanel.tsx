import { useMemo, useState } from "react";
import { BookmarkSimple, DownloadSimple, MagnifyingGlass, NotePencil, Star, Trash } from "@phosphor-icons/react";
import { Badge } from "../../components/ui/Badge";
import { IconButton } from "../../components/ui/Button";
import { StudyCard } from "../../components/ui/StudyCard";
import { cx } from "../../lib/classes";
import { sortedPhraseBank } from "../../lib/phraseBankExport";
import type { PhraseBankItem } from "../../lib/storage";

export function PhraseBankPanel({
  phrases,
  onDeletePhrase,
  onExport,
  onTogglePhraseStar,
  onUpdatePhraseNote
}: {
  phrases: PhraseBankItem[];
  onDeletePhrase: (phraseId: string) => void;
  onExport: () => void;
  onTogglePhraseStar: (phraseId: string) => void;
  onUpdatePhraseNote: (phraseId: string, note: string) => void;
}) {
  const [query, setQuery] = useState("");
  const sortedPhrases = useMemo(() => sortedPhraseBank(phrases), [phrases]);
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
    <StudyCard className="phrase-bank-panel lg:col-span-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Phrase Bank</p>
          <h2 className="card-title text-lg">
            <BookmarkSimple size={18} weight="duotone" /> Terms to remember
          </h2>
        </div>
        <div className="phrase-bank-actions">
          <IconButton
            disabled={phrases.length === 0}
            label="Export phrase bank"
            onClick={onExport}
            tone="ghost"
          >
            <DownloadSimple size={17} weight="duotone" />
          </IconButton>
          <Badge tone="primary" className="badge-lg">{phrases.length}</Badge>
        </div>
      </div>

      <label className="input input-bordered flex items-center gap-2">
        <MagnifyingGlass size={16} className="text-base-content/55" />
        <input
          className="grow"
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
                  <IconButton
                    className={cx(phrase.starred && "text-warning")}
                    label={phrase.starred ? `Unstar ${phrase.text}` : `Star ${phrase.text}`}
                    onClick={() => onTogglePhraseStar(phrase.id)}
                    tone="ghost"
                  >
                    <Star size={16} weight={phrase.starred ? "fill" : "regular"} />
                  </IconButton>
                  <div className="phrase-main">
                    <strong>{phrase.text}</strong>
                    <span>
                      {sourceLabel}
                      {phrase.captureCount > 1 ? ` x${phrase.captureCount}` : ""}
                    </span>
                  </div>
                  <IconButton
                    className="phrase-delete"
                    label={`Delete ${phrase.text}`}
                    onClick={() => onDeletePhrase(phrase.id)}
                    tone="ghost"
                  >
                    <Trash size={16} weight="duotone" />
                  </IconButton>
                </div>
                <label className="phrase-note-row">
                  <NotePencil size={15} weight="duotone" />
                  <input
                    className="input input-bordered input-sm phrase-note"
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
    </StudyCard>
  );
}
