import { useRef } from "react";
import { CheckCircle, DownloadSimple, GearSix, UploadSimple, WarningCircle } from "@phosphor-icons/react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { StudyCard } from "../../components/ui/StudyCard";
import type { ProgressState } from "../../lib/storage";

export type ProgressTransferStatus = {
  message: string;
  tone: "error" | "success";
} | null;

export function ProgressSettings({
  progress,
  status,
  onExport,
  onImport
}: {
  progress: ProgressState;
  status: ProgressTransferStatus;
  onExport: () => void;
  onImport: (file: File) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const flaggedCount = Object.values(progress.flagged).filter(Boolean).length;
  const sessionCount = progress.sessions.length + progress.freestyle.length;

  return (
    <StudyCard className="progress-settings-panel lg:col-span-2">
      <div className="settings-head">
        <div>
          <p className="eyebrow">Settings</p>
          <h2 className="card-title text-lg">
            <GearSix size={18} weight="duotone" /> Progress
          </h2>
        </div>
        <div className="settings-badges" aria-label="Saved progress totals">
          <Badge tone="primary">{sessionCount} reps</Badge>
          <Badge tone="accent">{progress.phraseBank.length} phrases</Badge>
          <Badge tone="warning">{flaggedCount} flagged</Badge>
        </div>
      </div>

      <div className="settings-actions">
        <Button tone="primary" onClick={onExport} icon={<DownloadSimple size={18} weight="duotone" />}>
          Export JSON
        </Button>
        <Button onClick={() => fileInputRef.current?.click()} icon={<UploadSimple size={18} weight="duotone" />}>
          Import JSON
        </Button>
        <input
          ref={fileInputRef}
          className="sr-only"
          type="file"
          accept="application/json,.json"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (file) onImport(file);
          }}
        />
      </div>

      {status && (
        <p className={`progress-transfer-status ${status.tone}`} role={status.tone === "error" ? "alert" : "status"}>
          {status.tone === "success" ? <CheckCircle size={16} weight="duotone" /> : <WarningCircle size={16} weight="duotone" />}
          {status.message}
        </p>
      )}
    </StudyCard>
  );
}
