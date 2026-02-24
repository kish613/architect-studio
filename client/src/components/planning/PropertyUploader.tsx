import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Image, FileText, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PropertyUploaderProps {
  propertyImage: File | null;
  floorplan: File | null;
  onPropertyImageChange: (file: File | null) => void;
  onFloorplanChange: (file: File | null) => void;
}

export function PropertyUploader({
  propertyImage,
  floorplan,
  onPropertyImageChange,
  onFloorplanChange,
}: PropertyUploaderProps) {
  const [propertyPreview, setPropertyPreview] = useState<string | null>(null);
  const [floorplanPreview, setFloorplanPreview] = useState<string | null>(null);

  const onPropertyDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles?.[0]) {
      const file = acceptedFiles[0];
      onPropertyImageChange(file);
      setPropertyPreview(URL.createObjectURL(file));
    }
  }, [onPropertyImageChange]);

  const onFloorplanDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles?.[0]) {
      const file = acceptedFiles[0];
      onFloorplanChange(file);
      setFloorplanPreview(URL.createObjectURL(file));
    }
  }, [onFloorplanChange]);

  const { getRootProps: getPropertyRootProps, getInputProps: getPropertyInputProps, isDragActive: isPropertyDragActive } = useDropzone({
    onDrop: onPropertyDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    maxFiles: 1
  });

  const { getRootProps: getFloorplanRootProps, getInputProps: getFloorplanInputProps, isDragActive: isFloorplanDragActive } = useDropzone({
    onDrop: onFloorplanDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    maxFiles: 1
  });

  const clearPropertyImage = () => {
    onPropertyImageChange(null);
    setPropertyPreview(null);
  };

  const clearFloorplan = () => {
    onFloorplanChange(null);
    setFloorplanPreview(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Property Image Upload */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <Image className="w-4 h-4" />
          Property Photo <span className="text-red-500">*</span>
        </label>
        <Card className={`border border-white/20 transition-colors bg-white/10 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] ${isPropertyDragActive ? 'border-primary bg-primary/20' : 'hover:border-white/30 hover:bg-white/15'}`}>
          <CardContent className="p-0">
            {propertyPreview ? (
              <div className="relative aspect-[4/3]">
                <img
                  src={propertyPreview}
                  alt="Property preview"
                  className="w-full h-full object-cover rounded-2xl"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={clearPropertyImage}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div
                {...getPropertyRootProps()}
                className="aspect-[4/3] flex flex-col items-center justify-center cursor-pointer p-6"
              >
                <input {...getPropertyInputProps()} />
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <p className="text-foreground font-medium mb-1">
                  {isPropertyDragActive ? "Drop property photo here" : "Upload property photo"}
                </p>
                <p className="text-muted-foreground text-sm text-center">
                  Drag & drop or click to select<br />
                  PNG, JPG, WebP (max 20MB)
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground">
          Upload an exterior photo of your property
        </p>
      </div>

      {/* Floorplan Upload */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Floor Plan <span className="text-muted-foreground">(Optional)</span>
        </label>
        <Card className={`border border-white/20 transition-colors bg-white/10 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] ${isFloorplanDragActive ? 'border-primary bg-primary/20' : 'hover:border-white/30 hover:bg-white/15'}`}>
          <CardContent className="p-0">
            {floorplanPreview ? (
              <div className="relative aspect-[4/3]">
                <img
                  src={floorplanPreview}
                  alt="Floorplan preview"
                  className="w-full h-full object-cover rounded-2xl"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={clearFloorplan}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div
                {...getFloorplanRootProps()}
                className="aspect-[4/3] flex flex-col items-center justify-center cursor-pointer p-6"
              >
                <input {...getFloorplanInputProps()} />
                <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-secondary-foreground" />
                </div>
                <p className="text-foreground font-medium mb-1">
                  {isFloorplanDragActive ? "Drop floor plan here" : "Upload floor plan"}
                </p>
                <p className="text-muted-foreground text-sm text-center">
                  Drag & drop or click to select<br />
                  PNG, JPG, WebP (max 20MB)
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground">
          Upload your current floor plan for modified layouts
        </p>
      </div>
    </div>
  );
}
