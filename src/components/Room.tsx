import { RigidBody } from '@react-three/rapier';

export function Room() {
  return (
    <group>
      {/* Floor */}
      <RigidBody type="fixed" position={[0, -0.5, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[40, 1, 40]} />
          <meshStandardMaterial color="#333" />
        </mesh>
      </RigidBody>
      <gridHelper args={[40, 40, '#111', '#111']} position={[0, 0.01, 0]} />

      {/* Ceiling */}
      <RigidBody type="fixed" position={[0, 10.5, 0]}>
        <mesh>
          <boxGeometry args={[40, 1, 40]} />
          <meshStandardMaterial color="#888" />
        </mesh>
      </RigidBody>

      {/* Walls */}
      {/* North Wall */}
      <RigidBody type="fixed" position={[0, 5, -20.5]}>
        <mesh receiveShadow>
          <boxGeometry args={[40, 10, 1]} />
          <meshStandardMaterial color="#a8a8a8" />
        </mesh>
      </RigidBody>

      {/* South Wall */}
      <RigidBody type="fixed" position={[0, 5, 20.5]}>
        <mesh receiveShadow>
          <boxGeometry args={[40, 10, 1]} />
          <meshStandardMaterial color="#a8a8a8" />
        </mesh>
      </RigidBody>

      {/* West Wall */}
      <RigidBody type="fixed" position={[-20.5, 5, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[1, 10, 40]} />
          <meshStandardMaterial color="#999" />
        </mesh>
      </RigidBody>

      {/* East Wall */}
      <RigidBody type="fixed" position={[20.5, 5, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[1, 10, 40]} />
          <meshStandardMaterial color="#999" />
        </mesh>
      </RigidBody>

      {/* Some boxes to jump on and shoot */}
      <RigidBody type="fixed" position={[5, 1, -5]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial color="#ff7b00" />
        </mesh>
      </RigidBody>

      <RigidBody type="fixed" position={[8, 2, -5]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2, 4, 2]} />
          <meshStandardMaterial color="#0088ff" />
        </mesh>
      </RigidBody>

    </group>
  );
}
