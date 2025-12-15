import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Float, ContactShadows, Environment, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";

function IsometricRoom() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      // Slow rotation
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.2 + Math.PI / 4;
    }
  });

  return (
    <group ref={groupRef} scale={0.8}>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
        <boxGeometry args={[4, 4, 0.2]} />
        <meshStandardMaterial color="#333" />
      </mesh>

      {/* Back Wall */}
      <mesh position={[0, 1, -2]}>
        <boxGeometry args={[4, 4.2, 0.2]} />
        <meshStandardMaterial color="#444" />
      </mesh>

      {/* Left Wall */}
      <mesh position={[-2, 1, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[4, 4.2, 0.2]} />
        <meshStandardMaterial color="#444" />
      </mesh>

      {/* Abstract Furniture - Table */}
      <mesh position={[0, -0.4, 0]}>
        <boxGeometry args={[1.5, 0.1, 1]} />
        <meshStandardMaterial color="#f97316" />
      </mesh>
      <mesh position={[-0.6, -0.7, -0.4]}>
        <boxGeometry args={[0.1, 0.6, 0.1]} />
        <meshStandardMaterial color="#aaa" />
      </mesh>
      <mesh position={[0.6, -0.7, -0.4]}>
        <boxGeometry args={[0.1, 0.6, 0.1]} />
        <meshStandardMaterial color="#aaa" />
      </mesh>
      <mesh position={[-0.6, -0.7, 0.4]}>
        <boxGeometry args={[0.1, 0.6, 0.1]} />
        <meshStandardMaterial color="#aaa" />
      </mesh>
      <mesh position={[0.6, -0.7, 0.4]}>
        <boxGeometry args={[0.1, 0.6, 0.1]} />
        <meshStandardMaterial color="#aaa" />
      </mesh>

      {/* Abstract Art on Wall */}
      <mesh position={[0, 1.5, -1.85]}>
        <boxGeometry args={[1.2, 1.6, 0.05]} />
        <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

export function Hero3D() {
  return (
    <div className="w-full h-full absolute inset-0">
      <Canvas>
        <PerspectiveCamera makeDefault position={[5, 5, 5]} fov={45} />
        <color attach="background" args={['#0a0a0a']} />
        
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <spotLight position={[-10, 10, -10]} angle={0.3} penumbra={1} intensity={1} castShadow />
        
        <Float speed={2} rotationIntensity={0.1} floatIntensity={0.2}>
          <IsometricRoom />
        </Float>
        
        <ContactShadows position={[0, -2, 0]} opacity={0.4} scale={10} blur={2.5} far={4} />
        <Environment preset="city" />
      </Canvas>
      {/* Overlay Gradient to blend with page */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background pointer-events-none" />
    </div>
  );
}
