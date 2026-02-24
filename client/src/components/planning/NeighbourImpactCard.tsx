import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Sun, Eye, Lightbulb } from "lucide-react";
import type { NeighbourImpactAnalysis } from "@/lib/api";

interface NeighbourImpactCardProps {
  impact: NeighbourImpactAnalysis;
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case "none": return "bg-green-500/20 text-green-400 border-green-500/30";
    case "minor": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "moderate": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "significant": return "bg-red-500/20 text-red-400 border-red-500/30";
    default: return "bg-muted text-muted-foreground";
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function NeighbourImpactCard({ impact }: NeighbourImpactCardProps) {
  return (
    <Card className="border-white/20 bg-white/5 backdrop-blur-xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="w-5 h-5 text-primary" />
          Neighbour Impact
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 45-degree rule */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">45-Degree Rule</p>
            <p className="text-xs text-muted-foreground">{impact.fortyFiveDegreeRule.details}</p>
          </div>
          <Badge
            className={
              impact.fortyFiveDegreeRule.passed
                ? "bg-green-500/20 text-green-400 border-green-500/30 flex-shrink-0"
                : "bg-red-500/20 text-red-400 border-red-500/30 flex-shrink-0"
            }
          >
            {impact.fortyFiveDegreeRule.passed ? "Passed" : "Failed"}
          </Badge>
        </div>

        {/* Overshadowing */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-sm font-medium">Overshadowing</p>
            </div>
            <p className="text-xs text-muted-foreground">{impact.overshadowing.details}</p>
          </div>
          <Badge className={`${getSeverityColor(impact.overshadowing.severity)} flex-shrink-0`}>
            {capitalize(impact.overshadowing.severity)}
          </Badge>
        </div>

        {/* Overlooking */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-sm font-medium">Overlooking</p>
            </div>
            <p className="text-xs text-muted-foreground">{impact.overlooking.details}</p>
          </div>
          <Badge className={`${getSeverityColor(impact.overlooking.severity)} flex-shrink-0`}>
            {capitalize(impact.overlooking.severity)}
          </Badge>
        </div>

        {/* Mitigations */}
        {impact.mitigations.length > 0 && (
          <div className="border-t border-white/10 pt-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Lightbulb className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium">Suggested Mitigations</p>
            </div>
            <ul className="space-y-1">
              {impact.mitigations.map((m, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  {m}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
