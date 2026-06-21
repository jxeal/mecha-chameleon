import { useState } from "react";
import { useGameStore } from "../store";

export function MainMenu() {
  const createRoom = useGameStore((state) => state.createRoom);
  const joinRoom = useGameStore((state) => state.joinRoom);
  const error = useGameStore((state) => state.error);
  const clearError = useGameStore((state) => state.clearError);

  const [joinCode, setJoinCode] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [maxHunters, setMaxHunters] = useState(2);
  const [mode, setMode] = useState<"menu" | "create" | "join">("menu");

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 text-white flex-col">
      <h1 className="text-4xl font-bold mb-4 font-sans tracking-tight">Room Shooter 3D</h1>

      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-100 px-4 py-2 rounded-lg mb-4 flex items-center gap-2">
          {error}
          <button onClick={clearError} className="text-sm rounded p-1 hover:bg-black/20">✕</button>
        </div>
      )}

      {mode === "menu" && (
        <div className="flex flex-col gap-4 w-64 mt-4">
          <button 
            className="px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors cursor-pointer w-full"
            onClick={() => setMode("create")}
          >
            Create Room
          </button>
          <button 
            className="px-6 py-3 bg-neutral-800 text-white border border-neutral-700 font-semibold rounded-lg hover:bg-neutral-700 transition-colors cursor-pointer w-full"
            onClick={() => setMode("join")}
          >
            Join Room
          </button>
        </div>
      )}

      {mode === "create" && (
        <div className="flex flex-col gap-4 w-64 mt-4 bg-neutral-900 p-6 rounded-xl border border-neutral-800">
          <h2 className="text-xl font-medium mb-2">Configure Room</h2>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-neutral-400">Max Players: {maxPlayers}</label>
            <input 
              type="range" 
              min="2" max="24" 
              value={maxPlayers} 
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              className="accent-white cursor-pointer"
            />
          </div>
          <div className="flex flex-col gap-2 mt-2">
            <label className="text-sm text-neutral-400">Max Hunters: {maxHunters}</label>
            <input 
              type="range" 
              min="1" max="3" 
              value={maxHunters} 
              onChange={(e) => setMaxHunters(Number(e.target.value))}
              className="accent-white cursor-pointer"
            />
          </div>
          <button 
            className="px-4 py-2 mt-4 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
            onClick={() => createRoom({ maxPlayers, maxHunters })}
          >
            Start Server
          </button>
          <button 
            className="text-neutral-400 hover:text-white text-sm transition-colors cursor-pointer mt-2"
            onClick={() => setMode("menu")}
          >
             Back
          </button>
        </div>
      )}

      {mode === "join" && (
        <div className="flex flex-col gap-4 w-64 mt-4 bg-neutral-900 p-6 rounded-xl border border-neutral-800">
          <h2 className="text-xl font-medium mb-2">Join by Code</h2>
          <input 
            type="text"
            placeholder="Enter Room Code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            className="px-4 py-2 bg-neutral-950 border border-neutral-800 rounded font-mono text-center outline-none focus:border-neutral-500"
            maxLength={6}
          />
          <button 
            className="px-4 py-2 mt-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
            onClick={() => joinRoom(joinCode)}
            disabled={joinCode.length === 0}
          >
            Join
          </button>
          <button 
            className="text-neutral-400 hover:text-white text-sm transition-colors cursor-pointer mt-2"
            onClick={() => setMode("menu")}
          >
             Back
          </button>
        </div>
      )}

      <p className="text-neutral-500 mt-12 font-mono text-sm max-w-md text-center">
        WASD to move • SHIFT to sprint<br/>SPACE to jump • CLICK to shoot<br/>ESC to unlock mouse
      </p>
    </div>
  );
}
