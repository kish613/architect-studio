import { 
  type Project,
  type InsertProject,
  type FloorplanModel,
  type InsertFloorplanModel,
  type UserSubscription,
  type InsertUserSubscription,
  projects,
  floorplanModels,
  userSubscriptions,
  PLAN_LIMITS,
  type SubscriptionPlan
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Projects
  getAllProjects(userId?: string): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<void>;
  
  // Models
  getModelsByProject(projectId: number): Promise<FloorplanModel[]>;
  getModel(id: number): Promise<FloorplanModel | undefined>;
  createModel(model: InsertFloorplanModel): Promise<FloorplanModel>;
  updateModel(id: number, model: Partial<InsertFloorplanModel>): Promise<FloorplanModel | undefined>;
  
  // Subscriptions
  getSubscription(userId: string): Promise<UserSubscription | undefined>;
  createOrUpdateSubscription(userId: string, data: Partial<InsertUserSubscription>): Promise<UserSubscription>;
  incrementGenerationsUsed(userId: string): Promise<UserSubscription | undefined>;
  canGenerate(userId: string): Promise<boolean>;
  resetMonthlyUsage(userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getAllProjects(userId?: string): Promise<Project[]> {
    if (userId) {
      return await db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.lastModified));
    }
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

  // Subscription methods
  async getSubscription(userId: string): Promise<UserSubscription | undefined> {
    const [sub] = await db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, userId));
    return sub || undefined;
  }

  async createOrUpdateSubscription(userId: string, data: Partial<InsertUserSubscription>): Promise<UserSubscription> {
    const existing = await this.getSubscription(userId);
    
    if (existing) {
      const [updated] = await db
        .update(userSubscriptions)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(userSubscriptions.userId, userId))
        .returning();
      return updated;
    }
    
    const [created] = await db
      .insert(userSubscriptions)
      .values({ 
        userId, 
        plan: 'free',
        generationsLimit: PLAN_LIMITS.free,
        ...data 
      })
      .returning();
    return created;
  }

  async incrementGenerationsUsed(userId: string): Promise<UserSubscription | undefined> {
    let sub = await this.getSubscription(userId);
    
    if (!sub) {
      sub = await this.createOrUpdateSubscription(userId, {});
    }
    
    const [updated] = await db
      .update(userSubscriptions)
      .set({ 
        generationsUsed: sub.generationsUsed + 1,
        updatedAt: new Date() 
      })
      .where(eq(userSubscriptions.userId, userId))
      .returning();
    return updated;
  }

  async canGenerate(userId: string): Promise<boolean> {
    let sub = await this.getSubscription(userId);
    
    if (!sub) {
      sub = await this.createOrUpdateSubscription(userId, {});
    }
    
    return sub.generationsUsed < sub.generationsLimit;
  }

  async resetMonthlyUsage(userId: string): Promise<void> {
    await db
      .update(userSubscriptions)
      .set({ generationsUsed: 0, updatedAt: new Date() })
      .where(eq(userSubscriptions.userId, userId));
  }
}

export const storage = new DatabaseStorage();
