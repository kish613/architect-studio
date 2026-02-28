import { create } from "zustand";
import type { CADExtensionParams, CADSceneParams, PropertyBaseParams } from "@/lib/cad/types";
import type { MaterialPreset } from "@/lib/cad/materials";
import type { ExtensionOption, PDRAssessment, EPCData } from "@/lib/api";
import { extensionOptionToCADParams, buildPropertyBase } from "@/lib/cad/extension-factory";

interface CADStore {
  sceneParams: CADSceneParams;
  pdrAssessment: PDRAssessment | null;
  materialPreset: MaterialPreset;
  isInitialized: boolean;

  // Initialize from planning analysis data
  initFromAnalysis: (
    option: ExtensionOption,
    epcData?: EPCData | null,
    propertyAnalysis?: { stories?: number } | null,
    pdr?: PDRAssessment | null
  ) => void;

  // Update a single extension parameter
  updateExtensionParam: <K extends keyof CADExtensionParams>(
    index: number,
    key: K,
    value: CADExtensionParams[K]
  ) => void;

  // Update property base
  updatePropertyParam: <K extends keyof PropertyBaseParams>(
    key: K,
    value: PropertyBaseParams[K]
  ) => void;

  // Toggle display options
  toggleDimensions: () => void;
  toggleWireframe: () => void;
  setMaterialPreset: (preset: MaterialPreset) => void;

  // Reset
  reset: () => void;
}

const defaultScene: CADSceneParams = {
  property: {
    widthM: 7,
    depthM: 9,
    heightM: 2.7,
    stories: 2,
  },
  extensions: [],
  showDimensions: true,
  showWireframe: false,
};

export const useCADStore = create<CADStore>((set) => ({
  sceneParams: defaultScene,
  pdrAssessment: null,
  materialPreset: "brick",
  isInitialized: false,

  initFromAnalysis: (option, epcData, propertyAnalysis, pdr) => {
    const property = buildPropertyBase(epcData, propertyAnalysis);
    const extensions = extensionOptionToCADParams(option, property);

    set({
      sceneParams: {
        property,
        extensions,
        showDimensions: true,
        showWireframe: false,
      },
      pdrAssessment: pdr || null,
      isInitialized: true,
    });
  },

  updateExtensionParam: (index, key, value) => {
    set((state) => {
      const extensions = [...state.sceneParams.extensions];
      if (extensions[index]) {
        extensions[index] = { ...extensions[index], [key]: value };
      }
      return {
        sceneParams: { ...state.sceneParams, extensions },
      };
    });
  },

  updatePropertyParam: (key, value) => {
    set((state) => ({
      sceneParams: {
        ...state.sceneParams,
        property: { ...state.sceneParams.property, [key]: value },
      },
    }));
  },

  toggleDimensions: () => {
    set((state) => ({
      sceneParams: {
        ...state.sceneParams,
        showDimensions: !state.sceneParams.showDimensions,
      },
    }));
  },

  toggleWireframe: () => {
    set((state) => ({
      sceneParams: {
        ...state.sceneParams,
        showWireframe: !state.sceneParams.showWireframe,
      },
    }));
  },

  setMaterialPreset: (preset) => {
    set({ materialPreset: preset });
  },

  reset: () => {
    set({
      sceneParams: defaultScene,
      pdrAssessment: null,
      materialPreset: "brick",
      isInitialized: false,
    });
  },
}));
