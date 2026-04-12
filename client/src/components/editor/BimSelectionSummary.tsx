import { useViewer } from "@/stores/use-viewer";
import { useBimScene } from "@/stores/use-bim-scene";

export function BimSelectionSummary() {
  const selectedIds = useViewer((s) => s.selectedIds);
  const bim = useBimScene((s) => s.bim);

  if (selectedIds.length === 0) {
    return (
      <p className="p-3 text-xs text-white/45">
        Select walls, furniture, or other elements in the 3D view. Use{" "}
        <kbd className="rounded bg-white/10 px-1">W</kbd> for wall tool and{" "}
        <kbd className="rounded bg-white/10 px-1">V</kbd> for select.
      </p>
    );
  }

  const id = selectedIds[0]!;
  const hit =
    bim.walls.find((w) => w.id === id) ??
    bim.doors.find((d) => d.id === id) ??
    bim.windows.find((w) => w.id === id) ??
    bim.furniture.find((f) => f.id === id) ??
    bim.fixtures.find((f) => f.id === id) ??
    bim.rooms.find((r) => r.id === id) ??
    bim.slabs.find((s) => s.id === id) ??
    null;

  const label = hit
    ? `${"kind" in hit ? hit.kind : "element"} · ${hit.name ?? id.slice(0, 8)}`
    : `id: ${id.slice(0, 8)}…`;

  return (
    <div className="space-y-2 p-3">
      <h3 className="text-xs font-medium uppercase tracking-wider text-white/50">Selection</h3>
      <p className="text-sm text-white/90">{label}</p>
      <p className="text-[11px] text-white/40">
        Full BIM property editing UI is coming soon — drag handles and keyboard shortcuts work today.
      </p>
    </div>
  );
}
