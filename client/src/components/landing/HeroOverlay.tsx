import { Link } from "wouter";
import { PenSquare, PlayCircle } from "lucide-react";

export function HeroOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-20">
      <div className="hero-text-overlay rounded-[2.5rem] p-12 max-w-4xl mx-auto text-center shadow-2xl">
        <div className="space-y-6">
          <h1 className="text-4xl xl:text-5xl font-bold text-slate-900 leading-tight tracking-tight font-[var(--font-poppins)]">
            Intelligent 3D Floorplans for{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600">
              Modern Living
            </span>
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto font-[var(--font-poppins)]">
            Transform sketches into professional 3D models and planning
            permission documents instantly. Precision drafting for
            architects and homeowners.
          </p>

          {/* CTA Buttons */}
          <div className="pt-6 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/upload">
              <button className="bg-slate-900 text-white px-10 py-4 rounded-xl font-medium hover:bg-cyan-600 transition-all text-lg shadow-lg hover:shadow-cyan-500/25 flex items-center gap-2">
                <PenSquare className="w-5 h-5" />
                Start Designing
              </button>
            </Link>
            <Link href="/projects">
              <button className="bg-white text-slate-700 border border-slate-200 px-8 py-4 rounded-xl font-medium hover:bg-slate-50 transition-all text-lg flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-slate-400" />
                View Demo
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
