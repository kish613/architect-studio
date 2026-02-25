import { useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { PlanningAnalysisCard } from "@/components/planning/PlanningAnalysisCard";
import { Plus, Loader2, Search, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { fetchPlanningAnalyses } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { PageTransition, staggerContainer, staggerItem } from "@/components/ui/page-transition";

export function Planning() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const { data: analyses, isLoading } = useQuery({
    queryKey: ['planning-analyses'],
    queryFn: fetchPlanningAnalyses,
    enabled: isAuthenticated,
  });

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
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-12">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-display font-bold">Planning Analysis</h1>
                <span className="px-2 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium shimmer-badge">
                  Beta
                </span>
              </div>
              <div className="h-1 w-16 bg-gradient-to-r from-primary to-primary/40 rounded-full mb-3" />
              <p className="text-muted-foreground">
                Visualize planning-approved modifications for your property.
              </p>
            </div>
            <Link href="/planning/new">
              <Button className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
                <Plus className="w-4 h-4" />
                New Analysis
              </Button>
            </Link>
          </div>

          {/* Feature Highlight */}
          <motion.div
            className="mb-12 p-6 dark-glass-card rounded-3xl border-primary/10"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">AI-Powered Planning Insights</h3>
                <p className="text-sm text-muted-foreground max-w-2xl">
                  Upload a photo of your property and we'll analyze it, search for similar
                  planning approvals nearby, and generate visualizations of potential modifications
                  based on what's been approved in your area.
                </p>
              </div>
            </div>
          </motion.div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="aspect-[4/3] rounded-2xl" />
                  <Skeleton className="h-6 w-3/4 rounded-lg" />
                  <Skeleton className="h-4 w-1/2 rounded-lg" />
                </div>
              ))}
            </div>
          ) : analyses && analyses.length > 0 ? (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {analyses.map((analysis, index) => (
                <motion.div key={analysis.id} variants={staggerItem}>
                  <PlanningAnalysisCard analysis={analysis} index={index} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="text-center py-24 dark-glass-card rounded-3xl"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Search className="w-8 h-8 text-primary floating-animation" />
              </div>
              <h3 className="text-xl font-medium mb-2">No analyses yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Start by uploading a photo of your property to discover what modifications
                have been approved nearby and visualize potential changes.
              </p>
              <Link href="/planning/new">
                <Button className="gap-2 shadow-lg shadow-primary/20">
                  <Plus className="w-4 h-4" />
                  Start Your First Analysis
                </Button>
              </Link>
            </motion.div>
          )}
        </div>
      </PageTransition>
    </Layout>
  );
}
