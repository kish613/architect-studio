import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scale, Check, X, AlertTriangle } from "lucide-react";
import type { PDRAssessment } from "@/lib/api";

interface PDRSummaryCardProps {
  pdrAssessment: PDRAssessment;
}

function PermittedBadge({ permitted }: { permitted: boolean }) {
  return permitted ? (
    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs gap-1">
      <Check className="w-3 h-3" />
      Permitted
    </Badge>
  ) : (
    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs gap-1">
      <X className="w-3 h-3" />
      Needs Planning
    </Badge>
  );
}

interface LimitRowProps {
  label: string;
  limits: { maxDepthM: number; maxHeightM: number; permitted: boolean; notes: string[] };
}

function LimitRow({ label, limits }: LimitRowProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">
          Max depth: {limits.maxDepthM}m • Max height: {limits.maxHeightM}m
        </p>
      </div>
      <PermittedBadge permitted={limits.permitted} />
    </div>
  );
}

export function PDRSummaryCard({ pdrAssessment }: PDRSummaryCardProps) {
  return (
    <Card className="border-white/20 bg-white/5 backdrop-blur-xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Scale className="w-5 h-5 text-primary" />
          Permitted Development Rights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {pdrAssessment.overallPDRSummary}
        </p>

        <div className="space-y-1">
          <LimitRow label="Rear (Single Storey)" limits={pdrAssessment.rearSingleStorey} />
          <LimitRow label="Rear (Two Storey)" limits={pdrAssessment.rearTwoStorey} />
          <LimitRow label="Side Extension" limits={pdrAssessment.side} />
          <LimitRow label="Loft Conversion" limits={pdrAssessment.loft} />
          <LimitRow label="Outbuilding" limits={pdrAssessment.outbuilding} />
        </div>

        {pdrAssessment.conservationRestrictions.length > 0 && (
          <div className="border-t border-white/10 pt-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <p className="text-sm font-medium text-amber-400">Restrictions</p>
            </div>
            <ul className="space-y-1">
              {pdrAssessment.conservationRestrictions.map((r, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
