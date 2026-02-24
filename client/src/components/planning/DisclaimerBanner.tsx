import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function DisclaimerBanner() {
  return (
    <Alert className="border-amber-500/30 bg-amber-500/10">
      <AlertTriangle className="h-4 w-4 text-amber-500" />
      <AlertDescription className="text-sm text-amber-200/80">
        This tool provides estimates based on UK planning regulations and is for informational purposes only.
        It does not constitute professional planning advice. Always consult a qualified architect or planning
        consultant before starting any building work. PDR calculations are based on general rules and may not
        account for local Article 4 directions or other restrictions.
      </AlertDescription>
    </Alert>
  );
}
