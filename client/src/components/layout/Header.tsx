import { Link, useLocation } from "wouter";
import { Box, Plus, Grid } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function Header() {
  const [location] = useLocation();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/">
          <a className="flex items-center gap-2 group">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 transition-all group-hover:bg-primary/20 group-hover:border-primary/50">
              <Box className="w-5 h-5 text-primary transition-transform group-hover:scale-110" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">Architect Studio</span>
          </a>
        </Link>

        <nav className="flex items-center gap-4">
          <Link href="/projects">
            <a className={cn(
              "text-sm font-medium transition-colors hover:text-primary flex items-center gap-2",
              location === "/projects" ? "text-foreground" : "text-muted-foreground"
            )}>
              <Grid className="w-4 h-4" />
              <span className="hidden sm:inline">My Projects</span>
            </a>
          </Link>
          
          <Link href="/upload">
            <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90 text-white border-0 shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Project</span>
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
