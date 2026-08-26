import "dotenv/config";
import crypto from "crypto";
import https from "https";
import express from "express";
import http from "http";
import path from "path";
import { Server, Socket } from "socket.io";
import { createServer as createViteServer } from "vite";

type Language = "id" | "en";
type MessageType = "text" | "snap" | "photo" | "audio" | "voice";
type MessageStatus = "sent" | "delivered" | "read";

interface ChatMessage {
  id: string | number;
  sender: "me" | "stranger";
  type: MessageType;
  text?: string;
  content?: string;
  image?: string;
  audio?: string;
  duration?: number;
  timestamp?: number;
  status?: MessageStatus;
}

interface CustomSocket extends Socket {
  room?: string | null;
  language?: Language;
  rateState?: Map<string, { startedAt: number; count: number }>;
}

const PORT = Number(process.env.PORT || 3000);
const MAX_MESSAGE_BYTES = 8 * 1024 * 1024;
const MAX_TEXT_LENGTH = 4000;
const MAX_DATA_URL_LENGTH = 7 * 1024 * 1024;
const MEDIA_URL_EXPIRES_SECONDS = 3600;
const RATE_LIMITS: Record<string, { windowMs: number; max: number }> = {
  send_message: { windowMs: 10_000, max: 30 },
  typing: { windowMs: 10_000, max: 40 },
  find_partner: { windowMs: 10_000, max: 5 },
  signaling: { windowMs: 10_000, max: 30 },
};

const AWS_REGION = process.env.AWS_REGION || "";
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "";
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";
const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET || "";
const S3_MEDIA_ENABLED = Boolean(
  AWS_REGION && AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY && AWS_S3_BUCKET,
);

const MEDIA_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
};

function hmac(key: Buffer | string, value: string) {
  return crypto.createHmac("sha256", key).update(value).digest();
}

function sha256(value: string | Buffer) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function getSigningKey(secret: string, dateStamp: string, region: string, service: string) {
  const kDate = hmac(`AWS4${secret}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

function encodeObjectKey(key: string) {
  return key.split("/").map(encodeURIComponent).join("/");
}

function presignS3Url(method: "GET" | "PUT", key: string, expiresIn = MEDIA_URL_EXPIRES_SECONDS) {
  const host = `${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com`;
  const encodedKey = encodeObjectKey(key);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${AWS_REGION}/s3/aws4_request`;
  const credential = `${AWS_ACCESS_KEY_ID}/${credentialScope}`;

  const query = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": credential,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresIn),
    "X-Amz-SignedHeaders": "host",
  });
  query.sort();

  const canonicalQueryString = query.toString();
  const canonicalHeaders = `host:${host}\n`;
  const canonicalRequest = [
    method,
    `/${encodedKey}`,
    canonicalQueryString,
    canonicalHeaders,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join("\n");

  const signature = crypto
    .createHmac("sha256", getSigningKey(AWS_SECRET_ACCESS_KEY, dateStamp, AWS_REGION, "s3"))
    .update(stringToSign)
    .digest("hex");

  return `https://${host}/${encodedKey}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}

function parseDataUrl(value: string) {
  const match = value.match(/^data:([a-z0-9.+-]+);base64,([a-z0-9+/=]+)$/i);
  if (!match) return null;
  const [, mimeType, base64] = match;
  const extension = MEDIA_MIME_TYPES[mimeType.toLowerCase()];
  if (!extension) return null;
  const buffer = Buffer.from(base64, "base64");
  if (!buffer.length || buffer.length > MAX_MESSAGE_BYTES) return null;
  return { mimeType: mimeType.toLowerCase(), extension, buffer };
}

function uploadToS3(key: string, body: Buffer, contentType: string) {
  return new Promise<void>((resolve, reject) => {
    const url = new URL(presignS3Url("PUT", key));
    const request = https.request(
      {
        method: "PUT",
        hostname: url.hostname,
        path: `${url.pathname}${url.search}`,
        headers: {
          "Content-Type": contentType,
          "Content-Length": body.length,
        },
      },
      (response) => {
        let responseBody = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          responseBody += chunk;
        });
        response.on("end", () => {
          if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
            resolve();
            return;
          }
          reject(new Error(`S3 upload failed (${response.statusCode ?? "unknown"}) ${responseBody.slice(0, 300)}`));
        });
      },
    );
    request.on("error", reject);
    request.end(body);
  });
}

async function persistMedia(dataUrl: string, type: "image" | "audio") {
  if (!S3_MEDIA_ENABLED) throw new Error("S3 media storage is not configured");
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) throw new Error("Unsupported or invalid media payload");
  if (type === "image" && !parsed.mimeType.startsWith("image/")) throw new Error("Invalid image type");
  if (type === "audio" && !parsed.mimeType.startsWith("audio/")) throw new Error("Invalid audio type");

  const key = `media/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${parsed.extension}`;
  await uploadToS3(key, parsed.buffer, parsed.mimeType);
  return presignS3Url("GET", key);
}

async function normalizeMessage(input: ChatMessage): Promise<ChatMessage> {
  const sanitized: ChatMessage = {
    id: typeof input.id === "number" ? input.id : String(input.id).slice(0, 128),
    sender: "stranger",
    type: input.type,
    timestamp: Date.now(),
  };

  if (input.text !== undefined) sanitized.text = input.text;
  if (input.duration !== undefined) sanitized.duration = input.duration;

  if (input.type === "snap" || input.type === "photo") {
    const source = input.image || input.content;
    if (!source || !S3_MEDIA_ENABLED) throw new Error("Image storage is not configured");
    sanitized.image = await persistMedia(source, "image");
  }

  if (input.type === "audio" || input.type === "voice") {
    const source = input.audio || input.content;
    if (!source || !S3_MEDIA_ENABLED) throw new Error("Audio storage is not configured");
    sanitized.audio = await persistMedia(source, "audio");
  }

  return sanitized;
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: process.env.ALLOWED_ORIGIN || true, methods: ["GET", "POST"] },
    maxHttpBufferSize: MAX_MESSAGE_BYTES,
    transports: ["websocket", "polling"],
  });

  const waitingUsers: CustomSocket[] = [];
  let onlineUsersCount = 0;

  if (!S3_MEDIA_ENABLED) {
    console.warn("S3 media storage is disabled: set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and AWS_S3_BUCKET");
  }

  const emitOnlineCount = () => io.emit("online_count", Math.max(0, onlineUsersCount));

  function removeFromWaiting(socket: CustomSocket) {
    const index = waitingUsers.findIndex((user) => user.id === socket.id);
    if (index !== -1) waitingUsers.splice(index, 1);
  }

  function createRoomName(first: CustomSocket, second: CustomSocket) {
    return `room_${first.id}_${second.id}_${Date.now()}`;
  }

  function allow(socket: CustomSocket, action: string) {
    const config = RATE_LIMITS[action];
    if (!config) return true;
    if (!socket.rateState) socket.rateState = new Map();

    const now = Date.now();
    const state = socket.rateState.get(action);
    if (!state || now - state.startedAt >= config.windowMs) {
      socket.rateState.set(action, { startedAt: now, count: 1 });
      return true;
    }

    state.count += 1;
    return state.count <= config.max;
  }

  function isValidMessage(data: unknown): data is ChatMessage {
    if (!data || typeof data !== "object") return false;
    const message = data as Partial<ChatMessage>;
    const messageType = message.type;

    if (
      (typeof message.id !== "string" && typeof message.id !== "number") ||
      !["text", "snap", "photo", "audio", "voice"].includes(messageType || "")
    ) return false;

    if (message.text !== undefined && (typeof message.text !== "string" || message.text.length > MAX_TEXT_LENGTH)) return false;

    for (const field of [message.content, message.image, message.audio]) {
      if (field !== undefined && (typeof field !== "string" || field.length > MAX_DATA_URL_LENGTH)) return false;
    }

    if (
      message.duration !== undefined &&
      (!Number.isFinite(message.duration) || message.duration < 0 || message.duration > 120)
    ) return false;

    return true;
  }

  function relay(socket: CustomSocket, event: string, payload: unknown, action = "signaling") {
    if (!socket.room || !allow(socket, action)) return;
    socket.to(socket.room).emit(event, payload);
  }

  function findPartner(socket: CustomSocket, language: Language) {
    if (!allow(socket, "find_partner")) return;
    socket.language = language === "en" ? "en" : "id";
    removeFromWaiting(socket);

    if (socket.room) {
      const oldRoom = socket.room;
      socket.to(oldRoom).emit("partner_disconnected");
      socket.leave(oldRoom);
      socket.room = null;
    }

    const availableIndex = waitingUsers.findIndex(
      (candidate) => candidate.id !== socket.id && candidate.connected && !candidate.room,
    );

    if (availableIndex !== -1) {
      const other = waitingUsers.splice(availableIndex, 1)[0];
      if (other) {
        const roomName = createRoomName(socket, other);
        socket.join(roomName);
        other.join(roomName);
        socket.room = roomName;
        other.room = roomName;
        io.to(roomName).emit("connected");
        io.to(roomName).emit("partner_online");
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
    socket.rateState = new Map();
    onlineUsersCount++;
    emitOnlineCount();

    socket.on("find_partner", (data) => findPartner(socket, data?.language === "en" ? "en" : "id"));

    socket.on("send_message", async (messageData: unknown) => {
      if (!socket.room || !allow(socket, "send_message") || !isValidMessage(messageData)) return;

      try {
        const sanitized = await normalizeMessage(messageData as ChatMessage);
        socket.to(socket.room).emit("receive_message", sanitized);
      } catch (error) {
        console.warn(`Media message rejected for ${socket.id}:`, error instanceof Error ? error.message : error);
        socket.emit("message_error", { message: "Media upload failed" });
      }
    });

    socket.on("unsend_message", (messageId: unknown) => {
      if (
        !socket.room ||
        !allow(socket, "send_message") ||
        (typeof messageId !== "string" && typeof messageId !== "number")
      ) return;
      socket.to(socket.room).emit("delete_message", typeof messageId === "number" ? messageId : String(messageId).slice(0, 128));
    });

    socket.on("typing", () => relay(socket, "lawan_sedang_mengetik", undefined, "typing"));
    socket.on("stop_typing", () => relay(socket, "lawan_berhenti_mengetik", undefined, "typing"));

    socket.on("mark_delivered", (messageId: unknown) => {
      if (typeof messageId !== "string" && typeof messageId !== "number") return;
      relay(socket, "message_delivered", typeof messageId === "number" ? messageId : String(messageId).slice(0, 128), "typing");
    });

    socket.on("mark_read", (messageId: unknown) => {
      if (typeof messageId !== "string" && typeof messageId !== "number") return;
      relay(socket, "message_read", typeof messageId === "number" ? messageId : String(messageId).slice(0, 128), "typing");
    });

    socket.on("call_offer", (data: unknown) => relay(socket, "call_offer", data));
    socket.on("call_answer", (data: unknown) => relay(socket, "call_answer", data));
    socket.on("ice_candidate", (data: unknown) => relay(socket, "ice_candidate", data));
    socket.on("call_declined", () => relay(socket, "call_declined", undefined));
    socket.on("call_ended", () => relay(socket, "call_ended", undefined));

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
    res.json({
      status: "ok",
      app: "Anonnect",
      onlineUsers: onlineUsersCount,
      mode: "Pure Human Matchmaking",
      mediaStorage: S3_MEDIA_ENABLED ? "s3" : "disabled",
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Anonnect Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start Anonnect:", error);
  process.exit(1);
});
