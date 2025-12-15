import { Layers, Image, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function Capabilities() {
  return (
    <section className="py-24 container mx-auto px-4">
      <div className="grid md:grid-cols-2 gap-8">
        <Card className="group relative overflow-hidden bg-card/50 border-white/5 hover:border-primary/20 transition-colors duration-500">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardContent className="p-8 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
              <Image className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-2xl font-display font-bold mb-3">Photorealistic Renders</h3>
            <p className="text-muted-foreground text-lg leading-relaxed mb-6">
              Turn sketches into reality. Our AI analyzes your floorplan structure and lighting to generate hyper-realistic visualizations in seconds.
            </p>
            <div className="flex items-center text-primary font-medium">
              Learn more <ArrowUpRight className="w-4 h-4 ml-1" />
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden bg-card/50 border-white/5 hover:border-primary/20 transition-colors duration-500">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardContent className="p-8 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
              <Layers className="w-6 h-6 text-blue-500" />
            </div>
            <h3 className="text-2xl font-display font-bold mb-3">Multi-Level Support</h3>
            <p className="text-muted-foreground text-lg leading-relaxed mb-6">
              Complex projects made simple. Upload multi-story blueprints and visualize entire buildings with cohesive architectural consistency.
            </p>
            <div className="flex items-center text-blue-500 font-medium">
              Explore features <ArrowUpRight className="w-4 h-4 ml-1" />
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
