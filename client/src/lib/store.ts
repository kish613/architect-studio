import { create } from 'zustand';
import floorplanImage from '@assets/generated_images/architectural_2d_floorplan_sketch.png';
import renderImage from '@assets/generated_images/photorealistic_3d_interior_render.png';

export interface FloorplanModel {
  id: string;
  projectId: string;
  thumbnailUrl: string;
  renderUrl: string;
  originalUrl: string;
  createdAt: string;
  status: 'processing' | 'completed' | 'failed';
}

export interface Project {
  id: string;
  name: string;
  models: FloorplanModel[];
  lastModified: string;
}

interface FloorplanStore {
  projects: Project[];
  activeProject: Project | null;
  addProject: (project: Project) => void;
  getProject: (id: string) => Project | undefined;
  // Mock action to simulate upload
  createMockProject: (name: string, file: File) => Promise<string>;
}

// Mock Data
const MOCK_PROJECTS: Project[] = [
  {
    id: 'p1',
    name: 'Modern Loft',
    lastModified: '2024-05-10T14:30:00Z',
    models: [
      {
        id: 'm1',
        projectId: 'p1',
        thumbnailUrl: renderImage,
        renderUrl: renderImage,
        originalUrl: floorplanImage,
        createdAt: '2024-05-10T14:30:00Z',
        status: 'completed',
      },
    ],
  },
  {
    id: 'p2',
    name: 'Seaside Villa',
    lastModified: '2024-05-08T09:15:00Z',
    models: [
      {
        id: 'm2',
        projectId: 'p2',
        thumbnailUrl: renderImage, // Reusing for mock
        renderUrl: renderImage,
        originalUrl: floorplanImage,
        createdAt: '2024-05-08T09:15:00Z',
        status: 'completed',
      },
    ],
  },
];

export const useFloorplanStore = create<FloorplanStore>((set, get) => ({
  projects: MOCK_PROJECTS,
  activeProject: null,
  addProject: (project) => set((state) => ({ projects: [project, ...state.projects] })),
  getProject: (id) => get().projects.find((p) => p.id === id),
  createMockProject: async (name, file) => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    const newProject: Project = {
      id: `p${Date.now()}`,
      name: name || 'Untitled Project',
      lastModified: new Date().toISOString(),
      models: [
        {
          id: `m${Date.now()}`,
          projectId: `p${Date.now()}`,
          thumbnailUrl: renderImage,
          renderUrl: renderImage,
          originalUrl: URL.createObjectURL(file), // Use local blob for preview
          createdAt: new Date().toISOString(),
          status: 'completed',
        }
      ]
    };

    set((state) => ({ projects: [newProject, ...state.projects] }));
    return newProject.id;
  }
}));
