import { useFrame } from '@react-three/fiber';
import { useGameStore, BulletMark as MatchType } from '../store';
import { useRef, useEffect } from 'react';
import * as THREE from 'three';

const MARK_LIFETIME = 5000;

export function BulletMarks() {
  const marks = useGameStore((state) => state.marks);
  const removeMark = useGameStore((state) => state.removeMark);
  
  return (
    <>
      {marks.map((mark) => (
        <Mark key={mark.id} mark={mark} removeMark={removeMark} />
      ))}
    </>
  );
}

function Mark({ mark, removeMark }: { mark: MatchType, removeMark: (id: string) => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useEffect(() => {
    if (meshRef.current) {
      // Offset slightly to avoid z-fighting
      const offsetPos = mark.position.clone().add(mark.normal.clone().multiplyScalar(0.01));
      meshRef.current.position.copy(offsetPos);
      
      // Orient the decal to face outward from the surface
      const targetPos = offsetPos.clone().add(mark.normal);
      meshRef.current.lookAt(targetPos);
    }
  }, [mark]);

  useFrame(() => {
    const age = Date.now() - mark.timestamp;
    if (age > MARK_LIFETIME) {
      removeMark(mark.id);
    } else if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshBasicMaterial;
      // Start fading out when 1 second is left
      if (MARK_LIFETIME - age < 1000) {
        material.opacity = (MARK_LIFETIME - age) / 1000;
      }
    }
  });

  return (
    <mesh ref={meshRef}>
      <circleGeometry args={[0.08, 16]} />
      <meshBasicMaterial color="#1a1a1a" transparent opacity={1} depthWrite={false} />
    </mesh>
  );
}
