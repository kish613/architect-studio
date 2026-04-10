import { useState, useRef } from "react";
import { useScene } from "@/stores/use-scene";
import { generateFloorplanFromImage } from "@/lib/api";
import { Upload, Sparkles, Loader2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { loadPascalScene } from "@shared/pascal-load";

/**
 * AI generation panel (BIM-first).
 *
 * Accepts a floor plan image OR PDF. The endpoint now runs the canonical
 * BIM pipeline and returns canonicalJson + a derived Pascal sceneData for
 * legacy editor compatibility. We load the sceneData into the existing
 * editor store, but we also surface a summary so the UI can reason about
 * the BIM model (rooms / doors / windows / furniture counts).
 */

const ACCEPTED_TYPES = "image/*,application/pdf,.pdf";

function isAcceptedFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  if (file.type === "application/pdf") return true;
  // Some browsers / OSs don't set MIME type for PDF drops — fall back to ext.
  return file.name.toLowerCase().endsWith(".pdf");
}

export function AIGeneratePanel() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { floorplanId, loadScene } = useScene();
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    if (!floorplanId) {
      toast({
        title: "Save first",
        description: "Please save the floorplan before generating.",
        variant: "destructive",
      });
      return;
    }

    if (!isAcceptedFile(file)) {
      toast({
        title: "Unsupported file",
        description: "Please upload a floor plan image or PDF.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setSummary(null);
    try {
      const result = await generateFloorplanFromImage(floorplanId, file);

      // Load legacy Pascal sceneData for the existing editor.
      const parsed = loadPascalScene(result.sceneData);
      if (parsed.status === "error") {
        throw new Error(
          parsed.diagnostics.map((d) => d.message).join(" | ")
        );
      }
      loadScene(parsed.sceneData, floorplanId);

      const s = result.summary;
      const nextSummary = `${s.levels} level${s.levels === 1 ? "" : "s"}, ${s.walls} walls, ${s.rooms} rooms, ${s.doors} doors, ${s.windows} windows`;
      setSummary(nextSummary);

      toast({
        title: "BIM model generated",
        description: nextSummary,
      });
    } catch (err) {
      toast({
        title: "Generation failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">
          AI Generate
        </h3>
      </div>
      <p className="text-xs text-white/40">
        Upload a floor plan image or PDF — we build a canonical BIM model and
        drop it into the editor.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
          isDragging
            ? "border-primary bg-primary/10"
            : "border-white/20 hover:border-white/40"
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        {isGenerating ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-xs text-white/60">Running BIM pipeline…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-white/40">
              <Upload className="w-6 h-6" />
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-xs text-white/60">
              Drop image or PDF, or click to upload
            </p>
          </div>
        )}
      </div>

      {summary && (
        <p className="text-[11px] text-white/50">Extracted: {summary}</p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
