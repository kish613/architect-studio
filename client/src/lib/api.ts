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

export async function generate3DTrellis(modelId: number): Promise<FloorplanModel> {
  const response = await fetch(`/api/models/${modelId}/generate-3d-trellis`, {
    method: 'POST',
  });

  if (!response.ok) {
    const text = await response.text();
    let errorMessage = 'Failed to generate 3D model with TRELLIS';
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

// Planning Analysis Types
export type WorkflowMode = 'classic' | 'extend';
export type ExtensionOptionTier = 'pdr_only' | 'moderate_planning' | 'maximum_extension';
export type ExtensionType = 'rear_single_storey' | 'rear_two_storey' | 'side' | 'loft' | 'wraparound' | 'basement' | 'outbuilding';

export interface EPCData {
  address: string;
  postcode: string;
  propertyType: string;
  builtForm: string;
  totalFloorArea: number;
  constructionAgeBand: string;
  currentEnergyRating: string;
  currentEnergyEfficiency: number;
  wallsDescription: string;
  roofDescription: string;
  windowsDescription: string;
  mainFuel: string;
  hotWaterDescription: string;
  floorDescription: string;
  certificateHash?: string;
}

export interface PDRLimits {
  maxDepthM: number;
  maxHeightM: number;
  maxEavesHeightM: number;
  maxWidthPercent?: number;
  maxVolumeM3?: number;
  permitted: boolean;
  notes: string[];
}

export interface PDRAssessment {
  rearSingleStorey: PDRLimits;
  rearTwoStorey: PDRLimits;
  side: PDRLimits;
  loft: PDRLimits;
  outbuilding: PDRLimits;
  conservationRestrictions: string[];
  overallPDRSummary: string;
}

export interface ExtensionDetail {
  type: ExtensionType;
  description: string;
  additionalSqM: number;
  depthM?: number;
  widthM?: number;
  heightM?: number;
  requiresPlanningPermission: boolean;
  pdrCompliant: boolean;
}

export interface ExtensionOption {
  tier: ExtensionOptionTier;
  label: string;
  description: string;
  requiresPlanningPermission: boolean;
  extensions: ExtensionDetail[];
  totalAdditionalSqM: number;
  estimatedCostGBP: {
    low: number;
    mid: number;
    high: number;
  };
  costRange?: { min: number; max: number };
  approvalLikelihood: 'very_high' | 'high' | 'medium' | 'low' | 'moderate';
  planningNotes: string[];
  estimatedTimeline: string;
  partyWallRequired: boolean;
  buildingRegsRequired: boolean;
  timelineWeeks: { min: number; max: number };
  requiresPartyWall: boolean;
}

export interface CostEstimate {
  costPerSqm: { min: number; max: number };
  regionalMultiplier: number;
  region: string;
}

export interface PartyWallAssessment {
  required: boolean;
  affectedBoundaries: string[];
  noticeRequirements: string[];
  estimatedSurveyorCost: { min: number; max: number };
  notes: string[];
}

export interface NeighbourImpactAnalysis {
  fortyFiveDegreeRule: { passed: boolean; details: string };
  overshadowing: { severity: 'none' | 'minor' | 'moderate' | 'significant'; details: string };
  overlooking: { severity: 'none' | 'minor' | 'moderate' | 'significant'; details: string };
  mitigations: string[];
}

export interface RealApprovalEntry {
  applicationRef: string;
  address: string;
  description: string;
  decision: string;
  decisionDate: string;
  modificationType: string;
  source?: string;
}

export interface RealApprovalData {
  searchSummary: string;
  councilName: string;
  councilPlanningPortalUrl: string;
  recentApprovals: RealApprovalEntry[];
  areaCharacteristics: string;
  commonExtensionTypes: string[];
  knownRestrictions: string[];
}

export interface PlanningAnalysis {
  id: number;
  projectId: number | null;
  userId: string;
  propertyImageUrl: string;
  floorplanUrl: string | null;
  address: string | null;
  postcode: string | null;
  latitude: string | null;
  longitude: string | null;
  propertyAnalysis: PropertyAnalysisData | null;
  approvalSearchResults: ApprovalSearchResults | null;
  selectedModification: string | null;
  generatedExteriorUrl: string | null;
  generatedFloorplanUrl: string | null;
  generatedIsometricUrl: string | null;
  // Smart Extension fields
  houseNumber: string | null;
  workflowMode: WorkflowMode;
  epcData: EPCData | null;
  realApprovalData: RealApprovalData | null;
  pdrAssessment: PDRAssessment | null;
  isConservationArea: boolean;
  isListedBuilding: boolean;
  listedBuildingGrade: string | null;
  conservationAreaName: string | null;
  orientation: string | null;
  partyWallAssessment: PartyWallAssessment | null;
  neighbourImpact: NeighbourImpactAnalysis | null;
  extensionOptions: ExtensionOption[] | null;
  selectedOptionTier: ExtensionOptionTier | null;
  costEstimate: CostEstimate | null;
  generatedOptionFloorplans: Record<string, string> | null;
  satelliteImageUrl: string | null;
  status: 'pending' | 'analyzing' | 'searching' | 'awaiting_selection' | 'generating' | 'completed' | 'failed'
    | 'epc_lookup' | 'pdr_calculating' | 'searching_real' | 'options_ready';
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyAnalysisData {
  propertyType: 'terraced' | 'semi-detached' | 'detached' | 'flat' | 'bungalow' | 'other';
  architecturalStyle: string;
  estimatedEra: string;
  materials: string[];
  existingFeatures: string[];
  stories: number;
  estimatedSqFt: number;
  extensionPotential: {
    rear: 'high' | 'medium' | 'low' | 'none';
    side: 'high' | 'medium' | 'low' | 'none';
    loft: 'high' | 'medium' | 'low' | 'none';
    garage: 'high' | 'medium' | 'low' | 'none';
  };
}

export interface ApprovalSearchResults {
  searchRadius: number;
  totalFound: number;
  approvals: Array<{
    applicationRef: string;
    address: string;
    distance: number;
    modificationType: string;
    description: string;
    decisionDate: string;
    estimatedSqFt?: number;
  }>;
  modificationSummary: {
    [key: string]: {
      count: number;
      avgApprovalRate: number;
    };
  };
}

// Planning Analysis API Functions
export async function fetchPlanningAnalyses(): Promise<PlanningAnalysis[]> {
  const response = await fetch('/api/planning');
  if (!response.ok) throw new Error('Failed to fetch planning analyses');
  return response.json();
}

export async function fetchPlanningAnalysis(id: number): Promise<PlanningAnalysis> {
  const response = await fetch(`/api/planning/${id}`);
  if (!response.ok) throw new Error('Failed to fetch planning analysis');
  return response.json();
}

export async function uploadPlanningFiles(
  propertyImage: File,
  floorplan?: File,
  address?: string,
  postcode?: string,
  houseNumber?: string,
  workflowMode?: WorkflowMode
): Promise<PlanningAnalysis> {
  const formData = new FormData();
  formData.append('propertyImage', propertyImage);
  if (floorplan) {
    formData.append('floorplan', floorplan);
  }
  if (address) {
    formData.append('address', address);
  }
  if (postcode) {
    formData.append('postcode', postcode);
  }
  if (houseNumber) {
    formData.append('houseNumber', houseNumber);
  }
  if (workflowMode) {
    formData.append('workflowMode', workflowMode);
  }
  
  const response = await fetch('/api/planning/upload', {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const text = await response.text();
    let errorMessage = 'Failed to upload planning files';
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

export async function analyzeProperty(analysisId: number): Promise<PlanningAnalysis> {
  const response = await fetch(`/api/planning/${analysisId}/analyze`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    const text = await response.text();
    let errorMessage = 'Failed to analyze property';
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

export async function searchPlanningApprovals(analysisId: number): Promise<PlanningAnalysis> {
  const response = await fetch(`/api/planning/${analysisId}/search`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    const text = await response.text();
    let errorMessage = 'Failed to search planning approvals';
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

export async function selectModification(analysisId: number, modificationType: string): Promise<PlanningAnalysis> {
  const response = await fetch(`/api/planning/${analysisId}/select`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modificationType }),
  });
  
  if (!response.ok) {
    const text = await response.text();
    let errorMessage = 'Failed to select modification';
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

export async function generatePlanningVisualization(analysisId: number): Promise<PlanningAnalysis> {
  const response = await fetch(`/api/planning/${analysisId}/generate`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    const text = await response.text();
    let errorMessage = 'Failed to generate visualization';
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

export async function checkPlanningStatus(analysisId: number): Promise<PlanningAnalysis> {
  const response = await fetch(`/api/planning/${analysisId}/status`);
  if (!response.ok) throw new Error('Failed to check planning status');
  return response.json();
}

export async function deletePlanningAnalysis(id: number): Promise<void> {
  const response = await fetch(`/api/planning/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete planning analysis');
}

// Smart Extension API Functions
export async function runSmartExtend(analysisId: number): Promise<PlanningAnalysis> {
  const response = await fetch(`/api/planning/${analysisId}/extend`, {
    method: 'POST',
  });

  if (!response.ok) {
    const text = await response.text();
    let errorMessage = 'Failed to run smart extension analysis';
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

export async function selectExtensionOption(
  analysisId: number,
  optionTier: ExtensionOptionTier
): Promise<PlanningAnalysis> {
  const response = await fetch(`/api/planning/${analysisId}/select-option`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ optionTier }),
  });

  if (!response.ok) {
    const text = await response.text();
    let errorMessage = 'Failed to select extension option';
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
