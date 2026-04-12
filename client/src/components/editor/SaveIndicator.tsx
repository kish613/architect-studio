import { useState, useEffect } from "react";
import { useScene } from "@/stores/use-scene";
import { useBimScene } from "@/stores/use-bim-scene";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function SaveIndicator({ bimMode = false }: { bimMode?: boolean }) {
  const sceneSaving = useScene((s) => ({
    isSaving: s.isSaving,
    hasUnsavedChanges: s.hasUnsavedChanges,
    lastSavedAt: s.lastSavedAt,
  }));
  const bimSaving = useBimScene((s) => ({
    isSaving: s.isSaving,
    hasUnsavedChanges: s.hasUnsavedChanges,
    lastSavedAt: s.lastSavedAt,
  }));

  const { isSaving, hasUnsavedChanges, lastSavedAt } = bimMode ? bimSaving : sceneSaving;

  const [, setTick] = useState(0);
  useEffect(() => {
    if (!lastSavedAt) return;
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, [lastSavedAt]);

  if (isSaving) {
    return (
      <div className={cn("flex items-center gap-1.5 text-xs text-white/50")}>
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Saving...</span>
      </div>
    );
  }

  if (hasUnsavedChanges) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-amber-400/70">
        <AlertCircle className="h-3 w-3" />
        <span>Unsaved changes</span>
      </div>
    );
  }

  if (lastSavedAt) {
    const minutes = Math.floor((Date.now() - lastSavedAt) / 60000);
    const label = minutes === 0 ? "just now" : `${minutes}m ago`;
    return (
      <div className="flex items-center gap-1.5 text-xs text-white/40">
        <CheckCircle className="h-3 w-3" />
        <span>Saved {label}</span>
      </div>
    );
  }

  return null;
}
