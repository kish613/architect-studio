import { useState, useCallback } from "react";
import { Camera, RotateCw, Focus, Download } from "lucide-react";
import { EnvironmentPresetPicker } from "./EnvironmentPresetPicker";
import { useViewer } from "@/stores/use-viewer";

// ─────────────────────────────────────────────────────────────
// Screenshot helper
// ─────────────────────────────────────────────────────────────

function captureScreenshot() {
  const canvas = document.querySelector("canvas");
  if (!canvas) return;
  const link = document.createElement("a");
  link.download = `archstudio-${Date.now()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

// ─────────────────────────────────────────────────────────────
// Toolbar segment separator
// ─────────────────────────────────────────────────────────────

function Divider() {
  return <div className="w-px h-6 bg-black/10" />;
}

// ─────────────────────────────────────────────────────────────
// DOF controls
// ─────────────────────────────────────────────────────────────

function DofControls() {
  const dofEnabled = useViewer((s) => s.dofEnabled);
  const setDofEnabled = useViewer((s) => s.setDofEnabled);
  const dofFocusDistance = useViewer((s) => s.dofFocusDistance);
  const setDofFocusDistance = useViewer((s) => s.setDofFocusDistance);
  const budget = useViewer((s) => s.performanceBudget);

  // If the performance budget disables DOF, don't show this control
  if (budget && !budget.enableDof) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setDofEnabled(!dofEnabled)}
        className={`p-1.5 rounded-lg transition-all ${
          dofEnabled
            ? "bg-amber-500/20 text-amber-600"
            : "text-gray-400 hover:text-gray-600 hover:bg-black/5"
        }`}
        title={dofEnabled ? "Disable depth of field" : "Enable depth of field"}
      >
        <Focus size={14} />
      </button>
      {dofEnabled && (
        <input
          type="range"
          min={0.001}
          max={0.1}
          step={0.001}
          value={dofFocusDistance}
          onChange={(e) => setDofFocusDistance(parseFloat(e.target.value))}
          className="w-16 h-1 accent-amber-500 cursor-pointer"
          title={`Focus distance: ${dofFocusDistance.toFixed(3)}`}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Auto-rotate control
// ─────────────────────────────────────────────────────────────

function AutoRotateControl() {
  const autoRotateSpeed = useViewer((s) => s.autoRotateSpeed);
  const setAutoRotateSpeed = useViewer((s) => s.setAutoRotateSpeed);
  const isActive = autoRotateSpeed > 0;

  const toggle = useCallback(() => {
    setAutoRotateSpeed(isActive ? 0 : 0.3);
  }, [isActive, setAutoRotateSpeed]);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggle}
        className={`p-1.5 rounded-lg transition-all ${
          isActive
            ? "bg-amber-500/20 text-amber-600"
            : "text-gray-400 hover:text-gray-600 hover:bg-black/5"
        }`}
        title={isActive ? "Stop auto-rotate" : "Start auto-rotate"}
      >
        <RotateCw size={14} />
      </button>
      {isActive && (
        <input
          type="range"
          min={0.1}
          max={2}
          step={0.1}
          value={autoRotateSpeed}
          onChange={(e) => setAutoRotateSpeed(parseFloat(e.target.value))}
          className="w-16 h-1 accent-amber-500 cursor-pointer"
          title={`Speed: ${autoRotateSpeed.toFixed(1)}`}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main toolbar
// ─────────────────────────────────────────────────────────────

export function PresentationToolbar() {
  const [screenshotFlash, setScreenshotFlash] = useState(false);

  const handleScreenshot = useCallback(() => {
    captureScreenshot();
    setScreenshotFlash(true);
    setTimeout(() => setScreenshotFlash(false), 300);
  }, []);

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg border border-black/5">
      {/* Environment presets */}
      <EnvironmentPresetPicker />

      <Divider />

      {/* DOF toggle + slider */}
      <DofControls />

      <Divider />

      {/* Auto-rotate */}
      <AutoRotateControl />

      <Divider />

      {/* Screenshot */}
      <button
        onClick={handleScreenshot}
        className={`p-1.5 rounded-lg transition-all ${
          screenshotFlash
            ? "bg-green-500/20 text-green-600"
            : "text-gray-400 hover:text-gray-600 hover:bg-black/5"
        }`}
        title="Capture screenshot"
      >
        <Download size={14} />
      </button>
    </div>
  );
}
