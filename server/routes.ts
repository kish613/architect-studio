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
import { createImageTo3DTask, checkMeshyTaskStatus, pollMeshyTask, createRetextureTask, checkRetextureTaskStatus } from "./meshy";
import { convertPdfToImage, isPdf } from "./pdf-utils";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";

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
  
  // Setup authentication (must be before other routes)
  await setupAuth(app);
  registerAuthRoutes(app);
  
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
  app.post("/api/models/:id/generate-isometric", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Check usage limits
      let subscription = await storage.getSubscription(userId);
      if (!subscription) {
        subscription = await storage.createOrUpdateSubscription(userId, {});
      }
      
      if (subscription.generationsUsed >= subscription.generationsLimit) {
        return res.status(403).json({ 
          error: 'Generation limit reached', 
          message: 'Please upgrade your plan or purchase additional generations',
          redirectTo: '/pricing'
        });
      }

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
        // Increment usage count on successful generation
        await storage.createOrUpdateSubscription(userId, {
          generationsUsed: subscription.generationsUsed + 1,
        });

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

  // Retexture 3D model with new texture prompt (counts toward generation limit, limited to once per model)
  app.post("/api/models/:id/retexture", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const modelId = parseInt(req.params.id);
      const { texturePrompt } = req.body;

      if (!texturePrompt || typeof texturePrompt !== 'string') {
        return res.status(400).json({ error: 'Texture prompt is required' });
      }

      const model = await storage.getModel(modelId);
      if (!model) {
        return res.status(404).json({ error: 'Model not found' });
      }

      if (!model.model3dUrl) {
        return res.status(400).json({ error: '3D model not yet generated' });
      }

      // Check if retexturing was already used for this model
      if (model.retextureUsed) {
        return res.status(403).json({ 
          error: 'Retexturing limit reached',
          message: 'Retexturing is limited to once per model'
        });
      }

      // Check usage limits
      let subscription = await storage.getSubscription(userId);
      if (!subscription) {
        subscription = await storage.createOrUpdateSubscription(userId, {});
      }
      
      if (subscription.generationsUsed >= subscription.generationsLimit) {
        return res.status(403).json({ 
          error: 'Generation limit reached', 
          message: 'Please upgrade your plan or purchase additional generations',
          redirectTo: '/pricing'
        });
      }

      // Backup the original model URL before retexturing (if not already backed up)
      const baseModelUrl = model.baseModel3dUrl || model.model3dUrl;
      
      // Update status to retexturing (distinct from generating_3d)
      await storage.updateModel(modelId, { 
        status: 'retexturing',
        texturePrompt: texturePrompt,
        baseModel3dUrl: baseModelUrl,
        retextureUsed: true,
      });

      // Increment usage count for retexturing
      await storage.createOrUpdateSubscription(userId, {
        generationsUsed: subscription.generationsUsed + 1,
      });

      // Create retexture task with the existing model URL
      const result = await createRetextureTask(model.model3dUrl, texturePrompt);

      if (result.success && result.taskId) {
        const updatedModel = await storage.updateModel(modelId, {
          retextureTaskId: result.taskId,
        });
        res.json(updatedModel);
      } else {
        await storage.updateModel(modelId, { status: 'completed' }); // Revert to completed since we have a model
        res.status(500).json({ error: result.error || 'Failed to start retexturing' });
      }
    } catch (error) {
      console.error('Error starting retexture:', error);
      res.status(500).json({ error: 'Failed to start retexturing' });
    }
  });

  // Check retexture status
  app.get("/api/models/:id/retexture-status", async (req, res) => {
    try {
      const modelId = parseInt(req.params.id);

      const model = await storage.getModel(modelId);
      if (!model) {
        return res.status(404).json({ error: 'Model not found' });
      }

      // If there's a retexture task, check its status
      if (model.retextureTaskId && model.status === 'retexturing') {
        const taskResult = await checkRetextureTaskStatus(model.retextureTaskId);
        
        if (taskResult.status === 'completed' && taskResult.modelUrl) {
          const updatedModel = await storage.updateModel(modelId, {
            status: 'completed',
            model3dUrl: taskResult.modelUrl,
            retextureTaskId: null, // Clear after completion
          });
          return res.json(updatedModel);
        } else if (taskResult.status === 'failed') {
          // Revert to completed since we still have the previous model
          await storage.updateModel(modelId, { 
            status: 'completed',
            retextureTaskId: null,
          });
          return res.json({ ...model, status: 'completed', error: 'Retexture failed' });
        }
      }

      res.json(model);
    } catch (error) {
      console.error('Error checking retexture status:', error);
      res.status(500).json({ error: 'Failed to check retexture status' });
    }
  });

  // Revert to base 3D model (undo retexturing)
  app.post("/api/models/:id/revert-texture", async (req, res) => {
    try {
      const modelId = parseInt(req.params.id);

      const model = await storage.getModel(modelId);
      if (!model) {
        return res.status(404).json({ error: 'Model not found' });
      }

      if (!model.baseModel3dUrl) {
        return res.status(400).json({ error: 'No base model to revert to' });
      }

      // Revert to the base model
      const updatedModel = await storage.updateModel(modelId, {
        model3dUrl: model.baseModel3dUrl,
        texturePrompt: null,
      });

      res.json(updatedModel);
    } catch (error) {
      console.error('Error reverting texture:', error);
      res.status(500).json({ error: 'Failed to revert texture' });
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

  // Get user subscription status
  app.get("/api/subscription", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      let subscription = await storage.getSubscription(userId);
      
      if (!subscription) {
        subscription = await storage.createOrUpdateSubscription(userId, {});
      }

      res.json({
        plan: subscription.plan,
        generationsUsed: subscription.generationsUsed,
        generationsLimit: subscription.generationsLimit,
        canGenerate: subscription.generationsUsed < subscription.generationsLimit,
        stripeCustomerId: subscription.stripeCustomerId,
      });
    } catch (error) {
      console.error('Error fetching subscription:', error);
      res.status(500).json({ error: 'Failed to fetch subscription' });
    }
  });

  // Purchase additional generations (pay-per-use) - creates Stripe checkout
  app.post("/api/subscription/purchase", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const userEmail = (req.user as any)?.claims?.email;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { priceId, count } = req.body;
      if (!priceId) {
        return res.status(400).json({ error: 'Price ID required' });
      }

      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();

      let subscription = await storage.getSubscription(userId);
      let customerId = subscription?.stripeCustomerId;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: userEmail || undefined,
          metadata: { userId },
        });
        customerId = customer.id;
        await storage.createOrUpdateSubscription(userId, {
          stripeCustomerId: customerId,
        });
      }

      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: count || 1 }],
        mode: 'payment',
        success_url: `${baseUrl}/pricing?success=true`,
        cancel_url: `${baseUrl}/pricing?canceled=true`,
        metadata: { userId, type: 'pay_per_use', count: String(count || 1) },
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error('Error creating checkout session:', error);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  });

  // Create checkout for subscription plans
  app.post("/api/subscription/checkout", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const userEmail = (req.user as any)?.claims?.email;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { priceId } = req.body;
      if (!priceId) {
        return res.status(400).json({ error: 'Price ID required' });
      }

      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();

      let subscription = await storage.getSubscription(userId);
      let customerId = subscription?.stripeCustomerId;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: userEmail || undefined,
          metadata: { userId },
        });
        customerId = customer.id;
        await storage.createOrUpdateSubscription(userId, {
          stripeCustomerId: customerId,
        });
      }

      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${baseUrl}/pricing?success=true`,
        cancel_url: `${baseUrl}/pricing?canceled=true`,
        metadata: { userId, type: 'subscription' },
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error('Error creating subscription checkout:', error);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  });

  // Get Stripe publishable key for frontend
  app.get("/api/stripe/config", async (req, res) => {
    try {
      const { getStripePublishableKey } = await import('./stripeClient');
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error) {
      console.error('Error getting Stripe config:', error);
      res.status(500).json({ error: 'Failed to get Stripe config' });
    }
  });

  // List available products and prices
  app.get("/api/stripe/products", async (req, res) => {
    try {
      const { sql } = await import('drizzle-orm');
      const { db } = await import('./db');
      
      const result = await db.execute(
        sql`
          SELECT 
            p.id as product_id,
            p.name as product_name,
            p.description as product_description,
            p.active as product_active,
            p.metadata as product_metadata,
            pr.id as price_id,
            pr.unit_amount,
            pr.currency,
            pr.recurring,
            pr.active as price_active
          FROM stripe.products p
          LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
          WHERE p.active = true
          ORDER BY p.id, pr.unit_amount
        `
      );
      
      const productsMap = new Map();
      for (const row of result.rows as any[]) {
        if (!productsMap.has(row.product_id)) {
          productsMap.set(row.product_id, {
            id: row.product_id,
            name: row.product_name,
            description: row.product_description,
            metadata: row.product_metadata,
            prices: []
          });
        }
        if (row.price_id) {
          productsMap.get(row.product_id).prices.push({
            id: row.price_id,
            unit_amount: row.unit_amount,
            currency: row.currency,
            recurring: row.recurring,
          });
        }
      }

      res.json({ products: Array.from(productsMap.values()) });
    } catch (error) {
      console.error('Error listing products:', error);
      res.status(500).json({ error: 'Failed to list products' });
    }
  });

  return httpServer;
}
