import { useScene } from "@/stores/use-scene";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function SaveIndicator() {
  const { isSaving, hasUnsavedChanges, lastSavedAt } = useScene();

  if (isSaving) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-white/50">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Saving...</span>
      </div>
    );
  }

  if (hasUnsavedChanges) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-amber-400/70">
        <AlertCircle className="w-3 h-3" />
        <span>Unsaved changes</span>
      </div>
    );
  }

  if (lastSavedAt) {
    const minutes = Math.floor((Date.now() - lastSavedAt) / 60000);
    const label = minutes === 0 ? "just now" : `${minutes}m ago`;
    return (
      <div className="flex items-center gap-1.5 text-xs text-white/40">
        <CheckCircle className="w-3 h-3" />
        <span>Saved {label}</span>
      </div>
    );
  }

  return null;
}
