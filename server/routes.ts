import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProjectSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import { generateIsometricFloorplan } from "./gemini";
import { createImageTo3DTask, checkMeshyTaskStatus, pollMeshyTask } from "./meshy";
import { convertPdfToImage, isPdf } from "./pdf-utils";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "../uploads");

// Configure multer for file uploads (images + PDFs)
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
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit for PDFs
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /jpeg|jpg|png|webp|pdf/.test(file.mimetype);
    
    if (mimetype || extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image and PDF files are allowed!'));
    }
  }
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Ensure uploads directory exists
  await fs.mkdir(uploadsDir, { recursive: true });
  
  // Serve uploaded files
  const express = await import('express');
  app.use('/uploads', express.static(uploadsDir));

  // Get all projects with their models
  app.get("/api/projects", async (req, res) => {
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

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      let originalUrl = `/uploads/${req.file.filename}`;
      const filePath = path.join(uploadsDir, req.file.filename);
      
      // Convert PDF to image if needed
      if (isPdf(req.file.filename)) {
        try {
          const imagePath = await convertPdfToImage(filePath, uploadsDir);
          originalUrl = `/uploads/${path.basename(imagePath)}`;
        } catch (error) {
          console.error('PDF conversion failed:', error);
          return res.status(500).json({ error: 'Failed to process PDF file' });
        }
      }
      
      const model = await storage.createModel({
        projectId,
        originalUrl,
        status: 'uploaded',
      });

      res.status(201).json(model);
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ error: 'Failed to upload file' });
    }
  });

  // Generate isometric view using Gemini
  app.post("/api/models/:id/generate-isometric", async (req, res) => {
    try {
      const modelId = parseInt(req.params.id);
      const { prompt } = req.body;

      const model = await storage.getModel(modelId);
      if (!model) {
        return res.status(404).json({ error: 'Model not found' });
      }

      // Update status to generating
      await storage.updateModel(modelId, { 
        status: 'generating_isometric',
        isometricPrompt: prompt || null
      });

      // Get the file path from the URL
      const filePath = path.join(uploadsDir, path.basename(model.originalUrl));

      // Generate isometric view
      const result = await generateIsometricFloorplan(filePath, prompt);

      if (result.success && result.imageUrl) {
        const updatedModel = await storage.updateModel(modelId, {
          status: 'isometric_ready',
          isometricUrl: result.imageUrl,
        });
        res.json(updatedModel);
      } else {
        await storage.updateModel(modelId, { status: 'failed' });
        res.status(500).json({ error: result.error || 'Failed to generate isometric view' });
      }
    } catch (error) {
      console.error('Error generating isometric:', error);
      res.status(500).json({ error: 'Failed to generate isometric view' });
    }
  });

  // Start 3D generation using Meshy
  app.post("/api/models/:id/generate-3d", async (req, res) => {
    try {
      const modelId = parseInt(req.params.id);

      const model = await storage.getModel(modelId);
      if (!model) {
        return res.status(404).json({ error: 'Model not found' });
      }

      if (!model.isometricUrl) {
        return res.status(400).json({ error: 'Isometric image not yet generated' });
      }

      // Update status
      await storage.updateModel(modelId, { status: 'generating_3d' });

      // Get public URL for the isometric image
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const imageUrl = `${baseUrl}${model.isometricUrl}`;

      // Create Meshy task
      const result = await createImageTo3DTask(imageUrl);

      if (result.success && result.taskId) {
        const updatedModel = await storage.updateModel(modelId, {
          meshyTaskId: result.taskId,
        });
        res.json(updatedModel);
      } else {
        await storage.updateModel(modelId, { status: 'failed' });
        res.status(500).json({ error: result.error || 'Failed to start 3D generation' });
      }
    } catch (error) {
      console.error('Error starting 3D generation:', error);
      res.status(500).json({ error: 'Failed to start 3D generation' });
    }
  });

  // Check 3D generation status
  app.get("/api/models/:id/status", async (req, res) => {
    try {
      const modelId = parseInt(req.params.id);

      const model = await storage.getModel(modelId);
      if (!model) {
        return res.status(404).json({ error: 'Model not found' });
      }

      // If there's a Meshy task, check its status
      if (model.meshyTaskId && model.status === 'generating_3d') {
        const taskResult = await checkMeshyTaskStatus(model.meshyTaskId);
        
        if (taskResult.status === 'completed' && taskResult.modelUrl) {
          const updatedModel = await storage.updateModel(modelId, {
            status: 'completed',
            model3dUrl: taskResult.modelUrl,
          });
          return res.json(updatedModel);
        } else if (taskResult.status === 'failed') {
          await storage.updateModel(modelId, { status: 'failed' });
          return res.json({ ...model, status: 'failed' });
        }
      }

      res.json(model);
    } catch (error) {
      console.error('Error checking status:', error);
      res.status(500).json({ error: 'Failed to check status' });
    }
  });

  // Proxy external model files to avoid CORS issues
  app.get("/api/proxy-model", async (req, res) => {
    try {
      const { url } = req.query;
      
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL parameter required' });
      }

      // Only allow Meshy URLs
      if (!url.includes('meshy.ai')) {
        return res.status(403).json({ error: 'Only Meshy URLs are allowed' });
      }

      const response = await fetch(url);
      
      if (!response.ok) {
        return res.status(response.status).json({ error: 'Failed to fetch model' });
      }

      const contentType = response.headers.get('content-type') || 'model/gltf-binary';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (error) {
      console.error('Error proxying model:', error);
      res.status(500).json({ error: 'Failed to proxy model' });
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
