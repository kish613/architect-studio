import { Link, useLocation } from "wouter";
import { Plus, Grid, LogIn, LogOut, User, CreditCard, Settings, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UsageDisplay } from "@/components/subscription/UsageDisplay";

function Logo({ className }: { className?: string }) {
  return (
    <svg 
      version="1.1" 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 900 150"
      className={`header-logo ${className || ''}`}
    >
      <style>
        {`
          @keyframes headerDrawLine {
            from { stroke-dashoffset: 600; }
            to { stroke-dashoffset: 0; }
          }
          @keyframes headerDrawLineFast {
            from { stroke-dashoffset: 100; }
            to { stroke-dashoffset: 0; }
          }
          @keyframes headerFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes headerSlideIn {
            from { 
              opacity: 0;
              transform: translateX(-20px);
            }
            to { 
              opacity: 1;
              transform: translateX(0);
            }
          }
          .header-logo .stroke-animate {
            stroke-dasharray: 600;
            stroke-dashoffset: 0;
          }
          .header-logo .stroke-animate-fast {
            stroke-dasharray: 100;
            stroke-dashoffset: 0;
          }
          .header-logo .fill-animate {
            opacity: 1;
          }
          .header-logo .text-animate {
            opacity: 1;
            transform: translateX(0);
          }
          .header-logo:hover .stroke-animate {
            animation: headerDrawLine 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
          }
          .header-logo:hover .stroke-animate-fast {
            animation: headerDrawLineFast 1s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.3s forwards;
          }
          .header-logo:hover .fill-animate {
            animation: headerFadeIn 0.6s ease-out 1.2s forwards;
            opacity: 0;
          }
          .header-logo:hover .text-animate {
            animation: headerSlideIn 0.5s ease-out 1.3s forwards;
            opacity: 0;
          }
        `}
      </style>
      <defs>
        <linearGradient id="headerIconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#003087' }} />
          <stop offset="100%" style={{ stopColor: '#00AEEF' }} />
        </linearGradient>
        
        <pattern id="headerGrid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
        </pattern>
      </defs>

      <g transform="translate(50, 25)">
        {/* Logo Icon Outlines */}
        <g stroke="#003087" strokeWidth="2.5" fill="none" strokeLinecap="square" strokeLinejoin="miter">
          <rect x="0" y="0" width="100" height="100" rx="4" strokeWidth="3" className="stroke-animate" />
          
          {/* Room 1: Top Left */}
          <path d="M10,10 H45 V40 H30 V25 H10 V10 Z" className="stroke-animate" style={{ animationDelay: '0.1s' }} />
          <rect x="18" y="15" width="8" height="8" strokeWidth="1" className="stroke-animate-fast" />
  
          {/* Room 2: Bottom Left */}
          <path d="M10,50 H45 V90 H10 V50 Z" className="stroke-animate" style={{ animationDelay: '0.2s' }} />
          <line x1="10" y1="70" x2="45" y2="70" strokeWidth="1" className="stroke-animate-fast" />
          
          {/* Room 3: Right Side */}
          <path d="M55,10 H90 V90 H55 V60 H65 V40 H55 V10 Z" className="stroke-animate" style={{ animationDelay: '0.3s' }} />
          
          {/* Staircase Detail */}
          <g strokeWidth="1.5" className="stroke-animate-fast">
            <line x1="60" y1="15" x2="85" y2="15" />
            <line x1="60" y1="20" x2="85" y2="20" />
            <line x1="60" y1="25" x2="85" y2="25" />
            <line x1="60" y1="30" x2="85" y2="30" />
          </g>
          
          {/* Structural Columns */}
          <rect x="52" y="52" width="6" height="6" fill="none" className="stroke-animate-fast" />
          <rect x="52" y="32" width="6" height="6" fill="none" className="stroke-animate-fast" />

          {/* Door Swing */}
          <path d="M45,40 Q55,40 55,30" strokeWidth="1.5" strokeDasharray="2,2" className="stroke-animate-fast" />
          
          {/* Window */}
          <line x1="90" y1="50" x2="90" y2="80" stroke="#00AEEF" strokeWidth="4" className="stroke-animate" style={{ animationDelay: '0.4s' }} />
        </g>

        {/* Fills */}
        <g fillRule="evenodd" className="fill-animate">
          <path d="M10,10 H45 V40 H30 V25 H10 V10 Z" fill="#003087" />
          <path d="M10,50 H45 V90 H10 V50 Z" fill="#003087" />
          <path d="M55,10 H90 V90 H55 V60 H65 V40 H55 V10 Z" fill="#00AEEF" opacity="0.9" />
          <rect x="52" y="52" width="6" height="6" fill="#003087" />
          <rect x="52" y="32" width="6" height="6" fill="#003087" />
          <rect x="18" y="15" width="8" height="8" fill="white" opacity="0.3" />
          <rect x="25" y="60" width="10" height="5" fill="white" opacity="0.3" />
          <rect x="0" y="0" width="100" height="100" rx="4" fill="url(#headerGrid)" opacity="0.3" style={{ pointerEvents: 'none' }}/>
        </g>
        
        {/* Text */}
        <g className="text-animate">
          <text x="130" y="50" dominantBaseline="middle" fontFamily="'Montserrat', sans-serif" fontSize="65" letterSpacing="-1">
            <tspan fill="#003087" fontWeight="700">Architect</tspan>
            <tspan dx="10" fill="#00AEEF" fontWeight="400">Studio</tspan>
          </text>
        </g>
      </g>
    </svg>
  );
}

export function Header() {
  const [location] = useLocation();
  const { user, isLoading, isAuthenticated } = useAuth();
  const { subscription } = useSubscription();

  return (
    <header className="fixed top-4 left-4 right-4 z-50 border border-white/20 bg-gradient-to-b from-white/15 to-white/5 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-1px_0_rgba(0,0,0,0.2)]">
      <div className="w-full px-4 h-20 flex items-center justify-between">
        <Link href="/">
          <Logo 
            className="h-14 w-auto transition-transform hover:scale-105 cursor-pointer"
          />
        </Link>

        <nav className="flex items-center gap-4">
          <Link href="/pricing">
            <span className={cn(
              "text-sm font-medium transition-colors hover:text-primary flex items-center gap-2 cursor-pointer",
              location === "/pricing" ? "text-foreground" : "text-muted-foreground"
            )}>
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Pricing</span>
            </span>
          </Link>

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

              <Link href="/planning">
                <span className={cn(
                  "text-sm font-medium transition-colors hover:text-primary flex items-center gap-2 cursor-pointer",
                  location.startsWith("/planning") ? "text-foreground" : "text-muted-foreground"
                )}>
                  <Search className="w-4 h-4" />
                  <span className="hidden sm:inline">Planning</span>
                </span>
              </Link>

              {subscription && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-muted-foreground hover:text-foreground"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span className="hidden md:inline text-xs">
                        {subscription.remaining}/{subscription.generationsLimit}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold mb-1">Credits</h3>
                        <p className="text-sm text-muted-foreground">
                          {subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)} Plan
                        </p>
                      </div>
                      <UsageDisplay
                        used={subscription.generationsUsed}
                        limit={subscription.generationsLimit}
                        showPercentage
                      />
                      <div className="flex gap-2">
                        <Link href="/settings" className="flex-1">
                          <Button variant="outline" size="sm" className="w-full gap-2">
                            <Settings className="w-4 h-4" />
                            Manage
                          </Button>
                        </Link>
                        <Link href="/pricing" className="flex-1">
                          <Button size="sm" className="w-full">
                            Upgrade
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}

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
              <a href="/api/auth/logout">
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
            <div className="flex items-center gap-2">
              <a href="/api/auth/login">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-2 text-muted-foreground hover:text-foreground"
                  data-testid="button-signin"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign In</span>
                </Button>
              </a>
              <a href="/api/auth/login">
                <Button 
                  size="sm" 
                  className="gap-2 bg-primary hover:bg-primary/90 text-white border-0 shadow-lg shadow-primary/20"
                  data-testid="button-signup"
                >
                  <span>Sign Up</span>
                </Button>
              </a>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
