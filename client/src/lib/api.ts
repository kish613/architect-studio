import type { Project, FloorplanModel } from "@shared/schema";

export interface ProjectWithModels extends Project {
  models: FloorplanModel[];
}

export async function fetchProjects(): Promise<ProjectWithModels[]> {
  const response = await fetch('/api/projects');
  if (!response.ok) throw new Error('Failed to fetch projects');
  return response.json();
}

export async function fetchProject(id: number): Promise<ProjectWithModels> {
  const response = await fetch(`/api/projects/${id}`);
  if (!response.ok) throw new Error('Failed to fetch project');
  return response.json();
}

export async function createProject(name: string): Promise<Project> {
  const response = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw new Error('Failed to create project');
  return response.json();
}

export async function uploadFloorplan(projectId: number, file: File): Promise<FloorplanModel> {
  const formData = new FormData();
  formData.append('floorplan', file);
  
  const response = await fetch(`/api/projects/${projectId}/upload`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) throw new Error('Failed to upload floorplan');
  return response.json();
}

export async function generateIsometric(modelId: number, prompt?: string): Promise<FloorplanModel> {
  const response = await fetch(`/api/models/${modelId}/generate-isometric`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  
  if (!response.ok) {
    const text = await response.text();
    let errorMessage = 'Failed to generate isometric view';
    try {
      const error = JSON.parse(text);
      errorMessage = error.error || error.message || errorMessage;
    } catch {
      // Response was not JSON, use the text directly if it's not too long
      if (text && text.length < 200) {
        errorMessage = text;
      }
    }
    throw new Error(errorMessage);
  }
  return response.json();
}

export async function generate3D(modelId: number): Promise<FloorplanModel> {
  const response = await fetch(`/api/models/${modelId}/generate-3d`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    const text = await response.text();
    let errorMessage = 'Failed to start 3D generation';
    try {
      const error = JSON.parse(text);
      errorMessage = error.error || error.message || errorMessage;
    } catch {
      if (text && text.length < 200) {
        errorMessage = text;
      }
    }
    throw new Error(errorMessage);
  }
  return response.json();
}

export async function checkModelStatus(modelId: number): Promise<FloorplanModel> {
  const response = await fetch(`/api/models/${modelId}/status`);
  if (!response.ok) throw new Error('Failed to check status');
  return response.json();
}

export async function deleteProject(id: number): Promise<void> {
  const response = await fetch(`/api/projects/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete project');
}

export async function retextureModel(modelId: number, texturePrompt: string): Promise<FloorplanModel> {
  const response = await fetch(`/api/models/${modelId}/retexture`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texturePrompt }),
  });
  
  if (!response.ok) {
    const text = await response.text();
    let errorMessage = 'Failed to start retexturing';
    try {
      const error = JSON.parse(text);
      errorMessage = error.error || error.message || errorMessage;
    } catch {
      if (text && text.length < 200) {
        errorMessage = text;
      }
    }
    throw new Error(errorMessage);
  }
  return response.json();
}

export async function checkRetextureStatus(modelId: number): Promise<FloorplanModel> {
  const response = await fetch(`/api/models/${modelId}/retexture-status`);
  if (!response.ok) throw new Error('Failed to check retexture status');
  return response.json();
}

export async function revertTexture(modelId: number): Promise<FloorplanModel> {
  const response = await fetch(`/api/models/${modelId}/revert-texture`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    const text = await response.text();
    let errorMessage = 'Failed to revert texture';
    try {
      const error = JSON.parse(text);
      errorMessage = error.error || error.message || errorMessage;
    } catch {
      if (text && text.length < 200) {
        errorMessage = text;
      }
    }
    throw new Error(errorMessage);
  }
  return response.json();
}
