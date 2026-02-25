import { useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Plus, Loader2, FolderOpen } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { fetchProjects } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { PageTransition, staggerContainer, staggerItem } from "@/components/ui/page-transition";

export function Projects() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
    enabled: isAuthenticated,
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Sign up required",
        description: "Create a free account to view your projects.",
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
              <h1 className="text-4xl font-display font-bold mb-2">My Projects</h1>
              <div className="h-1 w-16 bg-gradient-to-r from-primary to-primary/40 rounded-full mb-3" />
              <p className="text-muted-foreground">Manage and view your architectural generations.</p>
            </div>
            <Link href="/upload">
              <Button className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20" data-testid="button-new-project">
                <Plus className="w-4 h-4" />
                New Project
              </Button>
            </Link>
          </div>

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
          ) : projects && projects.length > 0 ? (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {projects.map((project, index) => (
                <motion.div key={project.id} variants={staggerItem}>
                  <ProjectCard project={project} index={index} />
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
              <div className="w-16 h-16 mx-auto mb-6 bg-primary/10 rounded-2xl flex items-center justify-center">
                <FolderOpen className="w-8 h-8 text-primary floating-animation" />
              </div>
              <h3 className="text-xl font-medium mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-6">Upload your first floorplan to get started.</p>
              <Link href="/upload">
                <Button className="shadow-lg shadow-primary/20" data-testid="button-start-creating">Start Creating</Button>
              </Link>
            </motion.div>
          )}
        </div>
      </PageTransition>
    </Layout>
  );
}
