// Re-export the shared singleton so both Pascal Viewer and app code
// use the same Three.js object ↔ node ID registry.
export { sceneRegistry } from "@/lib/pascal/scene-registry";
