import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/ui/page-transition";
import { PropertyAnalysisCard } from "@/components/planning/PropertyAnalysisCard";
import { ApprovalsList } from "@/components/planning/ApprovalsList";
import { VisualizationCompare } from "@/components/planning/VisualizationCompare";
import { EPCDataCard } from "@/components/planning/EPCDataCard";
import { PDRSummaryCard } from "@/components/planning/PDRSummaryCard";
import { ExtensionOptionsPanel } from "@/components/planning/ExtensionOptionsPanel";
import { CostBreakdownCard } from "@/components/planning/CostBreakdownCard";
import { PartyWallCard } from "@/components/planning/PartyWallCard";
import { NeighbourImpactCard } from "@/components/planning/NeighbourImpactCard";
import { ConservationAreaBadge } from "@/components/planning/ConservationAreaBadge";
import { DisclaimerBanner } from "@/components/planning/DisclaimerBanner";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchPlanningAnalysis,
  analyzeProperty,
  searchPlanningApprovals,
  selectModification,
  generatePlanningVisualization,
  runSmartExtend,
  selectExtensionOption,
  type PlanningAnalysis,
  type ExtensionOptionTier,
} from "@/lib/api";
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  Search,
  Sparkles,
  AlertCircle,
  Maximize2,
  Building2,
  Scale,
  FileSearch,
  Layers,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function ExtendProgressIndicator({ status }: { status: string }) {
  const steps = [
    { key: "epc_lookup", label: "Looking up property data...", icon: Building2, description: "Querying the EPC Register for your property details" },
    { key: "pdr_calculating", label: "Calculating permitted development...", icon: Scale, description: "Checking what you can build without planning permission" },
    { key: "searching_real", label: "Searching real planning approvals...", icon: FileSearch, description: "Finding approved extensions in your area via council records" },
  ];

  const currentIdx = steps.findIndex((s) => s.key === status);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="py-12 weavy-panel rounded-2xl border-primary/20"
    >
      <div className="relative w-16 h-16 mx-auto mb-6">
        <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
        <Loader2 className="w-8 h-8 absolute inset-0 m-auto text-primary animate-spin" />
      </div>
      <h3 className="text-xl font-medium text-center mb-6">Running Smart Analysis...</h3>
      <div className="max-w-md mx-auto space-y-4 px-6">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isDone = idx < currentIdx;
          const isActive = idx === currentIdx;
          return (
            <motion.div
              key={step.key}
              className="flex items-start gap-3"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.1, ease: "easeOut" }}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${isDone
                    ? "bg-green-500/20 text-green-400 shadow-sm shadow-green-500/20"
                    : isActive
                      ? "bg-primary/20 text-primary ring-2 ring-primary/30"
                      : "bg-muted text-muted-foreground"
                  }`}
              >
                {isDone ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <div>
                <p className={`text-sm font-medium ${isActive ? "text-foreground" : isDone ? "text-green-400" : "text-muted-foreground"}`}>
                  {step.label}
                </p>
                {isActive && (
                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

export function PlanningViewer() {
  const params = useParams<{ id: string }>();
  const analysisId = parseInt(params.id || "0");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMod, setSelectedMod] = useState<string | null>(null);
  const [selectedExtendTier, setSelectedExtendTier] = useState<ExtensionOptionTier | null>(null);

  // Fetch analysis data
  const { data: analysis, isLoading, error } = useQuery({
    queryKey: ["planning-analysis", analysisId],
    queryFn: () => fetchPlanningAnalysis(analysisId),
    enabled: isAuthenticated && analysisId > 0,
    refetchInterval: (query) => {
      const data = query.state.data as PlanningAnalysis | undefined;
      const pollingStates = [
        "analyzing", "searching", "generating",
        "epc_lookup", "pdr_calculating", "searching_real",
      ];
      if (data?.status && pollingStates.includes(data.status)) {
        return 2000;
      }
      return false;
    },
  });

  // Sync selected states from server
  useEffect(() => {
    if (analysis?.selectedModification && !selectedMod) {
      setSelectedMod(analysis.selectedModification);
    }
  }, [analysis?.selectedModification]);

  useEffect(() => {
    if (analysis?.selectedOptionTier && !selectedExtendTier) {
      setSelectedExtendTier(analysis.selectedOptionTier as ExtensionOptionTier);
    }
  }, [analysis?.selectedOptionTier]);

  const isExtendMode = analysis?.workflowMode === "extend";

  // --- Classic workflow mutations ---
  const analyzeMutation = useMutation({
    mutationFn: () => analyzeProperty(analysisId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planning-analysis", analysisId] });
      toast({ title: "Analysis Started", description: "Analyzing your property..." });
    },
    onError: (error) => {
      toast({ title: "Analysis Failed", description: error instanceof Error ? error.message : "Something went wrong.", variant: "destructive" });
    },
  });

  const searchMutation = useMutation({
    mutationFn: () => searchPlanningApprovals(analysisId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planning-analysis", analysisId] });
      toast({ title: "Search Complete", description: "Found nearby planning approvals." });
    },
    onError: (error) => {
      toast({ title: "Search Failed", description: error instanceof Error ? error.message : "Something went wrong.", variant: "destructive" });
    },
  });

  const selectMutation = useMutation({
    mutationFn: (type: string) => selectModification(analysisId, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planning-analysis", analysisId] });
    },
    onError: (error) => {
      toast({ title: "Selection Failed", description: error instanceof Error ? error.message : "Something went wrong.", variant: "destructive" });
    },
  });

  const generateMutation = useMutation({
    mutationFn: () => generatePlanningVisualization(analysisId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planning-analysis", analysisId] });
      toast({ title: "Generation Started", description: "Creating your visualization..." });
    },
    onError: (error) => {
      toast({ title: "Generation Failed", description: error instanceof Error ? error.message : "Something went wrong.", variant: "destructive" });
    },
  });

  // --- Extend workflow mutations ---
  const extendMutation = useMutation({
    mutationFn: () => runSmartExtend(analysisId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planning-analysis", analysisId] });
      toast({ title: "Smart Analysis Started", description: "Running property data lookup and PDR calculation..." });
    },
    onError: (error) => {
      toast({ title: "Smart Analysis Failed", description: error instanceof Error ? error.message : "Something went wrong.", variant: "destructive" });
    },
  });

  const selectOptionMutation = useMutation({
    mutationFn: (tier: ExtensionOptionTier) => selectExtensionOption(analysisId, tier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planning-analysis", analysisId] });
    },
    onError: (error) => {
      toast({ title: "Selection Failed", description: error instanceof Error ? error.message : "Something went wrong.", variant: "destructive" });
    },
  });

  const handleSelectModification = async (type: string) => {
    setSelectedMod(type);
    await selectMutation.mutateAsync(type);
  };

  const handleSelectExtendOption = async (tier: ExtensionOptionTier) => {
    setSelectedExtendTier(tier);
    await selectOptionMutation.mutateAsync(tier);
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/api/auth/login");
    }
  }, [isAuthenticated, authLoading, setLocation]);

  // Loading state
  if (authLoading || isLoading) {
    return (
      <WorkspaceLayout title="Loading..." onBack={() => setLocation("/planning")}>
        <div className="flex items-center justify-center h-full w-full">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading analysis...</p>
          </div>
        </div>
      </WorkspaceLayout>
    );
  }

  // Error state
  if (error || !analysis) {
    return (
      <WorkspaceLayout title="Error" onBack={() => setLocation("/planning")}>
        <div className="container mx-auto px-4 py-12 max-w-2xl w-full">
          <Alert variant="destructive" className="weavy-panel">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : "Failed to load analysis"}
            </AlertDescription>
          </Alert>
          <div className="mt-6 text-center">
            <Button variant="outline" onClick={() => setLocation("/planning")} className="border-white/10 text-white hover:bg-white/5">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Planning
            </Button>
          </div>
        </div>
      </WorkspaceLayout>
    );
  }

  // --- Classic workflow step calculation ---
  const getClassicStep = () => {
    switch (analysis.status) {
      case "pending": return 1;
      case "analyzing":
      case "searching": return 2;
      case "awaiting_selection": return 3;
      case "generating":
      case "completed": return 4;
      case "failed": return 0;
      default: return 1;
    }
  };

  // --- Extend workflow step calculation ---
  const getExtendStep = () => {
    switch (analysis.status) {
      case "pending": return 1;
      case "epc_lookup":
      case "pdr_calculating":
      case "searching_real": return 2;
      case "options_ready": return selectedExtendTier ? 4 : 3;
      case "generating": return 4;
      case "completed": return 5;
      case "failed": return 0;
      default: return 1;
    }
  };

  const currentStep = isExtendMode ? getExtendStep() : getClassicStep();

  const classicSteps = [
    { num: 1, label: "Upload" },
    { num: 2, label: "Analyze" },
    { num: 3, label: "Select" },
    { num: 4, label: "Visualize" },
  ];

  const extendSteps = [
    { num: 1, label: "Upload" },
    { num: 2, label: "Analyze" },
    { num: 3, label: "Options" },
    { num: 4, label: "Generate" },
    { num: 5, label: "Visualize" },
  ];

  const steps = isExtendMode ? extendSteps : classicSteps;

  return (
    <Layout>
      <PageTransition>
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          {/* Header */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <Button
              variant="ghost"
              size="sm"
              className="mb-4 hover:bg-primary/10 transition-colors duration-200"
              onClick={() => setLocation("/planning")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Planning
            </Button>

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-display font-bold mb-2">
                  {isExtendMode ? "Smart Extension Advisor" : "Planning Analysis"}
                </h1>
                <div className="h-1 w-16 bg-gradient-to-r from-primary to-primary/40 rounded-full mb-3" />
                <p className="text-muted-foreground">
                  {analysis.houseNumber && `${analysis.houseNumber} `}
                  {analysis.address && `${analysis.address} • `}
                  {analysis.postcode && `${analysis.postcode}`}
                  {!isExtendMode && analysis.propertyAnalysis?.propertyType &&
                    ` • ${analysis.propertyAnalysis.propertyType.charAt(0).toUpperCase()}${analysis.propertyAnalysis.propertyType.slice(1).replace("-", " ")}`}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Steps Progress */}
          <motion.div
            className="flex items-center justify-center gap-4 mb-12 flex-wrap"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
          >
            {steps.map((step, idx) => (
              <div key={step.num} className="flex items-center gap-2">
                {idx > 0 && (
                  <div className="w-8 h-px bg-gradient-to-r from-primary/50 to-muted hidden sm:block" />
                )}
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${currentStep >= step.num
                        ? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
                        : "bg-muted text-muted-foreground"
                      }`}
                  >
                    {step.num}
                  </div>
                  <span
                    className={`text-sm ${currentStep >= step.num ? "font-medium" : "text-muted-foreground"
                      }`}
                  >
                    {step.label}
                  </span>
                </div>
              </div>
            ))}
          </motion.div>

          {/* Error State */}
          {analysis.status === "failed" && (
            <Alert variant="destructive" className="mb-8">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Analysis Failed</AlertTitle>
              <AlertDescription>
                {analysis.errorMessage || "Something went wrong during analysis."}
              </AlertDescription>
            </Alert>
          )}

          {/* ====== EXTEND WORKFLOW ====== */}
          {isExtendMode && (
            <div className="space-y-8">
              {/* Pending — Start Smart Analysis */}
              {analysis.status === "pending" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="text-center py-12 dark-glass-card rounded-3xl"
                >
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Maximize2 className="w-8 h-8 text-primary floating-animation" />
                  </div>
                  <h3 className="text-xl font-medium mb-2">Ready for Smart Analysis</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    We'll look up your property data, calculate permitted development rights,
                    search real planning approvals, and generate extension options.
                  </p>
                  <Button
                    size="lg"
                    className="gap-2 shadow-lg shadow-primary/20"
                    onClick={() => extendMutation.mutate()}
                    disabled={extendMutation.isPending}
                  >
                    {extendMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Run Smart Analysis
                      </>
                    )}
                  </Button>
                </motion.div>
              )}

              {/* Processing states */}
              {(analysis.status === "epc_lookup" ||
                analysis.status === "pdr_calculating" ||
                analysis.status === "searching_real") && (
                  <ExtendProgressIndicator status={analysis.status} />
                )}

              {/* Options Ready — Show full analysis */}
              {(analysis.status === "options_ready" || analysis.status === "generating" || analysis.status === "completed") && (
                <>
                  {/* Conservation / Listed Building Alerts */}
                  <ConservationAreaBadge
                    isConservationArea={analysis.isConservationArea ?? false}
                    conservationAreaName={analysis.conservationAreaName ?? undefined}
                    isListedBuilding={analysis.isListedBuilding ?? false}
                    listedBuildingGrade={analysis.listedBuildingGrade ?? undefined}
                  />

                  {/* Property Data Cards */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {analysis.epcData && <EPCDataCard epcData={analysis.epcData} />}
                    {analysis.pdrAssessment && <PDRSummaryCard pdrAssessment={analysis.pdrAssessment} />}
                  </div>

                  {/* Extension Options */}
                  {analysis.extensionOptions && analysis.extensionOptions.length > 0 && analysis.status === "options_ready" && (
                    <ExtensionOptionsPanel
                      options={analysis.extensionOptions}
                      selectedTier={selectedExtendTier}
                      onSelect={handleSelectExtendOption}
                      isSelecting={selectOptionMutation.isPending}
                    />
                  )}

                  {/* Detail cards for selected option */}
                  {selectedExtendTier && analysis.extensionOptions && (
                    <>
                      {(() => {
                        const selectedOption = analysis.extensionOptions.find(
                          (o) => o.tier === selectedExtendTier
                        );
                        if (!selectedOption) return null;
                        return (
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <CostBreakdownCard option={selectedOption} />
                            {analysis.partyWallAssessment && (
                              <PartyWallCard assessment={analysis.partyWallAssessment} />
                            )}
                            {analysis.neighbourImpact && (
                              <NeighbourImpactCard impact={analysis.neighbourImpact} />
                            )}
                          </div>
                        );
                      })()}

                      {/* Generate button */}
                      {analysis.status === "options_ready" && (
                        <div className="flex justify-center pt-4">
                          <Button
                            size="lg"
                            className="gap-2"
                            onClick={() => generateMutation.mutate()}
                            disabled={generateMutation.isPending}
                          >
                            {generateMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4" />
                                Generate Extension Floorplan
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </>
                  )}

                  {/* Generating state */}
                  {analysis.status === "generating" && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="text-center py-12 dark-glass-card rounded-2xl border-primary/20"
                    >
                      <div className="relative w-16 h-16 mx-auto mb-4">
                        <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
                        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
                        <Loader2 className="w-8 h-8 absolute inset-0 m-auto text-primary animate-spin" />
                      </div>
                      <h3 className="text-xl font-medium mb-2">Generating Extension Floorplan...</h3>
                      <p className="text-muted-foreground">
                        Creating your extended property visualization. This may take a minute.
                      </p>
                    </motion.div>
                  )}

                  {/* Completed — Show results */}
                  {analysis.status === "completed" && analysis.generatedExteriorUrl && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    >
                      <VisualizationCompare analysis={analysis} />
                    </motion.div>
                  )}

                  <DisclaimerBanner />
                </>
              )}
            </div>
          )}

          {/* ====== CLASSIC WORKFLOW ====== */}
          {!isExtendMode && (
            <div className="space-y-8">
              {/* Step 1: Pending - Start Analysis */}
              {analysis.status === "pending" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="text-center py-12 dark-glass-card rounded-3xl"
                >
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-primary floating-animation" />
                  </div>
                  <h3 className="text-xl font-medium mb-2">Ready to Analyze</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    We'll analyze your property photo to identify its type, style, and extension potential.
                  </p>
                  <Button
                    size="lg"
                    className="gap-2 shadow-lg shadow-primary/20"
                    onClick={() => analyzeMutation.mutate()}
                    disabled={analyzeMutation.isPending}
                  >
                    {analyzeMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Start Analysis
                      </>
                    )}
                  </Button>
                </motion.div>
              )}

              {/* Step 2: Analyzing or Searching */}
              {(analysis.status === "analyzing" || analysis.status === "searching") && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="text-center py-12 dark-glass-card rounded-2xl border-primary/20"
                >
                  <div className="relative w-16 h-16 mx-auto mb-4">
                    <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
                    <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
                    <Loader2 className="w-8 h-8 absolute inset-0 m-auto text-primary animate-spin" />
                  </div>
                  <h3 className="text-xl font-medium mb-2">
                    {analysis.status === "analyzing" ? "Analyzing Property..." : "Searching Planning Approvals..."}
                  </h3>
                  <p className="text-muted-foreground">
                    {analysis.status === "analyzing"
                      ? "Our AI is examining your property photo"
                      : "Finding similar approved applications nearby"}
                  </p>
                </motion.div>
              )}

              {/* Property Analysis Result */}
              {analysis.propertyAnalysis && analysis.status !== "pending" && analysis.status !== "analyzing" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1">
                    <PropertyAnalysisCard analysis={analysis.propertyAnalysis} />

                    {/* Search button after analysis */}
                    {!analysis.approvalSearchResults && analysis.status !== "searching" && (
                      <div className="mt-4">
                        <Button
                          className="w-full gap-2"
                          onClick={() => searchMutation.mutate()}
                          disabled={searchMutation.isPending}
                        >
                          {searchMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Searching...
                            </>
                          ) : (
                            <>
                              <Search className="w-4 h-4" />
                              Search Planning Approvals
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Approvals List */}
                  {analysis.approvalSearchResults && (
                    <div className="lg:col-span-2">
                      <ApprovalsList
                        results={analysis.approvalSearchResults}
                        selectedModification={selectedMod}
                        onSelectModification={handleSelectModification}
                      />

                      {/* Generate button */}
                      {analysis.status === "awaiting_selection" && selectedMod && (
                        <div className="mt-6 flex justify-center">
                          <Button
                            size="lg"
                            className="gap-2"
                            onClick={() => generateMutation.mutate()}
                            disabled={generateMutation.isPending}
                          >
                            {generateMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4" />
                                Generate Visualization
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Generating State */}
              {analysis.status === "generating" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="text-center py-12 dark-glass-card rounded-2xl border-primary/20"
                >
                  <div className="relative w-16 h-16 mx-auto mb-4">
                    <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
                    <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
                    <Loader2 className="w-8 h-8 absolute inset-0 m-auto text-primary animate-spin" />
                  </div>
                  <h3 className="text-xl font-medium mb-2">Generating Visualization...</h3>
                  <p className="text-muted-foreground">
                    Creating your property transformation. This may take a minute.
                  </p>
                </motion.div>
              )}

              {/* Completed - Show Visualization */}
              {analysis.status === "completed" && analysis.generatedExteriorUrl && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  <VisualizationCompare analysis={analysis} />
                </motion.div>
              )}
            </div>
          )}
        </div>
      </PageTransition>
    </Layout>
  );
}
