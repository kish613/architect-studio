import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { CADViewer } from "@/components/cad/CADViewer";
import { CADParameterPanel } from "@/components/cad/CADParameterPanel";
import { CADToolbar } from "@/components/cad/CADToolbar";
import { PageTransition } from "@/components/ui/page-transition";
import { useCADStore } from "@/hooks/use-cad-params";
import { fetchPlanningAnalysis } from "@/lib/api";
import { Loader2, Cuboid, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CADViewerPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const id = Number(params.id);

  const { data: analysis, isLoading } = useQuery({
    queryKey: ["planning-analysis", id],
    queryFn: () => fetchPlanningAnalysis(id),
    enabled: !!id,
  });

  const { initFromAnalysis, isInitialized, sceneParams } = useCADStore();

  // Initialize CAD params from analysis data
  useEffect(() => {
    if (!analysis || isInitialized) return;

    const selectedTier = analysis.selectedOptionTier;
    const options = analysis.extensionOptions;
    if (!options || !selectedTier) return;

    const selectedOption = options.find((o) => o.tier === selectedTier);
    if (!selectedOption) return;

    initFromAnalysis(
      selectedOption,
      analysis.epcData,
      analysis.propertyAnalysis ? { stories: analysis.propertyAnalysis.stories } : null,
      analysis.pdrAssessment
    );
  }, [analysis, isInitialized, initFromAnalysis]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0A0A0A]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-white/60 text-sm">Loading CAD viewer...</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0A0A0A]">
        <div className="text-center">
          <p className="text-white/60 text-sm mb-4">Analysis not found</p>
          <Button onClick={() => navigate("/planning")} variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Planning
          </Button>
        </div>
      </div>
    );
  }

  const selectedOption = analysis.extensionOptions?.find(
    (o) => o.tier === analysis.selectedOptionTier
  );

  const leftPanel = (
    <div className="space-y-4">
      {/* Extension list summary */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">Extensions</h3>
        {selectedOption?.extensions.map((ext, i) => (
          <div
            key={i}
            className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-1"
          >
            <p className="text-sm font-medium text-white">{ext.description}</p>
            <p className="text-xs text-white/50">
              +{ext.additionalSqM}m&sup2;
              {ext.depthM && ` &bull; ${ext.depthM}m deep`}
              {ext.widthM && ` &bull; ${ext.widthM}m wide`}
            </p>
          </div>
        ))}
      </div>

      {/* Property info */}
      {analysis.address && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-3">
          <p className="text-xs text-white/50 mb-1">Property</p>
          <p className="text-sm text-white">{analysis.address}</p>
          {analysis.epcData && (
            <p className="text-xs text-white/40 mt-1">
              {analysis.epcData.totalFloorArea}m&sup2; &bull; {analysis.epcData.builtForm}
            </p>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="pt-2 border-t border-white/10">
        <CADToolbar />
      </div>
    </div>
  );

  const rightPanel = <CADParameterPanel />;

  return (
    <PageTransition>
      <WorkspaceLayout
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        title="CAD Model"
        backHref={`/planning/${id}`}
      >
        <div className="w-full h-full">
          {isInitialized ? (
            <CADViewer />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Cuboid className="w-16 h-16 mx-auto mb-4 text-primary/40" />
                <p className="text-white/60 text-sm">
                  {analysis.selectedOptionTier
                    ? "Initializing CAD model..."
                    : "Select an extension option first"}
                </p>
                {!analysis.selectedOptionTier && (
                  <Button
                    onClick={() => navigate(`/planning/${id}`)}
                    variant="outline"
                    size="sm"
                    className="mt-4"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Analysis
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </WorkspaceLayout>
    </PageTransition>
  );
}
