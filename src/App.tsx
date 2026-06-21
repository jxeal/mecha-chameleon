import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { PointerLockControls, KeyboardControls } from '@react-three/drei';
import { Player } from './components/Player';
import { Room } from './components/Room';
import { BulletMarks } from './components/BulletMarks';
import { RemotePlayers } from './components/RemotePlayers';
import { useState, useEffect, useRef } from 'react';
import { useGameStore } from './store';
import { MainMenu } from './components/MainMenu';
import { InGameUI } from './components/InGameUI';
import { Lobby } from './components/Lobby';

const controls = [
  { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
  { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
  { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
  { name: 'right', keys: ['ArrowRight', 'KeyD'] },
  { name: 'jump', keys: ['Space'] },
  { name: 'sprint', keys: ['ShiftLeft', 'ShiftRight'] },
];

export default function App() {
  const [isLocked, setIsLocked] = useState(false);
  const initSocket = useGameStore((state) => state.initSocket);
  const roomId = useGameStore((state) => state.roomId);
  const roomStatus = useGameStore((state) => state.roomStatus);
  const sensitivity = useGameStore((state) => state.sensitivity);

  const isPlaying = roomStatus === "playing" && roomId !== null;

  useEffect(() => {
    initSocket();
  }, [initSocket]);

  useEffect(() => {
    if (!isPlaying) {
      setIsLocked(false);
    }
  }, [isPlaying]);

  return (
    <div className="w-full h-screen bg-black">
      {/* Reticle */}
      {isPlaying && isLocked && (
        <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-white rounded-full opacity-80" />
        </div>
      )}

      {/* Menus */}
      {!roomId && <MainMenu />}
      
      {roomId && roomStatus === "lobby" && <Lobby />}

      {isPlaying && <InGameUI />}

      {/* Start Playing Overlay (needed to engage PointerLock safely) */}
      <div 
        id="start-overlay"
        className={`absolute inset-0 z-10 bg-black/40 flex items-center justify-center backdrop-blur-sm transition-opacity ${
          isPlaying && !isLocked ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none hidden"
        }`}
      >
        <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-xl shadow-2xl text-center pointer-events-none">
          <h2 className="text-white text-2xl font-bold mb-4">Ready?</h2>
          <p className="text-neutral-400 mb-6 font-mono text-sm">Click anywhere to lock mouse and play.<br/>Press ESC to open menu.</p>
          <div className="w-full h-10 flex items-center justify-center bg-white text-black font-semibold rounded">
            Click to Start
          </div>
        </div>
      </div>

      <KeyboardControls map={controls}>
        <Canvas shadows camera={{ fov: 75 }}>
          <color attach="background" args={['#000']} />
          <ambientLight intensity={0.5} />
          <directionalLight castShadow position={[10, 20, 10]} intensity={1.5} shadow-mapSize={[1024, 1024]} />
          
          <Physics gravity={[0, -20, 0]}>
            <Player />
            <Room />
            <BulletMarks />
            {roomId && <RemotePlayers />}
          </Physics>

          {/* Pointer Lock Controls handles locking/unlocking natively */}
          {isPlaying && (
            <PointerLockControls 
              selector="#start-overlay"
              pointerSpeed={sensitivity} 
              onLock={() => setIsLocked(true)} 
              onUnlock={() => setIsLocked(false)} 
            />
          )}
        </Canvas>
      </KeyboardControls>
    </div>
  );
}
