import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { io } from "socket.io-client";
import {
  Sun,
  Moon,
  Users,
  Camera,
  Mic,
  Send,
  SkipForward,
  PhoneOff,
  Trash2,
  X,
  Play,
  Pause,
  RotateCcw,
  Radar,
  Info,
  Square
} from "lucide-react";

// 1. KONEKSI SOCKET KEMBALI MENGGUNAKAN LOGIKA ASLI ANDA
const socket = io({ autoConnect: false });

const STATUS = {
  searching: {
    label: "Mencari Teman...",
    dot: "bg-amber-400",
  },
  connected: {
    label: "Terhubung",
    dot: "bg-emerald-400",
  },
  disconnected: {
    label: "Terputus",
    dot: "bg-rose-500",
  },
};

function formatTime(ts) {
  const d = new Date(typeof ts === 'number' && ts > 100000 ? ts : Date.now());
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function StatusDot({ status }) {
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

function VoiceBubblePlayer({ src, isMe }) {
  const audioRef = useRef(null);
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
        onClick={(e) => { e.stopPropagation(); toggle(); }}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isMe ? "bg-white/20 text-white" : "bg-cyan-500/20 text-slate-800 dark:text-white"
        }`}
      >
        {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </button>
      <div className="flex-1 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
        <div className={`h-full ${barColor} transition-all`} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function MessageBubble({ msg, isMe, isSelected, onSelect, onUnsend }) {
  if (msg.unsent) {
    return (
      <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-2`}>
        <span className="text-xs italic px-3 py-1.5 rounded-full bg-black/5 dark:bg-slate-800/90 text-slate-400 dark:text-slate-300">
          {isMe ? "Kamu menarik pesan ini" : "Pesan ditarik"}
        </span>
      </div>
    );
  }

  const content = msg.text || msg.content;
  const imageSrc = msg.image || (msg.type === 'snap' ? msg.content : null);
  const audioSrc = msg.audio || (msg.type === 'audio' || msg.type === 'voice' ? msg.content : null);

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-2`}>
      <div className="flex flex-col max-w-[78%] sm:max-w-[65%]">
        <motion.div
          layout
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          onClick={() => isMe && onSelect(isSelected ? null : msg.id)}
          className={`relative px-3.5 py-2.5 text-sm leading-relaxed shadow-sm cursor-pointer select-none
            ${
              isMe
                ? "bg-gradient-to-br from-cyan-500 to-violet-600 text-white rounded-2xl rounded-br-md"
                : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-2xl rounded-bl-md border border-slate-200/70 dark:border-slate-700/70"
            }`}
        >
          {msg.type === "text" && <p className="whitespace-pre-wrap break-words">{content}</p>}

          {(msg.type === "photo" || msg.type === "snap") && imageSrc && (
            <img src={imageSrc} alt="Snap" className="rounded-lg max-w-[220px] w-full object-cover" draggable={false} />
          )}

          {(msg.type === "voice" || msg.type === "audio") && audioSrc && (
            <VoiceBubblePlayer src={audioSrc} isMe={isMe} />
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
                className="absolute -top-4 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/30"
              >
                <Trash2 size={14} />
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
        <span className={`mt-1 text-[10px] text-slate-400 dark:text-slate-500 ${isMe ? "text-right mr-1" : "text-left ml-1"}`}>
          {formatTime(msg.timestamp || msg.id)}
        </span>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="flex justify-start mb-2">
      <div className="flex items-center gap-1 px-3.5 py-3 rounded-2xl rounded-bl-md bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70">
        {[0, 1, 2].map((i) => (
          <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-500" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />
        ))}
      </div>
    </motion.div>
  );
}

function CameraModal({ onClose, onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => setReady(true);
        }
      })
      .catch(() => alert("Gagal mengakses kamera."));

    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const snap = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");

    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    ctx.font = "italic 600 16px sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.textAlign = "right";
    ctx.fillText("dipotret dari camera", canvas.width - 15, canvas.height - 20);

    setPreview(canvas.toDataURL("image/jpeg", 0.8));
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="relative w-full max-w-sm rounded-2xl overflow-hidden bg-slate-900">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/70">
          <span className="flex items-center gap-2 text-sm font-medium text-slate-200"><Camera size={16} /> Kamera Snap</span>
          <button onClick={onClose} className="text-slate-300"><X size={16} /></button>
        </div>
        <div className="relative aspect-[3/4] bg-black flex items-center justify-center">
          {!preview ? <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover transform -scale-x-100" /> : <img src={preview} alt="Preview" className="h-full w-full object-cover" />}
          <canvas ref={canvasRef} className="hidden" />
        </div>
        <div className="flex items-center justify-center gap-4 px-4 py-4">
          {!preview ? (
            <button onClick={snap} disabled={!ready} className="h-14 w-14 rounded-full border-4 border-white/80 bg-white/10" />
          ) : (
            <>
              <button onClick={() => setPreview(null)} className="px-4 py-2 rounded-full bg-slate-700 text-slate-100"><RotateCcw size={14} className="inline mr-1"/> Ulangi</button>
              <button onClick={() => onCapture(preview)} className="px-4 py-2 rounded-full bg-[#7c6ef2] text-white"><Send size={14} className="inline mr-1"/> Kirim</button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ChatInterface({ onNavigateToAbout }) {
  const [darkMode, setDarkMode] = useState(true);
  const [status, setStatus] = useState("connected");
  const [onlineCount, setOnlineCount] = useState(0);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [selectedMsgId, setSelectedMsgId] = useState(null);
  
  const [showCamera, setShowCamera] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  /* --- 2. MENGEMBALIKAN EVENT LISTENER SERVER ASLI ANDA --- */
  useEffect(() => {
    socket.connect();

    socket.on("online_count", (count) => setOnlineCount(count));

    socket.on("waiting", () => {
      setStatus("searching");
      setMessages([{ id: Date.now(), text: "Mencari pasangan obrolan baru...", sender: "stranger", type: "text" }]);
    });

    socket.on("connected", (data) => {
      setStatus("connected");
      setMessages([{ id: Date.now(), text: data?.isBot ? "Terhubung dengan sistem otomatis!" : "Pasangan ditemukan! Ucapkan Hai 👋", sender: "stranger", type: "text" }]);
    });

    socket.on("receive_message", (incomingMsg) => {
      setMessages((prev) => [...prev, incomingMsg]);
    });

    socket.on("delete_message", (messageId) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    });

    socket.on("partner_disconnected", () => {
      setStatus("disconnected");
      setMessages((prev) => [...prev, { id: Date.now(), text: "Orang asing telah meninggalkan obrolan.", sender: "stranger", type: "text" }]);
    });

    socket.on("lawan_sedang_mengetik", () => setPartnerTyping(true));
    socket.on("lawan_berhenti_mengetik", () => setPartnerTyping(false));

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, partnerTyping]);

  /* --- ACTIONS --- */
  const handleInputChange = (e) => {
    setInputText(e.target.value);
    socket.emit("typing");
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing");
    }, 2000);
  };

  const sendText = () => {
    const text = inputText.trim();
    if (!text || status !== "connected") return;
    const newMsg = { id: Date.now(), text: text, sender: "me", type: "text", status: "sent" };
    setMessages((prev) => [...prev, newMsg]);
    socket.emit("send_message", newMsg);
    setInputText("");
    socket.emit("stop_typing");
  };

  const handleUnsend = (id) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
    socket.emit("unsend_message", id);
    setSelectedMsgId(null);
  };

  const handleStop = () => {
    socket.emit("stop_chat");
    setStatus("disconnected");
    setMessages((prev) => [...prev, { id: Date.now(), text: "Kamu telah meninggalkan obrolan.", sender: "stranger", type: "text" }]);
  };

  const handleNext = () => {
    setStatus("searching");
    socket.emit("find_partner");
  };

  const handleCapture = (dataUrl) => {
    const newMsg = { id: Date.now(), image: dataUrl, sender: "me", type: "snap", status: "sent" };
    setMessages((prev) => [...prev, newMsg]);
    socket.emit("send_message", newMsg);
    setShowCamera(false);
  };

  const startRecording = async () => {
    if (status !== "connected") return;
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
          const base64Audio = reader.result;
          const newMsg = { id: Date.now(), audio: base64Audio, sender: "me", type: "audio", status: "sent" };
          setMessages((prev) => [...prev, newMsg]);
          socket.emit("send_message", newMsg);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert("Izinkan akses mikrofon untuk pesan suara.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
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
              onClick={() => setDarkMode((v) => !v)}
              className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              {darkMode ? <Moon size={15} /> : <Sun size={15} />}
            </button>
          </div>
        </header>

        {/* Chat Body */}
        <main onClick={() => setSelectedMsgId(null)} className="flex-1 overflow-y-auto px-3 sm:px-4 py-4">
          <div className="max-w-2xl mx-auto">
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

        {/* Input Bar */}
        <footer className="shrink-0 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#0B0F19]/90 backdrop-blur-md">
          <div className="max-w-2xl mx-auto w-full px-3 sm:px-4 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button onClick={handleStop} disabled={status === "disconnected"} className="h-10 w-10 shrink-0 flex items-center justify-center rounded-full bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 disabled:opacity-30">
                <PhoneOff size={17} />
              </button>

              <form onSubmit={(e) => { e.preventDefault(); sendText(); }} className="flex-1 flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800/80 pl-4 pr-1.5 py-1.5">
                <input
                  value={inputText}
                  onChange={handleInputChange}
                  disabled={!canType}
                  placeholder={canType ? "Tulis pesan…" : "Menunggu koneksi…"}
                  className="flex-1 bg-transparent outline-none text-sm placeholder:text-slate-400 disabled:cursor-not-allowed min-w-0"
                />

                <button type="button" onClick={() => setShowCamera(true)} disabled={!canType} className="h-8 w-8 flex items-center justify-center rounded-full text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30">
                  <Camera size={16} />
                </button>

                <button type="button" onClick={isRecording ? stopRecording : startRecording} disabled={!canType} className={`h-8 w-8 flex items-center justify-center rounded-full disabled:opacity-30 ${isRecording ? "text-rose-500 bg-rose-500/20 animate-pulse" : "text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"}`}>
                  {isRecording ? <Square size={14} /> : <Mic size={16} />}
                </button>

                {inputText.trim() && (
                  <button type="submit" className="h-8 w-8 flex items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 text-white">
                    <Send size={14} />
                  </button>
                )}
              </form>

              <button onClick={handleNext} className="h-10 px-3.5 flex items-center gap-1.5 rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 text-white text-sm font-medium shadow-md">
                <SkipForward size={15} />
                <span className="hidden sm:inline">Next</span>
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5 mt-2.5 text-[11px] text-slate-400 dark:text-slate-500">
              <span>🔒 Secured by Anonnect</span>
              <span className="opacity-40">•</span>
              <button onClick={onNavigateToAbout} className="hover:text-slate-600 dark:hover:text-slate-300 underline-offset-2 hover:underline">
                <Info size={11} className="inline" /> Tentang Developer
              </button>
            </div>
          </div>
        </footer>

        {/* Modal Camera */}
        <AnimatePresence>
          {showCamera && <CameraModal onClose={() => setShowCamera(false)} onCapture={handleCapture} />}
        </AnimatePresence>
      </div>
    </div>
  );
}