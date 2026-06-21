import { useState } from "react";
import { useGameStore } from "../store";
import { Settings2, Users, LogOut, Copy, UserX } from "lucide-react";

export function InGameUI() {
  const roomId = useGameStore((state) => state.roomId);
  const isAdmin = useGameStore((state) => state.isAdmin);
  const players = useGameStore((state) => state.players);
  const myId = useGameStore((state) => state.myId);
  const leaveRoom = useGameStore((state) => state.leaveRoom);
  const kickPlayer = useGameStore((state) => state.kickPlayer);
  const sensitivity = useGameStore((state) => state.sensitivity);
  const setSensitivity = useGameStore((state) => state.setSensitivity);

  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // We need to know if pointer lock is active, but we can just use an overlay that covers when unlocked.
  // Actually, standard practice: users press ESC to unlock pointer lock and see settings.

  if (!roomId) return null;

  const copyCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const myPlayer = myId ? players[myId] : null;
  const isPlayer = myPlayer?.role === "player";

  return (
    <>
      <div className="absolute top-4 right-4 z-30 pointer-events-auto">
        {/* Top right floating buttons (always visible when unlocked) */}
        <div className="flex gap-2">
          <div className="bg-black/50 backdrop-blur text-white px-3 py-1.5 rounded border border-neutral-800 font-mono text-sm flex items-center gap-2">
            Room: <span className="text-blue-400 font-bold">{roomId}</span>
            <button onClick={copyCode} className="hover:text-blue-300 ml-1" title="Copy code">
              <Copy size={14} />
            </button>
          </div>
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className={`p-2 rounded border transition-colors ${isOpen ? 'bg-white text-black border-white' : 'bg-black/50 backdrop-blur text-white border-neutral-800 hover:bg-neutral-800'}`}
          >
            <Settings2 size={18} />
          </button>
        </div>

        {isOpen && (
          <div className="mt-2 w-72 bg-black/80 backdrop-blur-md border border-neutral-800 rounded-xl p-4 text-white shadow-2xl flex flex-col gap-6">
            
            <div>
              <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-3">Settings</h3>
              <div className="flex flex-col gap-2">
                <label className="text-sm flex justify-between">
                  <span>Mouse Sensitivity</span>
                  <span className="font-mono text-neutral-400">{sensitivity.toFixed(2)}</span>
                </label>
                <input 
                  type="range" 
                  min="0.1" 
                  max="3" 
                  step="0.1"
                  value={sensitivity} 
                  onChange={(e) => setSensitivity(Number(e.target.value))}
                  className="accent-blue-500"
                />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Users size={14} /> Players ({Object.keys(players).length + 1})
              </h3>
              <ul className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                <li className="text-sm flex justify-between items-center p-2 rounded bg-neutral-900 border border-neutral-800">
                  <span className="text-blue-400 flex items-center gap-2">
                    You {isAdmin && <span className="text-[10px] bg-blue-500/20 px-1.5 py-0.5 rounded uppercase font-bold tracking-widest text-blue-300">Admin</span>}
                  </span>
                  <span className="text-xs font-mono text-neutral-600 block w-10 truncate">{myId}</span>
                </li>
                
                {Object.values(players).map(p => (
                  <li key={p.id} className="text-sm flex justify-between items-center p-2 rounded bg-neutral-900/50">
                    <span className="text-neutral-300 block w-20 truncate">{p.id}</span>
                    {isAdmin && (
                      <button 
                        onClick={() => kickPlayer(p.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/20 p-1 rounded transition-colors"
                        title="Kick player"
                      >
                        <UserX size={14} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <button 
              onClick={leaveRoom}
              className="mt-2 flex items-center justify-center gap-2 w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-medium rounded-lg border border-red-500/20 transition-colors"
            >
              <LogOut size={16} /> Leave Room
            </button>
          </div>
        )}

        {copied && (
          <div className="absolute top-10 right-10 bg-blue-500 text-white text-xs px-2 py-1 rounded shadow pointer-events-none fade-out">
            Copied!
          </div>
        )}
      </div>

      {isPlayer && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-black/85 backdrop-blur-md border border-neutral-800 rounded-xl px-6 py-3 text-white flex items-center gap-4 shadow-2xl pointer-events-none select-none z-30">
          <div className="w-8 h-8 rounded-full border-2 border-white/20 shadow-inner flex-shrink-0" style={{ backgroundColor: myPlayer?.brushColor ?? '#ff0000', transition: 'background-color 0.2s ease' }} />
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Paint Brush Active</span>
            <span className="text-xs text-neutral-200 mt-0.5">Left Click & Drag: Paint Body | Right Click: Sample Color</span>
          </div>
        </div>
      )}
    </>
  );
}
