import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Home, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/ui/page-transition";

export default function NotFound() {
  return (
    <Layout>
      <PageTransition>
        <div className="flex items-center justify-center min-h-[70vh] px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-center dark-glass-card rounded-3xl p-12 max-w-md w-full"
          >
            <div className="mb-6">
              <span className="text-8xl font-display font-bold gradient-text">404</span>
            </div>
            <div className="w-14 h-14 mx-auto mb-6 bg-primary/10 rounded-2xl flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-primary floating-animation" />
            </div>
            <h1 className="text-2xl font-display font-bold mb-2">Page Not Found</h1>
            <p className="text-muted-foreground mb-8">
              The page you're looking for doesn't exist or has been moved.
            </p>
            <Link href="/">
              <Button className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
                <Home className="w-4 h-4" />
                Go Home
              </Button>
            </Link>
          </motion.div>
        </div>
      </PageTransition>
    </Layout>
  );
}
