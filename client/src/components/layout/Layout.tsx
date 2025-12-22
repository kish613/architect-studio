import { Header } from "./Header";
import { UsageWarningBanner } from "@/components/subscription/UsageWarningBanner";
import { useAuth } from "@/hooks/use-auth";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <Header />
      {isAuthenticated && (
        <div className="fixed top-[8rem] left-4 right-4 z-40">
          <UsageWarningBanner />
        </div>
      )}
      <main className="min-h-screen flex flex-col">
        {children}
      </main>
    </div>
  );
}
