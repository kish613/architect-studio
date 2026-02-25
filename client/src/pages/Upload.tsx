import { useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { useDropzone } from "react-dropzone";
import { Upload as UploadIcon, FileUp, Loader2, ArrowRight } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createProject, uploadFloorplan } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/ui/page-transition";
import uploadBgVideo from "@assets/kish613_a_floorplan_morphing_from_a_regular_2d_drawing_and_gr__1765912738462.mp4";

export function Upload() {
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Sign up required",
        description: "Create a free account to start transforming floorplans into 3D models.",
      });
      setTimeout(() => {
        window.location.href = "/api/auth/login";
      }, 500);
    }
  }, [isAuthenticated, isLoading, toast]);

  const createProjectMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('No file selected');
      
      // Create project first
      const project = await createProject(name || "Untitled Project");
      
      // Then upload the floorplan
      await uploadFloorplan(project.id, file);
      
      return project;
    },
    onSuccess: (project) => {
      toast({
        title: "Project Created",
        description: "Your floorplan is being processed into 3D.",
      });
      
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setLocation(`/projects/${project.id}`);
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Something went wrong.",
        variant: "destructive"
      });
    }
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles?.[0]) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1
  });

  const handleUpload = () => {
    createProjectMutation.mutate();
  };

  // Show loading state while checking auth
  if (isLoading || !isAuthenticated) {
    return (
      <Layout>
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 bg-black/70 z-10" />
          <video 
            autoPlay 
            loop 
            muted 
            playsInline
            className="w-full h-full object-cover"
          >
            <source src={uploadBgVideo} type="video/mp4" />
          </video>
        </div>
        <div className="container relative z-10 mx-auto px-4 py-12 max-w-2xl pt-32 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Redirecting to sign up...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Video Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-black/70 z-10" />
        {/* Vignette overlay */}
        <div className="absolute inset-0 z-20 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)' }} />
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        >
          <source src={uploadBgVideo} type="video/mp4" />
        </video>
      </div>

      <PageTransition>
        <div className="container relative z-10 mx-auto px-4 py-12 max-w-2xl pt-32">
          <motion.div
            className="mb-8 text-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <h1 className="text-4xl font-display font-bold mb-4">Upload Floorplan</h1>
            <div className="h-1 w-16 bg-gradient-to-r from-primary to-primary/40 rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">
              Import your 2D design to start the 3D transformation engine.
            </p>
          </motion.div>

          <div className="space-y-8">
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
            >
              <Label htmlFor="project-name">Project Name (Optional)</Label>
              <Input
                id="project-name"
                placeholder="e.g. Downtown Apartment"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-card border-white/10 h-12"
                data-testid="input-project-name"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
            >
              <Card className={`border border-white/20 transition-all duration-300 cursor-pointer bg-white/10 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] ${isDragActive ? 'border-primary bg-primary/20 ring-2 ring-primary/30 ring-offset-2 ring-offset-transparent' : 'hover:border-white/30 hover:bg-white/15'}`}>
                <CardContent className="p-0">
                  <div {...getRootProps()} className="flex flex-col items-center justify-center py-20 px-4 text-center" data-testid="dropzone-upload">
                    <input {...getInputProps()} />

                    {file ? (
                      <div className="relative w-full max-w-xs aspect-video bg-black/50 rounded-xl overflow-hidden mb-4 border border-border">
                        {file.type === 'application/pdf' ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <FileUp className="w-12 h-12 text-primary" />
                          </div>
                        ) : (
                          <img
                            src={URL.createObjectURL(file)}
                            alt="Preview"
                            className="w-full h-full object-cover"
                            data-testid="img-preview"
                          />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-xl">
                          <p className="text-white font-medium">Click to change</p>
                        </div>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                        <FileUp className="w-10 h-10 text-primary floating-animation" />
                      </div>
                    )}

                    <h3 className="text-xl font-medium mb-2">
                      {file ? file.name : "Drag & drop your floorplan"}
                    </h3>
                    <p className="text-muted-foreground mb-6 max-w-sm">
                      {file ? "Ready to upload" : "Supports JPG, PNG, WEBP, PDF up to 20MB"}
                    </p>

                    {!file && (
                      <Button variant="secondary" className="pointer-events-none">
                        Select File
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
            >
              <Button
                onClick={handleUpload}
                disabled={!file || createProjectMutation.isPending}
                className="w-full h-14 text-lg bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 transition-all duration-300"
                data-testid="button-upload"
              >
                {createProjectMutation.isPending ? (
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
            </motion.div>
          </div>
        </div>
      </PageTransition>
    </Layout>
  );
}
