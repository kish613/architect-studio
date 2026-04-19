import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  LayoutGrid,
  Box,
  Columns2,
  Scan,
  Footprints,
  PanelTop,
  PanelsLeftRight,
  Sparkles,
  Image as ImageIcon,
  Paintbrush,
  Layers,
  type LucideIcon,
} from "lucide-react";

export interface CommandDef {
  label: string;
  iconName: string;
  action: string;
}

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onPick: (action: string) => void;
}

const ICONS: Record<string, LucideIcon> = {
  "layout-grid": LayoutGrid,
  box: Box,
  "columns-2": Columns2,
  scan: Scan,
  footprints: Footprints,
  "panel-top": PanelTop,
  "panels-left-right": PanelsLeftRight,
  sparkles: Sparkles,
  image: ImageIcon,
  paintbrush: Paintbrush,
  layers: Layers,
};

export const DEFAULT_COMMANDS: CommandDef[] = [
  { label: "Switch to Plan view", iconName: "layout-grid", action: "mode:2d" },
  { label: "Switch to Split view", iconName: "columns-2", action: "mode:split" },
  { label: "Switch to Model view", iconName: "box", action: "mode:3d" },
  { label: "Camera · Isometric", iconName: "box", action: "cam:iso" },
  { label: "Camera · Front", iconName: "box", action: "cam:front" },
  { label: "Camera · Side", iconName: "box", action: "cam:side" },
  { label: "Camera · Top down", iconName: "scan", action: "cam:top" },
  { label: "Camera · Walk-through", iconName: "footprints", action: "cam:walk" },
  { label: "Layout · Studio (minimal)", iconName: "panel-top", action: "layout:studio" },
  {
    label: "Layout · Precision (panels)",
    iconName: "panels-left-right",
    action: "layout:precision",
  },
  { label: "Generate · Pascal BIM", iconName: "layers", action: "gen:pascal" },
  {
    label: "Generate · Isometric render",
    iconName: "image",
    action: "gen:isometric",
  },
  { label: "Generate · 3D mesh", iconName: "box", action: "gen:3d" },
  {
    label: "Generate · Retexture",
    iconName: "paintbrush",
    action: "gen:retexture",
  },
];

export function CommandPalette({ open, onClose, onPick }: CommandPaletteProps) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      setQ("");
      // Autofocus input when opened
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const filtered = useMemo(
    () =>
      DEFAULT_COMMANDS.filter((c) =>
        c.label.toLowerCase().includes(q.toLowerCase()),
      ),
    [q],
  );

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      data-testid="command-palette-overlay"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.65)",
        backdropFilter: "blur(4px)",
        zIndex: 1000,
        display: "grid",
        placeItems: "start center",
        paddingTop: "15vh",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 560,
          background: "var(--ink-2)",
          border: "1px solid var(--line-3)",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 30px 80px rgba(0,0,0,.7)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            borderBottom: "1px solid var(--line-2)",
          }}
        >
          <Search style={{ width: 16, height: 16, color: "var(--fg-3)" }} />
          <input
            ref={inputRef}
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search or run command…"
            data-testid="command-palette-input"
            style={{
              flex: 1,
              background: "transparent",
              border: 0,
              outline: "none",
              color: "var(--fg-1)",
              fontSize: 14,
              fontFamily: "var(--font-sans)",
            }}
          />
          <kbd
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--fg-3)",
              background: "var(--ink-3)",
              padding: "2px 6px",
              borderRadius: 4,
              border: "1px solid var(--line-2)",
            }}
          >
            ESC
          </kbd>
        </div>
        <div
          data-testid="command-palette-list"
          style={{ maxHeight: 380, overflow: "auto", padding: 8 }}
        >
          {filtered.map((c) => {
            const Icon = ICONS[c.iconName] ?? Box;
            return (
              <button
                key={c.action}
                data-action={c.action}
                onClick={() => onPick(c.action)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  background: "transparent",
                  border: 0,
                  borderRadius: 7,
                  color: "var(--fg-1)",
                  cursor: "pointer",
                  fontSize: 13,
                  textAlign: "left",
                  fontFamily: "var(--font-sans)",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = "rgba(249,115,22,.08)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <Icon
                  style={{ width: 15, height: 15, color: "var(--fg-3)" }}
                />
                {c.label}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div
              style={{
                padding: 24,
                textAlign: "center",
                color: "var(--fg-3)",
                fontSize: 13,
              }}
            >
              No matches
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
