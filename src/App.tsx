/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { io, Socket } from "socket.io-client";
import {
  Camera,
  Trash2,
  Send,
  X,
  Moon,
  Sun,
  ArrowRight,
  MapPin,
  Mail,
  Instagram,
  Linkedin,
  Mic,
  Users,
  SkipForward,
  PhoneOff,
  Play,
  Pause,
  RotateCcw,
  Radar,
  Info
} from "lucide-react";
import ParticleText from "./components/ParticleText";
import EmojiBurst from "./components/EmojiBurst";
import MagneticButton from "./components/MagneticButton";
import AsciiImage from "./components/AsciiImage";
import Text3DFlip from "./components/Text3DFlip";
import { MagneticDots } from "./components/MagneticDots";

// Inisialisasi Socket
const socket: Socket = io({ autoConnect: false });

type MessageType = "text" | "photo" | "voice" | "snap" | "audio";

interface Message {
  id: number | string;
  text?: string;
  content?: string;
  image?: string;
  audio?: string;
  sender: "me" | "stranger";
  type: MessageType;
  status?: "sent" | "delivered" | "read";
  unsent?: boolean;
  meta?: { duration?: number };
  timestamp?: number;
}

const words = ["rahasia", "anonim", "aman", "terjaga"];

const STATUS = {
  searching: {
    label: "Mencari Teman...",
    dot: "bg-amber-400",
    ring: "ring-amber-400/40",
  },
  connected: {
    label: "Terhubung",
    dot: "bg-emerald-400",
    ring: "ring-emerald-400/40",
  },
  disconnected: {
    label: "Terputus",
    dot: "bg-rose-500",
    ring: "ring-rose-500/40",
  },
};

function formatTime(ts?: number | string) {
  const d = new Date(ts || Date.now());
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/* -------------------------------------------------------------------------- */
/*  Sub-komponen: BlurWord                                                    */
/* -------------------------------------------------------------------------- */
function BlurWord({ word, trigger }: { word: string; trigger: number }) {
  const letters = word.split("");
  const STAGGER = 45;
  const DURATION = 500;
  const GRADIENT_HOLD = STAGGER * letters.length + DURATION + 200;

  const [letterStates, setLetterStates] = useState<{ opacity: number; blur: number }[]>(
    letters.map(() => ({ opacity: 0, blur: 20 }))
  );
  const [showGradient, setShowGradient] = useState(true);
  const framesRef = useRef<number[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    framesRef.current.forEach(cancelAnimationFrame);
    timersRef.current.forEach(clearTimeout);
    framesRef.current = [];
    timersRef.current = [];

    setLetterStates(letters.map(() => ({ opacity: 0, blur: 20 })));
    setShowGradient(true);

    letters.forEach((_, i) => {
      const t = setTimeout(() => {
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min((now - start) / DURATION, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setLetterStates((prev) => {
            const next = [...prev];
            next[i] = { opacity: eased, blur: 20 * (1 - eased) };
            return next;
          });
          if (progress < 1) {
            const id = requestAnimationFrame(tick);
            framesRef.current.push(id);
          }
        };
        const id = requestAnimationFrame(tick);
        framesRef.current.push(id);
      }, i * STAGGER);
      timersRef.current.push(t);
    });

    const gt = setTimeout(() => setShowGradient(false), GRADIENT_HOLD);
    timersRef.current.push(gt);

    return () => {
      framesRef.current.forEach(cancelAnimationFrame);
      timersRef.current.forEach(clearTimeout);
    };
  }, [trigger]);

  const gradientColors = ["#eca8d6", "#a78bfa", "#67e8f9", "#fbbf24", "#eca8d6"];

  return (
    <>
      {letters.map((char, i) => {
        const colorIndex = (i / Math.max(letters.length - 1, 1)) * (gradientColors.length - 1);
        const lower = Math.floor(colorIndex);
        const upper = Math.min(lower + 1, gradientColors.length - 1);
        const t = colorIndex - lower;

        const hex2rgb = (hex: string) => {
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          return [r, g, b];
        };
        const [r1, g1, b1] = hex2rgb(gradientColors[lower]);
        const [r2, g2, b2] = hex2rgb(gradientColors[upper]);
        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);

        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: letterStates[i]?.opacity ?? 0,
              filter: `blur(${letterStates[i]?.blur ?? 20}px)`,
              color: showGradient ? `rgb(${r},${g},${b})` : "white",
              transition: "color 0.4s ease",
            }}
          >
            {char}
          </span>
        );
      })}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-komponen: StatusDot                                                   */
/* -------------------------------------------------------------------------- */
function StatusDot({ status }: { status: "searching" | "connected" | "disconnected" }) {
  const s = STATUS[status];
  return (
    <span className="relative flex h-2.5 w-2.5">
      {status === "searching" && (
        <motion.span
          className={`absolute inline-flex h-full w-full rounded-full ${s.dot}`}
          animate={{ scale: [1, 2.4], opacity: [0.6, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${s.dot}`} />
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-komponen: VoiceBubblePlayer                                           */
/* -------------------------------------------------------------------------- */
function VoiceBubblePlayer({ src, duration, isMe }: { src?: string; duration?: number; isMe: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
    setPlaying(!playing);
  };

  const onTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    setProgress((audio.currentTime / audio.duration) * 100);
  };

  const barColor = isMe ? "bg-white/70" : "bg-cyan-400/80";

  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={onTimeUpdate}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
        }}
        className="hidden"
      />
      <button
        type="button"
        onClick={toggle}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isMe ? "bg-white/20" : "bg-cyan-500/20 text-slate-800 dark:text-slate-100"
        }`}
        aria-label={playing ? "Jeda" : "Putar"}
      >
        {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </button>
      <div className="flex-1 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
        <div className={`h-full ${barColor} transition-all`} style={{ width: `${progress}%` }} />
      </div>
      <span className="text-[10px] tabular-nums opacity-70">{formatDuration(duration || 0)}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-komponen: MessageBubble                                               */
/* -------------------------------------------------------------------------- */
function MessageBubble({
  msg,
  isMe,
  isSelected,
  onSelect,
  onUnsend,
}: {
  msg: Message;
  isMe: boolean;
  isSelected: boolean;
  onSelect: (id: number | string | null) => void;
  onUnsend: (id: number | string) => void;
}) {
  if (msg.unsent) {
    return (
      <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-2`}>
        <span className="text-xs italic px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/5 text-slate-400 dark:text-slate-500">
          {isMe ? "Kamu menarik sebuah pesan" : "Lawan bicara menarik sebuah pesan"}
        </span>
      </div>
    );
  }

  const contentText = msg.content || msg.text;
  const mediaUrl = msg.content || msg.image || msg.audio;

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-2`}>
      <div className="flex flex-col max-w-[85%] sm:max-w-[70%]">
        <motion.div
          layout
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          onClick={() => isMe && onSelect(isSelected ? null : msg.id)}
          className={`relative px-3.5 py-2.5 text-sm leading-relaxed shadow-sm cursor-pointer select-none ${
            isMe
              ? "bg-gradient-to-br from-cyan-500 to-violet-600 text-white rounded-2xl rounded-br-md"
              : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-2xl rounded-bl-md border border-slate-200/70 dark:border-slate-700/70"
          }`}
        >
          {msg.type === "text" && <p className="whitespace-pre-wrap break-words">{contentText}</p>}

          {(msg.type === "photo" || msg.type === "snap") && (
            <img
              src={mediaUrl}
              alt="Snap"
              className="rounded-lg max-w-[220px] w-full object-cover"
              draggable={false}
            />
          )}

          {(msg.type === "voice" || msg.type === "audio") && (
            <VoiceBubblePlayer src={mediaUrl} duration={msg.meta?.duration} isMe={isMe} />
          )}

          <AnimatePresence>
            {isSelected && isMe && (
              <motion.button
                initial={{ opacity: 0, scale: 0.6, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.6 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onUnsend(msg.id);
                }}
                className="absolute -top-3 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/30"
                aria-label="Tarik pesan"
              >
                <Trash2 size={13} />
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
        <span
          className={`mt-1 text-[10px] text-slate-400 dark:text-slate-500 ${
            isMe ? "text-right mr-1" : "text-left ml-1"
          }`}
        >
          {formatTime(msg.timestamp || Number(msg.id))}
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-komponen: TypingIndicator                                             */
/* -------------------------------------------------------------------------- */
function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="flex justify-start mb-2"
    >
      <div className="flex items-center gap-1 px-3.5 py-3 rounded-2xl rounded-bl-md bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-500"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-komponen: CameraModal                                                 */
/* -------------------------------------------------------------------------- */
function CameraModal({
  onClose,
  onCapture,
}: {
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then((stream) => {
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => setReady(true);
        }
      })
      .catch(() => setError("Tidak bisa mengakses kamera. Periksa izin browser Anda."));

    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const snap = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Cermin
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Watermark
    const fontSize = Math.max(14, Math.round(canvas.width * 0.028));
    ctx.font = `italic ${fontSize}px sans-serif`;
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    const text = "dipotret dari camera";
    const pad = fontSize * 0.9;

    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillText(text, canvas.width - pad + 1, canvas.height - pad + 1);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText(text, canvas.width - pad, canvas.height - pad);

    setPreview(canvas.toDataURL("image/jpeg", 0.8));
  };

  const confirmSend = () => {
    if (preview) onCapture(preview);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-sm rounded-2xl overflow-hidden bg-slate-900 border border-slate-700"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/70">
          <span className="flex items-center gap-2 text-sm font-medium text-slate-200">
            <Camera size={16} /> Kamera Snap
          </span>
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-white/10 text-slate-300"
          >
            <X size={16} />
          </button>
        </div>

        <div className="relative aspect-[3/4] bg-black flex items-center justify-center">
          {error && <p className="text-rose-400 text-sm px-6 text-center">{error}</p>}

          {!preview ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
          ) : (
            <img src={preview} alt="Preview snap" className="h-full w-full object-cover" />
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="flex items-center justify-center gap-4 px-4 py-4">
          {!preview ? (
            <button
              type="button"
              onClick={snap}
              disabled={!ready}
              className="h-14 w-14 rounded-full border-4 border-white/80 bg-white/10 disabled:opacity-30 active:scale-95 transition-transform"
              aria-label="Ambil foto"
            />
          ) : (
            <>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-700 text-slate-100 text-sm hover:bg-slate-600"
              >
                <RotateCcw size={14} /> Ulangi
              </button>
              <button
                type="button"
                onClick={confirmSend}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 text-white text-sm shadow-lg shadow-violet-500/30"
              >
                <Send size={14} /> Kirim
              </button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Halaman: Landing Page                                                     */
/* -------------------------------------------------------------------------- */
function LandingPage({ onStart }: { onStart: () => void }) {
  const [isVisible, setIsVisible] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % words.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-[100svh] flex flex-col justify-center items-start overflow-hidden bg-black font-sans antialiased selection:bg-white/20">
      <div className="absolute inset-0 z-0">
        <video autoPlay muted loop playsInline aria-hidden="true" className="w-full h-full object-cover object-[80%_center] sm:object-right opacity-90">
          <source src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/bg-hero-0BnFGdr81Ifnj3WbBZoNt1KE4D5DMT.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80" />
      </div>

      <header className="absolute top-0 left-0 right-0 z-50 w-full max-w-[1400px] mx-auto flex items-center justify-between px-6 lg:px-12 py-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-lg sm:text-xl font-bold tracking-widest text-white uppercase">
            ANONNECT <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 font-mono ml-1">BETA</span>
          </span>
        </div>
      </header>

      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 lg:px-12 py-24 sm:py-32 lg:py-40">
        <div className="w-full lg:max-w-[85%] xl:max-w-[75%]">
          <div className={`mb-6 sm:mb-8 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <span className="inline-flex items-center gap-3 text-xs sm:text-sm font-mono text-white/70">
              <span className="w-6 sm:w-8 h-px bg-white/40" />
              Platform Obrolan Anonim Anti-Fake
            </span>
          </div>

          <div className="mb-10 sm:mb-14">
            <h1 className={`text-left text-4xl sm:text-5xl md:text-6xl lg:text-[5.5rem] font-extrabold leading-[1.15] sm:leading-[1.1] tracking-tight text-white transition-all duration-1000 flex flex-col gap-1 sm:gap-3 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
              <span className="break-words">Koneksi nyata,</span>
              <span className="flex flex-wrap items-center gap-x-2 sm:gap-x-4">
                <span>identitas</span>
                <span className="relative inline-block">
                  <BlurWord word={words[wordIndex]} trigger={wordIndex} />
                </span>
              </span>
            </h1>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }} transition={{ delay: 0.3, duration: 0.8 }}>
            <ShaderButton onClick={onStart} className="h-14 w-[280px] sm:w-[320px] uppercase text-xs sm:text-sm font-bold">
              Mulai Obrolan Sekarang
            </ShaderButton>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Halaman: Chat Interface                                                   */
/* -------------------------------------------------------------------------- */
function ChatInterface({ onNavigateToAbout }: { onNavigateToAbout: () => void }) {
  const [darkMode, setDarkMode] = useState(true);
  const [status, setStatus] = useState<"searching" | "connected" | "disconnected">("searching");
  const [onlineCount, setOnlineCount] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [selectedMsgId, setSelectedMsgId] = useState<number | string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  /* --- Koneksi socket & listener utama ------------------------------------ */
  useEffect(() => {
    socket.connect();

    socket.on("connect", () => {
      socket.emit("find_partner");
    });
    socket.on("disconnect", () => setStatus("disconnected"));
    socket.on("online_count", (count: number) => setOnlineCount(count));

    // Mendukung sinyal 'connected' atau 'partner_found'
    const handleConnected = () => {
      setStatus("connected");
      setMessages([]);
    };
    socket.on("partner_found", handleConnected);
    socket.on("connected", handleConnected);

    socket.on("waiting", () => {
      setStatus("searching");
    });

    socket.on("partner_disconnected", () => {
      setStatus("disconnected");
      setPartnerTyping(false);
    });

    socket.on("receive_message", (payload: Message) => {
      setMessages((prev) => [
        ...prev,
        {
          id: payload.id || `${Date.now()}-r`,
          sender: "stranger",
          type: payload.type || "text",
          content: payload.content || payload.text || payload.image || payload.audio,
          meta: payload.meta,
          timestamp: payload.timestamp || Date.now(),
        },
      ]);
      setPartnerTyping(false);
    });

    // Mendukung varian sinyal typing
    socket.on("partner_typing", () => setPartnerTyping(true));
    socket.on("lawan_sedang_mengetik", () => setPartnerTyping(true));
    socket.on("partner_stop_typing", () => setPartnerTyping(false));
    socket.on("lawan_berhenti_mengetik", () => setPartnerTyping(false));

    // Mendukung delete/unsend
    socket.on("message_unsent", ({ id }: { id: string | number }) => {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, unsent: true } : m)));
    });
    socket.on("delete_message", (id: string | number) => {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, unsent: true } : m)));
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("online_count");
      socket.off("partner_found");
      socket.off("connected");
      socket.off("waiting");
      socket.off("partner_disconnected");
      socket.off("receive_message");
      socket.off("partner_typing");
      socket.off("lawan_sedang_mengetik");
      socket.off("partner_stop_typing");
      socket.off("lawan_berhenti_mengetik");
      socket.off("message_unsent");
      socket.off("delete_message");
      socket.disconnect();
    };
  }, []);

  /* --- Auto-scroll ---------------------------------------------------------*/
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, partnerTyping]);

  /* --- Helper: kirim pesan -------------------------------------------------*/
  const pushLocalMessage = useCallback((type: MessageType, content: string, meta?: { duration?: number }) => {
    const id = `${Date.now()}-m`;
    const newMsg: Message = { id, sender: "me", type, content, text: content, meta, timestamp: Date.now() };
    setMessages((prev) => [...prev, newMsg]);
    socket.emit("send_message", newMsg);
  }, []);

  /* --- Input teks & indikator mengetik ------------------------------------*/
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    socket.emit("typing");
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing");
    }, 1200);
  };

  const sendText = () => {
    const text = inputText.trim();
    if (!text || status !== "connected") return;
    pushLocalMessage("text", text);
    setInputText("");
    socket.emit("stop_typing");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendText();
    }
  };

  /* --- Unsend pesan ---------------------------------------------------------*/
  const handleUnsend = (id: number | string) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, unsent: true } : m)));
    socket.emit("unsend_message", id);
    setSelectedMsgId(null);
  };

  /* --- Kamera snap ---------------------------------------------------------*/
  const handleCapture = (dataUrl: string) => {
    pushLocalMessage("photo", dataUrl);
    setShowCamera(false);
  };

  /* --- Voice note (tekan & tahan) -------------------------------------------*/
  const startRecording = async () => {
    if (status !== "connected" || isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          pushLocalMessage("voice", base64Audio, { duration: recordSeconds });
        };
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch {
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    mediaRecorderRef.current?.stop();
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    setIsRecording(false);
  };

  /* --- Stop & Next -----------------------------------------------------------*/
  const handleStop = () => {
    socket.emit("stop_chat");
    setStatus("disconnected");
    setMessages([]);
    setPartnerTyping(false);
  };

  const handleNext = () => {
    socket.emit("find_partner");
    setStatus("searching");
    setMessages([]);
    setPartnerTyping(false);
  };

  const s = STATUS[status];
  const canType = status === "connected";

  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="flex flex-col h-[100dvh] w-full bg-slate-50 dark:bg-[#0B0F19] text-slate-800 dark:text-slate-100 transition-colors">
        {/* Header */}
        <header className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0B0F19]/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 shadow-lg shadow-violet-500/20">
              <Radar size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight bg-gradient-to-r from-cyan-500 to-violet-600 bg-clip-text text-transparent">
                Anonnect
              </h1>
              <div className="flex items-center gap-1.5 -mt-0.5">
                <StatusDot status={status} />
                <span className="text-[11px] text-slate-500 dark:text-slate-400">{s.label}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/80 text-xs font-medium">
              <Users size={13} className="text-emerald-500" />
              <span className="tabular-nums">{onlineCount.toLocaleString("id-ID")}</span>
            </div>
            <button
              type="button"
              onClick={() => setDarkMode((v) => !v)}
              className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              aria-label="Ganti tema"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={darkMode ? "moon" : "sun"}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex"
                >
                  {darkMode ? <Moon size={15} /> : <Sun size={15} />}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </header>

        {/* Chat body */}
        <main
          onClick={() => selectedMsgId && setSelectedMsgId(null)}
          className="flex-1 overflow-y-auto px-3 sm:px-4 py-4"
        >
          <div className="max-w-2xl mx-auto">
            {status === "searching" && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center py-16 gap-3">
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                  className="h-16 w-16 rounded-full bg-gradient-to-br from-cyan-500/20 to-violet-600/20 flex items-center justify-center"
                >
                  <Radar size={26} className="text-violet-500" />
                </motion.div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Mencari lawan bicara acak untukmu…
                </p>
              </div>
            )}

            {status === "disconnected" && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center py-16 gap-3">
                <PhoneOff size={26} className="text-rose-400" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Obrolan telah berakhir. Tekan Next untuk mulai obrolan baru.
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isMe={msg.sender === "me"}
                isSelected={selectedMsgId === msg.id}
                onSelect={setSelectedMsgId}
                onUnsend={handleUnsend}
              />
            ))}

            <AnimatePresence>{partnerTyping && <TypingIndicator />}</AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Input bar */}
        <footer className="shrink-0 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#0B0F19]/90 backdrop-blur-md">
          <div className="max-w-2xl mx-auto w-full px-3 sm:px-4 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
            {isRecording ? (
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/30">
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="h-2.5 w-2.5 rounded-full bg-rose-500"
                />
                <span className="text-sm font-medium text-rose-500 tabular-nums flex-1">
                  Merekam suara… {formatDuration(recordSeconds)}
                </span>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-3 py-1.5 rounded-full bg-rose-500 text-white text-xs font-medium"
                >
                  Selesai
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={handleStop}
                  disabled={status === "disconnected"}
                  className="h-10 w-10 shrink-0 flex items-center justify-center rounded-full bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 disabled:opacity-30 transition-colors"
                  aria-label="Stop obrolan"
                  title="Stop"
                >
                  <PhoneOff size={17} />
                </button>

                <div className="flex-1 flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800/80 pl-4 pr-1.5 py-1.5">
                  <input
                    value={inputText}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    disabled={!canType}
                    placeholder={canType ? "Tulis pesan…" : "Menunggu koneksi…"}
                    className="flex-1 bg-transparent outline-none text-sm placeholder:text-slate-400 disabled:cursor-not-allowed min-w-0"
                  />

                  <button
                    type="button"
                    onClick={() => setShowCamera(true)}
                    disabled={!canType}
                    className="h-8 w-8 shrink-0 flex items-center justify-center rounded-full text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                    aria-label="Buka kamera"
                    title="Kamera"
                  >
                    <Camera size={16} />
                  </button>

                  <button
                    type="button"
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onMouseLeave={() => isRecording && stopRecording()}
                    onTouchStart={startRecording}
                    onTouchEnd={stopRecording}
                    disabled={!canType}
                    className="h-8 w-8 shrink-0 flex items-center justify-center rounded-full text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                    aria-label="Tahan untuk rekam suara"
                    title="Tahan untuk rekam"
                  >
                    <Mic size={16} />
                  </button>

                  {inputText.trim() && (
                    <motion.button
                      type="button"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      onClick={sendText}
                      className="h-8 w-8 shrink-0 flex items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 text-white"
                      aria-label="Kirim pesan"
                    >
                      <Send size={14} />
                    </motion.button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleNext}
                  className="h-10 px-3.5 shrink-0 flex items-center gap-1.5 rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 text-white text-sm font-medium shadow-md shadow-violet-500/25 hover:shadow-violet-500/40 transition-shadow"
                  aria-label="Cari partner baru"
                  title="Next"
                >
                  <SkipForward size={15} />
                  <span className="hidden sm:inline">Next</span>
                </button>
              </div>
            )}

            {/* Footer link */}
            <div className="flex items-center justify-center gap-1.5 mt-2.5 text-[11px] text-slate-400 dark:text-slate-500">
              <span>🔒 Secured by Anonnect</span>
              <span className="opacity-40">•</span>
              <button
                type="button"
                onClick={() => onNavigateToAbout()}
                className="flex items-center gap-1 underline-offset-2 hover:underline hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <Info size={11} /> Tentang Developer
              </button>
            </div>
          </div>
        </footer>

        {/* Modal kamera */}
        <AnimatePresence>
          {showCamera && (
            <CameraModal onClose={() => setShowCamera(false)} onCapture={handleCapture} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-komponen: GradientBackground                                          */
/* -------------------------------------------------------------------------- */
function GradientBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-20 bg-black">
      <svg className="absolute inset-0 w-full h-full opacity-[0.25] mix-blend-screen z-10" xmlns="http://www.w3.org/2000/svg">
        <filter id="noiseFilter">
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noiseFilter)" />
      </svg>
      <motion.div
        animate={{ scale: [1, 1.1, 1], x: ["0%", "5%", "0%"], y: ["0%", "-5%", "0%"] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -bottom-[20%] -left-[10%] w-[75vw] h-[75vh] rounded-full bg-[#0ea5e9]/50 blur-[120px]"
      />
      <motion.div
        animate={{ scale: [1, 1.15, 1], x: ["0%", "-5%", "0%"], y: ["0%", "5%", "0%"] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-[10%] -right-[10%] w-[65vw] h-[65vh] rounded-full bg-[#38bdf8]/40 blur-[100px]"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Halaman: About Page                                                       */
/* -------------------------------------------------------------------------- */
function AboutPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-[100svh] w-full text-white overflow-hidden selection:bg-white/20 relative flex z-0">
      <GradientBackground />
      <div className="absolute inset-0 z-0 opacity-80 pointer-events-auto">
        <AsciiImage />
      </div>

      <div className="absolute inset-0 z-10 p-6 sm:p-10 pointer-events-none flex flex-col justify-between">
        <div className="w-full flex items-start">
          <button
            type="button"
            onClick={onBack}
            className="pointer-events-auto p-3 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 transition-colors text-zinc-300 hover:text-white backdrop-blur-md shadow-lg"
          >
            <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 rotate-180" />
          </button>
        </div>

        <div className="absolute bottom-6 left-6 sm:bottom-8 sm:left-8 w-[320px] max-w-[calc(100vw-48px)] pointer-events-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-black/70 backdrop-blur-[24px] border border-white/15 rounded-[1.5rem] p-5 w-full flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.8)]"
          >
            <div>
              <h3 className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1 font-semibold font-sans">
                ABOUT DEVELOPER
              </h3>
              <h2 className="text-xl font-bold tracking-tight mb-2 text-white font-sans">
                Rizky Mahreza
              </h2>
              <p className="text-zinc-300 text-xs leading-snug mb-4 font-sans font-medium">
                HSE enthusiast & creator exploring tech and AI. Building digital experiences and sharing the journey.
              </p>
            </div>

            <div className="space-y-2.5 mb-4 text-zinc-200 text-xs font-sans font-medium">
              <div className="flex items-center gap-2.5">
                <MapPin className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                <span>Sumatra, Indonesia.</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                <a href="mailto:rizkymahreza@icloud.com" className="hover:text-white transition-colors truncate">
                  rizkymahreza@icloud.com
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-zinc-300 shrink-0">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  <path d="M12 21.5c-1.666 0-3.26-.43-4.663-1.214L3 21l.732-4.14A9.458 9.458 0 0 1 2.5 12c0-5.247 4.253-9.5 9.5-9.5s9.5 4.253 9.5 9.5-4.253 9.5-9.5 9.5z" />
                </svg>
                <a href="https://wa.me/13312207673" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  +1 (331)-220-7673
                </a>
              </div>
            </div>

            <div className="flex items-center gap-4 font-sans text-xs text-zinc-300 font-medium mb-4">
              <span>Follow me</span>
              <a href="https://www.instagram.com/rizkymahreza?igsh=eXV3cnR6cDZrbTA4&utm_source=qr" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors hover:scale-110">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="https://linkedin.com/in/rizky-mahreza" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors hover:scale-110">
                <Linkedin className="w-4 h-4" />
              </a>
            </div>

            {/* SEKSI QUICK LINKS & DONASI */}
            <div className="pt-4 border-t border-white/15 flex flex-col w-full">
              <p className="text-[10px] text-zinc-300 font-sans leading-relaxed mb-4">
                Bagi siapapun yang ingin membantu developer terus membangun <b className="text-white">Anonnect</b>, setiap dukunganmu sangat berarti!
              </p>
              
              <div className="flex items-center justify-between w-full">
                <div className="flex flex-col">
                  <h3 className="text-xs font-semibold text-white mb-1.5 font-sans">Quick Links</h3>
                  <a href="https://hse-excellence.preview.emergentagent.com/?utm_source=ig&utm_medium=social&utm_content=link_in_bio&fbclid=PAdGRleATkZpRwZG9mAmZkaWQWUMEIfuO1bv5l2HjDQsQKeAqEC98_TmV4dG4DYWVtAjExAHNydGMGYXBwX2lkDzEyNDAyNDU3NDI4NzQxNAABp9El3Gf_4voYhtukfXcKwRpvbv8C_DfMwvrzbLlWo91YXzJZ5bpSeHMR917c_aem_hDK_tOhJ4l1rt8eVnOsGIQ" target="_blank" rel="noopener noreferrer" className="text-zinc-300 hover:text-white transition-colors text-xs font-sans font-medium w-max relative z-10">
                    Portfolio
                  </a>
                </div>
                
                <a href="/donasi.html" target="_blank" rel="noopener noreferrer" className="shrink-0 relative z-10">
                  <ShaderButton className="h-[42px] w-[90px] sm:w-[100px]">
                    Donasi
                  </ShaderButton>
                </a>
              </div>
            </div>

          </motion.div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-komponen: ShaderButton                                                */
/* -------------------------------------------------------------------------- */
function ShaderButton({ children, onClick, className = "h-11 w-32" }: { children: React.ReactNode, onClick?: () => void, className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex overflow-hidden rounded-full p-[1.5px] focus:outline-none active:scale-95 transition-transform ${className}`}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
        className="absolute z-0 bg-[conic-gradient(from_90deg_at_50%_50%,#18181b_0%,#ffffff_50%,#18181b_100%)]"
        style={{ width: '400%', height: '400%', top: '-150%', left: '-150%' }}
      />
      <span className="relative z-10 inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-[#09090b] text-sm font-medium text-zinc-200 transition-colors hover:bg-[#18181b] tracking-wide">
        {children}
      </span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Komponen Induk Utama: App                                                 */
/* -------------------------------------------------------------------------- */
type Page = "landing" | "chat" | "about";

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("landing");

  return (
    <AnimatePresence mode="wait">
      {currentPage === "landing" && (
        <motion.div key="landing" exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          <LandingPage onStart={() => setCurrentPage("chat")} />
        </motion.div>
      )}
      {currentPage === "chat" && (
        <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <ChatInterface onNavigateToAbout={() => setCurrentPage("about")} />
        </motion.div>
      )}
      {currentPage === "about" && (
        <motion.div key="about" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <AboutPage onBack={() => setCurrentPage("chat")} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}