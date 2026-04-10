/**
 * Mode switcher for the new BIM-first viewer pages.
 *
 * The app now supports three modes on a floorplan:
 *
 *   /planning/:id/extract  — extract / review mode (the canonical BIM JSON
 *                            with the source image side-by-side)
 *   /planning/:id/bim      — BIM / technical mode (floors, metadata, layer
 *                            toggles, measurements, clipping-ready)
 *   /planning/:id/present  — presentation mode (cleaner materials, nicer
 *                            display for client-facing views)
 *
 * The legacy `/planning/:id/editor` route still mounts the original Pascal
 * editor and is preserved as a compatibility mode so we don't break any
 * in-flight work during the migration.
 */

import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { ClipboardCheck, Layers3, Presentation, Wrench } from "lucide-react";

type BimMode = "extract" | "bim" | "present" | "editor";

interface ModeConfig {
  id: BimMode;
  label: string;
  description: string;
  icon: typeof ClipboardCheck;
  href: (id: number | string) => string;
}

const MODES: ModeConfig[] = [
  {
    id: "extract",
    label: "Extract",
    description: "Review the extraction pipeline output",
    icon: ClipboardCheck,
    href: (id) => `/planning/${id}/extract`,
  },
  {
    id: "bim",
    label: "BIM",
    description: "Technical BIM viewer",
    icon: Layers3,
    href: (id) => `/planning/${id}/bim`,
  },
  {
    id: "present",
    label: "Present",
    description: "Client-facing presentation",
    icon: Presentation,
    href: (id) => `/planning/${id}/present`,
  },
  {
    id: "editor",
    label: "Legacy editor",
    description: "Pascal compatibility editor",
    icon: Wrench,
    href: (id) => `/planning/${id}/editor`,
  },
];

export function BimModeSwitcher({
  floorplanId,
  activeMode,
}: {
  floorplanId: number | string;
  activeMode: BimMode;
}) {
  const [, navigate] = useLocation();

  return (
    <nav
      className="flex flex-wrap items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-1"
      aria-label="BIM mode switcher"
    >
      {MODES.map((mode) => {
        const Icon = mode.icon;
        const active = mode.id === activeMode;
        return (
          <Link
            key={mode.id}
            href={mode.href(floorplanId)}
            onClick={(e) => {
              // Wouter's Link handles navigation but we keep explicit call
              // for consistency with other navigation sites in this repo.
              if ((e as React.MouseEvent).metaKey || (e as React.MouseEvent).ctrlKey) return;
              e.preventDefault();
              navigate(mode.href(floorplanId));
            }}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            )}
            title={mode.description}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{mode.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export type { BimMode };
