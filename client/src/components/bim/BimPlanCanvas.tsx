/**
 * Lightweight top-down BIM plan canvas.
 *
 * Renders the canonical BIM as an SVG overview — walls, rooms, doors,
 * windows — with no dependency on Three.js or the Pascal editor. This is
 * the placeholder the new BIM / extract / presentation modes render while
 * the heavier technical/presentation viewers are wired in. It is
 * intentionally read-only and deterministic.
 *
 * The canvas takes the canonical BIM as-is — nothing Pascal-shaped is
 * allowed here.
 */

import {
  computeBimBounds,
  type CanonicalBim,
  type Vec2,
} from "@shared/bim/canonical-schema";

interface BimPlanCanvasProps {
  bim: CanonicalBim;
  /** Optional style toggle. "technical" = BIM mode, "clean" = presentation. */
  style?: "technical" | "clean" | "extract";
  /** Optional filter to a specific level id. */
  levelId?: string | null;
}

interface Projected {
  width: number;
  height: number;
  project: (p: Vec2) => [number, number];
}

function buildProjection(bim: CanonicalBim): Projected {
  const bounds = computeBimBounds(bim);
  const pad = 1.5;
  const minX = bounds.min.x - pad;
  const minZ = bounds.min.z - pad;
  const maxX = bounds.max.x + pad;
  const maxZ = bounds.max.z + pad;
  const worldW = Math.max(maxX - minX, 0.001);
  const worldH = Math.max(maxZ - minZ, 0.001);

  const pixelsPerMetre = 40;
  const width = Math.max(worldW * pixelsPerMetre, 320);
  const height = Math.max(worldH * pixelsPerMetre, 200);

  return {
    width,
    height,
    project(p) {
      const x = ((p.x - minX) / worldW) * width;
      const y = ((p.z - minZ) / worldH) * height;
      return [x, y];
    },
  };
}

function wallLength(start: Vec2, end: Vec2): number {
  return Math.hypot(end.x - start.x, end.z - start.z);
}

const ROOM_COLORS: Record<string, string> = {
  room: "#4A90D9",
  hallway: "#B0B0B0",
  bathroom: "#5DADE2",
  kitchen: "#F4D03F",
  bedroom: "#82E0AA",
  living: "#AF7AC5",
  dining: "#D7BDE2",
  office: "#85C1E9",
  garage: "#AAB7B8",
  utility: "#F0B27A",
  closet: "#D5DBDB",
  stairwell: "#C39BD3",
  other: "#D5DBDB",
};

export function BimPlanCanvas({
  bim,
  style = "technical",
  levelId = null,
}: BimPlanCanvasProps) {
  const projection = buildProjection(bim);
  const activeLevelId = levelId ?? bim.levels[0]?.id ?? null;

  const walls = bim.walls.filter(
    (w) => !activeLevelId || w.levelId === activeLevelId
  );
  const rooms = bim.rooms.filter(
    (r) => !activeLevelId || r.levelId === activeLevelId
  );
  const doors = bim.doors.filter(
    (d) => !activeLevelId || d.levelId === activeLevelId
  );
  const windows = bim.windows.filter(
    (w) => !activeLevelId || w.levelId === activeLevelId
  );

  const wallFill =
    style === "clean"
      ? "#c9c6bd"
      : style === "extract"
        ? "#60a5fa"
        : "#e5e7eb";

  return (
    <div className="relative h-full w-full overflow-auto rounded-md border border-white/10 bg-[#0A0A0A]">
      <svg
        viewBox={`0 0 ${projection.width} ${projection.height}`}
        className="block h-full w-full"
        role="img"
        aria-label={`BIM floor plan (${style})`}
      >
        <defs>
          <pattern
            id="grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        {style !== "clean" && (
          <rect width={projection.width} height={projection.height} fill="url(#grid)" />
        )}

        {/* Rooms as filled polygons */}
        {rooms.map((room) => {
          const pts = room.outline
            .map((p) => {
              const [x, y] = projection.project(p);
              return `${x},${y}`;
            })
            .join(" ");
          if (!pts) return null;
          const color = room.color ?? ROOM_COLORS[room.roomType] ?? ROOM_COLORS.room;
          return (
            <g key={room.id}>
              <polygon
                points={pts}
                fill={color}
                fillOpacity={style === "clean" ? 0.15 : 0.18}
                stroke={color}
                strokeOpacity={0.6}
                strokeWidth={1.25}
              />
            </g>
          );
        })}

        {/* Walls drawn as thick projected line segments. */}
        {walls.map((wall) => {
          const [sx, sy] = projection.project(wall.start);
          const [ex, ey] = projection.project(wall.end);
          const strokeWidth = Math.max(2, wall.thickness * 40);
          return (
            <line
              key={wall.id}
              x1={sx}
              y1={sy}
              x2={ex}
              y2={ey}
              stroke={wallFill}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              data-len={wallLength(wall.start, wall.end).toFixed(2)}
              data-exterior={wall.isExterior}
            >
              <title>{wall.name ?? "wall"}</title>
            </line>
          );
        })}

        {/* Doors — small gap marker */}
        {doors.map((door) => {
          const host = walls.find((w) => w.id === door.hostWallId);
          if (!host) return null;
          const px = host.start.x + (host.end.x - host.start.x) * door.position;
          const pz = host.start.z + (host.end.z - host.start.z) * door.position;
          const [cx, cy] = projection.project({ x: px, z: pz });
          return (
            <circle
              key={door.id}
              cx={cx}
              cy={cy}
              r={5}
              fill="#f97316"
              stroke="#0A0A0A"
              strokeWidth={1}
            >
              <title>{door.name ?? "door"} ({door.width.toFixed(2)}m)</title>
            </circle>
          );
        })}

        {/* Windows — square markers */}
        {windows.map((win) => {
          const host = walls.find((w) => w.id === win.hostWallId);
          if (!host) return null;
          const px = host.start.x + (host.end.x - host.start.x) * win.position;
          const pz = host.start.z + (host.end.z - host.start.z) * win.position;
          const [cx, cy] = projection.project({ x: px, z: pz });
          return (
            <rect
              key={win.id}
              x={cx - 4}
              y={cy - 4}
              width={8}
              height={8}
              fill="#38bdf8"
              stroke="#0A0A0A"
              strokeWidth={1}
            >
              <title>{win.name ?? "window"} ({win.width.toFixed(2)}m)</title>
            </rect>
          );
        })}

        {/* Room labels */}
        {style !== "clean" &&
          rooms.map((room) => {
            if (room.outline.length === 0) return null;
            const cx =
              room.outline.reduce((acc, p) => acc + p.x, 0) /
              room.outline.length;
            const cz =
              room.outline.reduce((acc, p) => acc + p.z, 0) /
              room.outline.length;
            const [x, y] = projection.project({ x: cx, z: cz });
            return (
              <text
                key={`${room.id}-label`}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={11}
                fill="white"
                opacity={0.85}
              >
                {room.label || room.name || room.roomType}
              </text>
            );
          })}
      </svg>
    </div>
  );
}
