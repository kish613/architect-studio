import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../_lib/storage";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  const projectId = parseInt(id as string);

  if (isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid project ID" });
  }

  if (req.method === "GET") {
    return handleGet(req, res, projectId);
  } else if (req.method === "DELETE") {
    return handleDelete(req, res, projectId);
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}

async function handleGet(
  req: VercelRequest,
  res: VercelResponse,
  projectId: number
) {
  try {
    const project = await storage.getProject(projectId);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const models = await storage.getModelsByProject(projectId);
    res.json({ ...project, models });
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({ error: "Failed to fetch project" });
  }
}

async function handleDelete(
  req: VercelRequest,
  res: VercelResponse,
  projectId: number
) {
  try {
    await storage.deleteProject(projectId);
    res.status(204).send("");
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ error: "Failed to delete project" });
  }
}



