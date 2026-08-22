import "dotenv/config";
import express from "express";
import http from "http";
import path from "path";
import { Server, Socket } from "socket.io";
import { createServer as createViteServer } from "vite";

type Language = "id" | "en";

interface ChatMessage {
  id: string;
  sender: "me" | "stranger";
  type: "text" | "snap" | "photo" | "audio" | "voice";
  text?: string;
  content?: string;
  image?: string;
  audio?: string;
  duration?: number;
  timestamp?: number;
  status?: "sent" | "delivered" | "read";
}

interface CustomSocket extends Socket {
  room?: string | null;
  language?: Language;
}

const PORT = Number(process.env.PORT || 3000);

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    maxHttpBufferSize: 8 * 1024 * 1024,
    transports: ["websocket", "polling"],
  });

  const waitingUsers: CustomSocket[] = [];
  let onlineUsersCount = 0;

  function emitOnlineCount() {
    io.emit("online_count", Math.max(0, onlineUsersCount));
  }

  function removeFromWaiting(socket: CustomSocket) {
    const index = waitingUsers.findIndex((user) => user.id === socket.id);
    if (index !== -1) waitingUsers.splice(index, 1);
  }

  function createRoomName(first: CustomSocket, second: CustomSocket) {
    return `room_${first.id}_${second.id}_${Date.now()}`;
  }

  function findPartner(socket: CustomSocket, language: Language) {
    socket.language = language === "en" ? "en" : "id";
    removeFromWaiting(socket);

    if (socket.room) {
      const oldRoom = socket.room;
      socket.to(oldRoom).emit("partner_disconnected");
      socket.leave(oldRoom);
      socket.room = null;
    }

    const availableIndex = waitingUsers.findIndex(
      (candidate) => candidate.id !== socket.id && candidate.connected && !candidate.room
    );

    if (availableIndex !== -1) {
      const other = waitingUsers.splice(availableIndex, 1)[0];
      if (other) {
        const roomName = createRoomName(socket, other);
        socket.join(roomName);
        other.join(roomName);
        socket.room = roomName;
        other.room = roomName;

        // Kirim sinyal connected tanpa embel-embel isBot
        io.to(roomName).emit("connected");
        io.to(roomName).emit("partner_online");
        console.log(`Matched ${socket.id} <-> ${other.id}`);
        return;
      }
    }

    waitingUsers.push(socket);
    socket.emit("waiting");
  }

  io.on("connection", (rawSocket: Socket) => {
    const socket = rawSocket as CustomSocket;
    socket.room = null;
    socket.language = "id";
    
    onlineUsersCount++;
    emitOnlineCount();

    socket.on("find_partner", (data) => {
      findPartner(socket, data?.language === "en" ? "en" : "id");
    });

    socket.on("send_message", (messageData: ChatMessage) => {
      if (!socket.room || !messageData || !messageData.id) return;

      const sanitized: ChatMessage = {
        ...messageData,
        id: String(messageData.id),
        sender: "stranger",
        timestamp: messageData.timestamp || Date.now(),
      };

      socket.to(socket.room).emit("receive_message", sanitized);
    });

    socket.on("unsend_message", (messageId: string) => {
      if (!socket.room) return;
      socket.to(socket.room).emit("delete_message", String(messageId));
    });

    socket.on("typing", () => {
      if (!socket.room) return;
      socket.to(socket.room).emit("lawan_sedang_mengetik");
    });

    socket.on("stop_typing", () => {
      if (!socket.room) return;
      socket.to(socket.room).emit("lawan_berhenti_mengetik");
    });

    socket.on("mark_delivered", (messageId: string) => {
      if (!socket.room) return;
      socket.to(socket.room).emit("message_delivered", String(messageId));
    });

    socket.on("mark_read", (messageId: string) => {
      if (!socket.room) return;
      socket.to(socket.room).emit("message_read", String(messageId));
    });

    socket.on("call_offer", (data) => {
      if (!socket.room) return;
      socket.to(socket.room).emit("call_offer", data);
    });

    socket.on("call_answer", (data) => {
      if (!socket.room) return;
      socket.to(socket.room).emit("call_answer", data);
    });

    socket.on("ice_candidate", (data) => {
      if (!socket.room) return;
      socket.to(socket.room).emit("ice_candidate", data);
    });

    socket.on("call_declined", () => {
      if (!socket.room) return;
      socket.to(socket.room).emit("call_declined");
    });

    socket.on("call_ended", () => {
      if (!socket.room) return;
      socket.to(socket.room).emit("call_ended");
    });

    socket.on("stop_chat", () => {
      removeFromWaiting(socket);
      if (!socket.room) return;
      socket.to(socket.room).emit("partner_disconnected");
      socket.leave(socket.room);
      socket.room = null;
    });

    socket.on("disconnect", () => {
      removeFromWaiting(socket);
      if (socket.room) {
        socket.to(socket.room).emit("partner_disconnected");
        socket.leave(socket.room);
        socket.room = null;
      }
      onlineUsersCount = Math.max(0, onlineUsersCount - 1);
      emitOnlineCount();
    });
  });

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", app: "Anonnect", onlineUsers: onlineUsersCount, mode: "Pure Human Matchmaking" });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Anonnect Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start Anonnect:", error);
  process.exit(1);
});