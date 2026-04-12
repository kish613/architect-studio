import { useEffect, useRef } from "react";
import { useBimScene } from "@/stores/use-bim-scene";
import { saveFloorplan } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function useBimAutoSave(options?: { disabled?: boolean }) {
  const floorplanId = useBimScene((s) => s.floorplanId);
  const hasUnsavedChanges = useBimScene((s) => s.hasUnsavedChanges);
  const getCanonicalJson = useBimScene((s) => s.getCanonicalJson);
  const setSaving = useBimScene((s) => s.setSaving);
  const markSaved = useBimScene((s) => s.markSaved);
  const { toast } = useToast();
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (options?.disabled) return;
    if (!floorplanId || !hasUnsavedChanges) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      try {
        setSaving(true);
        const canonicalJson = getCanonicalJson();
        await saveFloorplan(floorplanId, { canonicalJson });
        markSaved();
      } catch {
        setSaving(false);
        toast({
          title: "Save failed",
          description: "BIM changes could not be saved. Will retry on next edit.",
          variant: "destructive",
        });
      }
    }, 800);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [floorplanId, hasUnsavedChanges, getCanonicalJson, markSaved, setSaving, toast, options?.disabled]);
}
