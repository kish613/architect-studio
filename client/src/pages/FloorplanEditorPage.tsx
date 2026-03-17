import { useEffect, lazy, Suspense } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PageTransition } from "@/components/ui/page-transition";
import { useScene } from "@/stores/use-scene";
import { fetchFloorplan } from "@/lib/api";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const FloorplanEditor = lazy(() =>
  import(
    /* webpackChunkName: "floorplan-editor" */
    /* vite-chunk-name: "floorplan-editor" */
    "@/components/editor/FloorplanEditor"
  ).then((m) => ({ default: m.FloorplanEditor }))
);

function EditorLoadingFallback() {
  return (
    <div className="flex items-center justify-center h-screen bg-[#0A0A0A]">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
        <p className="text-white/60 text-sm">Loading floorplan editor...</p>
      </div>
    </div>
  );
}

export function FloorplanEditorPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const id = Number(params.id);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["floorplan", id],
    queryFn: () => fetchFloorplan(id),
    enabled: !!id,
  });

  const { setFloorplanId, loadScene } = useScene();

  useEffect(() => {
    if (!data) return;
    setFloorplanId(data.id);
    loadScene(JSON.parse(data.sceneData));
  }, [data, setFloorplanId, loadScene]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0A0A0A]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-white/60 text-sm">Loading floorplan editor...</p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0A0A0A]">
        <div className="text-center">
          <p className="text-white/60 text-sm mb-4">Floorplan not found</p>
          <Button onClick={() => navigate("/projects")} variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <Suspense fallback={<EditorLoadingFallback />}>
        <FloorplanEditor floorplanId={data.id} floorplanName={data.name} />
      </Suspense>
    </PageTransition>
  );
}
