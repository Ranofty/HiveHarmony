/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { RigidBody } from '@react-three/rapier';
import { Grid, Stars } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { DataMonolith } from './DataMonolith';
import { useGameStore } from '../store';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    const uaMatch = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    return uaMatch || coarsePointer || window.innerWidth < 768;
  });

  useEffect(() => {
    const check = () => {
      const uaMatch = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
      setIsMobile(uaMatch || coarsePointer || window.innerWidth < 768);
    };
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return isMobile;
}

export function Arena() {
  const isMobile = useIsMobile();
  const monoliths = useGameStore(state => state.monoliths);

  return (
    <group>
      {/* Floor */}
      <RigidBody type="fixed" name="floor" friction={0}>
        <mesh receiveShadow={!isMobile} position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial color="#000000" roughness={0.1} metalness={0.9} />
        </mesh>
      </RigidBody>
      
      {/* Hex Grid Floor Effect */}
      <Grid 
        position={[0, -0.49, 0]} 
        args={[200, 200]} 
        cellColor="#FFD700" 
        sectionColor="#FFD700" 
        fadeDistance={150} 
        cellThickness={0.2} 
        sectionThickness={1} 
        infiniteGrid
      />

      {/* Atmosphere */}
      {!isMobile && (
        <>
          <Stars radius={150} depth={50} count={10000} factor={6} saturation={1} fade speed={2} />
          <AmbientParticles />
        </>
      )}

      {/* Central Conductor Node */}
      <ConductorNode />

      {/* Data Monoliths */}
      {monoliths.map(m => (
        <DataMonolith key={m.id} {...m} />
      ))}

      {/* Perimeter Walls */}
      <Wall name="wall-n" position={[0, 10, -100]} rotation={[0, 0, 0]} isMobile={isMobile} />
      <Wall name="wall-s" position={[0, 10, 100]} rotation={[0, Math.PI, 0]} isMobile={isMobile} />
      <Wall name="wall-e" position={[100, 10, 0]} rotation={[0, -Math.PI / 2, 0]} isMobile={isMobile} />
      <Wall name="wall-w" position={[-100, 10, 0]} rotation={[0, Math.PI / 2, 0]} isMobile={isMobile} />
    </group>
  );
}

function ConductorNode() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
      meshRef.current.position.y = 5 + Math.sin(state.clock.elapsedTime) * 0.5;
    }
  });

  return (
    <group position={[0, 5, 0]}>
      <mesh ref={meshRef}>
        <octahedronGeometry args={[3, 0]} />
        <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={2} metalness={1} roughness={0} />
      </mesh>
      
      {/* Outer Rings */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[5, 0.1, 16, 100]} />
        <meshBasicMaterial color="#FFD700" transparent opacity={0.3} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[6, 0.1, 16, 100]} />
        <meshBasicMaterial color="#FFD700" transparent opacity={0.2} />
      </mesh>
      
      {/* Glow Point */}
      <pointLight intensity={5} distance={30} color="#FFD700" />
    </group>
  );
}

function Wall({ name, position, rotation, isMobile }: { name: string, position: [number, number, number], rotation: [number, number, number], isMobile: boolean }) {
  return (
    <RigidBody type="fixed" name={name} position={position} rotation={rotation}>
      <mesh>
        <boxGeometry args={[200, 20, 1]} />
        <meshStandardMaterial color="#000000" roughness={0.8} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0, 0.51]}>
        <planeGeometry args={[200, 0.1]} />
        <meshBasicMaterial color="#FFD700" toneMapped={false} />
      </mesh>
    </RigidBody>
  );
}

function AmbientParticles() {
  const count = 2000;
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const [positions, sizes] = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = Math.random() * 60;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
      sizes[i] = Math.random() * 1.2 + 0.6;
    }
    return [positions, sizes];
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor: { value: new THREE.Color('#FFD700') }
  }), []);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aSize"
          count={count}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={`
          uniform float uTime;
          attribute float aSize;
          varying float vAlpha;
          void main() {
            vec3 pos = position;
            pos.y += uTime * 0.8;
            pos.x += sin(uTime * 0.3 + pos.y) * 3.0;
            pos.z += cos(uTime * 0.3 + pos.y) * 3.0;
            pos.y = mod(pos.y, 60.0);
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            gl_PointSize = aSize * (400.0 / -mvPosition.z);
            vAlpha = smoothstep(0.0, 10.0, pos.y) * smoothstep(60.0, 50.0, pos.y);
          }
        `}
        fragmentShader={`
          uniform vec3 uColor;
          varying float vAlpha;
          void main() {
            float d = length(gl_PointCoord - vec2(0.5));
            float alpha = smoothstep(0.5, 0.1, d) * 0.8 * vAlpha;
            if (alpha < 0.01) discard;
            gl_FragColor = vec4(uColor, alpha);
          }
        `}
      />
    </points>
  );
}
