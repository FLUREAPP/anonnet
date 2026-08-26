import "dotenv/config";
import express from "express";
import http from "http";
import path from "path";
import { Server, Socket } from "socket.io";
import { createServer as createViteServer } from "vite";

type Language = "id" | "en";
type MessageType = "text" | "snap" | "photo" | "audio" | "voice";
interface ChatMessage { id: string; sender: "me" | "stranger"; type: MessageType; text?: string; content?: string; image?: string; audio?: string; duration?: number; timestamp?: number; status?: "sent" | "delivered" | "read"; }
interface CustomSocket extends Socket { room?: string | null; language?: Language; rateState?: Map<string, { startedAt: number; count: number }>; }
const PORT = Number(process.env.PORT || 3000);
const MAX_MESSAGE_BYTES = 8 * 1024 * 1024;
const MAX_TEXT_LENGTH = 4000;
const MAX_DATA_URL_LENGTH = 7 * 1024 * 1024;
const RATE_LIMITS: Record<string, { windowMs: number; max: number }> = { send_message: { windowMs: 10_000, max: 30 }, typing: { windowMs: 10_000, max: 40 }, find_partner: { windowMs: 10_000, max: 5 }, signaling: { windowMs: 10_000, max: 30 } };

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: process.env.ALLOWED_ORIGIN || true, methods: ["GET", "POST"] }, maxHttpBufferSize: MAX_MESSAGE_BYTES, transports: ["websocket", "polling"] });
  const waitingUsers: CustomSocket[] = [];
  let onlineUsersCount = 0;
  const emitOnlineCount = () => io.emit("online_count", Math.max(0, onlineUsersCount));
  function removeFromWaiting(socket: CustomSocket) { const index = waitingUsers.findIndex((user) => user.id === socket.id); if (index !== -1) waitingUsers.splice(index, 1); }
  function createRoomName(first: CustomSocket, second: CustomSocket) { return `room_${first.id}_${second.id}_${Date.now()}`; }
  function allow(socket: CustomSocket, action: string) { const config = RATE_LIMITS[action]; if (!config) return true; if (!socket.rateState) socket.rateState = new Map(); const now = Date.now(); const state = socket.rateState.get(action); if (!state || now - state.startedAt >= config.windowMs) { socket.rateState.set(action, { startedAt: now, count: 1 }); return true; } state.count += 1; return state.count <= config.max; }
  function isValidMessage(data: unknown): data is ChatMessage { if (!data || typeof data !== "object") return false; const message = data as Partial<ChatMessage>; if ((typeof message.id !== "string" && typeof message.id !== "number") || !["text", "snap", "photo", "audio", "voice"].includes(message.type || "")) return false; if (message.text !== undefined && (typeof message.text !== "string" || message.text.length > MAX_TEXT_LENGTH)) return false; for (const field of [message.content, message.image, message.audio]) if (field !== undefined && (typeof field !== "string" || field.length > MAX_DATA_URL_LENGTH)) return false; if (message.duration !== undefined && (!Number.isFinite(message.duration) || message.duration < 0 || message.duration > 120)) return false; return true; }
  function relay(socket: CustomSocket, event: string, payload: unknown, action = "signaling") { if (!socket.room || !allow(socket, action)) return; socket.to(socket.room).emit(event, payload); }
  function findPartner(socket: CustomSocket, language: Language) { if (!allow(socket, "find_partner")) return; socket.language = language === "en" ? "en" : "id"; removeFromWaiting(socket); if (socket.room) { const oldRoom = socket.room; socket.to(oldRoom).emit("partner_disconnected"); socket.leave(oldRoom); socket.room = null; } const availableIndex = waitingUsers.findIndex((candidate) => candidate.id !== socket.id && candidate.connected && !candidate.room); if (availableIndex !== -1) { const other = waitingUsers.splice(availableIndex, 1)[0]; if (other) { const roomName = createRoomName(socket, other); socket.join(roomName); other.join(roomName); socket.room = roomName; other.room = roomName; io.to(roomName).emit("connected"); io.to(roomName).emit("partner_online"); return; } } waitingUsers.push(socket); socket.emit("waiting"); }
  io.on("connection", (rawSocket: Socket) => {
    const socket = rawSocket as CustomSocket; socket.room = null; socket.language = "id"; socket.rateState = new Map(); onlineUsersCount++; emitOnlineCount();
    socket.on("find_partner", (data) => findPartner(socket, data?.language === "en" ? "en" : "id"));
    socket.on("send_message", (messageData: unknown) => { if (!socket.room || !allow(socket, "send_message") || !isValidMessage(messageData)) return; const input = messageData as ChatMessage; const sanitized: ChatMessage = { id: String(input.id).slice(0, 128), sender: "stranger", type: input.type, timestamp: Date.now() }; if (input.text !== undefined) sanitized.text = input.text; if (input.content !== undefined) sanitized.content = input.content; if (input.image !== undefined) sanitized.image = input.image; if (input.audio !== undefined) sanitized.audio = input.audio; if (input.duration !== undefined) sanitized.duration = input.duration; socket.to(socket.room).emit("receive_message", sanitized); });
    socket.on("unsend_message", (messageId: unknown) => { if (!socket.room || !allow(socket, "send_message") || (typeof messageId !== "string" && typeof messageId !== "number")) return; socket.to(socket.room).emit("delete_message", String(messageId).slice(0, 128)); });
    socket.on("typing", () => relay(socket, "lawan_sedang_mengetik", undefined, "typing")); socket.on("stop_typing", () => relay(socket, "lawan_berhenti_mengetik", undefined, "typing"));
    socket.on("mark_delivered", (messageId: unknown) => { if (typeof messageId !== "string" && typeof messageId !== "number") return; relay(socket, "message_delivered", String(messageId).slice(0, 128), "typing"); });
    socket.on("mark_read", (messageId: unknown) => { if (typeof messageId !== "string" && typeof messageId !== "number") return; relay(socket, "message_read", String(messageId).slice(0, 128), "typing"); });
    socket.on("call_offer", (data: unknown) => relay(socket, "call_offer", data)); socket.on("call_answer", (data: unknown) => relay(socket, "call_answer", data)); socket.on("ice_candidate", (data: unknown) => relay(socket, "ice_candidate", data)); socket.on("call_declined", () => relay(socket, "call_declined", undefined)); socket.on("call_ended", () => relay(socket, "call_ended", undefined));
    socket.on("stop_chat", () => { removeFromWaiting(socket); if (!socket.room) return; socket.to(socket.room).emit("partner_disconnected"); socket.leave(socket.room); socket.room = null; });
    socket.on("disconnect", () => { removeFromWaiting(socket); if (socket.room) { socket.to(socket.room).emit("partner_disconnected"); socket.leave(socket.room); socket.room = null; } onlineUsersCount = Math.max(0, onlineUsersCount - 1); emitOnlineCount(); });
  });
  app.get("/api/health", (_req, res) => res.json({ status: "ok", app: "Anonnect", onlineUsers: onlineUsersCount, mode: "Pure Human Matchmaking" }));
  if (process.env.NODE_ENV !== "production") { const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" }); app.use(vite.middlewares); } else { const distPath = path.join(process.cwd(), "dist"); app.use(express.static(distPath)); app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html"))); }
  server.listen(PORT, "0.0.0.0", () => console.log(`Anonnect Server running on http://0.0.0.0:${PORT}`));
}
startServer().catch((error) => { console.error("Failed to start Anonnect:", error); process.exit(1); });