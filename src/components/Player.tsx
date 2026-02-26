import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, RapierRigidBody } from '@react-three/rapier';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store';

const SPEED = 15;

export function BeeModel({ color, isLocal }: { color: string, isLocal?: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 4) * 0.2;
      const wings = groupRef.current.getObjectByName('wings');
      if (wings) {
        wings.children.forEach((wing, i) => {
          wing.rotation.z = Math.sin(state.clock.elapsedTime * 25) * (i === 0 ? 0.6 : -0.6);
        });
      }
    }
  });

  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.2} />
      </mesh>
      
      {/* Stripes */}
      {[0.2, 0, -0.2].map((z, i) => (
        <mesh key={i} position={[0, 0, z]}>
          <torusGeometry args={[0.61, 0.05, 8, 24]} />
          <meshStandardMaterial color="#000000" />
        </mesh>
      ))}

      {/* Wings */}
      <group name="wings" position={[0, 0.3, 0]}>
        <mesh position={[0.6, 0, 0]}>
          <planeGeometry args={[1, 0.6]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[-0.6, 0, 0]}>
          <planeGeometry args={[1, 0.6]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Eyes */}
      <mesh position={[0.25, 0.2, 0.45]}>
        <sphereGeometry args={[0.12]} />
        <meshBasicMaterial color={isLocal ? "#00ffff" : "#ff0000"} />
      </mesh>
      <mesh position={[-0.25, 0.2, 0.45]}>
        <sphereGeometry args={[0.12]} />
        <meshBasicMaterial color={isLocal ? "#00ffff" : "#ff0000"} />
      </mesh>

      <pointLight intensity={2} distance={8} color={color} />
    </group>
  );
}

export function Player() {
  const body = useRef<RapierRigidBody>(null);
  const { camera } = useThree();
  const playerState = useGameStore(state => state.playerState);
  const gameState = useGameStore(state => state.gameState);
  const updatePlayerPosition = useGameStore(state => state.updatePlayerPosition);
  const mobileInput = useGameStore(state => state.mobileInput);
  
  const keys = useRef<Record<string, boolean>>({});
  const lastEmitTime = useRef(0);
  
  // Camera state: Yaw (horizontal) and Pitch (vertical)
  const camState = useRef({ yaw: 0, pitch: Math.PI / 4 });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => keys.current[e.key.toLowerCase()] = true;
    const handleKeyUp = (e: KeyboardEvent) => keys.current[e.key.toLowerCase()] = false;
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((state, delta) => {
    if (!body.current || gameState !== 'playing' || playerState === 'disabled') return;

    // Disable movement if typing in an input
    const isTyping = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';
    
    const velocity = body.current.linvel();
    
    // Movement relative to camera yaw
    const inputX = !isTyping ? ((keys.current['d'] || keys.current['arrowright'] ? 1 : 0) - (keys.current['a'] || keys.current['arrowleft'] ? 1 : 0) + mobileInput.move.x) : mobileInput.move.x;
    const inputZ = !isTyping ? ((keys.current['s'] || keys.current['arrowdown'] ? 1 : 0) - (keys.current['w'] || keys.current['arrowup'] ? 1 : 0) - mobileInput.move.y) : -mobileInput.move.y;

    const moveVector = new THREE.Vector3(inputX, 0, inputZ);
    if (moveVector.lengthSq() > 0.01) {
      moveVector.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), camState.current.yaw);
    }
    
    const direction = moveVector.multiplyScalar(SPEED);
    body.current.setLinvel({ x: direction.x, y: velocity.y, z: direction.z }, true);

    const pos = body.current.translation();
    
    // Update camera angles based on look input
    const lookSensitivity = 2.5;
    camState.current.yaw -= mobileInput.look.x * lookSensitivity * delta;
    camState.current.pitch = Math.max(0.2, Math.min(Math.PI / 2 - 0.2, camState.current.pitch + mobileInput.look.y * lookSensitivity * delta));

    // Rotation logic: Prioritize Look joystick, fallback to Movement direction
    const lookX = mobileInput.look.x;
    const lookY = mobileInput.look.y;
    
    if (Math.abs(lookX) > 0.1 || Math.abs(lookY) > 0.1) {
      // Rotate bee to face the "look" direction relative to camera
      const targetYaw = Math.atan2(lookX, -lookY) + camState.current.yaw;
      const targetPitch = -lookY * 0.5; // Slight tilt up/down
      
      const targetQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(targetPitch, targetYaw, -lookX * 0.3));
      body.current.setRotation(targetQuat, true);
    } else if (direction.lengthSq() > 0.1) {
      const targetYaw = Math.atan2(direction.x, direction.z);
      const targetQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, targetYaw, 0));
      body.current.setRotation(targetQuat, true);
    }

    // Camera follow (Orbital follow)
    const distance = 35;
    const camX = pos.x + distance * Math.sin(camState.current.yaw) * Math.cos(camState.current.pitch);
    const camY = pos.y + distance * Math.sin(camState.current.pitch);
    const camZ = pos.z + distance * Math.cos(camState.current.yaw) * Math.cos(camState.current.pitch);

    camera.position.lerp(new THREE.Vector3(camX, camY, camZ), 0.1);
    camera.lookAt(pos.x, pos.y, pos.z);

    // Emit position
    const now = Date.now();
    if (now - lastEmitTime.current > 50) {
      updatePlayerPosition([pos.x, pos.y, pos.z], body.current.rotation().y);
      lastEmitTime.current = now;
    }
  });

  return (
    <>
      <RigidBody
        ref={body}
        colliders="ball"
        mass={1}
        type="dynamic"
        position={[0, 2, 0]}
        enabledRotations={[false, true, false]}
        friction={0}
        linearDamping={0.5}
      >
        <BeeModel color="#FFD700" isLocal />
      </RigidBody>
    </>
  );
}
