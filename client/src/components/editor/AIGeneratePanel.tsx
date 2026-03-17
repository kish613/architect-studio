import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useScene } from "@/stores/use-scene";
import { generateFloorplanFromImage } from "@/lib/api";
import { sceneDataSchema } from "@/lib/pascal/schemas";
import { Upload, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function AIGeneratePanel() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { floorplanId, loadScene } = useScene();
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    if (!floorplanId) {
      toast({ title: "Save first", description: "Please save the floorplan before generating.", variant: "destructive" });
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file.", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateFloorplanFromImage(floorplanId, file);
      const parsed = sceneDataSchema.safeParse(JSON.parse(result.sceneData));
      if (!parsed.success) {
        throw new Error("AI returned invalid scene data");
      }
      loadScene(parsed.data, floorplanId);
      toast({ title: "Floorplan generated!", description: "Your 2D floorplan has been converted to 3D." });
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
        <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">AI Generate</h3>
      </div>
      <p className="text-xs text-white/40">Upload a 2D floorplan image to automatically generate the 3D layout.</p>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
          isDragging ? "border-primary bg-primary/10" : "border-white/20 hover:border-white/40"
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        {isGenerating ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-xs text-white/60">Analyzing floorplan...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-6 h-6 text-white/40" />
            <p className="text-xs text-white/60">Drop image or click to upload</p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
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
