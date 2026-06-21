import * as THREE from 'three';
import { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { RigidBody, CapsuleCollider, useRapier, RapierRigidBody } from '@react-three/rapier';
import { useGameStore } from '../store';

const SPEED = 5;
const JUMP_FORCE = 6;

export function Player() {
  const body = useRef<RapierRigidBody>(null);
  const weaponRef = useRef<THREE.Group>(null);
  const localBodyRef = useRef<THREE.Group>(null);
  const [, get] = useKeyboardControls();
  const { rapier, world } = useRapier();
  const { camera, raycaster, scene } = useThree();
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

  const localRotationRef = useRef<THREE.Quaternion>(new THREE.Quaternion());
  const isMouseDown = useRef(false);
  const [currentColor, setCurrentColor] = useState('#ff0000'); // default paint color: red

  // Initialize paint canvas & texture
  const { canvas, texture } = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#4287f5'; // Default blue body color
      ctx.fillRect(0, 0, 512, 512);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return { canvas, texture };
  }, []);

  // Track Left Mouse down for drawing
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (!isHunter && e.button === 0) {
        isMouseDown.current = true;
      }
    };
    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        isMouseDown.current = false;
      }
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isHunter]);

  // Color sampler via Right Click
  useEffect(() => {
    const handleRightClick = (e: MouseEvent) => {
      if (!isHunter && document.pointerLockElement && e.button === 2) {
        e.preventDefault();
        
        // Raycast from camera center
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const intersects = raycaster.intersectObjects(scene.children, true);
        
        // Find first intersection that is not our own body
        const hit = intersects.find(intersect => intersect.object.name !== "local-player-body");
        if (hit) {
          const mesh = hit.object as THREE.Mesh;
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (mat && mat.color) {
            const hexColor = "#" + mat.color.getHexString();
            setCurrentColor(hexColor);
            
            // Immediately sync color changes in position/brush updates
            const { x, y, z } = body.current ? body.current.translation() : { x: 0, y: 0, z: 0 };
            const eyeLevelPos = new THREE.Vector3(x, y + cameraYOffset, z);
            updateMyPosition(eyeLevelPos, localRotationRef.current, hexColor);
          }
        }
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (!isHunter) {
        e.preventDefault(); // disable context menu for right click sampling
      }
    };

    window.addEventListener('mousedown', handleRightClick);
    window.addEventListener('contextmenu', handleContextMenu);
    return () => {
      window.removeEventListener('mousedown', handleRightClick);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [camera, isHunter, scene, raycaster, cameraYOffset, updateMyPosition]);

  // Handle shooting
  useEffect(() => {
    const handleMouseClick = (e: MouseEvent) => {
      if (!isHunter) return; // Small guys cannot shoot
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
  }, [camera, rapier, world, addMark, lastShootTime, isHunter]);

  const direction = new THREE.Vector3();
  const frontVector = new THREE.Vector3();
  const sideVector = new THREE.Vector3();

  useFrame((state) => {
    if (!body.current) return;

    const { forward, backward, left, right, jump, sprint } = get();
    
    const velocity = body.current.linvel();
    const { x, y, z } = body.current.translation();

    // Movement direction calculation
    const currentSpeed = sprint ? SPEED * 1.8 : SPEED;
    frontVector.set(0, 0, Number(backward) - Number(forward));
    sideVector.set(Number(left) - Number(right), 0, 0);
    direction.subVectors(frontVector, sideVector).normalize().multiplyScalar(currentSpeed).applyEuler(camera.rotation);

    // Ground check raycast
    const groundRayOrigin = new THREE.Vector3(x, y - bottomOffset, z);
    const groundRay = new rapier.Ray(groundRayOrigin, { x: 0, y: -1, z: 0 });
    const groundHit = world.castRay(groundRay, 0.2, true);
    const isGrounded = groundHit !== null;

    // Check if player is near a wall for climbing
    const cameraRotationY = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ').y;
    const localDirections = [
      new THREE.Vector3(0, 0, -1), // Local Forward
      new THREE.Vector3(0, 0, 1),  // Local Backward
      new THREE.Vector3(-1, 0, 0), // Local Left
      new THREE.Vector3(1, 0, 0)   // Local Right
    ].map(d => d.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotationY));

    const playerRadius = isHunter ? 0.8 : 0.4;
    let isAtWall = false;
    const wallNormal = new THREE.Vector3();

    for (const dir of localDirections) {
      const wallRay = new rapier.Ray(
        { x, y, z },
        { x: dir.x, y: 0, z: dir.z }
      );
      const wallHit = world.castRay(wallRay, playerRadius + 0.3, true, undefined, undefined, undefined, body.current as any);
      if (wallHit) {
        const normal = wallHit.collider.castRayAndGetNormal(wallRay, playerRadius + 0.3, true)?.normal;
        if (normal && Math.abs(normal.y) < 0.7) {
          isAtWall = true;
          wallNormal.set(normal.x, normal.y, normal.z);
          break;
        }
      }
    }

    // If trying to move away from the wall, disable wall clinging
    if (isAtWall && direction.lengthSq() > 0.01) {
      const moveDir = new THREE.Vector3(direction.x, 0, direction.z).normalize();
      if (moveDir.dot(wallNormal) > 0.3) {
        isAtWall = false;
      }
    }

    // Determine target vertical velocity
    let targetVelocityY = velocity.y;
    let didWallJump = false;

    // Grounded jump
    if (jump && isGrounded && Math.abs(velocity.y) < 0.1) {
      targetVelocityY = JUMP_FORCE;
    } 
    // Wall jump (if in the air and touching wall)
    else if (jump && isAtWall && !isGrounded) {
      body.current.setLinvel({
        x: wallNormal.x * JUMP_FORCE * 1.2,
        y: JUMP_FORCE,
        z: wallNormal.z * JUMP_FORCE * 1.2
      }, true);
      didWallJump = true;
    }
    // Climbing movement (if in the air and touching wall, and not wall jumping)
    else if (isAtWall && !isGrounded) {
      if (forward) {
        targetVelocityY = SPEED * 0.8;
      } else if (backward) {
        targetVelocityY = -SPEED * 0.8;
      } else {
        targetVelocityY = -0.5; // wall cling/slow slide
      }
    }

    if (!didWallJump) {
      // Apply movement velocities
      body.current.setLinvel({ x: direction.x, y: targetVelocityY, z: direction.z }, true);
    }

    // Camera follow player
    const eyeLevelPos = new THREE.Vector3(x, y + cameraYOffset, z);

    if (isHunter) {
      camera.position.copy(eyeLevelPos);
    } else {
      // 3rd person view for the small guys
      const cameraDirection = new THREE.Vector3();
      camera.getWorldDirection(cameraDirection);
      const rayDirection = cameraDirection.clone().negate().normalize();
      
      // Cast a ray from player center/eyeLevel to check for obstacle collision
      const ray = new rapier.Ray(eyeLevelPos, rayDirection);
      const hit = world.castRay(ray, 3, true, undefined, undefined, undefined, body.current as any);
      
      let distance = 3;
      if (hit) {
        const toi = (hit as any).toi || (hit as any).timeOfImpact;
        distance = Math.max(0.5, toi - 0.2);
      }
      
      const targetCameraPosition = eyeLevelPos.clone().addScaledVector(rayDirection, distance);
      camera.position.copy(targetCameraPosition);
    }

    // Weapon follow camera (Hunters only)
    if (isHunter && weaponRef.current) {
      weaponRef.current.position.copy(camera.position);
      weaponRef.current.quaternion.copy(camera.quaternion);
      
      // Calculate recoil based on lastShootTime
      const timeSinceShoot = Date.now() - lastShootTime;
      const recoilOffset = timeSinceShoot < 100 ? (1 - timeSinceShoot / 100) * 0.1 : 0;
      
      // Apply local recoil offset (move backwards along Z)
      weaponRef.current.translateZ(recoilOffset);
    }

    // Body rotation calculations
    if (isHunter) {
      localRotationRef.current.copy(camera.quaternion);
    } else {
      // Small guys body rotation in 3rd person
      if (isAtWall && !isGrounded) {
        // Face the wall (opposite of wallNormal)
        const targetRotation = new THREE.Quaternion().setFromRotationMatrix(
          new THREE.Matrix4().lookAt(
            new THREE.Vector3(),
            new THREE.Vector3(-wallNormal.x, 0, -wallNormal.z).normalize(),
            new THREE.Vector3(0, 1, 0)
          )
        );
        localRotationRef.current.slerp(targetRotation, 0.15);
      } else if (direction.lengthSq() > 0.01) {
        // Face the movement direction
        const angle = Math.atan2(direction.x, direction.z);
        const targetRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        localRotationRef.current.slerp(targetRotation, 0.15);
      }
    }

    // Local body follow camera (Small guys only, in 3rd person)
    if (!isHunter && localBodyRef.current) {
      localBodyRef.current.position.copy(eyeLevelPos);
      localBodyRef.current.quaternion.copy(localRotationRef.current);
    }

    // Continuous painting when holding Left Click
    if (!isHunter && isMouseDown.current) {
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
      const intersects = raycaster.intersectObjects(scene.children, true);
      const hitSelf = intersects.find(intersect => intersect.object.name === "local-player-body");
      if (hitSelf && hitSelf.uv) {
        const u = hitSelf.uv.x;
        const v = hitSelf.uv.y;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = currentColor;
          ctx.beginPath();
          ctx.arc(u * 512, (1 - v) * 512, 16, 0, Math.PI * 2);
          ctx.fill();
          texture.needsUpdate = true;
        }
        // Emit paint stroke to the server
        const socket = useGameStore.getState().socket;
        if (socket) {
          socket.emit("player:paint", { u, v, color: currentColor });
        }
      }
    }

    const now = Date.now();
    if (now - lastEmitTime.current > 50) { // ~20 times per second
      lastEmitTime.current = now;
      updateMyPosition(eyeLevelPos, localRotationRef.current, currentColor);
    }
  });

  return (
    <>
      <RigidBody ref={body} colliders={false} mass={1} type="dynamic" position={[0, 2, 0]} enabledRotations={[false, false, false]}>
        <CapsuleCollider args={capsuleArgs} />
      </RigidBody>
      
      {isHunter ? (
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
      ) : (
        <group ref={localBodyRef}>
          {/* Body is lower than the camera */}
          <mesh name="local-player-body" position={[0, -0.6, 0]} castShadow>
            <capsuleGeometry args={[0.3, 0.4, 16, 16]} />
            <meshStandardMaterial map={texture} />
          </mesh>
          {/* Head/Face is slightly forward */}
          <mesh position={[0, 0, -0.1]} castShadow>
            <boxGeometry args={[0.4, 0.4, 0.4]} />
            <meshStandardMaterial color="#ffcc99" />
          </mesh>
          {/* Paint brush */}
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
              <meshStandardMaterial color={currentColor} roughness={0.8} />
            </mesh>
          </group>
        </group>
      )}
    </>
  );
}
