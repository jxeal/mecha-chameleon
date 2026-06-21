import { create } from 'zustand';
import * as THREE from 'three';
import { io, Socket } from 'socket.io-client';

export interface BulletMark {
  id: string;
  position: THREE.Vector3;
  normal: THREE.Vector3;
  timestamp: number;
}

export interface RemotePlayer {
  id: string;
  position: { x: number, y: number, z: number };
  rotation: { x: number, y: number, z: number, w: number };
  role: "hunter" | "player";
}

interface GameState {
  socket: Socket | null;
  marks: BulletMark[];
  players: Record<string, RemotePlayer>;
  myId: string | null;
  roomId: string | null;
  roomStatus: "lobby" | "playing" | null;
  maxHunters: number;
  isAdmin: boolean;
  sensitivity: number;
  error: string | null;
  
  initSocket: () => void;
  createRoom: (config: { maxPlayers: number, maxHunters: number }) => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: () => void;
  kickPlayer: (playerId: string) => void;
  setRole: (role: "hunter" | "player") => void;
  startGame: () => void;
  setSensitivity: (val: number) => void;
  clearError: () => void;

  addMark: (mark: Omit<BulletMark, 'timestamp' | 'id'>) => void;
  removeMark: (id: string) => void;
  updateMyPosition: (pos: THREE.Vector3, rot: THREE.Quaternion) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  socket: null,
  marks: [],
  players: {},
  myId: null,
  roomId: null,
  roomStatus: null,
  maxHunters: 2,
  isAdmin: false,
  sensitivity: 1,
  error: null,

  initSocket: () => {
    if (get().socket) return; 
    
    const socket = io();
    
    socket.on("connected", (id) => {
      set({ myId: id });
    });

    socket.on("room:joined", (data) => {
      set({ 
        roomId: data.roomId,
        isAdmin: data.isAdmin,
        myId: data.me,
        marks: data.marks.map((m: any) => ({
          ...m,
          position: new THREE.Vector3(m.position.x, m.position.y, m.position.z),
          normal: new THREE.Vector3(m.normal.x, m.normal.y, m.normal.z),
        })),
        players: data.players,
        roomStatus: data.status,
        maxHunters: data.maxHunters,
        error: null
      });
    });

    socket.on("room:started", () => {
      set({ roomStatus: "playing" });
    });

    socket.on("room:admin_changed", (newAdminId) => {
      set({ isAdmin: newAdminId === get().myId });
    });

    socket.on("room:error", (msg) => {
      set({ error: msg });
    });

    socket.on("room:kicked", () => {
      set({ roomId: null, roomStatus: null, error: "You were kicked from the room", marks: [], players: {} });
    });

    socket.on("player:joined", (player) => {
      set((state) => ({ players: { ...state.players, [player.id]: player } }));
    });

    socket.on("player:role_changed", ({ id, role }) => {
      set((state) => {
        const next = { ...state.players };
        if (next[id]) {
          next[id] = { ...next[id], role };
        }
        return { players: next };
      });
    });

    socket.on("player:moved", (data) => {
      set((state) => {
        const next = { ...state.players };
        if (next[data.id]) {
          next[data.id] = { ...next[data.id], position: data.position, rotation: data.rotation };
        }
        return { players: next };
      });
    });

    socket.on("player:left", (id) => {
      set((state) => {
        const next = { ...state.players };
        delete next[id];
        return { players: next };
      });
    });

    socket.on("mark:added", (m) => {
      const mark: BulletMark = {
        ...m,
        position: new THREE.Vector3(m.position.x, m.position.y, m.position.z),
        normal: new THREE.Vector3(m.normal.x, m.normal.y, m.normal.z),
      };
      set((state) => {
        if (state.marks.find(existing => existing.id === mark.id)) return state;
        return { marks: [...state.marks, mark] };
      });
    });

    set({ socket });
  },

  createRoom: (config) => {
      get().socket?.emit("room:create", config);
  },

  joinRoom: (roomId) => {
    get().socket?.emit("room:join", roomId);
  },

  leaveRoom: () => {
    get().socket?.emit("room:leave");
    set({ roomId: null, roomStatus: null, isAdmin: false, marks: [], players: {} });
  },

  kickPlayer: (playerId) => {
    get().socket?.emit("room:kick", playerId);
  },

  setRole: (role) => {
    get().socket?.emit("room:set_role", role);
  },

  startGame: () => {
    get().socket?.emit("room:start");
  },

  setSensitivity: (val) => set({ sensitivity: val }),
  clearError: () => set({ error: null }),
  
  addMark: (mark) => {
    const id = Math.random().toString(36).substring(7);
    const timestamp = Date.now();
    const newMark = { ...mark, id, timestamp };
    
    set((state) => ({ marks: [...state.marks, newMark] }));
    
    get().socket?.emit("mark:add", {
      id,
      position: { x: mark.position.x, y: mark.position.y, z: mark.position.z },
      normal: { x: mark.normal.x, y: mark.normal.y, z: mark.normal.z },
    });
  },
  
  removeMark: (id) => set((state) => ({ marks: state.marks.filter(m => m.id !== id) })),
  
  updateMyPosition: (pos, rot) => {
    const socket = get().socket;
    if (socket && get().roomId) {
      socket.emit("player:move", {
        position: { x: pos.x, y: pos.y, z: pos.z },
        rotation: { x: rot.x, y: rot.y, z: rot.z, w: rot.w },
      });
    }
  }
}));
