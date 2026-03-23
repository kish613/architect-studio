import React, { act, type ButtonHTMLAttributes, type HTMLAttributes, type LabelHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyScene } from "@shared/pascal-scene";

const mocks = vi.hoisted(() => {
  const navigate = vi.fn();
  const toast = vi.fn();
  const invalidateSubscription = vi.fn();
  const invalidateQueries = vi.fn();
  const useQuery = vi.fn();
  const useMutation = vi.fn(() => ({ mutate: vi.fn(), isPending: false }));

  const sceneStore = {
    nodes: {},
    rootNodeIds: [],
    loadScene: vi.fn(),
    resetSceneState: vi.fn(),
    setFloorplanId: vi.fn(),
    deleteNode: vi.fn(),
  };

  const viewerStore = {
    showWalls: true,
    showSlabs: true,
    showRoofs: true,
    showItems: true,
    showZones: true,
    showGrid: false,
    toggleVisibility: vi.fn(),
    setCameraPreset: vi.fn(),
    levelMode: "stacked",
    setLevelMode: vi.fn(),
    explodedSpacing: 0,
    setExplodedSpacing: vi.fn(),
    selectedIds: [],
    clearSelection: vi.fn(),
    resetViewState: vi.fn(),
  };

  const editorStore = {
    resetEditorState: vi.fn(),
  };

  const useScene = ((selector?: (state: typeof sceneStore) => unknown) =>
    selector ? selector(sceneStore) : sceneStore) as ((
      selector?: (state: typeof sceneStore) => unknown,
    ) => unknown) & {
      getState: () => typeof sceneStore;
    };
  useScene.getState = () => sceneStore;

  const useViewer = ((selector?: (state: typeof viewerStore) => unknown) =>
    selector ? selector(viewerStore) : viewerStore) as ((
      selector?: (state: typeof viewerStore) => unknown,
    ) => unknown) & {
      getState: () => typeof viewerStore;
    };
  useViewer.getState = () => viewerStore;

  const useEditor = ((selector?: (state: typeof editorStore) => unknown) =>
    selector ? selector(editorStore) : editorStore) as ((
      selector?: (state: typeof editorStore) => unknown,
    ) => unknown) & {
      getState: () => typeof editorStore;
    };
  useEditor.getState = () => editorStore;

  return {
    navigate,
    toast,
    invalidateSubscription,
    invalidateQueries,
    useQuery,
    useMutation,
    sceneStore,
    viewerStore,
    editorStore,
    useScene,
    useViewer,
    useEditor,
  };
});

vi.mock("wouter", () => ({
  useParams: () => ({ id: "42" }),
  useLocation: () => ["/planning/42/editor", mocks.navigate],
  Link: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.useQuery,
  useMutation: mocks.useMutation,
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));

vi.mock("@/components/layout/Layout", () => ({
  Layout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/layout/WorkspaceLayout", () => ({
  WorkspaceLayout: ({
    leftPanel,
    rightPanel,
    children,
  }: {
    leftPanel: ReactNode;
    rightPanel: ReactNode;
    children: ReactNode;
  }) => (
    <div>
      <div>{leftPanel}</div>
      <div>{children}</div>
      <div>{rightPanel}</div>
    </div>
  ),
}));

vi.mock("@/components/ui/page-transition", () => ({
  PageTransition: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/viewer/Model3DViewer", () => ({
  Model3DViewer: ({ modelUrl }: { modelUrl: string }) => <div>{`model-viewer:${modelUrl}`}</div>,
  Model3DPlaceholder: () => <div>model-placeholder</div>,
}));

vi.mock("@/components/viewer/FloorplanCanvas", () => ({
  FloorplanCanvas: () => <div>pascal-canvas</div>,
}));

vi.mock("@/components/subscription", () => ({
  PaywallModal: () => null,
}));

vi.mock("@/components/editor/FurnitureCatalogPanel", () => ({
  FurnitureCatalogPanel: () => <div>furniture-panel</div>,
}));

vi.mock("@/components/editor/FloorplanEditor", () => ({
  FloorplanEditor: ({
    floorplanId,
    floorplanName,
  }: {
    floorplanId: number;
    floorplanName: string;
  }) => <div>{`floorplan-editor:${floorplanId}:${floorplanName}`}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement> & { children?: ReactNode }) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div>loading-skeleton</div>,
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: (props: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({
    children,
    ...props
  }: LabelHTMLAttributes<HTMLLabelElement> & { children?: ReactNode }) => (
    <label {...props}>{children}</label>
  ),
}));

vi.mock("@/components/ui/progress", () => ({
  Progress: ({ value }: { value: number }) => <div>{`progress:${value}`}</div>,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock("@/hooks/use-subscription", () => ({
  useSubscription: () => ({
    subscription: null,
    invalidate: mocks.invalidateSubscription,
  }),
}));

vi.mock("@/stores/use-scene", () => ({
  useScene: mocks.useScene,
}));

vi.mock("@/stores/use-viewer", () => ({
  useViewer: mocks.useViewer,
}));

vi.mock("@/stores/use-editor", () => ({
  useEditor: mocks.useEditor,
}));

vi.mock("react-zoom-pan-pinch", () => ({
  TransformWrapper: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TransformComponent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  useControls: () => ({
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    resetTransform: vi.fn(),
  }),
}));

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({
      children,
      ...props
    }: HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) => (
      <div {...props}>{children}</div>
    ),
  },
}));

import { FloorplanEditorPage } from "./FloorplanEditorPage";
import { Viewer } from "./Viewer";

function createLegacyScenePayload() {
  const scene = createEmptyScene();
  const { schemaVersion: _schemaVersion, ...legacyScene } = scene;
  return JSON.stringify(legacyScene);
}

function createProjectModel(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    status: "completed",
    originalUrl: "/original.png",
    isometricUrl: "/isometric.png",
    model3dUrl: "/model.glb",
    pascalData: createLegacyScenePayload(),
    sceneVersion: 1,
    createdAt: "2026-03-23T00:00:00.000Z",
    provider: "trellis",
    baseModel3dUrl: null,
    meshyTaskId: null,
    retextureTaskId: null,
    ...overrides,
  };
}

function createProject(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    name: "Pascal House",
    models: [createProjectModel()],
    ...overrides,
  };
}

function createFloorplan(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    name: "Ground Floor",
    updatedAt: "2026-03-23T00:00:00.000Z",
    sceneData: createLegacyScenePayload(),
    ...overrides,
  };
}

function resetMockState() {
  vi.clearAllMocks();
  mocks.viewerStore.levelMode = "stacked";
  mocks.viewerStore.explodedSpacing = 0;
  mocks.viewerStore.selectedIds = [];
  mocks.viewerStore.showWalls = true;
  mocks.viewerStore.showSlabs = true;
  mocks.viewerStore.showRoofs = true;
  mocks.viewerStore.showItems = true;
  mocks.viewerStore.showZones = true;
  mocks.viewerStore.showGrid = false;
  mocks.sceneStore.nodes = {};
  mocks.sceneStore.rootNodeIds = [];
  mocks.useMutation.mockImplementation(() => ({ mutate: vi.fn(), isPending: false }));
}

async function renderRoute(element: ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(element);
    await Promise.resolve();
  });

  return { container, root };
}

async function clickButton(container: HTMLElement, label: string) {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.replace(/\s+/g, " ").includes(label),
  );

  if (!button) {
    throw new Error(`Could not find button containing "${label}"`);
  }

  await act(async () => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await Promise.resolve();
  });
}

describe("Pascal route smoke coverage", () => {
  let mountedRoot: Root | null = null;
  let mountedContainer: HTMLDivElement | null = null;

  beforeEach(() => {
    resetMockState();
  });

  afterEach(async () => {
    if (mountedRoot) {
      await act(async () => {
        mountedRoot?.unmount();
      });
    }

    mountedRoot = null;
    mountedContainer?.remove();
    mountedContainer = null;
  });

  it("loads the viewer Pascal canvas from a legacy saved payload", async () => {
    mocks.useQuery.mockReturnValue({
      data: createProject(),
      isLoading: false,
      refetch: vi.fn(),
    });

    const mounted = await renderRoute(<Viewer />);
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await clickButton(mounted.container, "3d View");

    expect(mounted.container.textContent).toContain("pascal-canvas");
    expect(mounted.container.textContent).not.toContain("Pascal scene could not be rendered safely");
    expect(mocks.sceneStore.loadScene).toHaveBeenCalledWith(
      expect.objectContaining({ schemaVersion: 1 }),
    );
  });

  it("falls back to the regular model viewer when Pascal data is malformed", async () => {
    mocks.useQuery.mockReturnValue({
      data: createProject({
        models: [
          createProjectModel({
            pascalData: "{ not-valid-json",
            model3dUrl: "/fallback.glb",
          }),
        ],
      }),
      isLoading: false,
      refetch: vi.fn(),
    });

    const mounted = await renderRoute(<Viewer />);
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await clickButton(mounted.container, "3d View");

    expect(mounted.container.textContent).toContain("model-viewer:/fallback.glb");
    expect(mounted.container.textContent).toContain("Pascal scene could not be rendered safely");
    expect(mocks.sceneStore.resetSceneState).toHaveBeenCalled();
    expect(mocks.viewerStore.resetViewState).toHaveBeenCalled();
    expect(mocks.editorStore.resetEditorState).toHaveBeenCalled();
  });

  it("loads the floorplan editor from a legacy saved payload", async () => {
    mocks.useQuery.mockReturnValue({
      data: createFloorplan(),
      isLoading: false,
      isError: false,
      error: null,
    });

    const mounted = await renderRoute(<FloorplanEditorPage />);
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await Promise.resolve();
    });

    expect(mounted.container.textContent).toContain("floorplan-editor:42:Ground Floor");
    expect(mocks.sceneStore.setFloorplanId).toHaveBeenCalledWith(42);
    expect(mocks.sceneStore.loadScene).toHaveBeenCalledWith(
      expect.objectContaining({ schemaVersion: 1 }),
      42,
    );
  });

  it("shows recovery UI instead of mounting the editor when Pascal data is malformed", async () => {
    mocks.useQuery.mockReturnValue({
      data: createFloorplan({ sceneData: "{ not-valid-json" }),
      isLoading: false,
      isError: false,
      error: null,
    });

    const mounted = await renderRoute(<FloorplanEditorPage />);
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(mounted.container.textContent).toContain("Pascal scene could not be validated");
    expect(mounted.container.textContent).not.toContain("floorplan-editor:");
    expect(mocks.sceneStore.resetSceneState).toHaveBeenCalled();
    expect(mocks.viewerStore.resetViewState).toHaveBeenCalled();
    expect(mocks.editorStore.resetEditorState).toHaveBeenCalled();
  });
});
