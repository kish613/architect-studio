import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProjectSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "../uploads");

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      await fs.mkdir(uploadsDir, { recursive: true });
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Serve uploaded files
  const express = await import('express');
  app.use('/uploads', express.static(uploadsDir));

  // Get all projects with their models
  app.get("/api/projects", async (req, res) => {
    try {
      const allProjects = await storage.getAllProjects();
      
      // Fetch models for each project
      const projectsWithModels = await Promise.all(
        allProjects.map(async (project) => {
          const models = await storage.getModelsByProject(project.id);
          return { ...project, models };
        })
      );
      
      res.json(projectsWithModels);
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ error: 'Failed to fetch projects' });
    }
  });

  // Get a specific project with its models
  app.get("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      const models = await storage.getModelsByProject(id);
      res.json({ ...project, models });
    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({ error: 'Failed to fetch project' });
    }
  });

  // Create a new project
  app.post("/api/projects", async (req, res) => {
    try {
      const data = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(data);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Error creating project:', error);
      res.status(500).json({ error: 'Failed to create project' });
    }
  });

  // Upload floorplan and create model
  app.post("/api/projects/:id/upload", upload.single('floorplan'), async (req: Request<{ id: string }>, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Verify project exists
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const originalUrl = `/uploads/${req.file.filename}`;
      
      // Create model with processing status
      const model = await storage.createModel({
        projectId,
        originalUrl,
        status: 'processing',
        thumbnailUrl: null,
        renderUrl: null,
      });

      // Simulate AI processing (in real app, this would call Meshy API)
      // For now, we'll just mark it as completed after a delay
      setTimeout(async () => {
        try {
          await storage.updateModel(model.id, {
            status: 'completed',
            thumbnailUrl: originalUrl, // Using original as thumbnail for mock
            renderUrl: originalUrl, // Using original as render for mock
          });
        } catch (error) {
          console.error('Error updating model status:', error);
        }
      }, 2000);

      res.status(201).json(model);
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ error: 'Failed to upload file' });
    }
  });

  // Delete a project
  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteProject(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({ error: 'Failed to delete project' });
    }
  });

  return httpServer;
}
