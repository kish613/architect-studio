import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useDropzone } from "react-dropzone";
import { Upload as UploadIcon, FileUp, Loader2, ArrowRight } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFloorplanStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";

export function Upload() {
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [, setLocation] = useLocation();
  const { createMockProject } = useFloorplanStore();
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles?.[0]) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    maxFiles: 1
  });

  const handleUpload = async () => {
    if (!file) return;

    try {
      setIsUploading(true);
      // Simulate processing time
      const projectId = await createMockProject(name || "Untitled Project", file);
      
      toast({
        title: "Project Created",
        description: "Your floorplan is being processed into 3D.",
      });

      // Navigate to the new project
      setLocation(`/projects/${projectId}`);
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-display font-bold mb-4">Upload Floorplan</h1>
          <p className="text-muted-foreground text-lg">
            Import your 2D design to start the 3D transformation engine.
          </p>
        </div>

        <div className="space-y-8">
          <div className="space-y-2">
            <Label htmlFor="project-name">Project Name (Optional)</Label>
            <Input 
              id="project-name" 
              placeholder="e.g. Downtown Apartment" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-card border-white/10 h-12"
            />
          </div>

          <Card className={`border-2 border-dashed transition-colors cursor-pointer bg-card/30 ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
            <CardContent className="p-0">
              <div {...getRootProps()} className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <input {...getInputProps()} />
                
                {file ? (
                  <div className="relative w-full max-w-xs aspect-video bg-black/50 rounded-lg overflow-hidden mb-4 border border-border">
                    <img 
                      src={URL.createObjectURL(file)} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                      <p className="text-white font-medium">Click to change</p>
                    </div>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <FileUp className="w-10 h-10 text-primary" />
                  </div>
                )}

                <h3 className="text-xl font-medium mb-2">
                  {file ? file.name : "Drag & drop your floorplan"}
                </h3>
                <p className="text-muted-foreground mb-6 max-w-sm">
                  {file ? "Ready to upload" : "Supports JPG, PNG, WEBP up to 10MB"}
                </p>

                {!file && (
                  <Button variant="secondary" className="pointer-events-none">
                    Select File
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Button 
            onClick={handleUpload} 
            disabled={!file || isUploading}
            className="w-full h-14 text-lg bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing AI Model...
              </>
            ) : (
              <>
                Generate 3D World
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
