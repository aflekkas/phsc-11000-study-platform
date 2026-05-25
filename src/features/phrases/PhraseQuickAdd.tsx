import { useState, type FormEvent } from "react";
import { BookmarkSimple, CheckCircle, Plus, WarningCircle } from "@phosphor-icons/react";
import { Button } from "../../components/ui/Button";
import { canSavePhrase, cleanPhraseText, MAX_PHRASE_LENGTH, normalizedPhraseKey } from "../../lib/studySession";
import { cx } from "../../lib/classes";
import type { PhraseBankItem } from "../../lib/storage";

export function PhraseQuickAdd({
  onAddPhrase,
  phrases,
  variant = "inline"
}: {
  onAddPhrase: (text: string) => void;
  phrases: PhraseBankItem[];
  variant?: "inline" | "dock";
}) {
  const [value, setValue] = useState("");
  const [savedText, setSavedText] = useState("");
  const normalized = normalizedPhraseKey(value);
  const cleaned = cleanPhraseText(value);
  const isDuplicate = normalized.length > 0 && phrases.some((phrase) => phrase.normalizedText === normalized);
  const isValid = canSavePhrase(value) && !isDuplicate;
  const helper =
    savedText && !value
      ? "Saved to your phrase bank."
      : cleaned.length === 0
      ? "Save terms you want to see again."
      : isDuplicate
        ? "Already in your phrase bank."
        : "Ready to save.";

  const submitPhrase = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValid) return;
    onAddPhrase(cleaned);
    setSavedText(cleaned);
    setValue("");
  };

  return (
    <form
      className={cx("phrase-quick-add", variant === "dock" && "is-dock", isDuplicate && "is-duplicate", savedText && !value && "is-saved")}
      onSubmit={submitPhrase}
    >
      <div className="phrase-entry-row">
        <span className="phrase-quick-icon">
          <BookmarkSimple size={18} weight="duotone" />
        </span>
        <input
          className={cx("input input-bordered min-w-0 flex-1", isDuplicate && "input-warning")}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (savedText) setSavedText("");
          }}
          maxLength={MAX_PHRASE_LENGTH}
          placeholder="Type a species, process, or term"
          aria-describedby="phrase-quick-status"
          aria-invalid={isDuplicate}
          aria-label="Add phrase to bank"
        />
        <Button tone="primary" disabled={!isValid} aria-label="Save phrase" icon={<Plus size={17} weight="bold" />} type="submit">
          Save
        </Button>
      </div>
      <p
        className={cx("phrase-quick-status", isDuplicate && "text-warning", savedText && !value && "text-success")}
        id="phrase-quick-status"
        aria-live="polite"
      >
        {isDuplicate ? <WarningCircle size={15} weight="duotone" /> : savedText && !value ? <CheckCircle size={15} weight="duotone" /> : null}
        <span>{helper}</span>
      </p>
    </form>
  );
}
