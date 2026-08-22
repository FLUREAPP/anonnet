import { io, Socket } from "socket.io-client";

/**
 * Singleton koneksi Socket.IO — dipakai bersama oleh LandingPage (buat baca
 * online_count sebelum masuk chat) dan ChatInterface (buat obrolan
 * sesungguhnya), supaya tidak dobel koneksi & transisi landing -> chat mulus
 * tanpa nyambung ulang dari nol.
 */
export const socket: Socket = io({ autoConnect: false });