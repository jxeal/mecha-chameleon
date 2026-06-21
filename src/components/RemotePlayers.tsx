import { useGameStore } from '../store';
import { useRef, useEffect } from 'react';
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
  const weaponRef = useRef<THREE.Group>(null);

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
        <meshStandardMaterial color={isHunter ? "#f58742" : "#4287f5"} />
      </mesh>
      {/* Head/Face is slightly forward */}
      <mesh position={[0, 0, -0.1]} castShadow>
        <boxGeometry args={headArgs} />
        <meshStandardMaterial color="#ffcc99" />
      </mesh>

      {/* Weapon positioned relative to camera */}
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
    </group>
  );
}
