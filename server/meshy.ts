import pRetry, { AbortError } from "p-retry";

const MESHY_API_URL = "https://api.meshy.ai";

export interface MeshyTaskResult {
  success: boolean;
  taskId?: string;
  modelUrl?: string;
  status?: string;
  error?: string;
}

function getMeshyApiKey(): string {
  const key = process.env.MESHY_API_KEY;
  if (!key) {
    throw new Error("MESHY_API_KEY is not configured");
  }
  return key;
}

const MESHY_3D_PROMPT = `CRITICAL 3D MODEL REQUIREMENTS:
4K ultra high resolution textures with maximum detail and clarity.
Photorealistic PBR materials with accurate roughness, metallic, and normal maps.
Professional architectural interior visualization quality.

GEOMETRY AND STRUCTURE:
- Accurate room proportions matching the source floorplan layout
- Clean architectural geometry with proper wall thickness and depth
- Distinct separation between rooms with visible wall boundaries
- Proper ceiling height proportions for residential interior
- Sharp 90-degree corners on walls and architectural elements
- Recessed doorways and window frames with proper depth

MATERIAL QUALITY:
- High-fidelity surface materials with realistic texture detail
- Clear material boundaries between different surfaces (walls, floors, furniture)
- Proper UV mapping without stretching or distortion
- Consistent material scale across the entire model
- Realistic material reflectivity and surface properties

LIGHTING AND SHADOWS:
- Soft ambient occlusion in corners and edges
- Proper shadow casting from furniture and architectural elements
- Natural light simulation from window positions
- Even illumination without harsh shadows or dark spots

FURNITURE AND DECOR:
- Properly scaled furniture appropriate for room dimensions
- Detailed furniture geometry with realistic proportions
- Fabric textures with visible weave patterns on upholstery
- Wood grain direction consistent on wooden surfaces
- Metal fixtures with appropriate reflectivity`;

export async function createImageTo3DTask(imageUrl: string): Promise<MeshyTaskResult> {
  try {
    const response = await fetch(`${MESHY_API_URL}/openapi/v1/image-to-3d`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${getMeshyApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: imageUrl,
        ai_model: "latest",
        enable_pbr: true,
        should_remesh: true,
        topology: "quad",
        target_polycount: 300000,
        texture_richness: "high",
        art_style: "realistic",
        texture_prompt: "Photorealistic architectural interior: warm oak hardwood floors with visible grain, smooth matte white walls, fabric upholstery with weave texture, brushed metal fixtures, marble countertops with veining, glass with reflections, detailed wood furniture grain, ceramic tiles with grout, realistic PBR materials with accurate roughness and metallic properties, 4K quality textures",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Meshy API error:", error);
      return { success: false, error: `Meshy API error: ${response.status}` };
    }

    const data = await response.json();
    return {
      success: true,
      taskId: data.result,
    };
  } catch (error: any) {
    console.error("Error creating Meshy task:", error);
    return { success: false, error: error.message };
  }
}

export async function checkMeshyTaskStatus(taskId: string): Promise<MeshyTaskResult> {
  try {
    const response = await fetch(`${MESHY_API_URL}/openapi/v1/image-to-3d/${taskId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${getMeshyApiKey()}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Meshy API error:", error);
      return { success: false, error: `Meshy API error: ${response.status}` };
    }

    const data = await response.json();
    
    if (data.status === "SUCCEEDED") {
      return {
        success: true,
        taskId,
        status: "completed",
        modelUrl: data.model_urls?.glb || data.model_urls?.obj,
      };
    } else if (data.status === "FAILED") {
      return {
        success: false,
        taskId,
        status: "failed",
        error: data.task_error?.message || "3D generation failed",
      };
    } else {
      return {
        success: true,
        taskId,
        status: data.status.toLowerCase(),
      };
    }
  } catch (error: any) {
    console.error("Error checking Meshy task:", error);
    return { success: false, error: error.message };
  }
}

export async function pollMeshyTask(taskId: string, maxAttempts: number = 60): Promise<MeshyTaskResult> {
  return pRetry(
    async () => {
      const result = await checkMeshyTaskStatus(taskId);
      
      if (!result.success) {
        throw new AbortError(result.error || "Task check failed");
      }
      
      if (result.status === "completed") {
        return result;
      }
      
      if (result.status === "failed") {
        throw new AbortError(result.error || "3D generation failed");
      }
      
      throw new Error("Still processing");
    },
    {
      retries: maxAttempts,
      minTimeout: 5000,
      maxTimeout: 10000,
      factor: 1,
    }
  );
}
