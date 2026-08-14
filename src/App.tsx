/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useState, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Camera, Trash2, Send, X, Moon, Sun, CheckCheck, ArrowRight, MapPin, Mail, Instagram, Linkedin, Mic, Square } from "lucide-react"
import ParticleText from "./components/ParticleText"
import EmojiBurst from "./components/EmojiBurst"
import MagneticButton from "./components/MagneticButton"
import AsciiImage from "./components/AsciiImage"
import Text3DFlip from "./components/Text3DFlip"
import { MagneticDots } from "./components/MagneticDots"
import { io } from "socket.io-client"

const socket = io({ autoConnect: false });
const springConfig = { type: "spring", stiffness: 400, damping: 30, mass: 0.8 }

type Message = {
  id: number | string;
  text?: string;
  image?: string;
  audio?: string;
  sender: "me" | "stranger";
  type: "text" | "snap" | "audio";
  status?: "sent" | "delivered" | "read";
}

const words = ["rahasia", "anonim", "aman", "terjaga"];

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
          setLetterStates(prev => {
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

function LandingPage({ onStart }: { onStart: () => void }) {
  const [isVisible, setIsVisible] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
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

function ChatInterface({ onGoToAbout }: { onGoToAbout: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<"searching" | "connected" | "disconnected">("connected");
  const [onlineCount, setOnlineCount] = useState<number>(0);

  // STATE UNTUK REKAMAN SUARA (VOICE NOTE)
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: "Halo! Selamat datang di Anonnect.", sender: "stranger", type: "text" }
  ]);
  const [inputValue, setInputValue] = useState("");
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [activeMessageId, setActiveMessageId] = useState<number | string | null>(null);
  // --- STATE INDIKATOR MENGETIK ---
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, connectionStatus]);

  useEffect(() => {
    socket.connect();

    socket.on("online_count", (count: number) => {
      setOnlineCount(count);
    });

    socket.on("waiting", () => {
      setConnectionStatus("searching");
      setMessages(prev => [...prev, { id: Date.now(), text: "Sistem mendeteksi pencarian baru. Memindai jaringan untuk menghubungkanmu dengan manusia asli...", sender: "stranger", type: "text" }]);
    });

    socket.on("connected", (data: { isBot?: boolean }) => {
      setConnectionStatus("connected");
      const welcomeText = data?.isBot
        ? "Terhubung dengan sistem otomatis! Ucapkan Hai."
        : "Pasangan ditemukan! 100% murni orang asli. Ucapkan Hai 👋";
      setMessages(prev => [...prev, { id: Date.now(), text: welcomeText, sender: "stranger", type: "text" }]);
    });

    socket.on("receive_message", (incomingMsg: Message) => {
      setMessages(prev => [...prev, incomingMsg]);
    });

    socket.on("delete_message", (messageId: number | string) => {
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    });

    socket.on("partner_disconnected", () => {
      setConnectionStatus("disconnected");
      setMessages(prev => [...prev, { id: Date.now(), text: "Orang asing telah meninggalkan obrolan.", sender: "stranger", type: "text" }]);
    });
    // --- PENANGKAP SINYAL MENGETIK ---
    socket.on("lawan_sedang_mengetik", () => {
      setIsTyping(true);
      endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
    });

    socket.on("lawan_berhenti_mengetik", () => {
      setIsTyping(false);
    });

    return () => {
      socket.off("online_count");
      socket.off("waiting");
      socket.off("connected");
      socket.off("receive_message");
      socket.off("delete_message");
      socket.off("partner_disconnected");
      socket.off("lawan_sedang_mengetik");
      socket.off("lawan_berhenti_mengetik");
      socket.disconnect();
    };
  }, []);

  const handleNextPerson = () => {
    setConnectionStatus("searching");
    socket.emit("find_partner");
  };

  const handleStopChat = () => {
    socket.emit("stop_chat");
    setConnectionStatus("disconnected");
    setMessages(prev => [...prev, { id: Date.now(), text: "Kamu telah meninggalkan obrolan.", sender: "stranger", type: "text" }]);
  };
  // --- FUNGSI DETEKSI JARI BOS MENGETIK ---
  const handleInputChange = (e: any) => {
    setInputValue(e.target.value);

    // Lapor ke server
    socket.emit("typing");

    // Reset timer
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // Kalau 2 detik diam, lapor berhenti
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing");
    }, 2000);
  };
  const handleSend = () => {
    if (!inputValue.trim()) return;
    const newMsg: Message = { id: Date.now(), text: inputValue, sender: "me", type: "text", status: "sent" };
    setMessages(prev => [...prev, newMsg]);
    socket.emit("send_message", newMsg);
    setInputValue("");
    inputRef.current?.focus();
  };

  const handleUnsend = (id: number | string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
    socket.emit("unsend_message", id);
  };

  // LOGIKA MEREKAM VOICE NOTE
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          const newMsg: Message = { id: Date.now(), audio: base64Audio, sender: "me", type: "audio", status: "sent" };
          setMessages(prev => [...prev, newMsg]);
          socket.emit("send_message", newMsg);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Gagal mengakses mikrofon:", err);
      alert("Izinkan akses mikrofon untuk mengirim pesan suara.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const openCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) { setIsCameraOpen(false); }
  };

  const closeCamera = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setIsCameraOpen(false);
  };

  // MENGAMBIL FOTO & MENAMBAHKAN WATERMARK
  const takeSnapshot = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        // Balik gambar seperti cermin
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, 0, 0);

        // RESET BALIKAN agar tulisan watermark tidak ikut terbalik
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        // CETAK WATERMARK DI BAWAH KANAN
        ctx.font = "italic 600 16px sans-serif";
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.textAlign = "right";
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.shadowBlur = 4;
        ctx.fillText("dipotret dari camera", canvas.width - 15, canvas.height - 20);

        const base64Image = canvas.toDataURL("image/jpeg", 0.7);
        const newMsg: Message = { id: Date.now(), image: base64Image, sender: "me", type: "snap", status: "sent" };
        setMessages(prev => [...prev, newMsg]);
        socket.emit("send_message", newMsg);
      }
      closeCamera();
    }
  };

  const t = {
    bg: isDarkMode ? 'bg-zinc-950' : 'bg-zinc-50',
    videoOpacity: isDarkMode ? 'opacity-60' : 'opacity-20',
    gradient1: isDarkMode ? 'from-zinc-950/40 via-transparent to-zinc-950/80' : 'from-zinc-50/70 via-transparent to-zinc-50/90',
    gradient2: isDarkMode ? '[background:radial-gradient(90%_60%_at_10%_70%,rgba(0,0,0,.6)_0%,transparent_70%)]' : '[background:radial-gradient(90%_60%_at_10%_70%,rgba(255,255,255,.4)_0%,transparent_70%)]',
    particleColors: isDarkMode ? ["#FFFFFF", "#FFFFFF", "#FFFFFF"] : ["#000000", "#111111", "#222222"],
    chatCard: isDarkMode ? 'bg-white/5 border-white/10 shadow-2xl' : 'bg-white/40 border-zinc-200/50 shadow-xl',
    chatHeader: isDarkMode ? 'border-white/10 bg-white/5' : 'border-zinc-200/50 bg-white/40',
    chatHeaderText: isDarkMode ? 'text-white' : 'text-zinc-900',
    chatSubtext: isDarkMode ? 'text-zinc-400' : 'text-zinc-500',
    msgStranger: isDarkMode ? 'bg-white/10 border-white/5 text-zinc-100' : 'bg-white/80 border-white/40 text-zinc-800',
    msgMe: isDarkMode ? 'bg-cyan-500/20 border-cyan-400/30 text-cyan-50' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-900',
    snapBox: isDarkMode ? 'bg-black/60 border-cyan-400' : 'bg-white/80 border-cyan-500',
    inputArea: isDarkMode ? 'bg-black/40 border-white/10' : 'bg-white/60 border-zinc-200/50',
    inputField: isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder-zinc-500' : 'bg-white border-white/50 text-zinc-900 placeholder-zinc-500',
    inputIcons: isDarkMode ? 'text-zinc-400 hover:text-cyan-400' : 'text-zinc-500 hover:text-cyan-600',
    contactBtn: isDarkMode ? 'border-cyan-400/30 bg-black/40 text-cyan-50' : 'border-cyan-500/30 bg-white/60 text-cyan-700',
    securedByText: isDarkMode ? 'text-zinc-400' : 'text-zinc-600',
    themeToggleIcon: isDarkMode ? 'text-cyan-50' : 'text-cyan-700'
  };

  return (
    <div className="chat-wrapper">
      <div className="page">
        <div className="topbar">
          <div className="logo"><span className="dot-mark"></span> Anonnect</div>
          <div className="top-actions">
            <div className="badge"><span className="pulse"></span> {onlineCount} Online</div>
            
            {/* Tombol Tema Cukup 1 Saja */}
            <div className="icon-btn" onClick={() => setIsDarkMode(!isDarkMode)}>
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            </div>
          </div>
        </div>

        <div className="chat-card" ref={cardRef}>
          <div className="chat-status">
            <div className="line1">
              <span className={`pulse ${connectionStatus === "connected" ? "bg-green-500" : "bg-red-500"}`}></span> 
              <span className="capitalize">{connectionStatus === "searching" ? "Mencari Teman..." : connectionStatus}</span>
            </div>
            <div className="line2">Identity hidden · End-to-end encrypted</div>
          </div>

          <div className="chat-body" onClick={() => setActiveMessageId(null)}>
            {messages.length === 0 && connectionStatus !== "searching" ? (
              <div className="empty-hint">
                <div className="ring">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.97-4.03 9-9 9-1.5 0-2.91-.37-4.15-1.02L3 21l1.02-3.85A8.96 8.96 0 013 12c0-4.97 4.03-9 9-9s9 4.03 9 9z"/>
                  </svg>
                </div>
                Mulai obrolan — lawan bicaramu anonim.
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {messages.map((msg) => {
                  const jam = new Date(typeof msg.id === 'number' && msg.id > 100000 ? msg.id : Date.now()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                  
                  return (
                    <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"} mb-3 w-full`}>
                      
                      {msg.type === "text" && (
                         <div onPointerDown={() => { if(msg.sender === "me") setActiveMessageId(msg.id); }} 
                              className={`bubble relative ${msg.sender === "me" ? "bg-[#7c6ef2] text-white border-none rounded-tr-sm" : "rounded-tl-sm"}`}>
                           {msg.text} 
                           <span className={`time ${msg.sender === "me" ? "text-white/70" : ""}`}>{jam}</span>
                           
                           {msg.sender === "me" && activeMessageId === msg.id && (
                              <button onClick={(e) => { e.stopPropagation(); handleUnsend(msg.id); setActiveMessageId(null); }} className="absolute -top-3 -left-3 w-7 h-7 flex items-center justify-center rounded-full bg-rose-500 text-white shadow-lg z-20">
                                <Trash2 size={12} />
                              </button>
                           )}
                         </div>
                      )}

                      {msg.type === "snap" && (
                         <div className="bubble p-1.5 overflow-hidden rounded-2xl bg-zinc-900 border-zinc-800" style={{ maxWidth: '220px' }}>
                            <img src={msg.image} alt="snap" className="w-full h-auto rounded-xl" />
                         </div>
                      )}

                      {msg.type === "audio" && (
                         <div className={`bubble p-2 ${msg.sender === "me" ? "bg-[#7c6ef2] rounded-tr-sm border-none" : "rounded-tl-sm"}`}>
                            <audio controls src={msg.audio} className="h-9 w-48 sm:w-56" />
                         </div>
                      )}
                    </motion.div>
                  )
                })}
                
                {connectionStatus === "searching" && (
                   <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start mb-2">
                      <div className="bubble text-sm italic opacity-80 rounded-tl-sm">Mencari orang lain...</div>
                   </motion.div>
                )}
                
                {isTyping && connectionStatus === "connected" && (
                   <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-start mb-2">
                      <div className="bubble text-sm italic opacity-80 rounded-tl-sm">Lawan bicara sedang mengetik...</div>
                   </motion.div>
                )}
              </AnimatePresence>
            )}
            <div ref={endOfMessagesRef} className="h-2 shrink-0" />
          </div>

          <div className="chat-input">
            <button type="button" onClick={handleStopChat} className="btn btn-ghost hover:text-rose-400 hover:border-rose-400/50 transition-colors">Stop</button>
            
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="input-field">
              <input 
                ref={inputRef}
                type="text" 
                placeholder="Ketik pesan..." 
                value={inputValue}
                onChange={handleInputChange}
              />
              <div className="mini-icon" onClick={openCamera}>
                <Camera size={18} />
              </div>
              <div className="mini-icon" onClick={isRecording ? stopRecording : startRecording} style={{ color: isRecording ? '#ef4444' : '' }}>
                {isRecording ? <Square size={18} className="animate-pulse" /> : <Mic size={18} />}
              </div>
            </form>
            
            <ShaderButton onClick={handleNextPerson} className="h-[42px] w-[100px]">
  Next
</ShaderButton>
          </div>
        </div>

        {/* FUNGSI MENUJU ABOUT DEVELOPER SUDAH KEMBALI DI SINI */}
        <div className="footnote flex items-center justify-center gap-1.5 mt-4">
  Secured by 
  <ShaderButton onClick={onGoToAbout} className="h-6 w-24 text-[10px]">
    Anonnect
  </ShaderButton>
</div>

        <AnimatePresence>
          {isCameraOpen && (
            <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-md">
              <button onClick={closeCamera} className="absolute top-6 right-6 p-3 rounded-full bg-white/10 text-white hover:bg-rose-500 z-50 transition-colors">
                <X size={24} />
              </button>
              <div className="relative w-[90%] max-w-md aspect-[3/4] sm:aspect-video rounded-3xl overflow-hidden border-2 border-[#7c6ef2] bg-black shadow-[0_0_30px_rgba(124,110,242,0.3)]">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
              </div>
              <motion.button whileTap={{ scale: 0.9 }} onClick={takeSnapshot} className="mt-8 w-20 h-20 rounded-full border-4 border-[#7c6ef2] flex items-center justify-center bg-[#7c6ef2]/20">
                <div className="w-14 h-14 rounded-full bg-[#7c6ef2] shadow-[0_0_20px_rgba(124,110,242,0.6)]" />
              </motion.button>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function GradientBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-20 bg-black">
      <svg className="absolute inset-0 w-full h-full opacity-[0.25] mix-blend-screen z-10" xmlns="http://www.w3.org/2000/svg">
        <filter id="noiseFilter">
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noiseFilter)" />
      </svg>
      <motion.div animate={{ scale: [1, 1.1, 1], x: ["0%", "5%", "0%"], y: ["0%", "-5%", "0%"] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }} className="absolute -bottom-[20%] -left-[10%] w-[75vw] h-[75vh] rounded-full bg-[#0ea5e9]/50 blur-[120px]" />
      <motion.div animate={{ scale: [1, 1.15, 1], x: ["0%", "-5%", "0%"], y: ["0%", "5%", "0%"] }} transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }} className="absolute -top-[10%] -right-[10%] w-[65vw] h-[65vh] rounded-full bg-[#38bdf8]/40 blur-[100px]" />
    </div>
  );
}

function AboutPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-[100svh] w-full text-white overflow-hidden selection:bg-white/20 relative flex z-0">
      <GradientBackground />
      <div className="absolute inset-0 z-0 opacity-80 pointer-events-auto">
        <AsciiImage />
      </div>

      <div className="absolute inset-0 z-10 p-6 sm:p-10 pointer-events-none flex flex-col justify-between">
        <div className="w-full flex items-start">
          <button onClick={onBack} className="pointer-events-auto p-3 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 transition-colors text-zinc-300 hover:text-white backdrop-blur-md shadow-lg">
            <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 rotate-180" />
          </button>
        </div>

        <div className="absolute bottom-6 left-6 sm:bottom-8 sm:left-8 w-[280px] pointer-events-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="bg-black/70 backdrop-blur-[24px] border border-white/15 rounded-[1.5rem] p-5 w-full flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.8)]">
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

            <div className="pt-3 border-t border-white/15 flex flex-col w-full">
              <h3 className="text-xs font-semibold text-white mb-1 font-sans">Quick Links</h3>
              <a href="https://hse-excellence.preview.emergentagent.com/?utm_source=ig&utm_medium=social&utm_content=link_in_bio&fbclid=PAdGRleATkZpRwZG9mAmZkaWQWUMEIfuO1bv5l2HjDQsQKeAqEC98_TmV4dG4DYWVtAjExAHNydGMGYXBwX2lkDzEyNDAyNDU3NDI4NzQxNAABp9El3Gf_4voYhtukfXcKwRpvbv8C_DfMwvrzbLlWo91YXzJZ5bpSeHMR917c_aem_hDK_tOhJ4l1rt8eVnOsGIQ" target="_blank" rel="noopener noreferrer" className="text-zinc-300 hover:text-white transition-colors text-xs font-sans font-medium">
                Portfolio
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

type Page = "landing" | "chat" | "about";
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
          <ChatInterface onGoToAbout={() => setCurrentPage("about")} />
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