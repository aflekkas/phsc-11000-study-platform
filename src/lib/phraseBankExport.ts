import type { PhraseBankItem, PhraseSource } from "./storage";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function sourceLabel(source: PhraseSource) {
  const parts = [
    source.lectureTitle ?? source.label,
    source.cluster,
    source.questionId ? `question ${source.questionId}` : undefined
  ].filter(Boolean);
  return parts.join(" - ");
}

function phraseSourceLine(source: PhraseSource) {
  const label = sourceLabel(source) || "Saved phrase";
  return `  - ${label} (${formatDate(source.capturedAt)})`;
}

export function sortedPhraseBank(phrases: PhraseBankItem[]) {
  return [...phrases].sort(
    (a, b) => Number(b.starred) - Number(a.starred) || b.updatedAt.localeCompare(a.updatedAt)
  );
}

export function buildPhraseBankMarkdown(phrases: PhraseBankItem[], exportedAt = new Date()) {
  const sorted = sortedPhraseBank(phrases);
  const lines = [
    "# PHSC 11000 Phrase Bank",
    "",
    `Exported: ${formatDate(exportedAt.toISOString())}`,
    `Phrases: ${sorted.length}`,
    ""
  ];

  if (sorted.length === 0) {
    lines.push("No phrases saved yet.", "");
    return `${lines.join("\n")}\n`;
  }

  for (const phrase of sorted) {
    lines.push(`## ${phrase.text}`);
    lines.push("");
    if (phrase.starred) lines.push("- Starred: yes");
    lines.push(`- Captures: ${phrase.captureCount}`);
    lines.push(`- Updated: ${formatDate(phrase.updatedAt)}`);
    if (phrase.note?.trim()) lines.push(`- Note: ${phrase.note.trim()}`);
    if (phrase.sources.length > 0) {
      lines.push("- Sources:");
      lines.push(...phrase.sources.map(phraseSourceLine));
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

export function phraseBankMarkdownFileName(now = new Date()) {
  return `phsc-11000-phrase-bank-${now.toISOString().slice(0, 10)}.md`;
}
