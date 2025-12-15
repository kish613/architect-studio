import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { fetchProjects } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

export function DesignGallery() {
  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
  });

  return (
    <section className="py-24 border-t border-border/40 bg-black/20">
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Recent Generations</h2>
            <p className="text-muted-foreground max-w-2xl text-lg">
              Explore the latest architectural transformations created by our community.
            </p>
          </div>
          <Link href="/projects">
            <Button variant="ghost" className="hidden md:flex group text-primary hover:text-primary hover:bg-primary/10">
              View All Projects <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <ScrollArea className="w-full whitespace-nowrap pb-4">
            <div className="flex w-max space-x-6 pb-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-[350px] whitespace-normal space-y-4">
                  <Skeleton className="aspect-[4/3] rounded-xl" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        ) : (
          <ScrollArea className="w-full whitespace-nowrap pb-4">
            <div className="flex w-max space-x-6 pb-4">
              {projects && projects.length > 0 ? (
                projects.map((project, index) => (
                  <div key={project.id} className="w-[350px] whitespace-normal">
                    <ProjectCard project={project} index={index} />
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground">No projects yet. Start creating!</div>
              )}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
        
        <div className="md:hidden mt-8 text-center">
          <Link href="/projects">
            <Button variant="outline" className="w-full">
              View All Projects
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
