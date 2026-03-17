import { useEffect, useRef } from "react";
import { useScene } from "@/stores/use-scene";
import { saveFloorplan } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function useAutoSave() {
  const { floorplanId, hasUnsavedChanges, getSceneData, setSaving, markSaved } = useScene();
  const { toast } = useToast();
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!floorplanId || !hasUnsavedChanges) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      try {
        setSaving(true);
        const sceneData = getSceneData();
        await saveFloorplan(floorplanId, {
          sceneData: JSON.stringify(sceneData),
        });
        markSaved();
      } catch {
        setSaving(false);
        toast({
          title: "Save failed",
          description: "Changes could not be saved. Will retry on next edit.",
          variant: "destructive",
        });
      }
    }, 800);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [floorplanId, hasUnsavedChanges]);
}
