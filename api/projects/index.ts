import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../../serverless-lib/storage";
import { insertProjectSchema } from "../../serverless-shared/schema";
import { z } from "zod";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    return handleGet(req, res);
  } else if (req.method === "POST") {
    return handlePost(req, res);
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  try {
    const allProjects = await storage.getAllProjects();

    const projectsWithModels = await Promise.all(
      allProjects.map(async (project) => {
        const models = await storage.getModelsByProject(project.id);
        return { ...project, models };
      })
    );

    res.json(projectsWithModels);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  try {
    const data = insertProjectSchema.parse(req.body);
    const project = await storage.createProject(data);
    res.status(201).json(project);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error creating project:", error);
    res.status(500).json({ error: "Failed to create project" });
  }
}



