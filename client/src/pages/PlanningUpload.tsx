import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { PropertyUploader } from "@/components/planning/PropertyUploader";
import { LocationInput } from "@/components/planning/LocationInput";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { uploadPlanningFiles } from "@/lib/api";
import type { WorkflowMode } from "@/lib/api";
import { Loader2, ArrowRight, Search, Sparkles, Maximize2 } from "lucide-react";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/ui/page-transition";

export function PlanningUpload() {
  const [propertyImage, setPropertyImage] = useState<File | null>(null);
  const [floorplan, setFloorplan] = useState<File | null>(null);
  const [address, setAddress] = useState("");
  const [postcode, setPostcode] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [workflowMode, setWorkflowMode] = useState<WorkflowMode>("classic");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const isExtendMode = workflowMode === "extend";

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Sign up required",
        description: "Create a free account to use planning analysis.",
      });
      setTimeout(() => {
        window.location.href = "/api/auth/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!propertyImage) throw new Error('Property image is required');
      if (!postcode.trim()) throw new Error('Postcode is required');
      
      if (isExtendMode && !floorplan) throw new Error('Floorplan is required for Smart Extend');
      if (isExtendMode && !houseNumber.trim()) throw new Error('House number is required for Smart Extend');

      return uploadPlanningFiles(
        propertyImage,
        floorplan || undefined,
        address || undefined,
        postcode,
        isExtendMode ? houseNumber : undefined,
        workflowMode
      );
    },
    onSuccess: (analysis) => {
      toast({
        title: "Upload Successful",
        description: "Starting property analysis...",
      });
      setLocation(`/planning/${analysis.id}`);
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Something went wrong.",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = () => {
    uploadMutation.mutate();
  };

  const isValid = propertyImage && postcode.trim() &&
    (!isExtendMode || (floorplan && houseNumber.trim()));

  // Show loading state while checking auth
  if (authLoading || !isAuthenticated) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Redirecting to sign up...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageTransition>
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <motion.div
            className="mb-8 text-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-4 shimmer-badge">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">AI-Powered Analysis</span>
            </div>
            <h1 className="text-4xl font-display font-bold mb-4">
              {isExtendMode ? "Smart Extension Advisor" : "Planning Approval Visualizer"}
            </h1>
            <div className="h-1 w-16 bg-gradient-to-r from-primary to-primary/40 rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {isExtendMode
                ? "Upload your floorplan and property photo. We'll calculate what you can build under Permitted Development Rights, search real planning approvals, and generate extension options with cost estimates."
                : "Upload your property photo and we'll search for similar approved planning applications nearby, then visualize how your property could look with those modifications."}
            </p>
          </motion.div>

          {/* Workflow mode toggle */}
          <motion.div
            className="flex justify-center mb-8"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
          >
            <div className="inline-flex rounded-xl border border-white/20 bg-white/5 backdrop-blur-xl p-1">
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  !isExtendMode
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setWorkflowMode("classic")}
              >
                <Search className="w-4 h-4" />
                Analyze Property
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  isExtendMode
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setWorkflowMode("extend")}
              >
                <Maximize2 className="w-4 h-4" />
                Smart Extend
              </button>
            </div>
          </motion.div>

          {/* Steps indicator */}
          <motion.div
            className="flex items-center justify-center gap-4 mb-12"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium ring-2 ring-primary/30 ring-offset-2 ring-offset-background">1</div>
              <span className="text-sm font-medium">Upload</span>
            </div>
            <div className="hidden sm:block w-8 h-px bg-gradient-to-r from-primary/50 to-muted" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">2</div>
              <span className="text-sm text-muted-foreground">Analyze</span>
            </div>
            {isExtendMode && (
              <>
                <div className="hidden sm:block w-8 h-px bg-muted" />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">3</div>
                  <span className="text-sm text-muted-foreground">Options</span>
                </div>
                <div className="hidden sm:block w-8 h-px bg-muted" />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">4</div>
                  <span className="text-sm text-muted-foreground">Generate</span>
                </div>
              </>
            )}
            <div className="hidden sm:block w-8 h-px bg-muted" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">{isExtendMode ? "5" : "3"}</div>
              <span className="text-sm text-muted-foreground">Visualize</span>
            </div>
          </motion.div>

          <div className="space-y-8">
            {/* Property & Floorplan Upload */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25, ease: "easeOut" }}
            >
              <PropertyUploader
                propertyImage={propertyImage}
                floorplan={floorplan}
                onPropertyImageChange={setPropertyImage}
                onFloorplanChange={setFloorplan}
              />
            </motion.div>

            {/* Extend mode: floorplan required notice */}
            {isExtendMode && !floorplan && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-sm"
              >
                Floorplan upload is <strong>required</strong> for Smart Extend. Please upload your current floorplan above.
              </motion.div>
            )}

            {/* Location Input */}
            <motion.div
              className="p-6 rounded-2xl border border-white/20 bg-white/5 backdrop-blur-xl"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
            >
              <LocationInput
                address={address}
                postcode={postcode}
                houseNumber={houseNumber}
                onAddressChange={setAddress}
                onPostcodeChange={setPostcode}
                onHouseNumberChange={setHouseNumber}
                showHouseNumber={isExtendMode}
              />
            </motion.div>

            {/* Submit Button */}
            <motion.div
              className="flex justify-center pt-4"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.35, ease: "easeOut" }}
            >
              <Button
                size="lg"
                className="gap-2 px-8 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
                onClick={handleSubmit}
                disabled={!isValid || uploadMutation.isPending}
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : isExtendMode ? (
                  <>
                    <Maximize2 className="w-4 h-4" />
                    Start Smart Extend
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Start Analysis
                  </>
                )}
              </Button>
            </motion.div>

            {/* Info */}
            <div className="text-center text-sm text-muted-foreground">
              <p>
                Analysis uses 1 credit • Visualization uses 2 credits
              </p>
            </div>
          </div>
        </div>
      </PageTransition>
    </Layout>
  );
}
