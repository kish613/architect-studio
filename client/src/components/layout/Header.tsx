import { Link, useLocation } from "wouter";
import { Plus, Grid, LogIn, LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import logoImage from "@assets/archudio_big_1765911734573.png";

export function Header() {
  const [location] = useLocation();
  const { user, isLoading, isAuthenticated } = useAuth();

  return (
    <header className="fixed top-4 left-4 right-4 z-50 border border-white/20 bg-gradient-to-b from-white/15 to-white/5 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-1px_0_rgba(0,0,0,0.2)]">
      <div className="w-full px-4 h-28 flex items-center justify-between">
        <Link href="/">
          <img 
            src={logoImage} 
            alt="Architect Studio" 
            className="h-20 w-auto object-contain transition-transform hover:scale-105 cursor-pointer"
            data-testid="img-logo"
          />
        </Link>

        <nav className="flex items-center gap-4">
          {isAuthenticated && (
            <>
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
                <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90 text-white border-0 shadow-lg shadow-primary/20" data-testid="button-new-project">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">New Project</span>
                </Button>
              </Link>
            </>
          )}

          {isLoading ? (
            <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
          ) : isAuthenticated ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {user?.profileImageUrl ? (
                  <img 
                    src={user.profileImageUrl} 
                    alt={user.firstName || 'User'} 
                    className="w-8 h-8 rounded-full border border-white/20"
                    data-testid="img-user-avatar"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                )}
                <span className="text-sm font-medium text-foreground hidden md:inline" data-testid="text-user-name">
                  {user?.firstName || 'User'}
                </span>
              </div>
              <a href="/api/logout">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-2 text-muted-foreground hover:text-foreground"
                  data-testid="button-logout"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Log Out</span>
                </Button>
              </a>
            </div>
          ) : (
            <a href="/api/login">
              <Button 
                size="sm" 
                className="gap-2 bg-primary hover:bg-primary/90 text-white border-0 shadow-lg shadow-primary/20"
                data-testid="button-login"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Sign In</span>
              </Button>
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}
