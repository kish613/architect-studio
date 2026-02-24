import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileCheck, MapPin, Calendar, Ruler } from "lucide-react";
import type { ApprovalSearchResults } from "@/lib/api";

interface ApprovalsListProps {
  results: ApprovalSearchResults;
  selectedModification: string | null;
  onSelectModification: (type: string) => void;
}

export function ApprovalsList({
  results,
  selectedModification,
  onSelectModification,
}: ApprovalsListProps) {
  const formatModificationType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getApprovalRateColor = (rate: number) => {
    if (rate >= 0.9) return 'text-green-400';
    if (rate >= 0.75) return 'text-yellow-400';
    return 'text-orange-400';
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
          Modification Types Found
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(results.modificationSummary).map(([type, data]) => (
            <Card
              key={type}
              className={`cursor-pointer transition-all border ${
                selectedModification === type
                  ? 'border-primary bg-primary/20 ring-2 ring-primary'
                  : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'
              }`}
              onClick={() => onSelectModification(type)}
            >
              <CardContent className="p-4">
                <p className="font-medium text-sm mb-2">{formatModificationType(type)}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{data.count} found</span>
                  <span className={`text-xs font-medium ${getApprovalRateColor(data.avgApprovalRate)}`}>
                    {Math.round(data.avgApprovalRate * 100)}% approved
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Approvals List */}
      <Card className="border border-white/20 bg-white/5 backdrop-blur-xl rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileCheck className="w-5 h-5 text-primary" />
            Recent Approvals Nearby
            <Badge variant="secondary" className="ml-2">
              {results.totalFound} total
            </Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Within {results.searchRadius}m radius
          </p>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {results.approvals.map((approval, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    selectedModification === approval.modificationType
                      ? 'border-primary/50 bg-primary/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                  onClick={() => onSelectModification(approval.modificationType)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm">{approval.applicationRef}</p>
                      <Badge 
                        variant="outline" 
                        className="mt-1 text-xs capitalize"
                      >
                        {formatModificationType(approval.modificationType)}
                      </Badge>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      <MapPin className="w-3 h-3 mr-1" />
                      {approval.distance}m
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                    {approval.description}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {approval.address}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(approval.decisionDate).toLocaleDateString()}
                    </span>
                    {approval.estimatedSqFt && (
                      <span className="flex items-center gap-1">
                        <Ruler className="w-3 h-3" />
                        +{approval.estimatedSqFt} sq ft
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
