import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Home, Calendar, MapPin, Ruler } from "lucide-react";
import type { PropertyAnalysisData } from "@/lib/api";

interface PropertyAnalysisCardProps {
  analysis: PropertyAnalysisData;
}

export function PropertyAnalysisCard({ analysis }: PropertyAnalysisCardProps) {
  const getPotentialColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'none': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-muted';
    }
  };

  return (
    <Card className="border border-white/20 bg-white/5 backdrop-blur-xl rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Home className="w-5 h-5 text-primary" />
          Property Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Type</p>
            <p className="font-medium capitalize">{analysis.propertyType.replace('-', ' ')}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Stories</p>
            <p className="font-medium">{analysis.stories} floor{analysis.stories > 1 ? 's' : ''}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Style</p>
            <p className="font-medium">{analysis.architecturalStyle}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Era</p>
            <p className="font-medium">{analysis.estimatedEra}</p>
          </div>
        </div>

        {/* Estimated Size */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20">
          <Ruler className="w-5 h-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Estimated Size</p>
            <p className="font-semibold text-lg">{analysis.estimatedSqFt.toLocaleString()} sq ft</p>
          </div>
        </div>

        {/* Materials */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Materials</p>
          <div className="flex flex-wrap gap-2">
            {analysis.materials.map((material, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {material}
              </Badge>
            ))}
          </div>
        </div>

        {/* Existing Features */}
        {analysis.existingFeatures.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Existing Features</p>
            <div className="flex flex-wrap gap-2">
              {analysis.existingFeatures.map((feature, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {feature}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Extension Potential */}
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Extension Potential</p>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(analysis.extensionPotential).map(([type, level]) => (
              <div
                key={type}
                className={`p-3 rounded-xl border ${getPotentialColor(level)}`}
              >
                <p className="text-xs opacity-80 capitalize">{type}</p>
                <p className="font-medium capitalize">{level}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
