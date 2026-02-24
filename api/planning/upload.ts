import type { VercelRequest, VercelResponse } from "@vercel/node";
import { put } from "@vercel/blob";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { pgTable, text, varchar, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { jwtVerify } from "jose";

export const config = {
  api: {
    bodyParser: false,
  },
};

// Inline schema
const planningAnalyses = pgTable("planning_analyses", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id"),
  userId: varchar("user_id").notNull(),
  propertyImageUrl: text("property_image_url").notNull(),
  floorplanUrl: text("floorplan_url"),
  address: text("address"),
  postcode: text("postcode"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  propertyAnalysis: text("property_analysis"),
  approvalSearchResults: text("approval_search_results"),
  selectedModification: text("selected_modification"),
  generatedExteriorUrl: text("generated_exterior_url"),
  generatedFloorplanUrl: text("generated_floorplan_url"),
  generatedIsometricUrl: text("generated_isometric_url"),
  houseNumber: text("house_number"),
  workflowMode: text("workflow_mode").default("classic"),
  epcData: text("epc_data"),
  realApprovalData: text("real_approval_data"),
  pdrAssessment: text("pdr_assessment"),
  isConservationArea: boolean("is_conservation_area").default(false),
  isListedBuilding: boolean("is_listed_building").default(false),
  listedBuildingGrade: text("listed_building_grade"),
  conservationAreaName: text("conservation_area_name"),
  orientation: text("orientation"),
  partyWallAssessment: text("party_wall_assessment"),
  neighbourImpact: text("neighbour_impact"),
  extensionOptions: text("extension_options"),
  selectedOptionTier: text("selected_option_tier"),
  costEstimate: text("cost_estimate"),
  generatedOptionFloorplans: text("generated_option_floorplans"),
  satelliteImageUrl: text("satellite_image_url"),
  status: text("status").notNull().default("pending"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set");
  }
  const sql = neon(process.env.DATABASE_URL);
  return drizzle(sql);
}

function getSessionFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const sessionCookie = cookies.find((c) => c.startsWith("auth_session="));
  return sessionCookie ? sessionCookie.split("=")[1] : null;
}

async function verifySession(token: string): Promise<{ userId: string } | null> {
  try {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET || "fallback-secret");
    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.userId === "string") {
      return { userId: payload.userId };
    }
    return null;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Authenticate user
  const sessionToken = getSessionFromCookies(req.headers.cookie || null);
  if (!sessionToken) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const session = await verifySession(sessionToken);
  if (!session) {
    return res.status(401).json({ error: "Invalid session" });
  }

  try {
    const db = getDb();

    // Get content type
    const contentType = req.headers["content-type"] || "";

    if (!contentType.includes("multipart/form-data")) {
      return res.status(400).json({ error: "Content type must be multipart/form-data" });
    }

    // Read the raw body
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.from(chunk));
    }
    const body = Buffer.concat(chunks);

    // Parse multipart form data
    const boundary = contentType.split("boundary=")[1];
    if (!boundary) {
      return res.status(400).json({ error: "No boundary found in content-type" });
    }

    const bodyStr = body.toString("binary");
    const parts = bodyStr.split(`--${boundary}`);

    let propertyImageBuffer: Buffer | null = null;
    let propertyImageFilename = "property";
    let propertyImageMimeType = "image/png";

    let floorplanBuffer: Buffer | null = null;
    let floorplanFilename = "floorplan";
    let floorplanMimeType = "image/png";

    let address = "";
    let postcode = "";
    let houseNumber = "";
    let workflowMode = "classic";

    for (const part of parts) {
      if (part.includes("Content-Disposition")) {
        // Extract field name
        const nameMatch = part.match(/name="([^"]+)"/);
        const fieldName = nameMatch ? nameMatch[1] : "";

        if (part.includes("filename=")) {
          // This is a file field
          const filenameMatch = part.match(/filename="([^"]+)"/);
          const mimeMatch = part.match(/Content-Type:\s*([^\r\n]+)/);

          // Find the actual file content (after double CRLF)
          const contentStart = part.indexOf("\r\n\r\n") + 4;
          const contentEnd = part.lastIndexOf("\r\n");

          if (contentStart > 3 && contentEnd > contentStart) {
            const fileContent = part.slice(contentStart, contentEnd);
            const fileBuffer = Buffer.from(fileContent, "binary");
            const mime = mimeMatch ? mimeMatch[1].trim() : "image/png";

            if (fieldName === "propertyImage") {
              propertyImageBuffer = fileBuffer;
              propertyImageFilename = filenameMatch ? filenameMatch[1] : "property.png";
              propertyImageMimeType = mime;
            } else if (fieldName === "floorplan") {
              floorplanBuffer = fileBuffer;
              floorplanFilename = filenameMatch ? filenameMatch[1] : "floorplan.png";
              floorplanMimeType = mime;
            }
          }
        } else {
          // This is a text field
          const contentStart = part.indexOf("\r\n\r\n") + 4;
          const contentEnd = part.lastIndexOf("\r\n");
          if (contentStart > 3 && contentEnd > contentStart) {
            const value = part.slice(contentStart, contentEnd).trim();
            if (fieldName === "address") {
              address = value;
            } else if (fieldName === "postcode") {
              postcode = value;
            } else if (fieldName === "houseNumber") {
              houseNumber = value;
            } else if (fieldName === "workflowMode") {
              workflowMode = value === "extend" ? "extend" : "classic";
            }
          }
        }
      }
    }

    // For extend mode, floorplan is required
    if (workflowMode === "extend" && !floorplanBuffer) {
      return res.status(400).json({ error: "Floorplan upload is required for Smart Extension mode" });
    }

    // Property image is required
    if (!propertyImageBuffer) {
      return res.status(400).json({ error: "Property image is required" });
    }

    // Validate file types
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(propertyImageMimeType)) {
      return res.status(400).json({ error: "Invalid property image type. Allowed: JPEG, PNG, WebP" });
    }
    if (floorplanBuffer && !allowedTypes.includes(floorplanMimeType)) {
      return res.status(400).json({ error: "Invalid floorplan type. Allowed: JPEG, PNG, WebP" });
    }

    // Upload property image to Vercel Blob
    const propertyImageExt = propertyImageFilename.split(".").pop() || "png";
    const propertyBlobName = `planning-property-${session.userId}-${Date.now()}.${propertyImageExt}`;
    
    const { url: propertyImageUrl } = await put(propertyBlobName, propertyImageBuffer, {
      access: "public",
      contentType: propertyImageMimeType,
    });

    // Upload floorplan if provided
    let floorplanUrl: string | null = null;
    if (floorplanBuffer) {
      const floorplanExt = floorplanFilename.split(".").pop() || "png";
      const floorplanBlobName = `planning-floorplan-${session.userId}-${Date.now()}.${floorplanExt}`;
      
      const { url } = await put(floorplanBlobName, floorplanBuffer, {
        access: "public",
        contentType: floorplanMimeType,
      });
      floorplanUrl = url;
    }

    // Create planning analysis record
    const [analysis] = await db.insert(planningAnalyses).values({
      userId: session.userId,
      propertyImageUrl,
      floorplanUrl,
      address: address || null,
      postcode: postcode || null,
      houseNumber: houseNumber || null,
      workflowMode: workflowMode as "classic" | "extend",
      status: "pending",
    }).returning();

    return res.status(201).json(analysis);
  } catch (error) {
    console.error("Planning upload error:", error);
    return res.status(500).json({ error: "Failed to upload planning files" });
  }
}
