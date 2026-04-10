/**
 * Extract / review mode.
 *
 * Shows the uploaded source file next to the extracted canonical BIM so
 * the user can sanity-check the pipeline output before opening the BIM
 * viewer or the legacy editor.
 *
 * This page deliberately does NOT depend on the Pascal editor. It reads
 * `canonicalJson` from the floorplan record, falls back to nothing if it
 * is missing (for pre-migration rows), and surfaces the first set of
 * diagnostics the pipeline emitted.
 */

import { useMemo } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PageTransition } from "@/components/ui/page-transition";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";

import { fetchFloorplan } from "@/lib/api";
import { loadCanonicalBim } from "@/lib/bim";
import { BimModeSwitcher } from "@/components/bim/BimModeSwitcher";
import { BimPlanCanvas } from "@/components/bim/BimPlanCanvas";

export function FloorplanExtractPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const id = Number(params.id);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["floorplan", id],
    queryFn: () => fetchFloorplan(id),
    enabled: !!id,
  });

  const bimResult = useMemo(() => {
    if (!data?.canonicalJson) return null;
    return loadCanonicalBim(data.canonicalJson);
  }, [data?.canonicalJson]);

  const diagnostics = useMemo(() => {
    if (!data?.diagnosticsJson) return null;
    try {
      return JSON.parse(data.diagnosticsJson) as {
        generatedAt?: string;
        extractor?: string;
        totals?: Record<string, number>;
        scaleConfidence?: number;
        messages?: Array<{ stage: string; code: string; message: string }>;
      };
    } catch {
      return null;
    }
  }, [data?.diagnosticsJson]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0A0A0A] text-white/60">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading extraction…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0A0A0A] text-white/60">
        <div className="text-center">
          <p>Could not load this floorplan.</p>
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
              <p className="text-[11px] text-white/50">
                Extraction review · canonical BIM JSON
              </p>
            </div>
          </div>
          <BimModeSwitcher floorplanId={id} activeMode="extract" />
        </header>

        <main className="grid flex-1 grid-cols-12 gap-4 p-4">
          {/* Source file preview */}
          <section className="col-span-4 flex flex-col rounded-lg border border-white/10 bg-[#0C0C0F]">
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
              <h2 className="text-xs uppercase tracking-wider text-white/50">
                Source file
              </h2>
              {data.sourceFileUrl && (
                <Link
                  href={data.sourceFileUrl}
                  className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                >
                  <FileText className="h-3 w-3" /> open raw
                </Link>
              )}
            </div>
            <div className="relative flex-1 p-3">
              {data.sourceFileUrl ? (
                /\.pdf(\?|$)/i.test(data.sourceFileUrl) ? (
                  <object
                    data={data.sourceFileUrl}
                    type="application/pdf"
                    className="h-full w-full rounded bg-white/5"
                  >
                    <p className="p-4 text-xs text-white/60">
                      PDF preview not supported here — open the raw link.
                    </p>
                  </object>
                ) : (
                  <img
                    src={data.sourceFileUrl}
                    alt="uploaded floor plan"
                    className="h-full w-full rounded bg-white/5 object-contain"
                  />
                )
              ) : (
                <p className="text-xs text-white/40">
                  No source file on record yet.
                </p>
              )}
            </div>
          </section>

          {/* Extracted BIM plan */}
          <section className="col-span-5 flex flex-col rounded-lg border border-white/10 bg-[#0C0C0F]">
            <div className="border-b border-white/10 px-3 py-2">
              <h2 className="text-xs uppercase tracking-wider text-white/50">
                Canonical BIM (extracted)
              </h2>
            </div>
            <div className="flex-1 p-3">
              {bimResult && bimResult.bim ? (
                <BimPlanCanvas bim={bimResult.bim} style="extract" />
              ) : (
                <p className="text-xs text-white/40">
                  No canonical BIM on this record yet. Run the AI generator
                  from the legacy editor to produce one.
                </p>
              )}
            </div>
          </section>

          {/* Diagnostics */}
          <aside className="col-span-3 flex flex-col rounded-lg border border-white/10 bg-[#0C0C0F]">
            <div className="border-b border-white/10 px-3 py-2">
              <h2 className="text-xs uppercase tracking-wider text-white/50">
                Diagnostics
              </h2>
            </div>
            <div className="flex-1 space-y-3 overflow-auto p-3 text-xs">
              {diagnostics ? (
                <>
                  <div className="text-white/70">
                    Extractor:{" "}
                    <span className="text-white">
                      {diagnostics.extractor ?? "unknown"}
                    </span>
                  </div>
                  {diagnostics.generatedAt && (
                    <div className="text-white/50">
                      Generated{" "}
                      {new Date(diagnostics.generatedAt).toLocaleString()}
                    </div>
                  )}
                  {typeof diagnostics.scaleConfidence === "number" && (
                    <div className="text-white/70">
                      Scale confidence:{" "}
                      <span className="text-white">
                        {(diagnostics.scaleConfidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}
                  {diagnostics.messages && diagnostics.messages.length > 0 ? (
                    <ul className="space-y-1.5">
                      {diagnostics.messages.map((msg, i) => (
                        <li
                          key={i}
                          className="rounded border border-white/5 bg-white/5 p-2"
                        >
                          <div className="flex items-center justify-between text-[10px] uppercase text-white/40">
                            <span>{msg.stage}</span>
                            <span>{msg.code}</span>
                          </div>
                          <div className="text-white/80">{msg.message}</div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-white/40">
                      No diagnostics reported — clean extraction.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-white/40">
                  No pipeline diagnostics stored for this floorplan.
                </p>
              )}
            </div>
          </aside>
        </main>

      </div>
    </PageTransition>
  );
}
