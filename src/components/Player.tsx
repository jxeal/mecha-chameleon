import * as THREE from 'three';
import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { RigidBody, CapsuleCollider, useRapier, RapierRigidBody } from '@react-three/rapier';
import { useGameStore } from '../store';

const SPEED = 5;
const JUMP_FORCE = 6;

export function Player() {
  const body = useRef<RapierRigidBody>(null);
  const weaponRef = useRef<THREE.Group>(null);
  const [, get] = useKeyboardControls();
  const { rapier, world } = useRapier();
  const { camera } = useThree();
  const addMark = useGameStore((state) => state.addMark);
  const updateMyPosition = useGameStore((state) => state.updateMyPosition);
  
  const myPlayer = useGameStore((state) => state.myId ? state.players[state.myId] : null);
  const isHunter = myPlayer?.role === 'hunter';

  // Dynamic capsule sizes
  const capsuleArgs: [number, number] = isHunter ? [0.8, 0.6] : [0.4, 0.3];
  const cameraYOffset = isHunter ? 1.2 : 0.6; // relative to center of body
  const bottomOffset = isHunter ? 1.5 : 0.8; // for grounded raycast

  const [lastShootTime, setLastShootTime] = useState(0);
  const lastEmitTime = useRef(0);

  // Handle shooting
  useEffect(() => {
    const handleMouseClick = (e: MouseEvent) => {
      // Primary button
      if (document.pointerLockElement && e.button === 0) {
        const now = Date.now();
        if (now - lastShootTime < 200) return; // Fire rate limit Let's say 200ms
        setLastShootTime(now);

        // Raycast from camera center
        const ray = new rapier.Ray(camera.position, camera.getWorldDirection(new THREE.Vector3()));
        
        // Max distance and collision groups. We skip the player's own collider
        const hit = world.castRay(ray, 100, true, undefined, undefined, undefined, body.current as any);

        if (hit) {
          const toi = (hit as any).toi || (hit as any).timeOfImpact;
          const point = ray.pointAt(toi);
          const normal = hit.collider.castRayAndGetNormal(ray, 100, true)?.normal;
          
          if (normal) {
            addMark({
              position: new THREE.Vector3(point.x, point.y, point.z),
              normal: new THREE.Vector3(normal.x, normal.y, normal.z),
            });
          }
        }
      }
    };
    
    document.addEventListener('mousedown', handleMouseClick);
    return () => {
      document.removeEventListener('mousedown', handleMouseClick);
    };
  }, [camera, rapier, world, addMark, lastShootTime]);

  const direction = new THREE.Vector3();
  const frontVector = new THREE.Vector3();
  const sideVector = new THREE.Vector3();

  useFrame((state) => {
    if (!body.current) return;

    const { forward, backward, left, right, jump, sprint } = get();
    
    const velocity = body.current.linvel();

    // Movement
    const currentSpeed = sprint ? SPEED * 1.8 : SPEED;
    frontVector.set(0, 0, Number(backward) - Number(forward));
    sideVector.set(Number(left) - Number(right), 0, 0);
    direction.subVectors(frontVector, sideVector).normalize().multiplyScalar(currentSpeed).applyEuler(camera.rotation);
    
    // Apply horizontal velocity, keep vertical
    body.current.setLinvel({ x: direction.x, y: velocity.y, z: direction.z }, true);

    // Jumping
    const rayOrigin = body.current.translation();
    rayOrigin.y -= bottomOffset; // Below the capsule
    const ray = new rapier.Ray(rayOrigin, { x: 0, y: -1, z: 0 });
    const groundHit = world.castRay(ray, 0.2, true);
    
    const isGrounded = groundHit !== null;

    if (jump && isGrounded && Math.abs(velocity.y) < 0.1) {
      body.current.setLinvel({ x: velocity.x, y: JUMP_FORCE, z: velocity.z }, true);
    }

    // Camera follow player
    const { x, y, z } = body.current.translation();
    camera.position.set(x, y + cameraYOffset, z); // Put camera at eye level

    // Weapon follow camera
    if (weaponRef.current) {
      weaponRef.current.position.copy(camera.position);
      weaponRef.current.quaternion.copy(camera.quaternion);
      
      // Calculate recoil based on lastShootTime
      const timeSinceShoot = Date.now() - lastShootTime;
      const recoilOffset = timeSinceShoot < 100 ? (1 - timeSinceShoot / 100) * 0.1 : 0;
      
      // Apply local recoil offset (move backwards along Z)
      weaponRef.current.translateZ(recoilOffset);
    }

    const now = Date.now();
    if (now - lastEmitTime.current > 50) { // ~20 times per second
      lastEmitTime.current = now;
      updateMyPosition(camera.position, camera.quaternion);
    }
  });

  return (
    <>
      <RigidBody ref={body} colliders={false} mass={1} type="dynamic" position={[0, 2, 0]} enabledRotations={[false, false, false]}>
        <CapsuleCollider args={capsuleArgs} />
      </RigidBody>
      <group ref={weaponRef}>
        <mesh position={[0.3, -0.3, -0.5]} castShadow>
          <boxGeometry args={[0.08, 0.08, 0.4]} />
          <meshStandardMaterial color="#444" />
        </mesh>
        <mesh position={[0.3, -0.4, -0.35]} castShadow>
          <boxGeometry args={[0.06, 0.15, 0.08]} />
          <meshStandardMaterial color="#222" />
        </mesh>
      </group>
    </>
  );
}
