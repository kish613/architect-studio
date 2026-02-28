import * as THREE from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";

export function exportSTL(group: THREE.Group, filename: string = "extension-model.stl"): void {
  const exporter = new STLExporter();

  // Create a temporary scene containing the group
  const scene = new THREE.Scene();
  const clone = group.clone(true);
  scene.add(clone);

  const result = exporter.parse(scene, { binary: true });

  const blob = new Blob([result], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
