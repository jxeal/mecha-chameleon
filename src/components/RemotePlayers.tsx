import { useGameStore } from '../store';
import { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { RemotePlayer } from '../store';

export function RemotePlayers() {
  const players = useGameStore((state) => state.players);
  const myId = useGameStore((state) => state.myId);

  return (
    <>
      {Object.values(players).map((player) => {
        if (player.id === myId) return null; // Don't render self here
        return <OtherPlayer key={player.id} player={player} />;
      })}
    </>
  );
}

function OtherPlayer({ player }: { player: RemotePlayer }) {
  const groupRef = useRef<THREE.Group>(null);

  // Initialize canvas and texture
  const { canvas, texture } = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#4287f5'; // Default blue color
      ctx.fillRect(0, 0, 256, 256);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return { canvas, texture };
  }, []);

  // Listen to remote paint events
  useEffect(() => {
    const handlePaint = (e: Event) => {
      const { u, v, color } = (e as CustomEvent).detail;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(u * 256, (1 - v) * 256, 12, 0, Math.PI * 2);
        ctx.fill();
        texture.needsUpdate = true;
      }
    };

    window.addEventListener(`player-paint-${player.id}`, handlePaint);
    return () => {
      window.removeEventListener(`player-paint-${player.id}`, handlePaint);
    };
  }, [player.id, canvas, texture]);

  useEffect(() => {
    if (groupRef.current) {
      // We receive camera.position and camera.quaternion
      groupRef.current.position.set(player.position.x, player.position.y, player.position.z);
      
      const rot = new THREE.Quaternion(player.rotation.x, player.rotation.y, player.rotation.z, player.rotation.w);
      groupRef.current.quaternion.copy(rot);
    }
  }, [player]);

  const isHunter = player.role === 'hunter';
  const bodyY = isHunter ? -1.2 : -0.6;
  const capsuleArgs: [number, number, number, number] = isHunter ? [0.6, 0.8, 16, 16] : [0.3, 0.4, 16, 16];
  const headArgs: [number, number, number] = isHunter ? [0.6, 0.6, 0.6] : [0.4, 0.4, 0.4];

  return (
    <group ref={groupRef}>
      {/* Body is lower than the camera */}
      <mesh position={[0, bodyY, 0]} castShadow>
        <capsuleGeometry args={capsuleArgs} />
        {isHunter ? (
          <meshStandardMaterial color="#f58742" />
        ) : (
          <meshStandardMaterial map={texture} />
        )}
      </mesh>
      {/* Head/Face is slightly forward */}
      <mesh position={[0, 0, -0.1]} castShadow>
        <boxGeometry args={headArgs} />
        <meshStandardMaterial color="#ffcc99" />
      </mesh>

      {/* Weapon positioned relative to camera (Hunters only) or Paintbrush */}
      {isHunter ? (
        <group position={[0.3, -0.3, -0.5]}>
          <mesh position={[0, 0, 0]} castShadow>
            <boxGeometry args={[0.08, 0.08, 0.4]} />
            <meshStandardMaterial color="#444" />
          </mesh>
          <mesh position={[0, -0.1, 0.15]} castShadow>
            <boxGeometry args={[0.06, 0.15, 0.08]} />
            <meshStandardMaterial color="#222" />
          </mesh>
        </group>
      ) : (
        <group position={[0.3, -0.4, -0.2]} rotation={[0.5, 0, 0]}>
          {/* Handle */}
          <mesh castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.4, 8]} />
            <meshStandardMaterial color="#8B5A2B" />
          </mesh>
          {/* Ferrule */}
          <mesh position={[0, 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.025, 0.025, 0.05, 8]} />
            <meshStandardMaterial color="#aaa" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Bristles tip */}
          <mesh position={[0, 0.25, 0]} castShadow>
            <coneGeometry args={[0.025, 0.08, 8]} />
            <meshStandardMaterial color={player.brushColor ?? "#ff0000"} roughness={0.8} />
          </mesh>
        </group>
      )}
    </group>
  );
}
