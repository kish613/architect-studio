import { X } from "lucide-react";
import { FurnitureCatalogPanel } from "@/components/editor/FurnitureCatalogPanel";

export interface FurniturePopoverProps {
  open: boolean;
  onClose?: () => void;
}

export function FurniturePopover({ open, onClose }: FurniturePopoverProps) {
  if (!open) return null;
  return (
    <div
      className="sb-island"
      style={{
        position: "absolute",
        right: 20,
        bottom: 90,
        width: 340,
        maxHeight: 540,
        padding: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        zIndex: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          borderBottom: "1px solid var(--line-2)",
        }}
      >
        <div className="sb-panel-title">Furniture</div>
        <button
          onClick={onClose}
          className="sb-icon-btn"
          style={{ width: 22, height: 22 }}
          aria-label="Close furniture panel"
        >
          <X style={{ width: 12, height: 12 }} />
        </button>
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        <FurnitureCatalogPanel />
      </div>
    </div>
  );
}
