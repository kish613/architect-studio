import { ShieldAlert, Landmark } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ConservationAreaBadgeProps {
  isConservationArea: boolean;
  conservationAreaName?: string | null;
  isListedBuilding: boolean;
  listedBuildingGrade?: string | null;
}

export function ConservationAreaBadge({
  isConservationArea,
  conservationAreaName,
  isListedBuilding,
  listedBuildingGrade,
}: ConservationAreaBadgeProps) {
  if (!isConservationArea && !isListedBuilding) return null;

  return (
    <div className="space-y-3">
      {isConservationArea && (
        <Alert className="border-orange-500/30 bg-orange-500/10">
          <ShieldAlert className="h-4 w-4 text-orange-500" />
          <AlertTitle className="text-orange-400 font-medium">Conservation Area</AlertTitle>
          <AlertDescription className="text-sm text-orange-200/80">
            This property is within {conservationAreaName ? `the ${conservationAreaName} ` : "a "}
            conservation area. Permitted development rights are more restricted — side extensions and
            additional storeys are typically not permitted without planning permission. Materials and
            design must be sympathetic to the area's character.
          </AlertDescription>
        </Alert>
      )}

      {isListedBuilding && (
        <Alert className="border-red-500/30 bg-red-500/10">
          <Landmark className="h-4 w-4 text-red-500" />
          <AlertTitle className="text-red-400 font-medium">
            Listed Building{listedBuildingGrade ? ` (Grade ${listedBuildingGrade})` : ""}
          </AlertTitle>
          <AlertDescription className="text-sm text-red-200/80">
            This is a listed building. All external and internal alterations require Listed Building
            Consent in addition to any planning permission. Permitted development rights do not apply.
            Specialist heritage advice is strongly recommended.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
