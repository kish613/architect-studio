import { ReactNode } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

interface WorkspaceLayoutProps {
  leftPanel?: ReactNode;
  rightPanel?: ReactNode;
  children: ReactNode;
  title?: string;
  onBack?: () => void;
  backHref?: string;
}

export function WorkspaceLayout({
  leftPanel,
  rightPanel,
  children,
  title,
  onBack,
  backHref = "/projects",
}: WorkspaceLayoutProps) {
  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-96px)] w-full overflow-hidden bg-[#0A0A0A] border-y border-white/[0.04] shadow-2xl relative z-10">
      {/* Left Sidebar */}
      {leftPanel && (
        <div className="w-full lg:w-[280px] shrink-0 border-b lg:border-b-0 lg:border-r border-white/[0.04] weavy-panel flex flex-col z-20 lg:h-full max-h-[40vh] lg:max-h-none overflow-hidden relative shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
          <div className="h-14 px-4 flex items-center border-b border-white/[0.04] shrink-0 bg-white/[0.01]">
            {onBack ? (
              <button onClick={onBack} className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mr-3" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : backHref ? (
              <Link href={backHref} className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mr-3" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            ) : null}
            {title && <span className="font-medium text-sm text-white/90 truncate tracking-wide" data-testid="text-project-name">{title}</span>}
          </div>
          <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
            {leftPanel}
          </div>
        </div>
      )}

      {/* Center Canvas */}
      <div className="flex-1 relative overflow-hidden workspace-canvas-bg z-0 flex flex-col min-h-[50vh] lg:min-h-0">
        <div className="absolute inset-0 z-0 opacity-40 mix-blend-overlay pointer-events-none"></div>
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 lg:p-8 h-full overflow-hidden w-full">
          {children}
        </div>
      </div>

      {/* Right Sidebar */}
      {rightPanel && (
        <div className="w-full lg:w-[320px] shrink-0 border-t lg:border-t-0 lg:border-l border-white/[0.04] weavy-panel flex flex-col z-20 lg:h-full max-h-[50vh] lg:max-h-none overflow-hidden relative shadow-[-4px_0_24px_rgba(0,0,0,0.5)]">
          <div className="h-14 px-5 flex items-center border-b border-white/[0.04] shrink-0 bg-white/[0.01]">
            <span className="font-medium text-[11px] text-muted-foreground uppercase tracking-widest">Properties</span>
          </div>
          <div className="p-5 overflow-y-auto flex-1 custom-scrollbar">
            {rightPanel}
          </div>
        </div>
      )}
    </div>
  );
}
