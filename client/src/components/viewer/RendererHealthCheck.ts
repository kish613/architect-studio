export const RENDERER_KEY = "architect-studio-renderer";
export type RendererType = "pascal" | "r3f";

export function getPreferredRenderer(): RendererType {
  const stored = localStorage.getItem(RENDERER_KEY);
  if (stored === "pascal" || stored === "r3f") return stored;
  return "pascal";
}

export function setPreferredRenderer(renderer: RendererType): void {
  localStorage.setItem(RENDERER_KEY, renderer);
}
