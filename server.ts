import express from 'express';
import http from 'http';
import path from 'path';
import { Server, Socket } from 'socket.io';
import { createServer as createViteServer } from 'vite';

interface CustomSocket extends Socket {
  room?: string | null;
  isBotPartner?: boolean;
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = 3000;

  // Configure Socket.IO
  const io = new Server(server, {
    cors: { origin: "*" }
  });

  // Store user waiting for match
  let waitingUser: CustomSocket | null = null;

  // Bot responses for fallback when chatting alone
  const botResponses = [
    "Hey there! Great to meet you on Anonnect. How's your day going?",
    "Hello! I'm enjoying the secret encrypted chat vibes here. What are you up to?",
    "Hey! Have you tried taking a Live Snap yet with the camera button?",
    "Haha awesome! Where are you connecting from?",
    "Nice! This real-time messaging is super smooth.",
    "That's cool! Feel free to send a photo or text anytime."
  ];

  io.on('connection', (rawSocket: Socket) => {
    const socket = rawSocket as CustomSocket;
    console.log('Client connected:', socket.id);

    // 1. FIND PARTNER / NEXT
    socket.on('find_partner', () => {
      // Leave previous room if any
      if (socket.room) {
        socket.to(socket.room).emit('partner_disconnected');
        socket.leave(socket.room);
        socket.room = null;
        socket.isBotPartner = false;
      }

      // Check if someone else is waiting
      if (waitingUser && waitingUser.id !== socket.id && waitingUser.connected) {
        const roomName = `room_${socket.id}_${waitingUser.id}`;
        
        socket.join(roomName);
        waitingUser.join(roomName);

        socket.room = roomName;
        waitingUser.room = roomName;

        socket.isBotPartner = false;
        waitingUser.isBotPartner = false;

        // Notify both clients that they are connected to a real partner
        io.to(roomName).emit('connected', { isBot: false });

        console.log(`Matched ${socket.id} with ${waitingUser.id} in ${roomName}`);
        waitingUser = null;
      } else {
        waitingUser = socket;
        socket.emit('waiting');

        // If no second client joins within 2.5 seconds, pair with interactive stranger bot
        setTimeout(() => {
          if (waitingUser === socket && socket.connected && !socket.room) {
            const botRoom = `bot_room_${socket.id}`;
            socket.join(botRoom);
            socket.room = botRoom;
            socket.isBotPartner = true;
            waitingUser = null;

            socket.emit('connected', { isBot: true });
            
            // Welcome message
            setTimeout(() => {
              if (socket.room === botRoom) {
                socket.emit('receive_message', {
                  id: Date.now(),
                  text: "Connected with an anonymous stranger! Say hi 👋",
                  sender: "stranger",
                  type: "text",
                  status: "read"
                });
              }
            }, 500);
          }
        }, 2500);
      }
    });

    // 2. SEND MESSAGE / LIVE SNAP
    socket.on('send_message', (messageData: any) => {
      if (!socket.room) return;

      if (socket.isBotPartner) {
        setTimeout(() => {
          if (socket.room) {
            const randomReply = botResponses[Math.floor(Math.random() * botResponses.length)];
            socket.emit('receive_message', {
              id: Date.now(),
              text: randomReply,
              sender: "stranger",
              type: "text",
              status: "read"
            });
          }
        }, 1200 + Math.random() * 800);
      } else {
        // Send message to partner in the room with sender adjusted
        const partnerData = {
          ...messageData,
          sender: "stranger"
        };
        socket.to(socket.room).emit('receive_message', partnerData);
      }
    });

    // 3. UNSEND MESSAGE
    socket.on('unsend_message', (messageId: number | string) => {
      if (socket.room && !socket.isBotPartner) {
        socket.to(socket.room).emit('delete_message', messageId);
      }
    });

    // 4. STOP CHAT / DISCONNECT
    const handleDisconnect = () => {
      if (waitingUser === socket) {
        waitingUser = null;
      }
      if (socket.room) {
        if (!socket.isBotPartner) {
          socket.to(socket.room).emit('partner_disconnected');
        }
        socket.leave(socket.room);
        socket.room = null;
        socket.isBotPartner = false;
      }
    };

    socket.on('stop_chat', handleDisconnect);
    socket.on('disconnect', handleDisconnect);
  });

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', app: 'Anonnect' });
  });

  // Vite middleware in dev
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Anonnect Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
