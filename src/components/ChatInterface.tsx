import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

import {
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
  Info,
  Square,
  Check,
  CheckCheck,
  Phone,
  PhoneIncoming,
  MicOff,
  Globe,
} from "lucide-react";
import { translations, type Lang } from "./i18n";
import { socket } from "./socket";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
];

const MAX_RECORD_SECONDS = 120;

type ConnectionStatus = "searching" | "connected" | "disconnected";
type CallStatus = "idle" | "calling" | "incoming" | "in_call";
type MessageStatus = "sent" | "delivered" | "read";
type MessageKind = "text" | "photo" | "snap" | "audio" | "voice";
type Sender = "me" | "stranger";

interface ChatMessage {
  id: number;
  sender: Sender;
  type: MessageKind;
  text?: string;
  content?: string;
  image?: string;
  audio?: string;
  duration?: number;
  status?: MessageStatus;
  unsent?: boolean;
  timestamp?: number;
}

const STATUS_DOT: Record<ConnectionStatus, string> = {
  searching: "bg-amber-400",
  connected: "bg-emerald-400",
  disconnected: "bg-rose-500",
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatTime(ts: number | undefined, lang: Lang = "id"): string {
  const d = new Date(typeof ts === "number" && ts > 100000 ? ts : Date.now());
  return d.toLocaleTimeString(lang === "en" ? "en-US" : "id-ID", { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(sec: number): string {
  const total = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(total / 60).toString().padStart(2, "0");
  const s = Math.floor(total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function StatusDot({ status }: { status: ConnectionStatus }) {
  const dot = STATUS_DOT[status];
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      {status === "searching" && (
        <motion.span
          className={`absolute inline-flex h-full w-full rounded-full ${dot}`}
          animate={{ scale: [1, 2.4], opacity: [0.6, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dot}`} />
    </span>
  );
}

function ReceiptTicks({ status }: { status?: MessageStatus }) {
  if (status === "read") return <CheckCheck size={13} className="text-sky-500 dark:text-sky-400 shrink-0" />;
  if (status === "delivered") return <CheckCheck size={13} className="text-slate-400 dark:text-slate-500 shrink-0" />;
  return <Check size={13} className="text-slate-400 dark:text-slate-500 shrink-0" />;
}

/* -------------------------------------------------------------------------- */
/*  Mini Shader Button (Khusus untuk tombol Tentang Developer)                */
/* -------------------------------------------------------------------------- */
function MiniShaderButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative inline-flex overflow-hidden rounded-full p-[1px] focus:outline-none active:scale-95 transition-transform shrink-0"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
        className="absolute z-0 bg-[conic-gradient(from_90deg_at_50%_50%,#18181b_0%,#ffffff_50%,#18181b_100%)]"
        style={{ width: "400%", height: "400%", top: "-150%", left: "-150%" }}
      />
      <span className="relative z-10 inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-[#09090b] px-3 py-1.5 text-[10px] sm:text-[11px] font-medium text-zinc-200 transition-colors hover:bg-[#18181b] tracking-wide gap-1.5">
        {children}
      </span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Pemutar voice note                                                        */
/* -------------------------------------------------------------------------- */
interface VoiceBubblePlayerProps {
  src: string;
  isMe: boolean;
  duration?: number;
  lang: Lang;
}

function VoiceBubblePlayer({ src, isMe, duration: initialDuration, lang }: VoiceBubblePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [playError, setPlayError] = useState(false);
  const tr = translations[lang] || translations.id;

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = 1;
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      if (progress >= 99.5) {
        audio.currentTime = 0;
        setProgress(0);
      }
      audio
        .play()
        .then(() => setPlayError(false))
        .catch(() => setPlayError(true));
    }
    setPlaying((p) => !p);
  };

  const onLoadedMetadata = () => {
    const audio = audioRef.current;
    if (audio && isFinite(audio.duration) && audio.duration > 0) setDuration(audio.duration);
  };

  const onTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio || !audio.duration || !isFinite(audio.duration)) return;
    setProgress((audio.currentTime / audio.duration) * 100);
  };

  const barColor = isMe ? "bg-white/70" : "bg-cyan-400/80";

  return (
    <div className="flex flex-col gap-1 min-w-[190px]">
      <div className="flex items-center gap-2">
        <audio
          ref={audioRef}
          src={src}
          preload="metadata"
          onLoadedMetadata={onLoadedMetadata}
          onTimeUpdate={onTimeUpdate}
          onEnded={() => {
            setPlaying(false);
            setProgress(0);
          }}
          onError={() => setPlayError(true)}
          className="hidden"
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggle();
          }}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            isMe ? "bg-white/20 text-white" : "bg-cyan-500/20 text-slate-800 dark:text-white"
          }`}
        >
          {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
        </button>
        <div className="flex-1 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div className={`h-full ${barColor} transition-all`} style={{ width: `${progress}%` }} />
        </div>
        <span className="text-[10px] tabular-nums opacity-70 shrink-0">{formatDuration(duration)}</span>
      </div>
      {playError && <span className="text-[10px] text-rose-300">{tr.audioError}</span>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
interface MessageBubbleProps {
  msg: ChatMessage;
  isMe: boolean;
  isSelected: boolean;
  onSelect: (id: number | null) => void;
  onUnsend: (id: number) => void;
  lang: Lang;
}

function MessageBubble({ msg, isMe, isSelected, onSelect, onUnsend, lang }: MessageBubbleProps) {
  const tr = translations[lang] || translations.id;

  if (msg.unsent) {
    return (
      <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-2`}>
        <span className="text-xs italic px-3 py-1.5 rounded-full bg-black/5 dark:bg-slate-800/90 text-slate-400 dark:text-slate-300">
          {isMe ? tr.unsendMine : tr.unsendTheirs}
        </span>
      </div>
    );
  }

  const content = msg.text || msg.content;
  const imageSrc = msg.image || (msg.type === "snap" ? msg.content : null);
  const audioSrc = msg.audio || (msg.type === "audio" || msg.type === "voice" ? msg.content : null);

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
            <VoiceBubblePlayer src={audioSrc} isMe={isMe} duration={msg.duration} lang={lang} />
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
        <span
          className={`mt-1 flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 ${
            isMe ? "justify-end mr-1" : "justify-start ml-1"
          }`}
        >
          <span>{formatTime(msg.timestamp || msg.id, lang)}</span>
          {isMe && <ReceiptTicks status={msg.status || "sent"} />}
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

/* -------------------------------------------------------------------------- */
interface CameraModalProps {
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
  lang: Lang;
}

function CameraModal({ onClose, onCapture, lang }: CameraModalProps) {
  const tr = translations[lang] || translations.id;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => setReady(true);
        }
      })
      .catch(() => alert(tr.cameraPermission));

    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const snap = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

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
          <span className="flex items-center gap-2 text-sm font-medium text-slate-200">
            <Camera size={16} /> {tr.cameraTitle}
          </span>
          <button onClick={onClose} className="text-slate-300">
            <X size={16} />
          </button>
        </div>
        <div className="relative aspect-[3/4] bg-black flex items-center justify-center">
          {!preview ? (
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover transform -scale-x-100" />
          ) : (
            <img src={preview} alt="Preview" className="h-full w-full object-cover" />
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>
        <div className="flex items-center justify-center gap-4 px-4 py-4">
          {!preview ? (
            <button onClick={snap} disabled={!ready} className="h-14 w-14 rounded-full border-4 border-white/80 bg-white/10" />
          ) : (
            <>
              <button onClick={() => setPreview(null)} className="px-4 py-2 rounded-full bg-slate-700 text-slate-100">
                <RotateCcw size={14} className="inline mr-1" /> {tr.cameraRetry}
              </button>
              <button onClick={() => onCapture(preview)} className="px-4 py-2 rounded-full bg-[#7c6ef2] text-white">
                <Send size={14} className="inline mr-1" /> {tr.cameraSend}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

function ConfirmModal({ title, message, confirmLabel = "Ya", cancelLabel = "Tidak", onConfirm, onCancel, danger = true }: ConfirmModalProps) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-xs rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-5 text-center shadow-2xl"
      >
        <div className={`mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full ${danger ? "bg-rose-500/10 text-rose-500" : "bg-cyan-500/10 text-cyan-500"}`}>
          <SkipForward size={20} />
        </div>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1.5">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">{message}</p>
        <div className="flex gap-2.5">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-full text-sm font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-full text-sm font-medium text-white transition-colors ${
              danger ? "bg-rose-500 hover:bg-rose-600" : "bg-gradient-to-br from-cyan-500 to-violet-600"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
interface IncomingCallModalProps {
  onAccept: () => void;
  onDecline: () => void;
  lang: Lang;
}

function IncomingCallModal({ onAccept, onDecline, lang }: IncomingCallModalProps) {
  const tr = translations[lang] || translations.id;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-8 bg-slate-950/95 backdrop-blur-md p-6">
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-violet-600">
          <motion.span
            className="absolute inset-0 rounded-full bg-cyan-400/40"
            animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
          />
          <PhoneIncoming size={32} className="text-white relative" />
        </div>
        <div className="text-center">
          <p className="text-white font-semibold text-base">{tr.incomingCallTitle}</p>
          <p className="text-slate-400 text-xs mt-1">{tr.incomingCallSubtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-8">
        <button onClick={onDecline} className="flex flex-col items-center gap-2">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/30 active:scale-95 transition-transform">
            <PhoneOff size={22} />
          </span>
          <span className="text-[11px] text-slate-400">{tr.callDecline}</span>
        </button>
        <button onClick={onAccept} className="flex flex-col items-center gap-2">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 active:scale-95 transition-transform">
            <Phone size={22} />
          </span>
          <span className="text-[11px] text-slate-400">{tr.callAccept}</span>
        </button>
      </div>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
interface CallBarProps {
  callStatus: CallStatus;
  seconds: number;
  muted: boolean;
  onToggleMute: () => void;
  onEndCall: () => void;
  lang: Lang;
}

function CallBar({ callStatus, seconds, muted, onToggleMute, onEndCall, lang }: CallBarProps) {
  const tr = translations[lang] || translations.id;
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="shrink-0 overflow-hidden bg-gradient-to-r from-cyan-500 to-violet-600 text-white"
    >
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          <motion.span
            animate={{ opacity: callStatus === "calling" ? [1, 0.3, 1] : 1 }}
            transition={{ duration: 1, repeat: callStatus === "calling" ? Infinity : 0 }}
            className="flex h-2 w-2 rounded-full bg-white"
          />
          <span className="text-xs font-medium">
            {callStatus === "calling" ? tr.callCalling : `${tr.callLabel} • ${formatDuration(seconds)}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {callStatus === "in_call" && (
            <button onClick={onToggleMute} className="h-7 w-7 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30">
              {muted ? <MicOff size={13} /> : <Mic size={13} />}
            </button>
          )}
          <button onClick={onEndCall} className="h-7 w-7 flex items-center justify-center rounded-full bg-rose-500 hover:bg-rose-600">
            <PhoneOff size={13} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Komponen utama: ChatInterface                                            */
/* -------------------------------------------------------------------------- */
interface ChatInterfaceProps {
  onNavigateToAbout?: () => void;
}

export default function ChatInterface({ onNavigateToAbout }: ChatInterfaceProps) {
  // Dark mode diset default selalu true
  const [darkMode] = useState<boolean>(true);

  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === "undefined") return "id";
    return window.localStorage.getItem("anonnect-lang") === "en" ? "en" : "id";
  });
  const langRef = useRef<Lang>(lang);

  const [status, setStatus] = useState<ConnectionStatus>("connected");
  const [onlineCount, setOnlineCount] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [selectedMsgId, setSelectedMsgId] = useState<number | null>(null);

  const [showCamera, setShowCamera] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  const [partnerOnline, setPartnerOnline] = useState(false);
  const [showNextConfirm, setShowNextConfirm] = useState(false);
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [callMuted, setCallMuted] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordStartRef = useRef<number>(0);
  const recordIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);

  const tr = translations[lang] || translations.id;

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [darkMode]);

  useEffect(() => {
    window.localStorage.setItem("anonnect-lang", lang);
    langRef.current = lang;
  }, [lang]);

  function createPeerConnection(): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit("ice_candidate", { candidate: e.candidate });
    };

    pc.ontrack = (e) => {
      const audioEl = remoteAudioRef.current;
      if (audioEl) {
        audioEl.srcObject = e.streams[0];
        audioEl.play().catch(() => {});
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "failed") {
        alert(translations[langRef.current].callConnectionFailed);
        endCall(true);
      }
    };

    return pc;
  }

  function cleanupCall() {
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    pendingOfferRef.current = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    setCallSeconds(0);
    setCallMuted(false);
  }

  function endCall(notify: boolean = true) {
    if (notify && callStatus !== "idle") socket.emit("call_ended");
    cleanupCall();
    setCallStatus("idle");
  }

  const startCall = async () => {
    if (status !== "connected" || callStatus !== "idle") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      peerConnectionRef.current = pc;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("call_offer", { offer });
      setCallStatus("calling");
    } catch {
      alert(tr.micPermissionCall);
    }
  };

  const acceptCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      peerConnectionRef.current = pc;

      if (!pendingOfferRef.current) throw new Error("no pending offer");
      await pc.setRemoteDescription(new RTCSessionDescription(pendingOfferRef.current));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("call_answer", { answer });
      setCallStatus("in_call");
    } catch {
      alert(tr.micPermissionAccept);
      declineCall();
    }
  };

  const declineCall = () => {
    socket.emit("call_declined");
    pendingOfferRef.current = null;
    setCallStatus("idle");
  };

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => (t.enabled = callMuted));
    setCallMuted((m) => !m);
  };

  useEffect(() => {
    if (callStatus === "in_call") {
      callTimerRef.current = setInterval(() => setCallSeconds((s) => s + 1), 1000);
    } else if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [callStatus]);

  useEffect(() => {
    socket.connect();

    socket.on("online_count", (count: number) => setOnlineCount(count));

    socket.on("waiting", () => {
      setStatus("searching");
      setPartnerOnline(false);
      setMessages([{ id: Date.now(), text: translations[langRef.current].waitingMessage, sender: "stranger", type: "text" }]);
    });

    socket.on("connected", () => {
      const currentLang = langRef.current;
      setStatus("connected");
      setPartnerOnline(true);
      setMessages([
        {
          id: Date.now(),
          text: translations[currentLang].realConnectedMessage,
          sender: "stranger",
          type: "text",
        },
      ]);
    });

    socket.on("partner_online", () => setPartnerOnline(true));
    socket.on("partner_offline", () => setPartnerOnline(false));

    socket.on("receive_message", (incomingMsg: ChatMessage) => {
      setMessages((prev) => [...prev, incomingMsg]);
      socket.emit("mark_delivered", incomingMsg.id);
      socket.emit("mark_read", incomingMsg.id);
    });

    socket.on("message_delivered", (messageId: number) => {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, status: m.status === "read" ? "read" : "delivered" } : m)));
    });

    socket.on("message_read", (messageId: number) => {
      setMessages((prev) => prev.map((m) => (m.sender === "me" && m.id <= messageId ? { ...m, status: "read" } : m)));
    });

    socket.on("delete_message", (messageId: number) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    });

    socket.on("partner_disconnected", () => {
      setStatus("disconnected");
      setPartnerOnline(false);
      setMessages((prev) => [...prev, { id: Date.now(), text: translations[langRef.current].strangerLeftMessage, sender: "stranger", type: "text" }]);
      endCall(false);
    });

    socket.on("lawan_sedang_mengetik", () => setPartnerTyping(true));
    socket.on("lawan_berhenti_mengetik", () => setPartnerTyping(false));

    socket.on("call_offer", ({ offer }: { offer: RTCSessionDescriptionInit }) => {
      pendingOfferRef.current = offer;
      setCallStatus("incoming");
    });

    socket.on("call_answer", async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      const pc = peerConnectionRef.current;
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
      setCallStatus("in_call");
    });

    socket.on("ice_candidate", async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      const pc = peerConnectionRef.current;
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {
          // Kandidat basi/duplikat — aman diabaikan
        }
      }
    });

    socket.on("call_declined", () => {
      cleanupCall();
      setCallStatus("idle");
    });

    socket.on("call_ended", () => {
      cleanupCall();
      setCallStatus("idle");
    });

    return () => {
      socket.off("online_count");
      socket.off("waiting");
      socket.off("connected");
      socket.off("partner_online");
      socket.off("partner_offline");
      socket.off("receive_message");
      socket.off("message_delivered");
      socket.off("message_read");
      socket.off("delete_message");
      socket.off("partner_disconnected");
      socket.off("lawan_sedang_mengetik");
      socket.off("lawan_berhenti_mengetik");
      socket.off("call_offer");
      socket.off("call_answer");
      socket.off("ice_candidate");
      socket.off("call_declined");
      socket.off("call_ended");
      socket.disconnect();
      cleanupCall();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, partnerTyping]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    const newMsg: ChatMessage = { id: Date.now(), text: text, sender: "me", type: "text", status: "sent" };
    setMessages((prev) => [...prev, newMsg]);
    socket.emit("send_message", newMsg);
    setInputText("");
    socket.emit("stop_typing");
  };

  const handleUnsend = (id: number) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
    socket.emit("unsend_message", id);
    setSelectedMsgId(null);
  };

  const handleStop = () => {
    if (callStatus !== "idle") endCall(true);
    socket.emit("stop_chat");
    setStatus("disconnected");
    setPartnerOnline(false);
    setMessages((prev) => [...prev, { id: Date.now(), text: tr.leftMessage, sender: "stranger", type: "text" }]);
  };

  const handleNext = () => {
    setShowNextConfirm(true);
  };

  const confirmNext = () => {
    setShowNextConfirm(false);
    if (callStatus !== "idle") endCall(true);
    setStatus("searching");
    setPartnerOnline(false);
    socket.emit("find_partner");
  };

  const handleCapture = (dataUrl: string) => {
    const newMsg: ChatMessage = { id: Date.now(), image: dataUrl, sender: "me", type: "snap", status: "sent" };
    setMessages((prev) => [...prev, newMsg]);
    socket.emit("send_message", newMsg);
    setShowCamera(false);
  };

  const startRecording = async () => {
    if (status !== "connected") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
      const supportedType = candidates.find(
        (t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)
      );

      const mediaRecorder = new MediaRecorder(stream, supportedType ? { mimeType: supportedType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      recordStartRef.current = Date.now();

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
        setRecordSeconds(0);
        if (audioChunksRef.current.length === 0) return;

        const blobType = mediaRecorder.mimeType || supportedType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: blobType });
        const durationSec = Math.max(1, Math.round((Date.now() - recordStartRef.current) / 1000));

        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          const newMsg: ChatMessage = {
            id: Date.now(),
            audio: base64Audio,
            sender: "me",
            type: "audio",
            status: "sent",
            duration: durationSec,
          };
          setMessages((prev) => [...prev, newMsg]);
          socket.emit("send_message", newMsg);
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      recordIntervalRef.current = setInterval(() => {
        setRecordSeconds((s) => {
          if (s + 1 >= MAX_RECORD_SECONDS) {
            stopRecording();
            return MAX_RECORD_SECONDS;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      alert(tr.micPermission);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    }
  };

  const statusLabel = tr[`status${capitalize(status)}` as keyof typeof tr];
  const canType = status === "connected";

  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="flex flex-col h-[100dvh] w-full bg-slate-50 dark:bg-[#0B0F19] text-slate-800 dark:text-slate-100 transition-colors duration-300">
        <header className="shrink-0 flex items-center justify-between px-3 sm:px-4 py-3 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0B0F19]/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <img
              src="/anonnect-logo.svg"
              alt="Anonnect Logo"
              className="relative flex h-9 w-9 rounded-xl shadow-lg shadow-violet-500/20 object-cover shrink-0"
            />
            <div className="min-w-0">
              <h1 className="text-base font-bold tracking-tight bg-gradient-to-r from-cyan-500 to-violet-600 bg-clip-text text-transparent truncate">
                Anonnect
              </h1>
              <div className="flex items-center gap-1.5 -mt-0.5 whitespace-nowrap">
                <StatusDot status={status} />
                <span className="text-[11px] text-slate-500 dark:text-slate-400">{statusLabel}</span>
                {status === "connected" && (
                  <span className="flex items-center gap-1 ml-0.5 sm:ml-1 text-[11px] text-slate-400 dark:text-slate-500">
                    <span className="opacity-50">•</span>
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${partnerOnline ? "bg-emerald-400" : "bg-slate-400"}`} />
                    <span className="truncate max-w-[50px] sm:max-w-none">{partnerOnline ? "Online" : "Offline"}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/80 text-xs font-medium">
              <Users size={13} className="text-emerald-500" />
              <span className="tabular-nums">{onlineCount.toLocaleString(lang === "en" ? "en-US" : "id-ID")}</span>
            </div>

            <button
              onClick={() => setLang((l) => (l === "id" ? "en" : "id"))}
              title={lang === "id" ? "Switch to English" : "Ganti ke Bahasa Indonesia"}
              className="h-8 px-2 flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-semibold transition-colors"
            >
              <Globe size={13} />
              <span className="hidden sm:inline">{lang.toUpperCase()}</span>
            </button>

            <button
              onClick={startCall}
              disabled={status !== "connected" || callStatus !== "idle"}
              title={tr.voiceCallTooltip}
              className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
            >
              <Phone size={15} />
            </button>
            {/* Tombol Theme dihapus di sini sesuai permintaan agar tidak berdempetan */}
          </div>
        </header>

        <AnimatePresence>
          {(callStatus === "calling" || callStatus === "in_call") && (
            <CallBar callStatus={callStatus} seconds={callSeconds} muted={callMuted} onToggleMute={toggleMute} onEndCall={() => endCall(true)} lang={lang} />
          )}
        </AnimatePresence>

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
                lang={lang}
              />
            ))}
            <AnimatePresence>{partnerTyping && <TypingIndicator />}</AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </main>

        <footer className="shrink-0 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#0B0F19]/90 backdrop-blur-md">
          <div className="max-w-2xl mx-auto w-full px-3 sm:px-4 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={handleStop}
                disabled={status === "disconnected"}
                title={tr.stopChatTooltip}
                className="h-10 w-10 shrink-0 flex items-center justify-center rounded-full bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 disabled:opacity-30"
              >
                <PhoneOff size={17} />
              </button>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendText();
                }}
                className="flex-1 flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800/80 pl-4 pr-1.5 py-1.5"
              >
                <input
                  value={inputText}
                  onChange={handleInputChange}
                  disabled={!canType}
                  placeholder={canType ? tr.inputPlaceholder : tr.inputPlaceholderWaiting}
                  className="flex-1 bg-transparent outline-none text-sm placeholder:text-slate-400 disabled:cursor-not-allowed min-w-0"
                />

                <button type="button" onClick={() => setShowCamera(true)} disabled={!canType} className="h-8 w-8 flex items-center justify-center rounded-full text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30">
                  <Camera size={16} />
                </button>

                {isRecording && (
                  <span className="text-[10px] tabular-nums text-rose-500 font-medium px-0.5">{formatDuration(recordSeconds)}</span>
                )}

                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={!canType}
                  className={`h-8 w-8 flex items-center justify-center rounded-full disabled:opacity-30 ${
                    isRecording ? "text-rose-500 bg-rose-500/20 animate-pulse" : "text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {isRecording ? <Square size={14} /> : <Mic size={16} />}
                </button>

                {inputText.trim() && (
                  <button type="submit" className="h-8 w-8 flex items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 text-white">
                    <Send size={14} />
                  </button>
                )}
              </form>

              <button onClick={handleNext} className="h-10 px-3.5 flex items-center gap-1.5 rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 text-white text-sm font-medium shadow-md shrink-0">
                <SkipForward size={15} />
                <span className="hidden sm:inline">Next</span>
              </button>
            </div>

            {/* Bagian footer Tentang Developer yang baru */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 mt-3 mb-1">
              <span className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500">{tr.footerSecured}</span>
              <MiniShaderButton onClick={onNavigateToAbout}>
                <Info size={11} className="shrink-0 text-cyan-400" />
                {tr.footerAbout}
              </MiniShaderButton>
            </div>
          </div>
        </footer>

        <AnimatePresence>{showCamera && <CameraModal onClose={() => setShowCamera(false)} onCapture={handleCapture} lang={lang} />}</AnimatePresence>

        <AnimatePresence>
          {showNextConfirm && (
            <ConfirmModal
              title={tr.nextConfirmTitle}
              message={tr.nextConfirmMessage}
              confirmLabel={tr.nextConfirmYes}
              cancelLabel={tr.nextConfirmNo}
              onConfirm={confirmNext}
              onCancel={() => setShowNextConfirm(false)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>{callStatus === "incoming" && <IncomingCallModal onAccept={acceptCall} onDecline={declineCall} lang={lang} />}</AnimatePresence>

        <audio
          ref={remoteAudioRef}
          autoPlay
          playsInline
          style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
        />
      </div>
    </div>
  );
}