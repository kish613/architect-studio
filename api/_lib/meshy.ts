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

export async function createImageTo3DTask(
  imageUrl: string
): Promise<MeshyTaskResult> {
  try {
    const response = await fetch(`${MESHY_API_URL}/openapi/v1/image-to-3d`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getMeshyApiKey()}`,
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
        texture_prompt:
          "Photorealistic architectural interior: warm oak hardwood floors with visible grain, smooth matte white walls, fabric upholstery with weave texture, brushed metal fixtures, marble countertops with veining, glass with reflections, detailed wood furniture grain, ceramic tiles with grout, realistic PBR materials with accurate roughness and metallic properties, 4K quality textures",
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

export async function checkMeshyTaskStatus(
  taskId: string
): Promise<MeshyTaskResult> {
  try {
    const response = await fetch(
      `${MESHY_API_URL}/openapi/v1/image-to-3d/${taskId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getMeshyApiKey()}`,
        },
      }
    );

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

export async function pollMeshyTask(
  taskId: string,
  maxAttempts: number = 60
): Promise<MeshyTaskResult> {
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

export async function createRetextureTask(
  modelUrl: string,
  texturePrompt: string
): Promise<MeshyTaskResult> {
  try {
    const response = await fetch(`${MESHY_API_URL}/openapi/v1/retexture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getMeshyApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model_url: modelUrl,
        text_style_prompt: texturePrompt,
        enable_original_uv: true,
        enable_pbr: true,
        ai_model: "latest",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Meshy Retexture API error:", error);
      return { success: false, error: `Meshy API error: ${response.status}` };
    }

    const data = await response.json();
    return {
      success: true,
      taskId: data.result,
    };
  } catch (error: any) {
    console.error("Error creating retexture task:", error);
    return { success: false, error: error.message };
  }
}

export async function checkRetextureTaskStatus(
  taskId: string
): Promise<MeshyTaskResult> {
  try {
    const response = await fetch(
      `${MESHY_API_URL}/openapi/v1/retexture/${taskId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getMeshyApiKey()}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Meshy Retexture API error:", error);
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
        error: data.task_error?.message || "Retexture failed",
      };
    } else {
      return {
        success: true,
        taskId,
        status: data.status.toLowerCase(),
      };
    }
  } catch (error: any) {
    console.error("Error checking retexture task:", error);
    return { success: false, error: error.message };
  }
}

export async function pollRetextureTask(
  taskId: string,
  maxAttempts: number = 60
): Promise<MeshyTaskResult> {
  return pRetry(
    async () => {
      const result = await checkRetextureTaskStatus(taskId);

      if (!result.success) {
        throw new AbortError(result.error || "Task check failed");
      }

      if (result.status === "completed") {
        return result;
      }

      if (result.status === "failed") {
        throw new AbortError(result.error || "Retexture failed");
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



