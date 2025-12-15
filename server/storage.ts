import { 
  type User, 
  type InsertUser,
  type Project,
  type InsertProject,
  type FloorplanModel,
  type InsertFloorplanModel,
  users,
  projects,
  floorplanModels
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getAllProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<void>;
  
  getModelsByProject(projectId: number): Promise<FloorplanModel[]>;
  getModel(id: number): Promise<FloorplanModel | undefined>;
  createModel(model: InsertFloorplanModel): Promise<FloorplanModel>;
  updateModel(id: number, model: Partial<InsertFloorplanModel>): Promise<FloorplanModel | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAllProjects(): Promise<Project[]> {
    return await db.select().from(projects).orderBy(desc(projects.lastModified));
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db
      .insert(projects)
      .values(insertProject)
      .returning();
    return project;
  }

  async updateProject(id: number, projectUpdate: Partial<InsertProject>): Promise<Project | undefined> {
    const [project] = await db
      .update(projects)
      .set({ ...projectUpdate, lastModified: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project || undefined;
  }

  async deleteProject(id: number): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  async getModelsByProject(projectId: number): Promise<FloorplanModel[]> {
    return await db
      .select()
      .from(floorplanModels)
      .where(eq(floorplanModels.projectId, projectId))
      .orderBy(desc(floorplanModels.createdAt));
  }

  async getModel(id: number): Promise<FloorplanModel | undefined> {
    const [model] = await db.select().from(floorplanModels).where(eq(floorplanModels.id, id));
    return model || undefined;
  }

  async createModel(insertModel: InsertFloorplanModel): Promise<FloorplanModel> {
    const [model] = await db
      .insert(floorplanModels)
      .values(insertModel)
      .returning();
    return model;
  }

  async updateModel(id: number, modelUpdate: Partial<InsertFloorplanModel>): Promise<FloorplanModel | undefined> {
    const [model] = await db
      .update(floorplanModels)
      .set(modelUpdate)
      .where(eq(floorplanModels.id, id))
      .returning();
    return model || undefined;
  }
}

export const storage = new DatabaseStorage();
