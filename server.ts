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
  
  // Menambahkan variabel untuk menghitung jumlah pengguna online murni
  let onlineUsersCount = 0;

  io.on('connection', (rawSocket: Socket) => {
    const socket = rawSocket as CustomSocket;
    console.log('Client connected:', socket.id);

    // 1. Tambah jumlah user asli
    onlineUsersCount++;

    // 2. Terapkan Trik Pemancing Angka (Tambah 49 jika ada minimal 1 user)
    let angkaPemancing = onlineUsersCount >= 1 ? onlineUsersCount + 49 : 0;
    io.emit('online_count', angkaPemancing);

    // =========================================================================
    // 1. FIND PARTNER / MATCHMAKING
    // =========================================================================
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
      }
    });

    // =========================================================================
    // 2. CHAT & TYPING INDICATOR
    // =========================================================================
    socket.on('send_message', (messageData: any) => {
      if (!socket.room) return;
      const partnerData = {
        ...messageData,
        sender: "stranger"
      };
      socket.to(socket.room).emit('receive_message', partnerData);
    });

    socket.on('unsend_message', (messageId: number | string) => {
      if (socket.room && !socket.isBotPartner) {
        socket.to(socket.room).emit('delete_message', messageId);
      }
    });

    // BUG FIXED: Menggunakan socket.to(socket.room) agar tidak nyasar ke orang lain
    socket.on('typing', () => {
      if (socket.room) socket.to(socket.room).emit('lawan_sedang_mengetik');
    });

    socket.on('stop_typing', () => {
      if (socket.room) socket.to(socket.room).emit('lawan_berhenti_mengetik');
    });

    // =========================================================================
    // 3. ✦ FITUR BARU CLAUDE: READ RECEIPTS (CENTANG BIRU)
    // =========================================================================
    socket.on('mark_delivered', (msgId) => {
      if (socket.room) socket.to(socket.room).emit('message_delivered', msgId);
    });

    socket.on('mark_read', (msgId) => {
      if (socket.room) socket.to(socket.room).emit('message_read', msgId);
    });

    // =========================================================================
    // 4. ✦ FITUR BARU CLAUDE: VOICE CALL (WebRTC)
    // =========================================================================
    socket.on('call_offer', (data) => {
      if (socket.room) socket.to(socket.room).emit('call_offer', data);
    });

    socket.on('call_answer', (data) => {
      if (socket.room) socket.to(socket.room).emit('call_answer', data);
    });

    socket.on('ice_candidate', (data) => {
      if (socket.room) socket.to(socket.room).emit('ice_candidate', data);
    });

    socket.on('call_declined', () => {
      if (socket.room) socket.to(socket.room).emit('call_declined');
    });

    socket.on('call_ended', () => {
      if (socket.room) socket.to(socket.room).emit('call_ended');
    });

    // =========================================================================
    // 5. STOP CHAT / DISCONNECT
    // =========================================================================
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
    
    socket.on('disconnect', () => {
      onlineUsersCount = Math.max(0, onlineUsersCount - 1);
      let angkaBaru = onlineUsersCount >= 1 ? onlineUsersCount + 49 : 0;
      io.emit('online_count', angkaBaru);
      
      handleDisconnect();
    });
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