import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import heroVideo from "@assets/kish613_A_floorplan_being_drawn_by_a_pencil._the_whole_pictur__1765809578123.mp4";

export function Hero() {
  return (
    <section className="relative h-[600px] w-full flex items-center overflow-hidden border-b border-border/40">
      {/* Video Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-black/60 z-10" /> {/* Overlay for readability */}
        <video 
          autoPlay 
          loop 
          muted 
          playsInline
          className="w-full h-full object-cover"
        >
          <source src={heroVideo} type="video/mp4" />
        </video>
      </div>

      {/* Content */}
      <div className="container relative z-10 mx-auto px-4 pointer-events-none">
        <div className="max-w-2xl pointer-events-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-Powered Architecture</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight mb-6 leading-[1.1] animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
            Transform Your Designs into <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50">3D Worlds</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-lg animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            Upload your 2D floorplans and instantly visualize them in stunning, photorealistic 3D environments.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
            <Link href="/upload">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-white rounded-full h-14 px-8 text-lg shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                Upload Floorplan
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            
            <Link href="/projects">
              <Button size="lg" variant="outline" className="rounded-full h-14 px-8 text-lg backdrop-blur-sm bg-background/50 hover:bg-accent/50 transition-all">
                View Gallery
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
