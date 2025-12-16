import { Header } from "./Header";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <Header />
      <main className="min-h-screen flex flex-col">
        {children}
      </main>
    </div>
  );
}
