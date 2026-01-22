import { Link } from "wouter";
import { PlusCircle, UserCircle, LogIn, LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import logoImage from "@assets/architect-studio-logo.png";

export function LandingNav() {
  const { user, isLoading, isAuthenticated } = useAuth();

  return (
    <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full font-[var(--font-poppins)]">
      {/* Logo */}
      <Link href="/">
        <img 
          src={logoImage} 
          alt="Architect Studio" 
          className="h-36 w-auto object-contain transition-transform hover:scale-105 cursor-pointer"
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
