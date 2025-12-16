import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  lastModified: timestamp("last_modified").notNull().defaultNow(),
});

export const floorplanModels = pgTable("floorplan_models", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  originalUrl: text("original_url").notNull(),
  isometricUrl: text("isometric_url"),
  isometricPrompt: text("isometric_prompt"),
  model3dUrl: text("model_3d_url"),
  baseModel3dUrl: text("base_model_3d_url"),
  meshyTaskId: text("meshy_task_id"),
  texturePrompt: text("texture_prompt"),
  retextureTaskId: text("retexture_task_id"),
  status: text("status").notNull().default("uploaded"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  lastModified: true,
});

export const insertFloorplanModelSchema = createInsertSchema(floorplanModels).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertFloorplanModel = z.infer<typeof insertFloorplanModelSchema>;
export type FloorplanModel = typeof floorplanModels.$inferSelect;

export type ModelStatus = 'uploaded' | 'generating_isometric' | 'isometric_ready' | 'generating_3d' | 'retexturing' | 'completed' | 'failed';
