import { useState, useEffect, useRef, useCallback } from "react";

export function EyeAnimation() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const leftEyeRef = useRef<HTMLDivElement>(null);
  const rightEyeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const calculatePupilPosition = useCallback((eyeRef: React.RefObject<HTMLDivElement | null>, maxDistance: number = 20) => {
    if (!eyeRef.current) return { x: 0, y: 0 };

    const eye = eyeRef.current.getBoundingClientRect();
    const eyeCenterX = eye.left + eye.width / 2;
    const eyeCenterY = eye.top + eye.height / 2;

    const deltaX = mousePosition.x - eyeCenterX;
    const deltaY = mousePosition.y - eyeCenterY;
    
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);
    const angle = Math.atan2(deltaY, deltaX);

    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
    };
  }, [mousePosition]);

  const leftPupil = calculatePupilPosition(leftEyeRef);
  const rightPupil = calculatePupilPosition(rightEyeRef);

  return (
    <section 
      ref={containerRef}
      className="relative py-24 overflow-hidden bg-gradient-to-b from-black via-zinc-950 to-black"
      data-testid="section-eye-animation"
    >
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-[120px]" />
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            We See Your <span className="text-primary">Vision</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Our AI watches every detail of your floorplan to create the perfect 3D visualization
          </p>
        </div>

        <div className="flex justify-center items-center gap-8 md:gap-16">
          <div 
            ref={leftEyeRef}
            className="relative w-32 h-32 md:w-48 md:h-48 rounded-full bg-gradient-to-br from-white via-gray-100 to-gray-200 shadow-[0_0_60px_rgba(249,115,22,0.3),inset_0_-8px_30px_rgba(0,0,0,0.15)] flex items-center justify-center"
            data-testid="eye-left"
          >
            <div className="absolute inset-3 rounded-full bg-gradient-to-br from-gray-50 to-white shadow-inner" />
            
            <div 
              className="relative w-14 h-14 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-zinc-800 via-zinc-900 to-black shadow-lg transition-transform duration-75 ease-out"
              style={{ 
                transform: `translate(${leftPupil.x}px, ${leftPupil.y}px)` 
              }}
            >
              <div className="absolute inset-1 rounded-full bg-gradient-to-br from-primary/80 via-orange-600 to-orange-800" />
              
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-black shadow-inner" />
              </div>
              
              <div className="absolute top-2 left-2 w-2 h-2 md:w-3 md:h-3 rounded-full bg-white/80" />
              <div className="absolute top-3 left-4 md:top-4 md:left-6 w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-white/60" />
            </div>
          </div>

          <div 
            ref={rightEyeRef}
            className="relative w-32 h-32 md:w-48 md:h-48 rounded-full bg-gradient-to-br from-white via-gray-100 to-gray-200 shadow-[0_0_60px_rgba(249,115,22,0.3),inset_0_-8px_30px_rgba(0,0,0,0.15)] flex items-center justify-center"
            data-testid="eye-right"
          >
            <div className="absolute inset-3 rounded-full bg-gradient-to-br from-gray-50 to-white shadow-inner" />
            
            <div 
              className="relative w-14 h-14 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-zinc-800 via-zinc-900 to-black shadow-lg transition-transform duration-75 ease-out"
              style={{ 
                transform: `translate(${rightPupil.x}px, ${rightPupil.y}px)` 
              }}
            >
              <div className="absolute inset-1 rounded-full bg-gradient-to-br from-primary/80 via-orange-600 to-orange-800" />
              
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-black shadow-inner" />
              </div>
              
              <div className="absolute top-2 left-2 w-2 h-2 md:w-3 md:h-3 rounded-full bg-white/80" />
              <div className="absolute top-3 left-4 md:top-4 md:left-6 w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-white/60" />
            </div>
          </div>
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground text-sm">
            Move your cursor around <span className="text-primary">👀</span>
          </p>
        </div>
      </div>
    </section>
  );
}
