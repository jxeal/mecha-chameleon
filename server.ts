import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";

export interface BulletMark {
  id: string;
  position: { x: number, y: number, z: number };
  normal: { x: number, y: number, z: number };
  timestamp: number;
}

export interface PlayerState {
  id: string;
  position: { x: number, y: number, z: number };
  rotation: { x: number, y: number, z: number, w: number };
  role: "hunter" | "player";
  brushColor?: string;
}

export interface RoomState {
  id: string;
  adminId: string;
  marks: BulletMark[];
  players: Record<string, PlayerState>;
  maxPlayers: number;
  maxHunters: number;
  status: "lobby" | "playing";
}

const DEFAULT_MAX_PLAYERS = 10;
const DEFAULT_MAX_HUNTERS = 2;

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });

  // Server state
  const rooms: Record<string, RoomState> = {};
  const socketRoomMap: Record<string, string> = {}; // socketId -> roomId
  const MARK_LIFETIME = 5000;

  // Cleanup old marks periodically
  setInterval(() => {
    const now = Date.now();
    for (const roomId in rooms) {
      const room = rooms[roomId];
      for (let i = room.marks.length - 1; i >= 0; i--) {
        if (now - room.marks[i].timestamp > MARK_LIFETIME) {
          room.marks.splice(i, 1);
        }
      }
    }
  }, 1000);

  function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  function leaveRoom(socket: any) {
    const roomId = socketRoomMap[socket.id];
    if (roomId && rooms[roomId]) {
      const room = rooms[roomId];
      delete room.players[socket.id];
      delete socketRoomMap[socket.id];
      socket.leave(roomId);
      io.to(roomId).emit("player:left", socket.id);

      // If room is empty, delete it
      if (Object.keys(room.players).length === 0) {
        delete rooms[roomId];
      } else if (room.adminId === socket.id) {
        // Reassign admin
        room.adminId = Object.keys(room.players)[0];
        io.to(roomId).emit("room:admin_changed", room.adminId);
      }
    }
  }

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Provide client socket id just in case
    socket.emit("connected", socket.id);

    socket.on("room:create", (config) => {
      const maxP = config?.maxPlayers ?? DEFAULT_MAX_PLAYERS;
      const maxH = config?.maxHunters ?? DEFAULT_MAX_HUNTERS;
      leaveRoom(socket); // leave any existing
      const roomId = generateRoomId();
      rooms[roomId] = {
        id: roomId,
        adminId: socket.id,
        marks: [],
        players: {
          [socket.id]: {
            id: socket.id,
            position: { x: 0, y: 2, z: 0 },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            role: "player"
          }
        },
        maxPlayers: maxP,
        maxHunters: maxH,
        status: "lobby"
      };
      socketRoomMap[socket.id] = roomId;
      socket.join(roomId);
      
      socket.emit("room:joined", {
        roomId,
        isAdmin: true,
        marks: rooms[roomId].marks,
        players: rooms[roomId].players,
        me: socket.id,
        status: "lobby",
        maxHunters: maxH
      });
    });

    socket.on("room:join", (roomId) => {
      roomId = roomId.toUpperCase();
      const room = rooms[roomId];
      if (!room) {
        return socket.emit("room:error", "Room not found");
      }
      if (Object.keys(room.players).length >= room.maxPlayers) {
        return socket.emit("room:error", "Room is full");
      }
      if (room.status === "playing") {
        return socket.emit("room:error", "Game has already started");
      }

      leaveRoom(socket);
      socketRoomMap[socket.id] = roomId;
      socket.join(roomId);

      room.players[socket.id] = {
        id: socket.id,
        position: { x: 0, y: 2, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        role: "player"
      };

      socket.emit("room:joined", {
        roomId,
        isAdmin: false,
        marks: room.marks,
        players: room.players,
        me: socket.id,
        status: room.status,
        maxHunters: room.maxHunters
      });

      socket.to(roomId).emit("player:joined", room.players[socket.id]);
    });

    socket.on("room:kick", (targetSocketId) => {
      const roomId = socketRoomMap[socket.id];
      if (roomId && rooms[roomId]) {
        if (rooms[roomId].adminId === socket.id) {
          // Admin kicking player
          const targetSocket = io.sockets.sockets.get(targetSocketId);
          if (targetSocket) {
            targetSocket.emit("room:kicked");
            leaveRoom(targetSocket);
          }
        }
      }
    });

    socket.on("room:leave", () => {
      leaveRoom(socket);
    });

    socket.on("room:set_role", (role) => {
      const roomId = socketRoomMap[socket.id];
      if (roomId && rooms[roomId] && rooms[roomId].status === 'lobby') {
        if (role === 'hunter') {
          const currentHunters = Object.values(rooms[roomId].players).filter(p => p.role === 'hunter').length;
          if (currentHunters >= rooms[roomId].maxHunters && rooms[roomId].players[socket.id].role !== 'hunter') {
            return socket.emit("room:error", "Max hunters reached");
          }
        }
        rooms[roomId].players[socket.id].role = role;
        io.to(roomId).emit("player:role_changed", { id: socket.id, role });
      }
    });

    socket.on("room:start", () => {
      const roomId = socketRoomMap[socket.id];
      if (roomId && rooms[roomId].adminId === socket.id) {
        rooms[roomId].status = "playing";
        io.to(roomId).emit("room:started");
      }
    });

    socket.on("player:move", (data) => {
      const roomId = socketRoomMap[socket.id];
      if (roomId && rooms[roomId] && rooms[roomId].players[socket.id]) {
        rooms[roomId].players[socket.id].position = data.position;
        rooms[roomId].players[socket.id].rotation = data.rotation;
        if (data.brushColor !== undefined) {
          rooms[roomId].players[socket.id].brushColor = data.brushColor;
        }
        
        socket.volatile.to(roomId).emit("player:moved", {
          id: socket.id,
          position: data.position,
          rotation: data.rotation,
          brushColor: data.brushColor
        });
      }
    });

    socket.on("player:paint", (data) => {
      const roomId = socketRoomMap[socket.id];
      if (roomId && rooms[roomId]) {
        socket.to(roomId).emit("player:painted", {
          id: socket.id,
          u: data.u,
          v: data.v,
          color: data.color
        });
      }
    });

    socket.on("mark:add", (data) => {
      const roomId = socketRoomMap[socket.id];
      if (roomId && rooms[roomId]) {
        const mark = { ...data, timestamp: Date.now() };
        rooms[roomId].marks.push(mark);
        socket.to(roomId).emit("mark:added", mark);
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
      leaveRoom(socket);
    });
  });

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
