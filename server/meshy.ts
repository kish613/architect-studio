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
        enable_pbr: true,
        should_remesh: true,
        topology: "quad",
        target_polycount: 100000,
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
