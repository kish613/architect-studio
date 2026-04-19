import { ChevronRight, Search, Share2, Download } from "lucide-react";
import type { ReactNode } from "react";
import { ModeSwitcher, type ViewerMode } from "./ModeSwitcher";

interface TopBarProps {
  projectName: string;
  mode: ViewerMode;
  onMode: (m: ViewerMode) => void;
  onOpenCmd: () => void;
  onExport?: () => void;
  onShare?: () => void;
  rightSlot?: ReactNode;
}

function UserAvatar() {
  return (
    <div
      className="sb-avatar sb-avatar-user"
      title="User"
      style={{
        width: 30,
        height: 30,
        marginLeft: 0,
        borderWidth: 0,
        background: "linear-gradient(135deg, #2a2520 0%, #4a4038 100%)",
        color: "var(--fg-1)",
        fontSize: 11,
        fontWeight: 600,
        border: "1px solid var(--line-2)",
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
      </svg>
    </div>
  );
}

export function TopBar({
  projectName,
  mode,
  onMode,
  onOpenCmd,
  onExport,
  onShare,
  rightSlot,
}: TopBarProps) {
  return (
    <header className="sb-top">
      <div className="sb-top-l">
        <UserAvatar />
        <div className="sb-crumb">
          <span>Projects</span>
          <ChevronRight style={{ width: 12, height: 12, opacity: 0.5 }} />
          <strong>{projectName}</strong>
          <span className="chip-beta">Live</span>
        </div>
      </div>

      <ModeSwitcher mode={mode} onChange={onMode} />

      <div className="sb-top-r">
        <button className="sb-cmd-trigger" onClick={onOpenCmd}>
          <Search style={{ width: 13, height: 13 }} />
          <span>Search or run command…</span>
          <span className="kbd">⌘K</span>
        </button>
        <div className="sb-avatars">
          <div
            className="sb-avatar"
            style={{ background: "linear-gradient(135deg,#F97316,#EA580C)" }}
          >
            KS
          </div>
          <div
            className="sb-avatar"
            style={{ background: "linear-gradient(135deg,#003087,#00AEEF)" }}
          >
            MA
          </div>
        </div>
        {rightSlot}
        <button className="sb-icon-btn" title="Share" onClick={onShare}>
          <Share2 style={{ width: 15, height: 15 }} />
        </button>
        <button className="sb-btn sb-btn-primary" onClick={onExport}>
          <Download style={{ width: 13, height: 13 }} />
          Export
        </button>
      </div>
    </header>
  );
}
