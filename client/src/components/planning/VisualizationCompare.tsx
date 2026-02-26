import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, ZoomIn, ZoomOut, Expand, Home, FileText, ArrowLeftRight } from "lucide-react";
import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch";
import type { PlanningAnalysis } from "@/lib/api";

const ViewZoomControls = () => {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  return (
    <div className="absolute top-2 right-2 flex gap-1 z-50 bg-black/60 backdrop-blur-md p-1 rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
      <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/20" onClick={() => zoomIn()}>
        <ZoomIn className="w-3 h-3" />
      </Button>
      <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/20" onClick={() => zoomOut()}>
        <ZoomOut className="w-3 h-3" />
      </Button>
      <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/20" onClick={() => resetTransform()}>
        <Expand className="w-3 h-3" />
      </Button>
    </div>
  );
};

interface VisualizationCompareProps {
  analysis: PlanningAnalysis;
}

export function VisualizationCompare({ analysis }: VisualizationCompareProps) {
  const formatModificationType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold">Visualization Results</h2>
          <p className="text-muted-foreground">
            {analysis.selectedModification && formatModificationType(analysis.selectedModification)} visualization
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {analysis.status === 'completed' ? 'Complete' : 'Processing...'}
        </Badge>
      </div>

      <Tabs defaultValue="exterior" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="exterior" className="flex items-center gap-2">
            <Home className="w-4 h-4" />
            Exterior View
          </TabsTrigger>
          <TabsTrigger value="floorplan" className="flex items-center gap-2" disabled={!analysis.floorplanUrl}>
            <FileText className="w-4 h-4" />
            Floor Plan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="exterior">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Original Property */}
            <Card className="border border-white/20 bg-white/5 backdrop-blur-xl rounded-2xl overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                  Original Property
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="relative aspect-[4/3] group">
                  <TransformWrapper centerOnInit minScale={0.5} maxScale={4}>
                    <ViewZoomControls />
                    <TransformComponent wrapperClass="w-full h-full" contentClass="w-full h-full">
                      <img
                        src={analysis.propertyImageUrl}
                        alt="Original property"
                        className="w-full h-full object-cover cursor-grab active:cursor-grabbing"
                      />
                    </TransformComponent>
                  </TransformWrapper>
                </div>
              </CardContent>
            </Card>

            {/* Generated Visualization */}
            <Card className="border border-primary/30 bg-primary/5 backdrop-blur-xl rounded-2xl overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  With {analysis.selectedModification && formatModificationType(analysis.selectedModification)}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="relative aspect-[4/3] group">
                  {analysis.generatedExteriorUrl ? (
                    <>
                      <TransformWrapper centerOnInit minScale={0.5} maxScale={4}>
                        <ViewZoomControls />
                        <TransformComponent wrapperClass="w-full h-full" contentClass="w-full h-full">
                          <img
                            src={analysis.generatedExteriorUrl}
                            alt="Modified property visualization"
                            className="w-full h-full object-cover cursor-grab active:cursor-grabbing"
                          />
                        </TransformComponent>
                      </TransformWrapper>
                      <div className="absolute bottom-3 right-3 flex gap-2 z-50">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="backdrop-blur-md bg-black/40"
                          onClick={() => handleDownload(analysis.generatedExteriorUrl!, `property-${analysis.selectedModification}.png`)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted/20">
                      <p className="text-muted-foreground">Generating...</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Comparison Overlay View */}
          <Card className="mt-6 border border-white/20 bg-white/5 backdrop-blur-xl rounded-2xl overflow-hidden">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4" />
                Side-by-Side Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative aspect-[21/9] rounded-xl overflow-hidden">
                <div className="absolute inset-0 flex">
                  <div className="w-1/2 relative overflow-hidden">
                    <img
                      src={analysis.propertyImageUrl}
                      alt="Original"
                      className="absolute inset-0 w-[200%] h-full object-cover object-left"
                    />
                    <div className="absolute bottom-2 left-2">
                      <Badge variant="secondary" className="backdrop-blur-md bg-black/60">
                        Before
                      </Badge>
                    </div>
                  </div>
                  <div className="w-px bg-white/50 z-10" />
                  <div className="w-1/2 relative overflow-hidden">
                    {analysis.generatedExteriorUrl ? (
                      <img
                        src={analysis.generatedExteriorUrl}
                        alt="Modified"
                        className="absolute inset-0 w-[200%] h-full object-cover object-right"
                        style={{ marginLeft: '-100%' }}
                      />
                    ) : (
                      <div className="w-full h-full bg-muted/20 flex items-center justify-center">
                        <p className="text-muted-foreground text-sm">Processing...</p>
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2">
                      <Badge className="backdrop-blur-md bg-primary/80">
                        After
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="floorplan">
          {analysis.floorplanUrl && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Original Floorplan */}
              <Card className="border border-white/20 bg-white/5 backdrop-blur-xl rounded-2xl overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                    Original Floor Plan
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="relative aspect-[4/3] bg-white/5 border-t border-white/5 group">
                    <TransformWrapper centerOnInit minScale={0.5} maxScale={4}>
                      <ViewZoomControls />
                      <TransformComponent wrapperClass="w-full h-full" contentClass="w-full h-full p-4">
                        <img
                          src={analysis.floorplanUrl}
                          alt="Original floor plan"
                          className="w-full h-full object-contain cursor-grab active:cursor-grabbing"
                        />
                      </TransformComponent>
                    </TransformWrapper>
                  </div>
                </CardContent>
              </Card>

              {/* Modified Floorplan */}
              <Card className="border border-primary/30 bg-primary/5 backdrop-blur-xl rounded-2xl overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    Modified Floor Plan
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="relative aspect-[4/3] bg-white/5 border-t border-white/5 group">
                    {analysis.generatedFloorplanUrl ? (
                      <>
                        <TransformWrapper centerOnInit minScale={0.5} maxScale={4}>
                          <ViewZoomControls />
                          <TransformComponent wrapperClass="w-full h-full" contentClass="w-full h-full p-4">
                            <img
                              src={analysis.generatedFloorplanUrl}
                              alt="Modified floor plan"
                              className="w-full h-full object-contain cursor-grab active:cursor-grabbing"
                            />
                          </TransformComponent>
                        </TransformWrapper>
                        <div className="absolute bottom-3 right-3 flex gap-2 z-50">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="backdrop-blur-md bg-black/40"
                            onClick={() => handleDownload(analysis.generatedFloorplanUrl!, `floorplan-${analysis.selectedModification}.png`)}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted/20">
                        <p className="text-muted-foreground">
                          {analysis.status === 'generating' ? 'Generating...' : 'Not generated'}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
