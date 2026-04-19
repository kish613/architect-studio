import type { LucideIcon } from "lucide-react";
import {
  MousePointer2,
  Hand,
  Minus,
  DoorOpen,
  SquareDashed,
  Square,
  Ruler,
  MessageSquare,
  Sofa,
  Undo2,
  Redo2,
} from "lucide-react";

export type ToolId =
  | "select"
  | "pan"
  | "wall"
  | "door"
  | "window"
  | "room"
  | "measure"
  | "comment"
  | "furniture";

export interface ToolDef {
  id: ToolId;
  icon: LucideIcon;
  label: string;
  k: string;
}

export const TOOLS: readonly ToolDef[] = [
  { id: "select", icon: MousePointer2, label: "Select", k: "V" },
  { id: "pan", icon: Hand, label: "Pan", k: "H" },
  { id: "wall", icon: Minus, label: "Wall", k: "W" },
  { id: "door", icon: DoorOpen, label: "Door", k: "D" },
  { id: "window", icon: SquareDashed, label: "Window", k: "N" },
  { id: "room", icon: Square, label: "Room", k: "R" },
  { id: "measure", icon: Ruler, label: "Measure", k: "M" },
  { id: "comment", icon: MessageSquare, label: "Comment", k: "C" },
  { id: "furniture", icon: Sofa, label: "Furniture", k: "F" },
] as const;

export const UNDO_ICON = Undo2;
export const REDO_ICON = Redo2;
