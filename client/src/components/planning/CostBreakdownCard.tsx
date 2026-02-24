import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PoundSterling } from "lucide-react";
import type { ExtensionOption } from "@/lib/api";

interface CostBreakdownCardProps {
  option: ExtensionOption;
}

function formatCost(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function CostBreakdownCard({ option }: CostBreakdownCardProps) {
  if (!option.costRange) return null;

  return (
    <Card className="border-white/20 bg-white/5 backdrop-blur-xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <PoundSterling className="w-5 h-5 text-primary" />
          Cost Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {option.extensions.map((ext, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
            <div>
              <p className="text-sm font-medium capitalize">{ext.type.replace(/_/g, " ")}</p>
              <p className="text-xs text-muted-foreground">+{ext.additionalSqM} m²</p>
            </div>
            <p className="text-sm text-muted-foreground">{ext.description}</p>
          </div>
        ))}

        <div className="border-t border-white/10 pt-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Estimated Total</p>
            <p className="text-lg font-bold text-primary">
              {formatCost(option.costRange.min)} – {formatCost(option.costRange.max)}
            </p>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Costs are estimates based on regional averages and exclude professional fees,
            planning application costs, and VAT. Actual costs may vary significantly.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
