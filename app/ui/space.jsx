'use client';

import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Stars } from '@react-three/drei';
import * as THREE from 'three';

// Load Spaceship Model
function Spaceship() {
  const { scene } = useGLTF('/spaceship.glb'); // Replace with your actual path
  scene.scale.set(0.5, 0.5, 0.5);
  return <primitive object={scene} />;
}

// Planet Component
function Planet({ size = 5, texture, position = [0, 0, 0] }) {
  const planetRef = useRef();
  const textureMap = useLoader(THREE.TextureLoader, texture);

  useFrame(() => {
    planetRef.current.rotation.y += 0.001;
  });

  return (
    <mesh ref={planetRef} position={position}>
      <sphereGeometry args={[size, 32, 32]} />
      <meshStandardMaterial map={textureMap} />
    </mesh>
  );
}

// Lighting
function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight intensity={1} position={[5, 5, 5]} />
    </>
  );
}

// Main Scene
function SpaceSceneContent() {
  const { camera } = useThree();
  camera.position.set(0, 2, 15);

  return (
    <>
      <Stars radius={300} depth={60} count={10000} factor={7} fade speed={1} />
      <SceneLights />
      <Suspense fallback={null}>
        <Spaceship />
        <Planet size={5} texture="/textures/earth.jpg" position={[50, 0, -100]} />
        <Planet size={7} texture="/textures/jupiter.jpg" position={[-50, 0, -200]} />
        <Planet size={6} texture="/textures/mars.jpg" position={[0, 20, -150]} />
      </Suspense>
      <OrbitControls enableDamping dampingFactor={0.1} />
    </>
  );
}

// Exportable Component
export default function SpaceshipScene() {
  return (
    <div className="h-screen w-full">
      <Canvas camera={{ fov: 70, near: 0.1, far: 1000 }}>
        <SpaceSceneContent />
      </Canvas>
    </div>
  );
}
