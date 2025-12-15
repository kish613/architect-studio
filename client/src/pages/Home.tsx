import { Layout } from "@/components/layout/Layout";
import { Hero } from "@/components/home/Hero";
import { Capabilities } from "@/components/home/Capabilities";
import { DesignGallery } from "@/components/home/DesignGallery";

export function Home() {
  return (
    <Layout>
      <Hero />
      <Capabilities />
      <DesignGallery />
      
      {/* Footer Simple */}
      <footer className="py-12 border-t border-border/40 bg-black/40 text-center text-muted-foreground text-sm">
        <div className="container mx-auto px-4">
          <p>© 2024 Architect Studio. All rights reserved.</p>
        </div>
      </footer>
    </Layout>
  );
}
