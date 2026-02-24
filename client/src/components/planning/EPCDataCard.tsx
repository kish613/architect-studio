import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Home, Ruler, Calendar, Zap } from "lucide-react";
import type { EPCData } from "@/lib/api";

interface EPCDataCardProps {
  epcData: EPCData;
}

function getEnergyColor(rating: string): string {
  const colors: Record<string, string> = {
    A: "bg-green-500",
    B: "bg-green-400",
    C: "bg-lime-400 text-black",
    D: "bg-yellow-400 text-black",
    E: "bg-orange-400",
    F: "bg-orange-500",
    G: "bg-red-500",
  };
  return colors[rating?.toUpperCase()] || "bg-muted";
}

export function EPCDataCard({ epcData }: EPCDataCardProps) {
  return (
    <Card className="border-white/20 bg-white/5 backdrop-blur-xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Home className="w-5 h-5 text-primary" />
          Property Data (EPC)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Property Type</p>
            <p className="text-sm font-medium capitalize">{epcData.builtForm || epcData.propertyType}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Floor Area</p>
            <div className="flex items-center gap-1">
              <Ruler className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-sm font-medium">{epcData.totalFloorArea} m²</p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Age Band</p>
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-sm font-medium">{epcData.constructionAgeBand}</p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Energy Rating</p>
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-muted-foreground" />
              <Badge className={`${getEnergyColor(epcData.currentEnergyRating)} text-xs px-2`}>
                {epcData.currentEnergyRating}
              </Badge>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-3 space-y-2">
          {epcData.wallsDescription && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Walls</span>
              <span className="text-right max-w-[60%]">{epcData.wallsDescription}</span>
            </div>
          )}
          {epcData.roofDescription && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Roof</span>
              <span className="text-right max-w-[60%]">{epcData.roofDescription}</span>
            </div>
          )}
          {epcData.windowsDescription && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Windows</span>
              <span className="text-right max-w-[60%]">{epcData.windowsDescription}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
