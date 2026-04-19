import "./workspace.css";
import type { PropsWithChildren } from "react";

export type WorkspaceLayout = "studio" | "precision";

export function WorkspaceRoot({ layout, children }: PropsWithChildren<{ layout: WorkspaceLayout }>) {
  return (
    <div className="workspace-root studio" data-layout={layout}>
      {children}
    </div>
  );
}
