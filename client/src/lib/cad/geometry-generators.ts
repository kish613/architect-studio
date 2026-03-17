import * as THREE from "three";
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";
import type { CADExtensionParams, WindowParams, DoorParams, PropertyBaseParams } from "./types";
import {
  WALL_THICKNESS,
  FLOOR_SLAB_THICKNESS,
  DEFAULT_ROOF_PITCH_DEG,
  FLAT_ROOF_PARAPET_HEIGHT,
  ROOF_OVERHANG,
} from "./constants";
import {
  brickMaterial,
  slateMaterial,
  flatRoofMaterial,
  glassMaterial,
  frameMaterial,
  concreteMaterial,
  existingBuildingMaterial,
} from "./materials";

const evaluator = new Evaluator();

// Helper: create a positioned brush for CSG
function createBrush(
  geometry: THREE.BufferGeometry,
  material: THREE.Material
): Brush {
  const brush = new Brush(geometry, material);
  brush.updateMatrixWorld();
  return brush;
}

// Cut a rectangular opening in a wall shell
function createOpeningCutout(
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  throughDepth: number
): Brush {
  const geo = new THREE.BoxGeometry(width, height, throughDepth);
  const brush = new Brush(geo);
  brush.position.set(x, y, z);
  brush.updateMatrixWorld();
  return brush;
}

// Calculate window position in world space relative to extension origin
function getWindowWorldPos(
  window: WindowParams,
  params: CADExtensionParams
): { x: number; y: number; z: number; throughDepth: number } {
  const wt = params.wallThicknessM;
  const halfW = params.widthM / 2;
  const halfD = params.depthM / 2;
  const centerY = window.sillHeightM + window.heightM / 2;

  switch (window.wall) {
    case "front":
      return {
        x: -halfW + params.widthM * window.positionAlongWall,
        y: centerY,
        z: -halfD,
        throughDepth: wt * 2,
      };
    case "rear":
      return {
        x: -halfW + params.widthM * window.positionAlongWall,
        y: centerY,
        z: halfD,
        throughDepth: wt * 2,
      };
    case "left":
      return {
        x: -halfW,
        y: centerY,
        z: -halfD + params.depthM * window.positionAlongWall,
        throughDepth: wt * 2,
      };
    case "right":
      return {
        x: halfW,
        y: centerY,
        z: -halfD + params.depthM * window.positionAlongWall,
        throughDepth: wt * 2,
      };
  }
}

// Calculate door position in world space
function getDoorWorldPos(
  door: DoorParams,
  params: CADExtensionParams
): { x: number; y: number; z: number; throughDepth: number } {
  const wt = params.wallThicknessM;
  const halfW = params.widthM / 2;
  const halfD = params.depthM / 2;
  const centerY = door.heightM / 2;

  switch (door.wall) {
    case "front":
      return {
        x: -halfW + params.widthM * door.positionAlongWall,
        y: centerY,
        z: -halfD,
        throughDepth: wt * 2,
      };
    case "rear":
      return {
        x: -halfW + params.widthM * door.positionAlongWall,
        y: centerY,
        z: halfD,
        throughDepth: wt * 2,
      };
    case "left":
      return {
        x: -halfW,
        y: centerY,
        z: -halfD + params.depthM * door.positionAlongWall,
        throughDepth: wt * 2,
      };
    case "right":
      return {
        x: halfW,
        y: centerY,
        z: -halfD + params.depthM * door.positionAlongWall,
        throughDepth: wt * 2,
      };
  }
}

// Generate a hollow wall shell (outer box minus inner box)
function generateWallShell(params: CADExtensionParams): Brush {
  const wt = params.wallThicknessM;
  const { widthM, depthM, heightM } = params;

  const outerBrush = createBrush(
    new THREE.BoxGeometry(widthM, heightM, depthM),
    brickMaterial
  );
  outerBrush.position.set(0, heightM / 2, 0);
  outerBrush.updateMatrixWorld();

  const innerBrush = createBrush(
    new THREE.BoxGeometry(widthM - wt * 2, heightM - FLOOR_SLAB_THICKNESS, depthM - wt * 2),
    brickMaterial
  );
  innerBrush.position.set(0, heightM / 2 + FLOOR_SLAB_THICKNESS / 2, 0);
  innerBrush.updateMatrixWorld();

  // Remove the wall that attaches to existing building (open side)
  const openSideBrush = createBrush(
    new THREE.BoxGeometry(widthM - wt * 2, heightM + 1, wt * 2),
    brickMaterial
  );

  let openZ = 0;
  if (params.attachmentSide === "rear") {
    openZ = -depthM / 2;
  }
  openSideBrush.position.set(0, heightM / 2, openZ);
  openSideBrush.updateMatrixWorld();

  let shell = evaluator.evaluate(outerBrush, innerBrush, SUBTRACTION);
  shell = evaluator.evaluate(shell, openSideBrush, SUBTRACTION);

  return shell;
}

// Cut window and door openings from the wall shell
function cutOpenings(shell: Brush, params: CADExtensionParams): Brush {
  let result = shell;

  for (const win of params.windows) {
    const pos = getWindowWorldPos(win, params);
    const cutout = createOpeningCutout(
      pos.x,
      pos.y + params.heightM / 2 - params.heightM / 2, // adjust to wall shell coord
      pos.z,
      win.widthM,
      win.heightM,
      pos.throughDepth
    );
    // Offset Y to match wall shell position
    cutout.position.y = win.sillHeightM + win.heightM / 2;
    cutout.updateMatrixWorld();
    result = evaluator.evaluate(result, cutout, SUBTRACTION);
  }

  for (const door of params.doors) {
    const pos = getDoorWorldPos(door, params);
    const cutout = createOpeningCutout(
      pos.x,
      door.heightM / 2,
      pos.z,
      door.widthM,
      door.heightM,
      pos.throughDepth
    );
    result = evaluator.evaluate(result, cutout, SUBTRACTION);
  }

  return result;
}

// Generate glazing panes for windows and doors
function generateGlazing(params: CADExtensionParams): THREE.Group {
  const group = new THREE.Group();
  const glassThickness = 0.02;

  for (const win of params.windows) {
    const pos = getWindowWorldPos(win, params);
    const pane = new THREE.Mesh(
      new THREE.BoxGeometry(win.widthM - 0.08, win.heightM - 0.08, glassThickness),
      glassMaterial
    );
    pane.position.set(pos.x, win.sillHeightM + win.heightM / 2, pos.z);

    // Frame
    const frameGeo = new THREE.BoxGeometry(win.widthM, win.heightM, 0.04);
    const frame = new THREE.Mesh(frameGeo, frameMaterial);
    frame.position.copy(pane.position);
    // Hollow frame - just use the full frame as outline, glass shows through
    group.add(frame);
    group.add(pane);
  }

  for (const door of params.doors) {
    const pos = getDoorWorldPos(door, params);
    const pane = new THREE.Mesh(
      new THREE.BoxGeometry(door.widthM - 0.08, door.heightM - 0.08, glassThickness),
      glassMaterial
    );
    pane.position.set(pos.x, door.heightM / 2, pos.z);

    const frameGeo = new THREE.BoxGeometry(door.widthM, door.heightM, 0.04);
    const frame = new THREE.Mesh(frameGeo, frameMaterial);
    frame.position.copy(pane.position);
    group.add(frame);
    group.add(pane);
  }

  return group;
}

// Generate flat roof
function generateFlatRoof(params: CADExtensionParams): THREE.Mesh {
  const roofGeo = new THREE.BoxGeometry(
    params.widthM + ROOF_OVERHANG * 2,
    FLAT_ROOF_PARAPET_HEIGHT,
    params.depthM + ROOF_OVERHANG
  );
  const roof = new THREE.Mesh(roofGeo, flatRoofMaterial);
  roof.position.set(0, params.heightM + FLAT_ROOF_PARAPET_HEIGHT / 2, ROOF_OVERHANG / 2);
  return roof;
}

// Generate pitched roof using ExtrudeGeometry
function generatePitchedRoof(params: CADExtensionParams): THREE.Mesh {
  const pitch = (params.roofPitchDeg || DEFAULT_ROOF_PITCH_DEG) * (Math.PI / 180);
  const halfWidth = (params.widthM + ROOF_OVERHANG * 2) / 2;
  const ridgeHeight = Math.tan(pitch) * halfWidth;

  // Triangle profile for the gable
  const shape = new THREE.Shape();
  shape.moveTo(-halfWidth, 0);
  shape.lineTo(halfWidth, 0);
  shape.lineTo(0, ridgeHeight);
  shape.closePath();

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: params.depthM + ROOF_OVERHANG,
    bevelEnabled: false,
  };

  const roofGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  const roof = new THREE.Mesh(roofGeo, slateMaterial);
  // Position: top of walls, centered, extruded along Z
  roof.position.set(0, params.heightM, -(params.depthM + ROOF_OVERHANG) / 2);
  return roof;
}

// Generate hipped roof
function generateHippedRoof(params: CADExtensionParams): THREE.Group {
  const group = new THREE.Group();
  const pitch = (params.roofPitchDeg || DEFAULT_ROOF_PITCH_DEG) * (Math.PI / 180);
  const halfWidth = params.widthM / 2;
  const ridgeHeight = Math.tan(pitch) * halfWidth;
  const ridgeInset = ridgeHeight / Math.tan(pitch); // same as halfWidth for 45deg hips

  // Use a simple cone-like geometry approximation
  const vertices = new Float32Array([
    // base rectangle corners
    -halfWidth, 0, -params.depthM / 2,
    halfWidth, 0, -params.depthM / 2,
    halfWidth, 0, params.depthM / 2,
    -halfWidth, 0, params.depthM / 2,
    // ridge line (two points for longer extensions)
    -halfWidth + ridgeInset, ridgeHeight, 0,
    halfWidth - ridgeInset, ridgeHeight, 0,
  ]);

  const indices = [
    // front face
    0, 1, 4,
    1, 5, 4,
    // back face
    2, 3, 5,
    3, 4, 5,
    // left hip
    3, 0, 4,
    // right hip
    1, 2, 5,
  ];

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const roof = new THREE.Mesh(geo, slateMaterial);
  roof.position.set(0, params.heightM, 0);
  group.add(roof);
  return group;
}

// Generate roof based on type
function generateRoof(params: CADExtensionParams): THREE.Object3D {
  switch (params.roofType) {
    case "pitched":
      return generatePitchedRoof(params);
    case "hipped":
      return generateHippedRoof(params);
    case "flat":
    default:
      return generateFlatRoof(params);
  }
}

// Generate floor slab
function generateSlab(params: CADExtensionParams): THREE.Mesh {
  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(params.widthM, FLOOR_SLAB_THICKNESS, params.depthM),
    concreteMaterial
  );
  slab.position.set(0, FLOOR_SLAB_THICKNESS / 2, 0);
  return slab;
}

// Calculate extension position relative to existing property
export function getExtensionPosition(
  ext: CADExtensionParams,
  property: PropertyBaseParams
): THREE.Vector3 {
  const pos = new THREE.Vector3();

  switch (ext.attachmentSide) {
    case "rear":
      pos.z = property.depthM / 2 + ext.depthM / 2;
      pos.x = ext.offsetFromEdgeM;
      break;
    case "left":
      pos.x = -(property.widthM / 2 + ext.widthM / 2);
      pos.z = ext.offsetFromEdgeM;
      break;
    case "right":
      pos.x = property.widthM / 2 + ext.widthM / 2;
      pos.z = ext.offsetFromEdgeM;
      break;
  }

  return pos;
}

// ==========================================
// Main extension generator
// ==========================================

export function generateExtensionGeometry(params: CADExtensionParams): THREE.Group {
  const group = new THREE.Group();
  group.name = `extension-${params.type}`;

  // 1. Wall shell with openings
  let wallShell = generateWallShell(params);
  wallShell = cutOpenings(wallShell, params);

  // Convert final CSG result to regular mesh
  const wallMesh = new THREE.Mesh(wallShell.geometry, brickMaterial);
  wallMesh.castShadow = true;
  wallMesh.receiveShadow = true;
  group.add(wallMesh);

  // 2. Glazing
  const glazing = generateGlazing(params);
  group.add(glazing);

  // 3. Roof
  const roof = generateRoof(params);
  roof.castShadow = true;
  group.add(roof);

  // 4. Floor slab
  const slab = generateSlab(params);
  slab.receiveShadow = true;
  group.add(slab);

  return group;
}

// ==========================================
// Property base (existing building outline)
// ==========================================

export function generatePropertyBase(params: PropertyBaseParams): THREE.Group {
  const group = new THREE.Group();
  group.name = "property-base";

  const totalHeight = params.heightM * params.stories;

  // Semi-transparent box for existing building
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(params.widthM, totalHeight, params.depthM),
    existingBuildingMaterial
  );
  box.position.set(0, totalHeight / 2, 0);
  group.add(box);

  // Wireframe edges
  const edges = new THREE.EdgesGeometry(
    new THREE.BoxGeometry(params.widthM, totalHeight, params.depthM)
  );
  const wireframe = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color: 0x666666 })
  );
  wireframe.position.set(0, totalHeight / 2, 0);
  group.add(wireframe);

  return group;
}
