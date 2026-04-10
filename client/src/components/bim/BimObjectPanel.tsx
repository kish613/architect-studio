/**
 * BIM object metadata panel (read-only).
 *
 * Surfaces the counts + per-level breakdown + room table produced by the
 * canonical BIM model. This is the technical/BIM mode's "right panel" —
 * it intentionally stays framework-free so the BIM viewer 3D surface can
 * be dropped in later without touching this component.
 */

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CanonicalBim } from "@shared/bim/canonical-schema";

interface BimObjectPanelProps {
  bim: CanonicalBim;
}

export function BimObjectPanel({ bim }: BimObjectPanelProps) {
  const areaOf = (points: { x: number; z: number }[]): number => {
    if (points.length < 3) return 0;
    let sum = 0;
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      sum += a.x * b.z - b.x * a.z;
    }
    return Math.abs(sum) / 2;
  };

  const totals = {
    levels: bim.levels.length,
    walls: bim.walls.length,
    doors: bim.doors.length,
    windows: bim.windows.length,
    rooms: bim.rooms.length,
    furniture: bim.furniture.length,
    fixtures: bim.fixtures.length,
  };

  return (
    <div className="flex h-full flex-col border-l border-white/10 bg-[#0C0C0F] text-white/80">
      <div className="border-b border-white/10 p-4">
        <p className="text-[10px] uppercase tracking-wider text-white/40">
          BIM summary
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {Object.entries(totals).map(([label, value]) => (
            <Badge
              key={label}
              variant="secondary"
              className="bg-white/5 text-white/80"
            >
              {label}: {value}
            </Badge>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-white/40">
          Scale confidence:{" "}
          <span className="text-white/70">
            {(bim.metadata.scaleConfidence * 100).toFixed(0)}%
          </span>
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          <section>
            <h4 className="mb-2 text-[10px] uppercase tracking-wider text-white/40">
              Levels
            </h4>
            <ul className="space-y-1">
              {bim.levels.map((lvl) => {
                const walls = bim.walls.filter((w) => w.levelId === lvl.id).length;
                const rooms = bim.rooms.filter((r) => r.levelId === lvl.id).length;
                return (
                  <li
                    key={lvl.id}
                    className="rounded border border-white/5 bg-white/5 p-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white">
                        {lvl.name ?? `Level ${lvl.index}`}
                      </span>
                      <span className="text-white/40">
                        elev {lvl.elevation.toFixed(1)}m
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-white/50">
                      {walls} walls · {rooms} rooms · height{" "}
                      {lvl.height.toFixed(1)}m
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section>
            <h4 className="mb-2 text-[10px] uppercase tracking-wider text-white/40">
              Rooms
            </h4>
            <ul className="space-y-1">
              {bim.rooms.length === 0 ? (
                <li className="text-[11px] text-white/40">No rooms extracted.</li>
              ) : (
                bim.rooms.map((room) => (
                  <li
                    key={room.id}
                    className="flex items-center justify-between rounded border border-white/5 bg-white/5 px-2 py-1.5 text-xs"
                  >
                    <span className="truncate text-white">
                      {room.label || room.name || room.roomType}
                    </span>
                    <span className="shrink-0 text-white/40">
                      {areaOf(room.outline).toFixed(1)} m²
                    </span>
                  </li>
                ))
              )}
            </ul>
          </section>

          {bim.metadata.extractionNotes.length > 0 && (
            <section>
              <h4 className="mb-2 text-[10px] uppercase tracking-wider text-white/40">
                Extraction notes
              </h4>
              <ul className="space-y-1 text-[11px] text-white/60">
                {bim.metadata.extractionNotes.map((note, i) => (
                  <li key={i}>• {note}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
