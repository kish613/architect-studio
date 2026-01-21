import { LandingNav } from "@/components/landing/LandingNav";
import { AnimatedPhotoGrid } from "@/components/landing/AnimatedPhotoGrid";
import { HeroOverlay } from "@/components/landing/HeroOverlay";
import { StatsCards } from "@/components/landing/StatsCards";
import { FeaturedProjects } from "@/components/landing/FeaturedProjects";

export function Home() {
  return (
    <div className="bg-[#F8FAFC] text-slate-800 antialiased selection:bg-cyan-100 selection:text-cyan-900">
      {/* Hero Section */}
      <div className="hero-bg min-h-screen relative overflow-hidden blueprint-grid">
        {/* Abstract Decoration */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-b from-cyan-100/40 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />

        {/* Navigation */}
        <LandingNav />

        {/* Main Content */}
        <div className="relative z-10 max-w-7xl mx-auto pt-6 px-4 sm:px-6 lg:px-8">
          {/* Grid Animation with Overlay Text */}
          <div className="flex justify-center">
            <div className="glass-frame w-full rounded-[2rem] relative overflow-hidden">
              {/* Animated Photo Grid Background */}
              <AnimatedPhotoGrid />

              {/* Overlaid Hero Text */}
              <HeroOverlay />
            </div>
          </div>

          {/* Stats Cards */}
          <StatsCards />

          {/* Featured Projects */}
          <FeaturedProjects />
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-200 bg-white text-center text-slate-500 text-sm font-[var(--font-poppins)]">
        <div className="container mx-auto px-4">
          <p>&copy; {new Date().getFullYear()} Architect Studio. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
