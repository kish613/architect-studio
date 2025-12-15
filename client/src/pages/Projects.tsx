import { Layout } from "@/components/layout/Layout";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { useFloorplanStore } from "@/lib/store";
import { Plus } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export function Projects() {
  const projects = useFloorplanStore((state) => state.projects);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-display font-bold mb-2">My Projects</h1>
            <p className="text-muted-foreground">Manage and view your architectural generations.</p>
          </div>
          <Link href="/upload">
            <Button className="gap-2 bg-primary hover:bg-primary/90 text-white">
              <Plus className="w-4 h-4" />
              New Project
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project, index) => (
            <ProjectCard key={project.id} project={project} index={index} />
          ))}
        </div>

        {projects.length === 0 && (
          <div className="text-center py-24 border border-dashed border-border rounded-2xl bg-card/30">
            <h3 className="text-xl font-medium mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-6">Upload your first floorplan to get started.</p>
            <Link href="/upload">
              <Button>Start Creating</Button>
            </Link>
          </div>
        )}
      </div>
    </Layout>
  );
}
