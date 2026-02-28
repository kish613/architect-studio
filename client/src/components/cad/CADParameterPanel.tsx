import { useCADStore } from "@/hooks/use-cad-params";
import { getPDRSliderBounds } from "@/lib/cad/extension-factory";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MIN_EXTENSION_DEPTH,
  MIN_EXTENSION_WIDTH,
  MIN_EXTENSION_HEIGHT,
  SLIDER_STEP,
} from "@/lib/cad/constants";
import { AlertTriangle, Ruler, ArrowUpDown, ArrowLeftRight, MoveVertical } from "lucide-react";

const extensionTypeLabels: Record<string, string> = {
  rear_single_storey: "Rear Single Storey",
  rear_two_storey: "Rear Two Storey",
  side: "Side Extension",
  loft: "Loft Conversion",
  wraparound: "Wraparound",
  basement: "Basement",
  outbuilding: "Outbuilding",
};

function PDRWarning({ currentValue, pdrLimit, unit }: { currentValue: number; pdrLimit: number; unit: string }) {
  if (currentValue <= pdrLimit) return null;
  return (
    <div className="flex items-center gap-1.5 mt-1 text-amber-400 text-[11px]">
      <AlertTriangle className="w-3 h-3 shrink-0" />
      <span>
        Exceeds PDR limit ({pdrLimit}{unit}) &mdash; planning permission required
      </span>
    </div>
  );
}

export function CADParameterPanel() {
  const { sceneParams, pdrAssessment, updateExtensionParam } = useCADStore();
  const { extensions } = sceneParams;

  if (extensions.length === 0) {
    return (
      <div className="p-4 text-center text-white/50 text-sm">
        No extensions to configure
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1">
      {extensions.map((ext, index) => {
        const bounds = getPDRSliderBounds(ext.type, pdrAssessment);
        const label = extensionTypeLabels[ext.type] || ext.type;

        return (
          <div key={`${ext.type}-${index}`} className="space-y-4">
            <div className="flex items-center gap-2">
              <Ruler className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-semibold text-white">{label}</h4>
            </div>

            {/* Depth slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-white/70 flex items-center gap-1">
                  <ArrowUpDown className="w-3 h-3" /> Depth
                </Label>
                <span className="text-xs font-mono text-primary">{ext.depthM.toFixed(1)}m</span>
              </div>
              <Slider
                value={[ext.depthM]}
                min={MIN_EXTENSION_DEPTH}
                max={bounds.maxDepthM}
                step={SLIDER_STEP}
                onValueChange={([v]) => updateExtensionParam(index, "depthM", v)}
                className="w-full"
              />
              <PDRWarning currentValue={ext.depthM} pdrLimit={bounds.pdrDepthLimit} unit="m" />
            </div>

            {/* Width slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-white/70 flex items-center gap-1">
                  <ArrowLeftRight className="w-3 h-3" /> Width
                </Label>
                <span className="text-xs font-mono text-primary">{ext.widthM.toFixed(1)}m</span>
              </div>
              <Slider
                value={[ext.widthM]}
                min={MIN_EXTENSION_WIDTH}
                max={bounds.maxWidthM || 12}
                step={SLIDER_STEP}
                onValueChange={([v]) => updateExtensionParam(index, "widthM", v)}
                className="w-full"
              />
            </div>

            {/* Height slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-white/70 flex items-center gap-1">
                  <MoveVertical className="w-3 h-3" /> Height
                </Label>
                <span className="text-xs font-mono text-primary">{ext.heightM.toFixed(1)}m</span>
              </div>
              <Slider
                value={[ext.heightM]}
                min={MIN_EXTENSION_HEIGHT}
                max={bounds.maxHeightM}
                step={SLIDER_STEP}
                onValueChange={([v]) => updateExtensionParam(index, "heightM", v)}
                className="w-full"
              />
              <PDRWarning currentValue={ext.heightM} pdrLimit={bounds.maxHeightM - 1} unit="m" />
            </div>

            {/* Roof type */}
            <div className="space-y-1.5">
              <Label className="text-xs text-white/70">Roof Type</Label>
              <Select
                value={ext.roofType}
                onValueChange={(v) => updateExtensionParam(index, "roofType", v as "flat" | "pitched" | "hipped")}
              >
                <SelectTrigger className="h-8 text-xs bg-black/40 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat</SelectItem>
                  <SelectItem value="pitched">Pitched</SelectItem>
                  <SelectItem value="hipped">Hipped</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Attachment side */}
            <div className="space-y-1.5">
              <Label className="text-xs text-white/70">Attachment Side</Label>
              <Select
                value={ext.attachmentSide}
                onValueChange={(v) => updateExtensionParam(index, "attachmentSide", v as "rear" | "left" | "right")}
              >
                <SelectTrigger className="h-8 text-xs bg-black/40 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rear">Rear</SelectItem>
                  <SelectItem value="left">Left Side</SelectItem>
                  <SelectItem value="right">Right Side</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Calculated area */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg px-3 py-2 text-xs">
              <span className="text-white/70">Floor area: </span>
              <span className="text-primary font-semibold">
                {(ext.depthM * ext.widthM).toFixed(1)}m&sup2;
              </span>
            </div>

            {index < extensions.length - 1 && (
              <div className="border-b border-white/10" />
            )}
          </div>
        );
      })}
    </div>
  );
}
