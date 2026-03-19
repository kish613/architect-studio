import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { pgTable, text, varchar, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";
import { jwtVerify } from "jose";
import { canUserGenerate, deductCredit } from "../../lib/subscription-manager.js";

// Inline schema
const users = pgTable("users", {
  id: varchar("id").primaryKey(),
});

const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
});

const floorplanModels = pgTable("floorplan_models", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  originalUrl: text("original_url").notNull(),
  pascalData: text("pascal_data"),
  status: text("status").notNull().default("uploaded"),
});

function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be set");
  return drizzle(neon(process.env.DATABASE_URL));
}

function getSessionFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const sessionCookie = cookieHeader.split(";").map(c => c.trim()).find(c => c.startsWith("auth_session="));
  return sessionCookie ? sessionCookie.split("=")[1] : null;
}

async function verifySession(token: string): Promise<{ userId: string } | null> {
  try {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET || "fallback-secret");
    const { payload } = await jwtVerify(token, secret);
    return typeof payload.userId === "string" ? { userId: payload.userId } : null;
  } catch {
    return null;
  }
}

// ─── Pascal SceneData types ─────────────────────────────────

type Vec3 = { x: number; y: number; z: number };

interface BaseNode {
  id: string;
  parentId: string | null;
  childIds: string[];
  name: string;
  visible: boolean;
  locked: boolean;
}

interface DefaultTransform {
  transform: { position: Vec3; rotation: Vec3; scale: Vec3 };
}

interface SiteNode extends BaseNode, DefaultTransform { type: "site" }
interface BuildingNode extends BaseNode, DefaultTransform { type: "building" }
interface LevelNode extends BaseNode, DefaultTransform {
  type: "level"; elevation: number; height: number; index: number;
}
interface WallNode extends BaseNode, DefaultTransform {
  type: "wall"; start: Vec3; end: Vec3; height: number; thickness: number; material: string;
}
interface DoorNode extends BaseNode, DefaultTransform {
  type: "door"; wallId: string; position: number; width: number; height: number;
  doorType: "single" | "double" | "sliding" | "french" | "bifold"; swing: "left" | "right";
}
interface WindowNode extends BaseNode, DefaultTransform {
  type: "window"; wallId: string; position: number; width: number; height: number;
  sillHeight: number; windowType: "fixed" | "casement" | "sash" | "sliding" | "bay" | "skylight";
}
interface ZoneNode extends BaseNode, DefaultTransform {
  type: "zone"; zoneType: string; label: string; color: string; points: Vec3[];
}
interface ItemNode extends BaseNode, DefaultTransform {
  type: "item"; itemType: "furniture" | "appliance" | "fixture" | "light" | "custom";
  catalogId?: string; dimensions: Vec3; material: string; modelUrl?: string;
}

type AnyNode = SiteNode | BuildingNode | LevelNode | WallNode | DoorNode | WindowNode | ZoneNode | ItemNode;
interface SceneData { nodes: Record<string, AnyNode>; rootNodeIds: string[] }

const defaultTransform: DefaultTransform["transform"] = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
};

function makeId(): string { return crypto.randomUUID(); }

function makeBase(type: string, name?: string): BaseNode & { type: string } {
  const id = makeId();
  return { id, parentId: null, childIds: [], name: name ?? `${type}-${id.slice(0, 4)}`, visible: true, locked: false, type };
}

const ZONE_DEFAULT_COLORS: Record<string, string> = {
  room: "#4A90D9", hallway: "#B0B0B0", bathroom: "#5DADE2", kitchen: "#F4D03F",
  bedroom: "#82E0AA", living: "#AF7AC5", garage: "#AAB7B8", utility: "#F0B27A", other: "#D5DBDB",
};

// ─── Gemini intermediate types ──────────────────────────────

interface GeminiWall { startX: number; startZ: number; endX: number; endZ: number; height?: number; thickness?: number }
interface GeminiDoor { wallIndex: number; position?: number; width?: number; height?: number; doorType?: string; swing?: string }
interface GeminiWindow { wallIndex: number; position?: number; width?: number; height?: number; sillHeight?: number; windowType?: string }
interface GeminiRoom { name: string; zoneType: string; points: Array<{ x: number; z: number }>; color?: string }
interface GeminiItem { name: string; itemType?: "furniture" | "appliance" | "fixture"; position: { x: number; z: number }; dimensions?: { x: number; y: number; z: number } }
interface GeminiLevel { name: string; index: number; elevation: number; walls: GeminiWall[]; doors: GeminiDoor[]; windows: GeminiWindow[]; rooms?: GeminiRoom[]; items?: GeminiItem[] }

function normaliseGeminiData(raw: any): { levels: GeminiLevel[] } {
  if (Array.isArray(raw.levels) && raw.levels.length > 0) {
    return {
      levels: raw.levels.map((lvl: any, i: number) => ({
        name: lvl.name ?? `Level ${i}`, index: typeof lvl.index === "number" ? lvl.index : i,
        elevation: typeof lvl.elevation === "number" ? lvl.elevation : i * 2.7,
        walls: Array.isArray(lvl.walls) ? lvl.walls : [], doors: Array.isArray(lvl.doors) ? lvl.doors : [],
        windows: Array.isArray(lvl.windows) ? lvl.windows : [], rooms: Array.isArray(lvl.rooms) ? lvl.rooms : [],
        items: Array.isArray(lvl.items) ? lvl.items : [],
      })),
    };
  }
  return {
    levels: [{
      name: "Ground Floor", index: 0, elevation: 0,
      walls: Array.isArray(raw.walls) ? raw.walls : [], doors: Array.isArray(raw.doors) ? raw.doors : [],
      windows: Array.isArray(raw.windows) ? raw.windows : [], rooms: Array.isArray(raw.rooms) ? raw.rooms : [],
      items: Array.isArray(raw.items) ? raw.items : [],
    }],
  };
}

// ─── Server-side catalog matching ───────────────────────────

const ASSET_BASE = "/assets/furniture";

interface CatalogMatch {
  id: string;
  modelUrl: string;
  dimensions: Vec3;
}

const CATALOG_KEYWORD_MAP: Record<string, CatalogMatch> = {
  sofa:         { id: "sofa-01",         modelUrl: `${ASSET_BASE}/sofa-01.glb`,         dimensions: { x: 2.2, y: 0.85, z: 0.9 } },
  couch:        { id: "sofa-01",         modelUrl: `${ASSET_BASE}/sofa-01.glb`,         dimensions: { x: 2.2, y: 0.85, z: 0.9 } },
  bed:          { id: "bed-double-01",   modelUrl: `${ASSET_BASE}/bed-double-01.glb`,   dimensions: { x: 1.6, y: 0.5, z: 2.0 } },
  toilet:       { id: "toilet-01",       modelUrl: `${ASSET_BASE}/toilet-01.glb`,       dimensions: { x: 0.4, y: 0.4, z: 0.65 } },
  fridge:       { id: "fridge-01",       modelUrl: `${ASSET_BASE}/fridge-01.glb`,       dimensions: { x: 0.7, y: 1.8, z: 0.7 } },
  refrigerator: { id: "fridge-01",       modelUrl: `${ASSET_BASE}/fridge-01.glb`,       dimensions: { x: 0.7, y: 1.8, z: 0.7 } },
  table:        { id: "dining-table-01", modelUrl: `${ASSET_BASE}/dining-table-01.glb`, dimensions: { x: 1.6, y: 0.75, z: 0.9 } },
  chair:        { id: "dining-chair-01", modelUrl: `${ASSET_BASE}/dining-chair-01.glb`, dimensions: { x: 0.45, y: 0.9, z: 0.45 } },
  bathtub:      { id: "bathtub-01",      modelUrl: `${ASSET_BASE}/bathtub-01.glb`,      dimensions: { x: 0.75, y: 0.6, z: 1.7 } },
  bath:         { id: "bathtub-01",      modelUrl: `${ASSET_BASE}/bathtub-01.glb`,      dimensions: { x: 0.75, y: 0.6, z: 1.7 } },
  shower:       { id: "shower-01",       modelUrl: `${ASSET_BASE}/shower-01.glb`,       dimensions: { x: 0.9, y: 2.1, z: 0.9 } },
  wardrobe:     { id: "wardrobe-01",     modelUrl: `${ASSET_BASE}/wardrobe-01.glb`,     dimensions: { x: 1.8, y: 2.2, z: 0.6 } },
  closet:       { id: "wardrobe-01",     modelUrl: `${ASSET_BASE}/wardrobe-01.glb`,     dimensions: { x: 1.8, y: 2.2, z: 0.6 } },
  desk:         { id: "desk-01",         modelUrl: `${ASSET_BASE}/desk-01.glb`,         dimensions: { x: 1.2, y: 0.75, z: 0.6 } },
  oven:         { id: "oven-01",         modelUrl: `${ASSET_BASE}/oven-01.glb`,         dimensions: { x: 0.6, y: 0.85, z: 0.6 } },
  stove:        { id: "oven-01",         modelUrl: `${ASSET_BASE}/oven-01.glb`,         dimensions: { x: 0.6, y: 0.85, z: 0.6 } },
  sink:         { id: "sink-kitchen-01", modelUrl: `${ASSET_BASE}/sink-kitchen-01.glb`, dimensions: { x: 0.8, y: 0.2, z: 0.5 } },
  nightstand:   { id: "nightstand-01",   modelUrl: `${ASSET_BASE}/nightstand-01.glb`,   dimensions: { x: 0.5, y: 0.55, z: 0.4 } },
  bookshelf:    { id: "bookshelf-01",    modelUrl: `${ASSET_BASE}/bookshelf-01.glb`,    dimensions: { x: 0.8, y: 1.8, z: 0.35 } },
  armchair:     { id: "armchair-01",     modelUrl: `${ASSET_BASE}/armchair-01.glb`,     dimensions: { x: 0.9, y: 0.85, z: 0.9 } },

  // ── New items ─────────────────────────────────────────────
  "modern sofa":      { id: "modern-sofa-01",        modelUrl: `${ASSET_BASE}/modern-sofa-01.glb`,        dimensions: { x: 2.0, y: 0.75, z: 0.85 } },
  "corner sofa":      { id: "corner-sofa-01",        modelUrl: `${ASSET_BASE}/corner-sofa-01.glb`,        dimensions: { x: 2.5, y: 0.85, z: 2.5 } },
  sectional:          { id: "corner-sofa-01",        modelUrl: `${ASSET_BASE}/corner-sofa-01.glb`,        dimensions: { x: 2.5, y: 0.85, z: 2.5 } },
  "round table":      { id: "round-table-01",        modelUrl: `${ASSET_BASE}/round-table-01.glb`,        dimensions: { x: 1.0, y: 0.75, z: 1.0 } },
  television:         { id: "television-01",          modelUrl: `${ASSET_BASE}/television-01.glb`,          dimensions: { x: 1.2, y: 0.7, z: 0.08 } },
  tv:                 { id: "television-01",          modelUrl: `${ASSET_BASE}/television-01.glb`,          dimensions: { x: 1.2, y: 0.7, z: 0.08 } },
  bench:              { id: "bench-01",               modelUrl: `${ASSET_BASE}/bench-01.glb`,               dimensions: { x: 1.2, y: 0.45, z: 0.4 } },
  "bar stool":        { id: "bar-stool-01",           modelUrl: `${ASSET_BASE}/bar-stool-01.glb`,           dimensions: { x: 0.4, y: 0.75, z: 0.4 } },
  stool:              { id: "bar-stool-01",           modelUrl: `${ASSET_BASE}/bar-stool-01.glb`,           dimensions: { x: 0.4, y: 0.75, z: 0.4 } },
  microwave:          { id: "microwave-01",           modelUrl: `${ASSET_BASE}/microwave-01.glb`,           dimensions: { x: 0.5, y: 0.3, z: 0.35 } },
  "coffee machine":   { id: "coffee-machine-01",     modelUrl: `${ASSET_BASE}/coffee-machine-01.glb`,     dimensions: { x: 0.25, y: 0.35, z: 0.3 } },
  "coffee maker":     { id: "coffee-machine-01",     modelUrl: `${ASSET_BASE}/coffee-machine-01.glb`,     dimensions: { x: 0.25, y: 0.35, z: 0.3 } },
  toaster:            { id: "toaster-01",             modelUrl: `${ASSET_BASE}/toaster-01.glb`,             dimensions: { x: 0.3, y: 0.2, z: 0.2 } },
  "electric stove":   { id: "electric-stove-01",     modelUrl: `${ASSET_BASE}/electric-stove-01.glb`,     dimensions: { x: 0.6, y: 0.85, z: 0.6 } },
  "washing machine":  { id: "washing-machine-01",    modelUrl: `${ASSET_BASE}/washing-machine-01.glb`,    dimensions: { x: 0.6, y: 0.85, z: 0.6 } },
  washer:             { id: "washing-machine-01",    modelUrl: `${ASSET_BASE}/washing-machine-01.glb`,    dimensions: { x: 0.6, y: 0.85, z: 0.6 } },
  dryer:              { id: "dryer-01",               modelUrl: `${ASSET_BASE}/dryer-01.glb`,               dimensions: { x: 0.6, y: 0.85, z: 0.6 } },
  monitor:            { id: "monitor-01",             modelUrl: `${ASSET_BASE}/monitor-01.glb`,             dimensions: { x: 0.6, y: 0.45, z: 0.2 } },
  "computer screen":  { id: "monitor-01",             modelUrl: `${ASSET_BASE}/monitor-01.glb`,             dimensions: { x: 0.6, y: 0.45, z: 0.2 } },
  laptop:             { id: "laptop-01",              modelUrl: `${ASSET_BASE}/laptop-01.glb`,              dimensions: { x: 0.35, y: 0.02, z: 0.25 } },
  computer:           { id: "laptop-01",              modelUrl: `${ASSET_BASE}/laptop-01.glb`,              dimensions: { x: 0.35, y: 0.02, z: 0.25 } },
  lamp:               { id: "floor-lamp-01",          modelUrl: `${ASSET_BASE}/floor-lamp-01.glb`,          dimensions: { x: 0.35, y: 1.6, z: 0.35 } },
  "floor lamp":       { id: "floor-lamp-01",          modelUrl: `${ASSET_BASE}/floor-lamp-01.glb`,          dimensions: { x: 0.35, y: 1.6, z: 0.35 } },
  "table lamp":       { id: "table-lamp-01",          modelUrl: `${ASSET_BASE}/table-lamp-01.glb`,          dimensions: { x: 0.2, y: 0.4, z: 0.2 } },
  plant:              { id: "plant-01",               modelUrl: `${ASSET_BASE}/plant-01.glb`,               dimensions: { x: 0.4, y: 0.8, z: 0.4 } },
  "potted plant":     { id: "plant-01",               modelUrl: `${ASSET_BASE}/plant-01.glb`,               dimensions: { x: 0.4, y: 0.8, z: 0.4 } },
  rug:                { id: "rug-01",                 modelUrl: `${ASSET_BASE}/rug-01.glb`,                 dimensions: { x: 2.0, y: 0.01, z: 1.4 } },
  carpet:             { id: "rug-01",                 modelUrl: `${ASSET_BASE}/rug-01.glb`,                 dimensions: { x: 2.0, y: 0.01, z: 1.4 } },
  mirror:             { id: "bathroom-mirror-01",     modelUrl: `${ASSET_BASE}/bathroom-mirror-01.glb`,     dimensions: { x: 0.6, y: 0.8, z: 0.05 } },
  "bedside table":    { id: "bedside-table-01",       modelUrl: `${ASSET_BASE}/bedside-table-01.glb`,       dimensions: { x: 0.45, y: 0.5, z: 0.4 } },

  // ── Batch 3 additions ───────────────────────────────────────
  recliner:           { id: "recliner-01",            modelUrl: `${ASSET_BASE}/recliner-01.glb`,            dimensions: { x: 0.9, y: 1.0, z: 0.9 } },
  "reclining chair":  { id: "recliner-01",            modelUrl: `${ASSET_BASE}/recliner-01.glb`,            dimensions: { x: 0.9, y: 1.0, z: 0.9 } },
  "l shaped sofa":    { id: "l-shaped-sofa-01",       modelUrl: `${ASSET_BASE}/l-shaped-sofa-01.glb`,       dimensions: { x: 2.8, y: 0.85, z: 2.8 } },
  "l-shaped sofa":    { id: "l-shaped-sofa-01",       modelUrl: `${ASSET_BASE}/l-shaped-sofa-01.glb`,       dimensions: { x: 2.8, y: 0.85, z: 2.8 } },
  "long sofa":        { id: "long-sofa-01",           modelUrl: `${ASSET_BASE}/long-sofa-01.glb`,           dimensions: { x: 2.8, y: 0.85, z: 0.9 } },
  ottoman:            { id: "ottoman-01",             modelUrl: `${ASSET_BASE}/ottoman-01.glb`,             dimensions: { x: 0.7, y: 0.4, z: 0.7 } },
  footrest:           { id: "ottoman-01",             modelUrl: `${ASSET_BASE}/ottoman-01.glb`,             dimensions: { x: 0.7, y: 0.4, z: 0.7 } },
  pouf:               { id: "ottoman-01",             modelUrl: `${ASSET_BASE}/ottoman-01.glb`,             dimensions: { x: 0.7, y: 0.4, z: 0.7 } },
  "cushion chair":    { id: "cushion-chair-01",       modelUrl: `${ASSET_BASE}/cushion-chair-01.glb`,       dimensions: { x: 0.5, y: 0.85, z: 0.5 } },
  "rounded chair":    { id: "rounded-chair-01",       modelUrl: `${ASSET_BASE}/rounded-chair-01.glb`,       dimensions: { x: 0.6, y: 0.8, z: 0.6 } },
  "tub chair":        { id: "rounded-chair-01",       modelUrl: `${ASSET_BASE}/rounded-chair-01.glb`,       dimensions: { x: 0.6, y: 0.8, z: 0.6 } },
  "glass table":      { id: "glass-table-01",         modelUrl: `${ASSET_BASE}/glass-table-01.glb`,         dimensions: { x: 1.4, y: 0.75, z: 0.8 } },
  "cloth table":      { id: "cloth-table-01",         modelUrl: `${ASSET_BASE}/cloth-table-01.glb`,         dimensions: { x: 1.2, y: 0.75, z: 0.8 } },
  "mini fridge":      { id: "mini-fridge-01",         modelUrl: `${ASSET_BASE}/mini-fridge-01.glb`,         dimensions: { x: 0.5, y: 0.85, z: 0.5 } },
  "small fridge":     { id: "mini-fridge-01",         modelUrl: `${ASSET_BASE}/mini-fridge-01.glb`,         dimensions: { x: 0.5, y: 0.85, z: 0.5 } },
  "bar fridge":       { id: "mini-fridge-01",         modelUrl: `${ASSET_BASE}/mini-fridge-01.glb`,         dimensions: { x: 0.5, y: 0.85, z: 0.5 } },
  "wide bookcase":    { id: "wide-bookcase-01",       modelUrl: `${ASSET_BASE}/wide-bookcase-01.glb`,       dimensions: { x: 1.2, y: 1.8, z: 0.35 } },
  "low shelf":        { id: "low-shelf-01",           modelUrl: `${ASSET_BASE}/low-shelf-01.glb`,           dimensions: { x: 0.8, y: 0.8, z: 0.35 } },
  dresser:            { id: "drawer-cabinet-01",      modelUrl: `${ASSET_BASE}/drawer-cabinet-01.glb`,      dimensions: { x: 0.6, y: 0.7, z: 0.4 } },
  "chest of drawers": { id: "drawer-cabinet-01",      modelUrl: `${ASSET_BASE}/drawer-cabinet-01.glb`,      dimensions: { x: 0.6, y: 0.7, z: 0.4 } },
  "end table":        { id: "side-table-drawers-01",  modelUrl: `${ASSET_BASE}/side-table-drawers-01.glb`,  dimensions: { x: 0.45, y: 0.55, z: 0.4 } },
  "ceiling fan":      { id: "ceiling-fan-01",         modelUrl: `${ASSET_BASE}/ceiling-fan-01.glb`,         dimensions: { x: 1.2, y: 0.3, z: 1.2 } },
  fan:                { id: "ceiling-fan-01",         modelUrl: `${ASSET_BASE}/ceiling-fan-01.glb`,         dimensions: { x: 1.2, y: 0.3, z: 1.2 } },
  "wall lamp":        { id: "wall-lamp-01",           modelUrl: `${ASSET_BASE}/wall-lamp-01.glb`,           dimensions: { x: 0.15, y: 0.25, z: 0.2 } },
  sconce:             { id: "wall-lamp-01",           modelUrl: `${ASSET_BASE}/wall-lamp-01.glb`,           dimensions: { x: 0.15, y: 0.25, z: 0.2 } },
  "wall light":       { id: "wall-lamp-01",           modelUrl: `${ASSET_BASE}/wall-lamp-01.glb`,           dimensions: { x: 0.15, y: 0.25, z: 0.2 } },
  "square sink":      { id: "square-sink-01",         modelUrl: `${ASSET_BASE}/square-sink-01.glb`,         dimensions: { x: 0.6, y: 0.85, z: 0.5 } },
  "square toilet":    { id: "square-toilet-01",       modelUrl: `${ASSET_BASE}/square-toilet-01.glb`,       dimensions: { x: 0.4, y: 0.4, z: 0.65 } },
  "round rug":        { id: "round-rug-01",           modelUrl: `${ASSET_BASE}/round-rug-01.glb`,           dimensions: { x: 1.8, y: 0.01, z: 1.8 } },
  "square rug":       { id: "square-rug-01",          modelUrl: `${ASSET_BASE}/square-rug-01.glb`,          dimensions: { x: 2.0, y: 0.01, z: 2.0 } },
  trashcan:           { id: "trashcan-01",            modelUrl: `${ASSET_BASE}/trashcan-01.glb`,            dimensions: { x: 0.3, y: 0.6, z: 0.3 } },
  "trash can":        { id: "trashcan-01",            modelUrl: `${ASSET_BASE}/trashcan-01.glb`,            dimensions: { x: 0.3, y: 0.6, z: 0.3 } },
  "garbage bin":      { id: "trashcan-01",            modelUrl: `${ASSET_BASE}/trashcan-01.glb`,            dimensions: { x: 0.3, y: 0.6, z: 0.3 } },
  "waste bin":        { id: "trashcan-01",            modelUrl: `${ASSET_BASE}/trashcan-01.glb`,            dimensions: { x: 0.3, y: 0.6, z: 0.3 } },
  "coat rack":        { id: "coat-rack-01",           modelUrl: `${ASSET_BASE}/coat-rack-01.glb`,           dimensions: { x: 0.5, y: 1.8, z: 0.5 } },
  "coat stand":       { id: "coat-rack-01",           modelUrl: `${ASSET_BASE}/coat-rack-01.glb`,           dimensions: { x: 0.5, y: 1.8, z: 0.5 } },
  "hat rack":         { id: "coat-rack-01",           modelUrl: `${ASSET_BASE}/coat-rack-01.glb`,           dimensions: { x: 0.5, y: 1.8, z: 0.5 } },

  // ── Outdoor / Garage additions ────────────────────────────────
  patio:              { id: "patio-chair-01",         modelUrl: `${ASSET_BASE}/dining-chair-01.glb`,       dimensions: { x: 0.6, y: 0.85, z: 0.6 } },
  "patio chair":      { id: "patio-chair-01",         modelUrl: `${ASSET_BASE}/dining-chair-01.glb`,       dimensions: { x: 0.6, y: 0.85, z: 0.6 } },
  "garden chair":     { id: "patio-chair-01",         modelUrl: `${ASSET_BASE}/dining-chair-01.glb`,       dimensions: { x: 0.6, y: 0.85, z: 0.6 } },
  "outdoor chair":    { id: "patio-chair-01",         modelUrl: `${ASSET_BASE}/dining-chair-01.glb`,       dimensions: { x: 0.6, y: 0.85, z: 0.6 } },
  garden:             { id: "garden-table-01",        modelUrl: `${ASSET_BASE}/round-table-01.glb`,        dimensions: { x: 1.2, y: 0.75, z: 1.2 } },
  "garden table":     { id: "garden-table-01",        modelUrl: `${ASSET_BASE}/round-table-01.glb`,        dimensions: { x: 1.2, y: 0.75, z: 1.2 } },
  "outdoor table":    { id: "garden-table-01",        modelUrl: `${ASSET_BASE}/round-table-01.glb`,        dimensions: { x: 1.2, y: 0.75, z: 1.2 } },
  "outdoor bench":    { id: "outdoor-bench-01",       modelUrl: `${ASSET_BASE}/bench-01.glb`,              dimensions: { x: 1.5, y: 0.45, z: 0.5 } },
  "garden bench":     { id: "outdoor-bench-01",       modelUrl: `${ASSET_BASE}/bench-01.glb`,              dimensions: { x: 1.5, y: 0.45, z: 0.5 } },
  "park bench":       { id: "outdoor-bench-01",       modelUrl: `${ASSET_BASE}/bench-01.glb`,              dimensions: { x: 1.5, y: 0.45, z: 0.5 } },
  planter:            { id: "planter-01",             modelUrl: `${ASSET_BASE}/plant-01.glb`,              dimensions: { x: 0.5, y: 0.6, z: 0.5 } },
  "flower pot":       { id: "planter-01",             modelUrl: `${ASSET_BASE}/plant-01.glb`,              dimensions: { x: 0.5, y: 0.6, z: 0.5 } },
  "outdoor planter":  { id: "planter-01",             modelUrl: `${ASSET_BASE}/plant-01.glb`,              dimensions: { x: 0.5, y: 0.6, z: 0.5 } },
  lounger:            { id: "sun-lounger-01",         modelUrl: `${ASSET_BASE}/bench-01.glb`,              dimensions: { x: 0.7, y: 0.4, z: 1.9 } },
  "sun lounger":      { id: "sun-lounger-01",         modelUrl: `${ASSET_BASE}/bench-01.glb`,              dimensions: { x: 0.7, y: 0.4, z: 1.9 } },
  "deck chair":       { id: "sun-lounger-01",         modelUrl: `${ASSET_BASE}/bench-01.glb`,              dimensions: { x: 0.7, y: 0.4, z: 1.9 } },
  sunbed:             { id: "sun-lounger-01",         modelUrl: `${ASSET_BASE}/bench-01.glb`,              dimensions: { x: 0.7, y: 0.4, z: 1.9 } },
  picnic:             { id: "picnic-table-01",        modelUrl: `${ASSET_BASE}/dining-table-01.glb`,       dimensions: { x: 1.8, y: 0.75, z: 1.4 } },
  "picnic table":     { id: "picnic-table-01",        modelUrl: `${ASSET_BASE}/dining-table-01.glb`,       dimensions: { x: 1.8, y: 0.75, z: 1.4 } },
  workbench:          { id: "workbench-01",           modelUrl: `${ASSET_BASE}/desk-01.glb`,               dimensions: { x: 1.8, y: 0.9, z: 0.7 } },
  "work bench":       { id: "workbench-01",           modelUrl: `${ASSET_BASE}/desk-01.glb`,               dimensions: { x: 1.8, y: 0.9, z: 0.7 } },
  "tool cabinet":     { id: "tool-cabinet-01",        modelUrl: `${ASSET_BASE}/wardrobe-01.glb`,           dimensions: { x: 0.9, y: 1.8, z: 0.5 } },
  "tool chest":       { id: "tool-cabinet-01",        modelUrl: `${ASSET_BASE}/wardrobe-01.glb`,           dimensions: { x: 0.9, y: 1.8, z: 0.5 } },
  "tool storage":     { id: "tool-cabinet-01",        modelUrl: `${ASSET_BASE}/wardrobe-01.glb`,           dimensions: { x: 0.9, y: 1.8, z: 0.5 } },
  "storage shelf":    { id: "storage-shelf-01",       modelUrl: `${ASSET_BASE}/bookshelf-01.glb`,          dimensions: { x: 1.2, y: 1.8, z: 0.5 } },
  "garage shelf":     { id: "storage-shelf-01",       modelUrl: `${ASSET_BASE}/bookshelf-01.glb`,          dimensions: { x: 1.2, y: 1.8, z: 0.5 } },
};

function matchItemToCatalog(name: string): CatalogMatch | null {
  const lower = name.toLowerCase().trim();
  // Exact keyword match
  if (CATALOG_KEYWORD_MAP[lower]) return CATALOG_KEYWORD_MAP[lower];
  // Substring match — check if any keyword appears in the name
  for (const [keyword, match] of Object.entries(CATALOG_KEYWORD_MAP)) {
    if (lower.includes(keyword)) return match;
  }
  return null;
}

function buildSceneFromGemini(geminiData: any): SceneData {
  const normalised = normaliseGeminiData(geminiData);
  const nodes: Record<string, AnyNode> = {};

  const site: SiteNode = { ...(makeBase("site", "Site") as BaseNode), type: "site", transform: { ...defaultTransform } };
  const building: BuildingNode = { ...(makeBase("building", "Building 1") as BaseNode), type: "building", parentId: site.id, transform: { ...defaultTransform } };
  site.childIds = [building.id];
  building.childIds = [];
  nodes[site.id] = site;
  nodes[building.id] = building;

  for (const lvl of normalised.levels) {
    const level: LevelNode = {
      ...(makeBase("level", lvl.name) as BaseNode), type: "level", parentId: building.id,
      elevation: lvl.elevation, height: 2.7, index: lvl.index, transform: { ...defaultTransform },
    };
    building.childIds.push(level.id);
    nodes[level.id] = level;

    const wallIds: string[] = [];
    for (const w of lvl.walls) {
      const wall: WallNode = {
        ...(makeBase("wall") as BaseNode), type: "wall", parentId: level.id,
        start: { x: w.startX, y: 0, z: w.startZ }, end: { x: w.endX, y: 0, z: w.endZ },
        height: w.height ?? 2.7, thickness: w.thickness ?? 0.15, material: "plaster", transform: { ...defaultTransform },
      };
      nodes[wall.id] = wall;
      wallIds.push(wall.id);
      level.childIds.push(wall.id);
    }

    for (const d of lvl.doors) {
      const wallId = wallIds[d.wallIndex]; if (!wallId) continue;
      const door: DoorNode = {
        ...(makeBase("door") as BaseNode), type: "door", parentId: wallId, wallId,
        position: d.position ?? 0.5, width: d.width ?? 0.9, height: d.height ?? 2.1,
        doorType: (d.doorType as DoorNode["doorType"]) ?? "single", swing: (d.swing as DoorNode["swing"]) ?? "left",
        transform: { ...defaultTransform },
      };
      nodes[door.id] = door;
      (nodes[wallId] as WallNode).childIds.push(door.id);
    }

    for (const w of lvl.windows) {
      const wallId = wallIds[w.wallIndex]; if (!wallId) continue;
      const win: WindowNode = {
        ...(makeBase("window") as BaseNode), type: "window", parentId: wallId, wallId,
        position: w.position ?? 0.5, width: w.width ?? 1.2, height: w.height ?? 1.2,
        sillHeight: w.sillHeight ?? 0.9, windowType: (w.windowType as WindowNode["windowType"]) ?? "casement",
        transform: { ...defaultTransform },
      };
      nodes[win.id] = win;
      (nodes[wallId] as WallNode).childIds.push(win.id);
    }

    for (const r of lvl.rooms ?? []) {
      const zt = (r.zoneType ?? "room") as ZoneNode["zoneType"];
      const zone: ZoneNode = {
        ...(makeBase("zone", r.name) as BaseNode), type: "zone", parentId: level.id, zoneType: zt,
        label: r.name, color: r.color ?? ZONE_DEFAULT_COLORS[zt] ?? ZONE_DEFAULT_COLORS.other,
        points: (r.points ?? []).map((p) => ({ x: p.x, y: 0, z: p.z })), transform: { ...defaultTransform },
      };
      nodes[zone.id] = zone;
      level.childIds.push(zone.id);
    }

    for (const item of lvl.items ?? []) {
      const itemNode: ItemNode = {
        ...(makeBase("item", item.name) as BaseNode), type: "item", parentId: level.id,
        itemType: item.itemType ?? "furniture", dimensions: item.dimensions ? { ...item.dimensions } : { x: 1, y: 1, z: 1 },
        material: "wood", transform: { position: { x: item.position.x, y: 0, z: item.position.z }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
      };
      const catalogMatch = matchItemToCatalog(item.name);
      if (catalogMatch) {
        itemNode.catalogId = catalogMatch.id;
        itemNode.modelUrl = catalogMatch.modelUrl;
        itemNode.dimensions = catalogMatch.dimensions;
      }
      nodes[itemNode.id] = itemNode;
      level.childIds.push(itemNode.id);
    }
  }

  return { nodes, rootNodeIds: [site.id] };
}

// ─── Gemini API call ────────────────────────────────────────

async function parseFloorplanWithGemini(imageBuffer: Buffer, mimeType: string) {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_GEMINI_API_KEY is not configured");

  const base64Image = imageBuffer.toString("base64");

  const prompt = `Analyze this 2D architectural floor plan image and extract all structural elements, rooms/zones, and visible furniture as JSON.

Return ONLY a valid JSON object with no markdown, no code fences, no explanation text — just the raw JSON object.

The JSON must have this exact structure:
{
  "levels": [
    {
      "name": "Ground Floor",
      "index": 0,
      "elevation": 0,
      "walls": [
        { "startX": number, "startZ": number, "endX": number, "endZ": number, "height": number, "thickness": number }
      ],
      "doors": [
        { "wallIndex": number, "position": number, "width": number, "height": number, "doorType": "single"|"double"|"sliding"|"french"|"bifold", "swing": "left"|"right" }
      ],
      "windows": [
        { "wallIndex": number, "position": number, "width": number, "height": number, "sillHeight": number, "windowType": "fixed"|"casement"|"sash"|"sliding"|"bay"|"skylight" }
      ],
      "rooms": [
        { "name": "Living Room", "zoneType": "room"|"hallway"|"bathroom"|"kitchen"|"bedroom"|"living"|"garage"|"utility"|"other", "points": [{"x": number, "z": number}], "color": null }
      ],
      "items": [
        { "name": "Sofa", "itemType": "furniture"|"appliance"|"fixture", "position": { "x": number, "z": number }, "dimensions": { "x": number, "y": number, "z": number } }
      ]
    }
  ]
}

Rules:
- Coordinates are in meters. Normalise so the floor plan fits roughly within a 20x20 metre bounding box.
- X axis goes right, Z axis goes down (top-down view).
- Y is always 0 (ground floor slab level).
- wall "startX/startZ" and "endX/endZ" are the two endpoints of each wall segment.
- door/window "wallIndex" is the 0-based index into the walls array of the wall the opening belongs to.
- door/window "position" is a value between 0 and 1 indicating where along the wall the centre of the opening sits.
- Default wall height: 2.7, default wall thickness: 0.15.
- Default door width: 0.9, door height: 2.1.
- Default window width: 1.2, window height: 1.2, sill height: 0.9.
- Include ALL visible walls, doors, and windows.
- If a value cannot be determined, use the default.
- Include ALL rooms/spaces, even small ones like closets or pantries.`;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent`;

  const requestBody = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: mimeType, data: base64Image } },
      ],
    }],
    generationConfig: { responseMimeType: "application/json" },
  };

  const fetchResponse = await fetch(endpoint, {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(90_000),
  });

  if (!fetchResponse.ok) {
    const errorText = await fetchResponse.text();
    throw new Error(`Gemini API failed (${fetchResponse.status}): ${errorText}`);
  }

  const response = await fetchResponse.json();
  const candidate = response.candidates?.[0];
  if (!candidate || (candidate.finishReason && candidate.finishReason !== "STOP")) {
    throw new Error(`Gemini generation blocked or incomplete: ${candidate?.finishReason}`);
  }

  const textPart = candidate?.content?.parts?.find((p: any) => typeof p.text === "string");
  if (!textPart?.text) throw new Error("Gemini returned no text content");

  let jsonText = textPart.text.trim();
  const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) jsonText = fenceMatch[1].trim();

  return JSON.parse(jsonText);
}

// ─── Handler ────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = getSessionFromCookies(req.headers.cookie || null);
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  const session = await verifySession(token);
  if (!session) return res.status(401).json({ error: "Not authenticated" });

  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, session.userId));
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const modelId = parseInt(req.query.id as string);
  if (isNaN(modelId)) return res.status(400).json({ error: "Invalid model ID" });

  try {
    const hasCredits = await canUserGenerate(session.userId);
    if (!hasCredits) return res.status(403).json({ error: "Credit limit reached" });

    const [model] = await db.select().from(floorplanModels).where(eq(floorplanModels.id, modelId));
    if (!model) return res.status(404).json({ error: "Model not found" });

    const [project] = await db.select().from(projects).where(eq(projects.id, model.projectId));
    if (!project || project.userId !== session.userId) return res.status(403).json({ error: "Access denied" });

    await db.update(floorplanModels).set({ status: "generating_pascal" }).where(eq(floorplanModels.id, modelId));

    const imageResponse = await fetch(model.originalUrl);
    if (!imageResponse.ok) throw new Error("Failed to fetch original image");

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const mimeType = imageResponse.headers.get("content-type") || "image/png";

    // Parse with Gemini and convert to proper SceneData
    const geminiData = await parseFloorplanWithGemini(imageBuffer, mimeType);
    const sceneData = buildSceneFromGemini(geminiData);

    await deductCredit(session.userId);

    const [updatedModel] = await db.update(floorplanModels).set({
      status: "pascal_ready",
      pascalData: JSON.stringify(sceneData),
    }).where(eq(floorplanModels.id, modelId)).returning();

    res.json({ ...updatedModel, sceneData: JSON.stringify(sceneData) });
  } catch (error: any) {
    await db.update(floorplanModels).set({ status: "uploaded" }).where(eq(floorplanModels.id, modelId));
    res.status(500).json({ error: error?.message || "An unexpected error occurred" });
  }
}
