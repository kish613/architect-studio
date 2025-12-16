import { Link, useLocation } from "wouter";
import { Plus, Grid } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import logoImage from "@assets/archudio_1765823035835.png";

export function Header() {
  const [location] = useLocation();

  return (
    <header className="fixed top-4 left-4 right-4 z-50 border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl shadow-2xl">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/">
          <img 
            src={logoImage} 
            alt="Architect Studio" 
            className="h-14 w-auto object-contain transition-transform hover:scale-105 cursor-pointer"
            data-testid="img-logo"
          />
        </Link>

        <nav className="flex items-center gap-4">
          <Link href="/projects">
            <span className={cn(
              "text-sm font-medium transition-colors hover:text-primary flex items-center gap-2 cursor-pointer",
              location === "/projects" ? "text-foreground" : "text-muted-foreground"
            )}>
              <Grid className="w-4 h-4" />
              <span className="hidden sm:inline">My Projects</span>
            </span>
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
