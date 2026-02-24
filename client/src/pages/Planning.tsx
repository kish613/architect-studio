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
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-display font-bold">Planning Analysis</h1>
              <span className="px-2 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
                Beta
              </span>
            </div>
            <p className="text-muted-foreground">
              Visualize planning-approved modifications for your property.
            </p>
          </div>
          <Link href="/planning/new">
            <Button className="gap-2 bg-primary hover:bg-primary/90 text-white">
              <Plus className="w-4 h-4" />
              New Analysis
            </Button>
          </Link>
        </div>

        {/* Feature Highlight */}
        <div className="mb-12 p-6 rounded-2xl border border-white/20 bg-gradient-to-r from-primary/10 via-transparent to-transparent">
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
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-[4/3] rounded-xl" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : analyses && analyses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {analyses.map((analysis, index) => (
              <PlanningAnalysisCard key={analysis.id} analysis={analysis} index={index} />
            ))}
          </div>
        ) : (
          <div className="text-center py-24 border border-dashed border-border rounded-2xl bg-card/30">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-medium mb-2">No analyses yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Start by uploading a photo of your property to discover what modifications 
              have been approved nearby and visualize potential changes.
            </p>
            <Link href="/planning/new">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Start Your First Analysis
              </Button>
            </Link>
          </div>
        )}
      </div>
    </Layout>
  );
}
