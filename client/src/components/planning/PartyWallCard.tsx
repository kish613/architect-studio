import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Fence, AlertCircle } from "lucide-react";
import type { PartyWallAssessment } from "@/lib/api";

interface PartyWallCardProps {
  assessment: PartyWallAssessment;
}

function formatCost(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function PartyWallCard({ assessment }: PartyWallCardProps) {
  return (
    <Card className="border-white/20 bg-white/5 backdrop-blur-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Fence className="w-5 h-5 text-primary" />
            Party Wall
          </CardTitle>
          <Badge
            className={
              assessment.required
                ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                : "bg-green-500/20 text-green-400 border-green-500/30"
            }
          >
            {assessment.required ? "Required" : "Not Required"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {assessment.affectedBoundaries.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Affected Boundaries</p>
            <div className="flex flex-wrap gap-1.5">
              {assessment.affectedBoundaries.map((b, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {b}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {assessment.noticeRequirements.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Notice Requirements</p>
            <ul className="space-y-1">
              {assessment.noticeRequirements.map((n, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                  {n}
                </li>
              ))}
            </ul>
          </div>
        )}

        {assessment.required && (
          <div className="border-t border-white/10 pt-3">
            <p className="text-xs text-muted-foreground">Estimated Surveyor Cost</p>
            <p className="text-sm font-medium">
              {formatCost(assessment.estimatedSurveyorCost.min)} – {formatCost(assessment.estimatedSurveyorCost.max)}
            </p>
          </div>
        )}

        {assessment.notes.length > 0 && (
          <div className="border-t border-white/10 pt-3">
            {assessment.notes.map((note, i) => (
              <p key={i} className="text-xs text-muted-foreground">{note}</p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
