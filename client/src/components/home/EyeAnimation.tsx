import { useState, useEffect, useRef, useCallback } from "react";
import { motion, useInView } from "framer-motion";

export function EyeAnimation() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const leftEyeRef = useRef<HTMLDivElement>(null);
  const rightEyeRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: false, amount: 0.3 });

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

  const Eye = ({ eyeRef, pupilPosition, testId, delay }: { 
    eyeRef: React.RefObject<HTMLDivElement | null>, 
    pupilPosition: { x: number, y: number },
    testId: string,
    delay: number
  }) => (
    <div className="relative">
      {/* The hole/socket that the eye pops out of */}
      <div 
        className="absolute inset-0 rounded-full"
        style={{
          background: `
            radial-gradient(circle at 50% 50%,
              #000000 0%,
              #0a0a0a 30%,
              #1a1a1a 60%,
              #2a2a2a 80%,
              #1a1a1a 100%
            )
          `,
          boxShadow: `
            inset 0 10px 40px rgba(0,0,0,0.9),
            inset 0 -5px 20px rgba(0,0,0,0.5),
            0 0 30px rgba(0,0,0,0.8)
          `,
        }}
      />
      
      {/* The eye that pops out */}
      <motion.div 
        ref={eyeRef}
        className="relative w-36 h-36 md:w-52 md:h-52 lg:w-60 lg:h-60"
        data-testid={testId}
        initial={{ scale: 0.3, y: 60, opacity: 0 }}
        animate={isInView ? { 
          scale: 1, 
          y: 0, 
          opacity: 1,
        } : { 
          scale: 0.3, 
          y: 60, 
          opacity: 0 
        }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 20,
          delay: delay,
        }}
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
      </motion.div>
    </div>
  );

  return (
    <section 
      ref={sectionRef}
      className="relative py-24 overflow-hidden bg-gradient-to-b from-black via-zinc-950 to-black"
      data-testid="section-eye-animation"
    >
      {/* Ambient background glow */}
      <motion.div 
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 0.4 } : { opacity: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/15 rounded-full blur-[150px]" />
      </motion.div>
      
      <div className="container mx-auto px-4 relative z-10" ref={containerRef}>
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            We See Your <span className="text-primary">Vision</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Our AI watches every detail of your floorplan to create the perfect 3D visualization
          </p>
        </motion.div>

        <div className="flex justify-center items-center gap-6 md:gap-12 lg:gap-16">
          <Eye eyeRef={leftEyeRef} pupilPosition={leftPupil} testId="eye-left" delay={0} />
          <Eye eyeRef={rightEyeRef} pupilPosition={rightPupil} testId="eye-right" delay={0.15} />
        </div>

        <motion.div 
          className="text-center mt-12"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <p className="text-muted-foreground text-sm">
            Move your cursor around <span className="text-primary">👀</span>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
