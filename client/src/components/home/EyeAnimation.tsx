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

  const calculatePupilPosition = useCallback((eyeRef: React.RefObject<HTMLDivElement | null>, maxDistance: number = 18) => {
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

  const Eye = ({ eyeRef, pupilPosition, testId }: { 
    eyeRef: React.RefObject<HTMLDivElement | null>, 
    pupilPosition: { x: number, y: number },
    testId: string 
  }) => (
    <div 
      ref={eyeRef}
      className="relative w-36 h-36 md:w-52 md:h-52 lg:w-60 lg:h-60"
      data-testid={testId}
      style={{
        perspective: "500px",
        transformStyle: "preserve-3d",
      }}
    >
      {/* Outer eye socket shadow */}
      <div 
        className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(ellipse at 30% 20%, transparent 0%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.6) 100%)",
          transform: "translateZ(-20px)",
        }}
      />
      
      {/* Eyeball base - 3D sphere effect */}
      <div 
        className="absolute inset-2 rounded-full"
        style={{
          background: `
            radial-gradient(ellipse at 25% 25%, #ffffff 0%, #f8f8f8 25%, #e8e8e8 50%, #d0d0d0 75%, #b8b8b8 100%)
          `,
          boxShadow: `
            0 20px 60px rgba(0,0,0,0.5),
            0 10px 30px rgba(0,0,0,0.3),
            inset 0 -15px 40px rgba(0,0,0,0.15),
            inset 0 15px 30px rgba(255,255,255,0.9),
            0 0 80px rgba(249,115,22,0.2)
          `,
          transform: "translateZ(10px)",
        }}
      />
      
      {/* Inner eyeball highlight layer */}
      <div 
        className="absolute inset-4 rounded-full"
        style={{
          background: `
            radial-gradient(ellipse at 30% 25%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.6) 30%, transparent 60%)
          `,
        }}
      />

      {/* Iris and pupil container */}
      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={{ transform: "translateZ(15px)" }}
      >
        <div 
          className="relative w-16 h-16 md:w-24 md:h-24 lg:w-28 lg:h-28 rounded-full transition-transform duration-100 ease-out"
          style={{ 
            transform: `translate(${pupilPosition.x}px, ${pupilPosition.y}px)`,
          }}
        >
          {/* Iris outer ring */}
          <div 
            className="absolute inset-0 rounded-full"
            style={{
              background: `
                radial-gradient(circle at 50% 50%, 
                  #1a1a1a 0%,
                  #2d1810 10%,
                  #8b4513 20%,
                  #d35400 35%,
                  #e67e22 45%,
                  #f39c12 55%,
                  #d35400 70%,
                  #8b4513 85%,
                  #1a1a1a 100%
                )
              `,
              boxShadow: `
                inset 0 0 20px rgba(0,0,0,0.8),
                inset 0 0 40px rgba(0,0,0,0.4),
                0 4px 15px rgba(0,0,0,0.5)
              `,
            }}
          />
          
          {/* Iris texture - radial lines */}
          <div 
            className="absolute inset-1 rounded-full overflow-hidden"
            style={{
              background: `
                repeating-conic-gradient(
                  from 0deg,
                  rgba(0,0,0,0.1) 0deg 2deg,
                  transparent 2deg 8deg
                )
              `,
              mixBlendMode: "overlay",
            }}
          />
          
          {/* Inner iris glow */}
          <div 
            className="absolute inset-2 rounded-full"
            style={{
              background: `
                radial-gradient(circle at 50% 50%,
                  transparent 30%,
                  rgba(249,115,22,0.4) 50%,
                  rgba(249,115,22,0.6) 60%,
                  transparent 80%
                )
              `,
            }}
          />

          {/* Pupil */}
          <div 
            className="absolute inset-0 flex items-center justify-center"
          >
            <div 
              className="w-7 h-7 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-full"
              style={{
                background: `
                  radial-gradient(circle at 40% 35%,
                    #1a1a1a 0%,
                    #0a0a0a 50%,
                    #000000 100%
                  )
                `,
                boxShadow: `
                  inset 0 2px 8px rgba(255,255,255,0.1),
                  inset 0 -2px 8px rgba(0,0,0,0.8),
                  0 2px 10px rgba(0,0,0,0.5)
                `,
              }}
            />
          </div>

          {/* Primary light reflection */}
          <div 
            className="absolute top-1 left-2 md:top-2 md:left-3 w-4 h-4 md:w-6 md:h-6 rounded-full"
            style={{
              background: `
                radial-gradient(circle at 50% 50%,
                  rgba(255,255,255,0.95) 0%,
                  rgba(255,255,255,0.6) 40%,
                  transparent 70%
                )
              `,
            }}
          />
          
          {/* Secondary light reflection */}
          <div 
            className="absolute top-4 left-5 md:top-5 md:left-7 w-2 h-2 md:w-2.5 md:h-2.5 rounded-full"
            style={{
              background: `
                radial-gradient(circle at 50% 50%,
                  rgba(255,255,255,0.8) 0%,
                  rgba(255,255,255,0.4) 50%,
                  transparent 100%
                )
              `,
            }}
          />

          {/* Bottom rim light */}
          <div 
            className="absolute bottom-2 right-3 md:bottom-3 md:right-4 w-6 h-2 md:w-8 md:h-3 rounded-full opacity-30"
            style={{
              background: `
                radial-gradient(ellipse at 50% 50%,
                  rgba(255,200,150,0.6) 0%,
                  transparent 100%
                )
              `,
              transform: "rotate(-30deg)",
            }}
          />
        </div>
      </div>

      {/* Glass-like overlay for depth */}
      <div 
        className="absolute inset-2 rounded-full pointer-events-none"
        style={{
          background: `
            linear-gradient(135deg, 
              rgba(255,255,255,0.1) 0%, 
              transparent 50%,
              rgba(0,0,0,0.05) 100%
            )
          `,
        }}
      />
    </div>
  );

  return (
    <section 
      ref={containerRef}
      className="relative py-24 overflow-hidden bg-black"
      data-testid="section-eye-animation"
    >
      {/* Animated Northern Lights Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Base dark gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-950 to-black" />
        
        {/* Aurora Layer 1 - Main flowing wave */}
        <div 
          className="absolute inset-0 opacity-60"
          style={{
            background: `
              radial-gradient(ellipse 120% 60% at 50% 100%, 
                transparent 0%,
                rgba(249, 115, 22, 0.15) 30%,
                rgba(234, 88, 12, 0.25) 50%,
                rgba(194, 65, 12, 0.2) 70%,
                transparent 100%
              )
            `,
            animation: "aurora1 8s ease-in-out infinite",
          }}
        />
        
        {/* Aurora Layer 2 - Secondary wave */}
        <div 
          className="absolute inset-0 opacity-50"
          style={{
            background: `
              radial-gradient(ellipse 100% 50% at 30% 80%, 
                transparent 0%,
                rgba(251, 146, 60, 0.2) 40%,
                rgba(249, 115, 22, 0.3) 60%,
                transparent 100%
              )
            `,
            animation: "aurora2 12s ease-in-out infinite",
          }}
        />
        
        {/* Aurora Layer 3 - Accent wave */}
        <div 
          className="absolute inset-0 opacity-40"
          style={{
            background: `
              radial-gradient(ellipse 80% 40% at 70% 90%, 
                transparent 0%,
                rgba(253, 186, 116, 0.15) 30%,
                rgba(251, 146, 60, 0.25) 50%,
                rgba(249, 115, 22, 0.2) 70%,
                transparent 100%
              )
            `,
            animation: "aurora3 10s ease-in-out infinite",
          }}
        />
        
        {/* Vertical light rays */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            background: `
              repeating-linear-gradient(
                90deg,
                transparent 0px,
                transparent 80px,
                rgba(249, 115, 22, 0.1) 82px,
                rgba(251, 146, 60, 0.15) 85px,
                rgba(249, 115, 22, 0.1) 88px,
                transparent 90px,
                transparent 200px
              )
            `,
            animation: "rays 15s linear infinite",
          }}
        />
        
        {/* Floating particles */}
        <div 
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(circle at 20% 70%, rgba(249, 115, 22, 0.4) 0%, transparent 0.5%),
              radial-gradient(circle at 80% 60%, rgba(251, 146, 60, 0.3) 0%, transparent 0.4%),
              radial-gradient(circle at 40% 80%, rgba(253, 186, 116, 0.3) 0%, transparent 0.3%),
              radial-gradient(circle at 60% 75%, rgba(249, 115, 22, 0.35) 0%, transparent 0.4%),
              radial-gradient(circle at 25% 65%, rgba(234, 88, 12, 0.25) 0%, transparent 0.3%),
              radial-gradient(circle at 75% 85%, rgba(251, 146, 60, 0.3) 0%, transparent 0.35%)
            `,
            animation: "particles 20s ease-in-out infinite",
          }}
        />
        
        {/* Top fade overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black opacity-70" />
      </div>
      
      {/* CSS Animations */}
      <style>{`
        @keyframes aurora1 {
          0%, 100% {
            transform: translateY(0) scaleY(1);
            opacity: 0.6;
          }
          25% {
            transform: translateY(-20px) scaleY(1.1);
            opacity: 0.7;
          }
          50% {
            transform: translateY(10px) scaleY(0.95);
            opacity: 0.5;
          }
          75% {
            transform: translateY(-10px) scaleY(1.05);
            opacity: 0.65;
          }
        }
        
        @keyframes aurora2 {
          0%, 100% {
            transform: translateX(0) translateY(0);
            opacity: 0.5;
          }
          33% {
            transform: translateX(30px) translateY(-15px);
            opacity: 0.6;
          }
          66% {
            transform: translateX(-20px) translateY(10px);
            opacity: 0.4;
          }
        }
        
        @keyframes aurora3 {
          0%, 100% {
            transform: translateX(0) scaleX(1);
            opacity: 0.4;
          }
          50% {
            transform: translateX(-40px) scaleX(1.2);
            opacity: 0.55;
          }
        }
        
        @keyframes rays {
          0% {
            transform: translateX(-100px);
          }
          100% {
            transform: translateX(100px);
          }
        }
        
        @keyframes particles {
          0%, 100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          25% {
            transform: translateY(-30px) scale(1.1);
            opacity: 0.8;
          }
          50% {
            transform: translateY(-10px) scale(0.95);
            opacity: 1;
          }
          75% {
            transform: translateY(-40px) scale(1.05);
            opacity: 0.9;
          }
        }
      `}</style>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            We See Your <span className="text-primary">Vision</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto bg-white">
            Turn customers' eyes with expertly rendered floorplans and models.
          </p>
        </div>

        <div className="flex justify-center items-center gap-6 md:gap-12 lg:gap-16">
          <Eye eyeRef={leftEyeRef} pupilPosition={leftPupil} testId="eye-left" />
          <Eye eyeRef={rightEyeRef} pupilPosition={rightPupil} testId="eye-right" />
        </div>
      </div>
    </section>
  );
}
