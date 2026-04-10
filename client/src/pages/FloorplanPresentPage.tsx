/**
 * Presentation mode.
 *
 * A cleaner, client-facing view of the canonical BIM model. This is the
 * surface a user would share with their client — the chrome is minimal,
 * the colours are muted, and the BIM metadata panel is hidden.
 *
 * The renderer is intentionally a read-only SVG plan for now, mirroring
 * what the BIM mode shows in "technical" style but with the "clean"
 * style variant. When the dedicated Fragments/GLB-backed 3D viewer is
 * wired in, it slots into the same central `main` region.
 */

import { useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PageTransition } from "@/components/ui/page-transition";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

import { fetchFloorplan } from "@/lib/api";
import { loadCanonicalBim } from "@/lib/bim";
import { BimModeSwitcher } from "@/components/bim/BimModeSwitcher";
import { BimPlanCanvas } from "@/components/bim/BimPlanCanvas";

export function FloorplanPresentPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const id = Number(params.id);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["floorplan", id],
    queryFn: () => fetchFloorplan(id),
    enabled: !!id,
  });

  const bim = useMemo(() => {
    if (!data?.canonicalJson) return null;
    return loadCanonicalBim(data.canonicalJson).bim;
  }, [data?.canonicalJson]);

  const [activeLevelId, setActiveLevelId] = useState<string | null>(null);
  const activeLevel = useMemo(() => {
    if (!bim) return null;
    return (
      bim.levels.find((l) => l.id === activeLevelId) ?? bim.levels[0] ?? null
    );
  }, [bim, activeLevelId]);

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
          <Button
            variant="outline"
            className="mt-3"
            onClick={() => navigate("/projects")}
          >
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/projects")}
            >
              <ArrowLeft className="mr-1 h-4 w-4" /> Projects
            </Button>
            <div>
              <h1 className="text-sm font-semibold">{data.name}</h1>
              <p className="text-[11px] text-white/50">Presentation mode</p>
            </div>
          </div>
          <BimModeSwitcher floorplanId={id} activeMode="present" />
        </header>

        <main className="flex flex-1 flex-col gap-3 p-6">
          <div className="flex items-center justify-center gap-1">
            {bim?.levels.map((lvl) => (
              <button
                key={lvl.id}
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
          <div className="flex-1 rounded-xl border border-white/10 bg-[#111114] p-4">
            {bim ? (
              <BimPlanCanvas
                bim={bim}
                style="clean"
                levelId={activeLevel?.id ?? null}
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
