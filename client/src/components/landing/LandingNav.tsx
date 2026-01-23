import { Link } from "wouter";
import { PlusCircle, UserCircle, LogIn, LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

function AnimatedLogo({ className }: { className?: string }) {
  return (
    <svg 
      version="1.1" 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 900 150"
      className={`landing-logo ${className || ''}`}
    >
      <defs>
        <linearGradient id="landingIconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#003087' }} />
          <stop offset="100%" style={{ stopColor: '#00AEEF' }} />
        </linearGradient>
        
        <pattern id="landingGrid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
        </pattern>
      </defs>

      <style>
        {`
          @keyframes landingDrawLine {
            from { stroke-dashoffset: 600; }
            to { stroke-dashoffset: 0; }
          }
          @keyframes landingDrawLineFast {
            from { stroke-dashoffset: 100; }
            to { stroke-dashoffset: 0; }
          }
          @keyframes landingFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes landingSlideIn {
            from { 
              opacity: 0;
              transform: translateX(-20px);
            }
            to { 
              opacity: 1;
              transform: translateX(0);
            }
          }
          /* Initial load animation */
          .landing-logo .stroke-animate {
            stroke-dasharray: 600;
            stroke-dashoffset: 600;
            animation: landingDrawLine 2.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
          }
          .landing-logo .stroke-animate-fast {
            stroke-dasharray: 100;
            stroke-dashoffset: 100;
            animation: landingDrawLineFast 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.5s forwards;
          }
          .landing-logo .fill-animate {
            opacity: 0;
            animation: landingFadeIn 1s ease-out 2s forwards;
          }
          .landing-logo .text-animate {
            opacity: 0;
            animation: landingSlideIn 0.8s ease-out 2.2s forwards;
          }
          /* Hover re-animation */
          .landing-logo:hover .stroke-animate {
            animation: landingDrawLine 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
          }
          .landing-logo:hover .stroke-animate-fast {
            animation: landingDrawLineFast 1s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.3s forwards;
          }
          .landing-logo:hover .fill-animate {
            animation: landingFadeIn 0.6s ease-out 1.2s forwards;
            opacity: 0;
          }
          .landing-logo:hover .text-animate {
            animation: landingSlideIn 0.5s ease-out 1.3s forwards;
            opacity: 0;
          }
        `}
      </style>

      <g transform="translate(50, 25)">
        {/* Logo Icon Outlines */}
        <g stroke="#003087" strokeWidth="2.5" fill="none" strokeLinecap="square" strokeLinejoin="miter">
          <rect x="0" y="0" width="100" height="100" rx="4" strokeWidth="3" className="stroke-animate" />
          
          {/* Room 1: Top Left */}
          <path d="M10,10 H45 V40 H30 V25 H10 V10 Z" className="stroke-animate" style={{ animationDelay: '0.2s' }} />
          <rect x="18" y="15" width="8" height="8" strokeWidth="1" className="stroke-animate-fast" />
  
          {/* Room 2: Bottom Left */}
          <path d="M10,50 H45 V90 H10 V50 Z" className="stroke-animate" style={{ animationDelay: '0.3s' }} />
          <line x1="10" y1="70" x2="45" y2="70" strokeWidth="1" className="stroke-animate-fast" />
          
          {/* Room 3: Right Side */}
          <path d="M55,10 H90 V90 H55 V60 H65 V40 H55 V10 Z" className="stroke-animate" style={{ animationDelay: '0.4s' }} />
          
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
          <line x1="90" y1="50" x2="90" y2="80" stroke="#00AEEF" strokeWidth="4" className="stroke-animate" style={{ animationDelay: '0.5s' }} />
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
          <rect x="0" y="0" width="100" height="100" rx="4" fill="url(#landingGrid)" opacity="0.3" style={{ pointerEvents: 'none' }}/>
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

export function LandingNav() {
  const { user, isLoading, isAuthenticated } = useAuth();

  return (
    <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full font-[var(--font-poppins)]">
      {/* Logo */}
      <Link href="/">
        <AnimatedLogo 
          className="h-20 w-auto transition-transform hover:scale-105 cursor-pointer"
        />
      </Link>

      {/* Navigation Links */}
      <div className="hidden md:flex items-center space-x-2 bg-white/50 backdrop-blur-md px-2 py-1.5 rounded-full border border-slate-200/60 shadow-sm">
        <Link href="/projects">
          <span className="px-5 py-2 rounded-full text-slate-600 text-sm font-medium hover:bg-white hover:text-cyan-700 hover:shadow-sm transition-all cursor-pointer">
            Floorplans
          </span>
        </Link>
        <Link href="/planning">
          <span className="px-5 py-2 rounded-full text-slate-600 text-sm font-medium hover:bg-white hover:text-cyan-700 hover:shadow-sm transition-all cursor-pointer">
            Permissions
          </span>
        </Link>
        <Link href="/projects">
          <span className="px-5 py-2 rounded-full text-slate-600 text-sm font-medium hover:bg-white hover:text-cyan-700 hover:shadow-sm transition-all cursor-pointer">
            3D Render
          </span>
        </Link>
        <Link href="/pricing">
          <span className="px-5 py-2 rounded-full text-slate-600 text-sm font-medium hover:bg-white hover:text-cyan-700 hover:shadow-sm transition-all cursor-pointer">
            Pricing
          </span>
        </Link>
      </div>

      {/* Auth Section */}
      <div className="flex items-center space-x-4">
        {isLoading ? (
          <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
        ) : isAuthenticated ? (
          <>
            {/* User Avatar/Icon */}
            <div className="flex items-center gap-2">
              {user?.profileImageUrl ? (
                <img 
                  src={user.profileImageUrl} 
                  alt={user.firstName || 'User'} 
                  className="w-8 h-8 rounded-full border border-slate-200"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center">
                  <User className="w-4 h-4 text-cyan-600" />
                </div>
              )}
              <span className="text-sm font-medium text-slate-700 hidden md:inline">
                {user?.firstName || 'User'}
              </span>
            </div>

            {/* Logout */}
            <a href="/api/auth/logout">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-slate-500 hover:text-slate-900"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </a>

            {/* New Project Button */}
            <Link href="/upload">
              <Button className="bg-slate-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-cyan-600 transition-all shadow-lg hover:shadow-cyan-500/25 flex items-center gap-2">
                <span>New Project</span>
                <PlusCircle className="w-4 h-4" />
              </Button>
            </Link>
          </>
        ) : (
          <>
            {/* Sign In */}
            <a href="/api/auth/login">
              <button className="text-slate-500 hover:text-slate-900 transition-colors">
                <UserCircle className="w-6 h-6" />
              </button>
            </a>

            {/* Sign Up / Get Started */}
            <a href="/api/auth/login">
              <Button className="bg-slate-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-cyan-600 transition-all shadow-lg hover:shadow-cyan-500/25 flex items-center gap-2">
                <span>Get Started</span>
                <PlusCircle className="w-4 h-4" />
              </Button>
            </a>
          </>
        )}
      </div>
    </nav>
  );
}
