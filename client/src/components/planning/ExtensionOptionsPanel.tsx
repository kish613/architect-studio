import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight, Clock, Shield, PoundSterling, Layers } from "lucide-react";
import type { ExtensionOption, ExtensionOptionTier } from "@/lib/api";

interface ExtensionOptionsPanelProps {
  options: ExtensionOption[];
  selectedTier: ExtensionOptionTier | null;
  onSelect: (tier: ExtensionOptionTier) => void;
  isSelecting?: boolean;
}

function getLikelihoodColor(likelihood: string): string {
  switch (likelihood) {
    case "very_high": return "bg-green-500/20 text-green-400 border-green-500/30";
    case "high": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "medium": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "low": return "bg-red-500/20 text-red-400 border-red-500/30";
    default: return "bg-muted text-muted-foreground";
  }
}

function getLikelihoodLabel(likelihood: string): string {
  switch (likelihood) {
    case "very_high": return "Very High";
    case "high": return "High";
    case "medium": return "Medium";
    case "low": return "Low";
    default: return likelihood;
  }
}

function formatCost(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

function OptionCard({
  option,
  isSelected,
  onSelect,
  isSelecting,
}: {
  option: ExtensionOption;
  isSelected: boolean;
  onSelect: () => void;
  isSelecting?: boolean;
}) {
  return (
    <Card
      className={`border transition-all cursor-pointer hover:border-primary/50 ${
        isSelected
          ? "border-primary ring-2 ring-primary/30 bg-primary/5"
          : "border-white/20 bg-white/5"
      } backdrop-blur-xl`}
      onClick={onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{option.label}</CardTitle>
          {isSelected && (
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <Check className="w-4 h-4 text-primary-foreground" />
            </div>
          )}
        </div>
        <Badge className={`${getLikelihoodColor(option.approvalLikelihood)} text-xs w-fit`}>
          <Shield className="w-3 h-3 mr-1" />
          {getLikelihoodLabel(option.approvalLikelihood)} Approval
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Extensions list */}
        <div className="space-y-2">
          {option.extensions.map((ext, i) => (
            <div key={i} className="flex items-start gap-2">
              <ArrowRight className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm">{ext.description}</p>
                <p className="text-xs text-muted-foreground">
                  +{ext.additionalSqM} m²
                  {ext.pdrCompliant && (
                    <span className="text-green-400 ml-2">PDR compliant</span>
                  )}
                  {ext.requiresPlanningPermission && (
                    <span className="text-amber-400 ml-2">Needs planning</span>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Layers className="w-3.5 h-3.5" />
              <span className="text-xs">Total Added</span>
            </div>
            <p className="text-sm font-semibold">+{option.totalAdditionalSqM} m²</p>
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-xs">Timeline</span>
            </div>
            <p className="text-sm font-semibold">{option.estimatedTimeline}</p>
          </div>
          {option.costRange && (
            <div className="col-span-2 space-y-0.5">
              <div className="flex items-center gap-1 text-muted-foreground">
                <PoundSterling className="w-3.5 h-3.5" />
                <span className="text-xs">Estimated Cost</span>
              </div>
              <p className="text-sm font-semibold">
                {formatCost(option.costRange.min)} – {formatCost(option.costRange.max)}
              </p>
            </div>
          )}
        </div>

        {/* Select button */}
        <Button
          variant={isSelected ? "default" : "outline"}
          className="w-full"
          disabled={isSelecting}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          {isSelected ? "Selected" : "Select Option"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function ExtensionOptionsPanel({
  options,
  selectedTier,
  onSelect,
  isSelecting,
}: ExtensionOptionsPanelProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Layers className="w-5 h-5 text-primary" />
        Extension Options
      </h3>
      <p className="text-sm text-muted-foreground">
        Choose from three tiers based on your goals, budget, and appetite for planning applications.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {options.map((option) => (
          <OptionCard
            key={option.tier}
            option={option}
            isSelected={selectedTier === option.tier}
            onSelect={() => onSelect(option.tier)}
            isSelecting={isSelecting}
          />
        ))}
      </div>
    </div>
  );
}
