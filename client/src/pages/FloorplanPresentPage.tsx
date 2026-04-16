/**
 * Presentation mode — read-only 3D canonical BIM for client-facing views.
 */

import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PageTransition } from "@/components/ui/page-transition";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

import { fetchFloorplan } from "@/lib/api";
import { BimModeSwitcher } from "@/components/bim/BimModeSwitcher";
import { BimR3FCanvas } from "@/components/bim-viewer/BimR3FCanvas";
import { EnvironmentPresetPicker } from "@/components/viewer/EnvironmentPresetPicker";
import { useBimScene } from "@/stores/use-bim-scene";

export function FloorplanPresentPage() {
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

  useEffect(() => {
    if (data?.canonicalJson) {
      loadFromCanonicalJson(data.canonicalJson, data.id);
    }
  }, [data?.canonicalJson, data?.id, loadFromCanonicalJson]);

  const [activeLevelId, setActiveLevelId] = useState<string | null>(null);
  const activeLevel =
    bim.levels.find((l) => l.id === activeLevelId) ?? bim.levels[0] ?? null;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAFAF7] text-neutral-700">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading presentation…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAFAF7] text-neutral-700">
        <div className="text-center">
          <p>Presentation unavailable for this floorplan.</p>
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
              <p className="text-[11px] text-white/50">Presentation mode (3D)</p>
            </div>
          </div>
          <BimModeSwitcher floorplanId={id} activeMode="present" />
        </header>

        <main className="flex flex-1 flex-col gap-3 p-6">
          <div className="flex items-center justify-center gap-1">
            {bim.levels.map((lvl) => (
              <button
                key={lvl.id}
                type="button"
                onClick={() => setActiveLevelId(lvl.id)}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  (activeLevel?.id ?? null) === lvl.id
                    ? "bg-white text-neutral-900"
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}
              >
                {lvl.name ?? `Level ${lvl.index}`}
              </button>
            ))}
          </div>
          <div className="flex justify-center">
            <EnvironmentPresetPicker />
          </div>
          <div className="min-h-0 flex-1 rounded-xl border border-white/10 bg-[#111114] p-2">
            {data.canonicalJson ? (
              <BimR3FCanvas
                mode="present"
                className="h-full min-h-[480px] rounded-lg"
                sceneProps={{ activeLevelId: activeLevel?.id ?? null }}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-white/40">
                No presentation data available for this floorplan yet.
              </div>
            )}
          </div>
        </main>
      </div>
    </PageTransition>
  );
}
