import { Header } from "./Header";
import { UsageWarningBanner } from "@/components/subscription/UsageWarningBanner";
import { useAuth } from "@/hooks/use-auth";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 relative overflow-hidden dark-dot-grid">
      {/* Decorative gradient blobs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-b from-primary/[0.03] to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-t from-primary/[0.02] to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
      </div>
      <Header />
      {isAuthenticated && (
        <div className="fixed top-[8rem] left-4 right-4 z-40">
          <UsageWarningBanner />
        </div>
      )}
      <main className="min-h-screen flex flex-col pt-32 relative z-10">
        {children}
      </main>
    </div>
  );
}
