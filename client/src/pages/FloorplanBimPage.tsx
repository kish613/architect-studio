/**
 * BIM / technical mode — full 3D canonical BIM viewer with layer toggles.
 */

import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PageTransition } from "@/components/ui/page-transition";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Layers3, Loader2 } from "lucide-react";

import { fetchFloorplan } from "@/lib/api";
import { BimModeSwitcher } from "@/components/bim/BimModeSwitcher";
import { BimR3FCanvas } from "@/components/bim-viewer/BimR3FCanvas";
import { BimObjectPanel } from "@/components/bim/BimObjectPanel";
import { useBimScene } from "@/stores/use-bim-scene";
import { useViewer } from "@/stores/use-viewer";
import { useBimAutoSave } from "@/hooks/use-bim-auto-save";

type Layer = "walls" | "rooms" | "openings" | "furniture";

const DEFAULT_LAYERS: Record<Layer, boolean> = {
  walls: true,
  rooms: true,
  openings: true,
  furniture: true,
};

export function FloorplanBimPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const id = Number(params.id);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["floorplan", id],
    queryFn: () => fetchFloorplan(id),
    enabled: !!id,
  });

  const bim = useBimScene((s) => s.bim);
  const loadFromCanonicalJson = useBimScene((s) => s.loadFromCanonicalJson);
  const resetBim = useBimScene((s) => s.reset);
  const setFloorplanId = useBimScene((s) => s.setFloorplanId);
  const setActiveLevel = useViewer((s) => s.setActiveLevel);

  useBimAutoSave();

  useEffect(() => {
    if (data?.canonicalJson) {
      loadFromCanonicalJson(data.canonicalJson, data.id);
      setFloorplanId(data.id);
      const first = useBimScene.getState().bim.levels[0];
      if (first) setActiveLevel(first.id);
    } else {
      resetBim();
      setFloorplanId(null);
    }
  }, [
    data?.canonicalJson,
    data?.id,
    loadFromCanonicalJson,
    resetBim,
    setActiveLevel,
    setFloorplanId,
  ]);

  const [activeLevelId, setActiveLevelId] = useState<string | null>(null);
  const [layers, setLayers] = useState<Record<Layer, boolean>>(DEFAULT_LAYERS);

  const activeLevel =
    bim.levels.find((l) => l.id === activeLevelId) ?? bim.levels[0] ?? null;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0A0A0A] text-white/60">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading BIM model…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0A0A0A] text-white/60">
        <div className="text-center">
          <p>Could not load this BIM model.</p>
          <Button variant="outline" className="mt-3" onClick={() => navigate("/projects")}>
            Back to projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="flex h-screen flex-col bg-[#0A0A0A] text-white">
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/projects")}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Projects
            </Button>
            <div>
              <h1 className="text-sm font-semibold">{data.name}</h1>
              <p className="flex items-center gap-1.5 text-[11px] text-white/50">
                <Layers3 className="h-3 w-3" />
                BIM technical viewer (3D)
              </p>
            </div>
          </div>
          <BimModeSwitcher floorplanId={id} activeMode="bim" />
        </header>

        <main className="grid flex-1 grid-cols-12 gap-4 p-4">
          <aside className="col-span-3 flex flex-col rounded-lg border border-white/10 bg-[#0C0C0F]">
            <div className="border-b border-white/10 px-3 py-2">
              <h2 className="text-xs uppercase tracking-wider text-white/50">Levels</h2>
            </div>
            <div className="space-y-1 p-3">
              {bim.levels.length ? (
                bim.levels.map((lvl) => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => {
                      setActiveLevelId(lvl.id);
                      setActiveLevel(lvl.id);
                    }}
                    className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                      (activeLevel?.id ?? null) === lvl.id
                        ? "bg-primary/20 text-white"
                        : "text-white/70 hover:bg-white/5"
                    }`}
                  >
                    <span>{lvl.name ?? `Level ${lvl.index}`}</span>
                    <span className="text-[10px] text-white/40">elev {lvl.elevation.toFixed(1)} m</span>
                  </button>
                ))
              ) : (
                <p className="text-xs text-white/40">No levels loaded.</p>
              )}
            </div>

            <div className="border-t border-white/10 px-3 py-2">
              <h2 className="text-xs uppercase tracking-wider text-white/50">Layers</h2>
            </div>
            <div className="space-y-1 p-3">
              {(Object.keys(layers) as Layer[]).map((layer) => (
                <label
                  key={layer}
                  className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1 text-xs text-white/70 hover:bg-white/5"
                >
                  <span>{layer}</span>
                  <input
                    type="checkbox"
                    checked={layers[layer]}
                    onChange={(e) =>
                      setLayers((prev) => ({
                        ...prev,
                        [layer]: e.target.checked,
                      }))
                    }
                    className="accent-primary"
                  />
                </label>
              ))}
            </div>

            <div className="mt-auto border-t border-white/10 p-3 text-[10px] text-white/40">
              <p className="mb-1">Derived assets</p>
              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary" className="bg-white/5 text-white/70">
                  IFC{" "}
                  {data.ifcUrl ? (
                    <span className="ml-1 text-emerald-400">ready</span>
                  ) : (
                    <span className="ml-1 text-white/40">pending</span>
                  )}
                </Badge>
                <Badge variant="secondary" className="bg-white/5 text-white/70">
                  Fragments{" "}
                  {data.fragmentsUrl ? (
                    <span className="ml-1 text-emerald-400">ready</span>
                  ) : (
                    <span className="ml-1 text-white/40">pending</span>
                  )}
                </Badge>
                <Badge variant="secondary" className="bg-white/5 text-white/70">
                  GLB{" "}
                  {data.glbUrl ? (
                    <span className="ml-1 text-emerald-400">ready</span>
                  ) : (
                    <span className="ml-1 text-white/40">pending</span>
                  )}
                </Badge>
              </div>
            </div>
          </aside>

          <section className="col-span-6 flex flex-col rounded-lg border border-white/10 bg-[#0C0C0F]">
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
              <h2 className="text-xs uppercase tracking-wider text-white/50">
                3D — {activeLevel?.name ?? "all levels"}
              </h2>
              <span className="text-[11px] text-white/40">Orbit · scroll zoom · shift-drag pan</span>
            </div>
            <div className="min-h-0 flex-1 p-0">
              {data.canonicalJson ? (
                <BimR3FCanvas
                  mode="bim"
                  className="h-full min-h-[400px] rounded-b-md"
                  sceneProps={{
                    layers: {
                      walls: layers.walls,
                      rooms: layers.rooms,
                      openings: layers.openings,
                      furniture: layers.furniture,
                      slabs: true,
                      ceilings: true,
                      roofs: true,
                      stairs: true,
                      columns: true,
                    },
                    activeLevelId: activeLevel?.id ?? null,
                  }}
                />
              ) : (
                <div className="flex h-full min-h-[320px] items-center justify-center text-xs text-white/40">
                  No canonical BIM loaded yet.
                </div>
              )}
            </div>
          </section>

          <div className="col-span-3">
            {data.canonicalJson && bim.levels.length > 0 ? (
              <BimObjectPanel bim={bim} />
            ) : (
              <div className="flex h-full items-center justify-center rounded-lg border border-white/10 bg-[#0C0C0F] p-4 text-xs text-white/40">
                No BIM metadata yet.
              </div>
            )}
          </div>
        </main>
      </div>
    </PageTransition>
  );
}
