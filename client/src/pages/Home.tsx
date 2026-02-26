import { LandingNav } from "@/components/landing/LandingNav";
import { AnimatedPhotoGrid } from "@/components/landing/AnimatedPhotoGrid";
import { HeroOverlay } from "@/components/landing/HeroOverlay";
import { StatsCards } from "@/components/landing/StatsCards";
import { FeaturedProjects } from "@/components/landing/FeaturedProjects";

export function Home() {
  return (
    <div className="bg-[#0A0A0A] text-white/90 antialiased selection:bg-primary/30 selection:text-white workspace-canvas-bg min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden w-full h-full">
        {/* Abstract Decoration */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />

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
      <footer className="py-12 border-t border-white/10 bg-[#0f1115] text-center text-white/40 text-sm font-[var(--font-poppins)]">
        <div className="container mx-auto px-4">
          <p>&copy; {new Date().getFullYear()} Architect Studio. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
