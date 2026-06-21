import { useGameStore } from "../store";
import { Users, Shield, Copy, UserX } from "lucide-react";
import { useState } from "react";

export function Lobby() {
  const roomId = useGameStore((state) => state.roomId);
  const isAdmin = useGameStore((state) => state.isAdmin);
  const maxHunters = useGameStore((state) => state.maxHunters);
  const players = useGameStore((state) => state.players);
  const myId = useGameStore((state) => state.myId);
  const leaveRoom = useGameStore((state) => state.leaveRoom);
  const kickPlayer = useGameStore((state) => state.kickPlayer);
  const setRole = useGameStore((state) => state.setRole);
  const startGame = useGameStore((state) => state.startGame);

  const [copied, setCopied] = useState(false);

  if (!roomId || !myId) return null;
  const myPlayer = players[myId];
  if (!myPlayer) return null;

  const currentHuntersCount = Object.values(players).filter(p => p.role === "hunter").length;

  const copyCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/90 text-white pointer-events-auto">
      <div className="w-full max-w-4xl p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Col - Info */}
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-4xl font-bold font-sans tracking-tight mb-2">Room Lobby</h1>
            <div className="inline-flex items-center gap-2 bg-neutral-900 border border-neutral-800 px-4 py-2 rounded-lg font-mono text-xl">
              Code: <span className="text-blue-400 font-bold tracking-widest">{roomId}</span>
              <button onClick={copyCode} className="ml-2 hover:text-blue-300 text-neutral-400 transition-colors">
                <Copy size={18} />
              </button>
            </div>
            {copied && <p className="text-green-400 text-sm mt-1">Copied to clipboard!</p>}
          </div>

          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl">
            <h2 className="text-lg font-semibold mb-4 text-neutral-300">Your Role</h2>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setRole("player")}
                className={`p-4 rounded-lg border-2 text-center transition-all ${
                  myPlayer.role === "player" 
                  ? "border-blue-500 bg-blue-500/10 text-blue-100" 
                  : "border-neutral-700 bg-neutral-800 hover:border-neutral-500 text-neutral-400"
                }`}
              >
                <div className="font-bold mb-1">Player</div>
                <div className="text-xs opacity-70">Small & Agile</div>
              </button>
              
              <button 
                onClick={() => setRole("hunter")}
                disabled={myPlayer.role !== "hunter" && currentHuntersCount >= maxHunters}
                className={`p-4 rounded-lg border-2 text-center transition-all ${
                  myPlayer.role === "hunter" 
                  ? "border-orange-500 bg-orange-500/10 text-orange-100" 
                  : currentHuntersCount >= maxHunters
                    ? "border-neutral-800 bg-neutral-900 text-neutral-600 opacity-50 cursor-not-allowed"
                    : "border-neutral-700 bg-neutral-800 hover:border-neutral-500 text-neutral-400"
                }`}
              >
                <div className="font-bold mb-1">Hunter</div>
                <div className="text-xs opacity-70 mb-1">Big Body</div>
                <div className="text-[10px] font-mono bg-black/50 rounded px-1">{currentHuntersCount}/{maxHunters} Active</div>
              </button>
            </div>
          </div>

          <div className="flex gap-4 mt-auto">
            <button 
              onClick={leaveRoom}
              className="px-6 py-3 bg-red-500/10 text-red-500 hover:bg-red-500/20 font-semibold rounded-lg border border-red-500/20 transition-colors w-full"
            >
              Leave Room
            </button>
            {isAdmin && (
              <button 
                onClick={startGame}
                className="px-6 py-3 bg-white text-black hover:bg-gray-200 font-bold rounded-lg transition-colors w-full"
              >
                Start Game
              </button>
            )}
            {!isAdmin && (
              <div className="px-6 py-3 bg-neutral-800 text-neutral-400 font-semibold rounded-lg text-center w-full flex items-center justify-center">
                Waiting for admin...
              </div>
            )}
          </div>
        </div>

        {/* Right Col - Players */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 flex flex-col max-h-[80vh]">
          <h2 className="text-lg font-semibold mb-4 text-neutral-300 flex items-center gap-2">
            <Users size={18} /> Players ({Object.keys(players).length})
          </h2>
          <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-2">
            {Object.values(players).map(p => (
              <div key={p.id} className="flex justify-between items-center p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                <div className="flex items-center gap-3">
                  {p.role === "hunter" ? (
                    <div className="w-8 h-8 rounded bg-orange-500/20 text-orange-400 flex items-center justify-center" title="Hunter">
                      <Shield size={16} />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center" title="Player">
                      <Users size={16} />
                    </div>
                  )}
                  <div>
                    <div className="font-mono text-sm text-neutral-200">
                      {p.id === myId ? "You" : p.id}
                      {p.id === useGameStore.getState().roomId ? " (Host)" : ""}
                    </div>
                    <div className="text-xs text-neutral-500 capitalize">{p.role}</div>
                  </div>
                </div>
                {isAdmin && p.id !== myId && (
                  <button 
                    onClick={() => kickPlayer(p.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/20 p-2 rounded transition-colors"
                    title="Kick player"
                  >
                    <UserX size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
