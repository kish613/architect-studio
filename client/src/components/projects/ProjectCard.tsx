import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Clock } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Project } from "@/lib/store";
import { Badge } from "@/components/ui/badge";

interface ProjectCardProps {
  project: Project;
  index: number;
}

export function ProjectCard({ project, index }: ProjectCardProps) {
  // Use the first model for thumbnail, or a placeholder
  const thumbnail = project.models[0]?.thumbnailUrl;
  const date = new Date(project.lastModified).toLocaleDateString();

  return (
    <Link href={`/projects/${project.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.1 }}
      >
        <div className="group cursor-pointer">
          <div className="relative overflow-hidden rounded-xl aspect-[4/3] bg-muted mb-4 border border-border/50 shadow-sm transition-all duration-300 group-hover:shadow-xl group-hover:shadow-primary/10 group-hover:scale-[1.02] ring-offset-background group-hover:ring-2 ring-primary/50">
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60 z-10 transition-opacity group-hover:opacity-40" />
            
            {thumbnail ? (
              <img 
                src={thumbnail} 
                alt={project.name} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                No Preview
              </div>
            )}
            
            <div className="absolute top-3 right-3 z-20">
              <Badge variant="secondary" className="backdrop-blur-md bg-black/40 border-white/10 text-white">
                {project.models.length} Renders
              </Badge>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-start">
              <h3 className="font-display font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                {project.name}
              </h3>
              <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
            </div>
            <div className="flex items-center text-sm text-muted-foreground gap-2">
              <Clock className="w-3.5 h-3.5" />
              <span>Edited {date}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
