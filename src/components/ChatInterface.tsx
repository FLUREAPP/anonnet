"use client";

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
} from "lucide-react";

/**
 * ============================================================================
 *  ANONNECT — ChatInterface
 * ============================================================================
 *  Kontrak Socket.IO yang diharapkan dari backend (sesuaikan sesuai server):
 *
 *  EMIT (client -> server)
 *    "find_partner"                          -> mulai mencari lawan bicara
 *    "send_message"   { type, content, meta } -> kirim pesan (text/photo/voice)
 *    "typing"                                -> user sedang mengetik
 *    "stop_typing"                           -> user berhenti mengetik
 *    "unsend_message" { id }                 -> tarik pesan milik sendiri
 *    "stop_chat"                             -> hentikan obrolan saat ini
 *    "next_chat"                             -> cari partner baru (skip)
 *
 *  ON (server -> client)
 *    "connect"                               -> socket tersambung ke server
 *    "disconnect"                            -> socket terputus dari server
 *    "online_count"        (number)          -> update jumlah user online
 *    "partner_found"       { partnerId }     -> partner ditemukan, status "connected"
 *    "partner_disconnected"                  -> partner keluar/putus
 *    "receive_message"     { id, type, content, meta, timestamp }
 *    "partner_typing"                        -> partner sedang mengetik
 *    "partner_stop_typing"                   -> partner berhenti mengetik
 *    "message_unsent"      { id }            -> pesan partner ditarik oleh dia
 * ============================================================================
 */

const SOCKET_URL = import.meta?.env?.VITE_SOCKET_URL || "https://your-anonnect-server.example.com";

const STATUS = {
  searching: {
    label: "Mencari Teman",
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

function formatTime(ts) {
  const d = new Date(ts || Date.now());
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(sec) {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

/* -------------------------------------------------------------------------- */
/*  Sub-komponen: Titik status koneksi dengan efek radar saat mencari         */
/* -------------------------------------------------------------------------- */
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

/* -------------------------------------------------------------------------- */
/*  Sub-komponen: Pemutar voice note kustom                                  */
/* -------------------------------------------------------------------------- */
function VoiceBubblePlayer({ src, duration, isMe }) {
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
        onClick={toggle}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isMe ? "bg-white/20" : "bg-cyan-500/20"
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
/*  Sub-komponen: Bubble pesan                                                */
/* -------------------------------------------------------------------------- */
function MessageBubble({ msg, isMe, isSelected, onSelect, onUnsend }) {
  if (msg.unsent) {
    return (
      <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-2`}>
        <span className="text-xs italic px-3 py-1.5 rounded-full bg-black/5 dark:bg-slate-800/90 text-slate-400 dark:text-slate-300">
          {isMe ? "Kamu menarik sebuah pesan" : "Lawan bicara menarik sebuah pesan"}
        </span>
      </div>
    );
  }

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
          {msg.type === "text" && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}

          {msg.type === "photo" && (
            <img
              src={msg.content}
              alt="Snap"
              className="rounded-lg max-w-[220px] w-full object-cover"
              draggable={false}
            />
          )}

          {msg.type === "voice" && (
            <VoiceBubblePlayer src={msg.content} duration={msg.meta?.duration} isMe={isMe} />
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
                aria-label="Tarik pesan"
              >
                <Trash2 size={14} />
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
        <span
          className={`mt-1 text-[10px] text-slate-400 dark:text-slate-400 dark:drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] ${
            isMe ? "text-right mr-1" : "text-left ml-1"
          }`}
        >
          {formatTime(msg.timestamp)}
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-komponen: Indikator mengetik                                         */
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
/*  Sub-komponen: Modal kamera dengan efek cermin + watermark                */
/* -------------------------------------------------------------------------- */
function CameraModal({ onClose, onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);

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
      .catch(() => setError("Tidak bisa mengakses kamera. Periksa izin browser kamu."));

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

    // Efek cermin: balik horizontal agar sesuai preview
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Watermark miring di pojok kanan bawah
    const fontSize = Math.max(14, Math.round(canvas.width * 0.028));
    ctx.font = `italic ${fontSize}px sans-serif`;
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    const text = "dipotret dari camera";
    const pad = fontSize * 0.9;

    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillText(text, canvas.width - pad + 1, canvas.height - pad + 1);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText(text, canvas.width - pad, canvas.height - pad);

    setPreview(canvas.toDataURL("image/jpeg", 0.9));
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
              onClick={snap}
              disabled={!ready}
              className="h-14 w-14 rounded-full border-4 border-white/80 bg-white/10 disabled:opacity-30 active:scale-95 transition-transform"
              aria-label="Ambil foto"
            />
          ) : (
            <>
              <button
                onClick={() => setPreview(null)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-700 text-slate-100 text-sm hover:bg-slate-600"
              >
                <RotateCcw size={14} /> Ulangi
              </button>
              <button
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
/*  Sub-komponen: OilBackground — latar animasi black-oil iridescent         */
/* -------------------------------------------------------------------------- */
function OilBackground({ interactive = false, className = "" }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance",
    })

    if (!gl) {
      canvas.style.background = "radial-gradient(ellipse at center, #0a0a0f 0%, #000 70%)"
      return
    }

    const floatExt = gl.getExtension("EXT_color_buffer_float")
    const linearFloat = gl.getExtension("OES_texture_float_linear")
    if (!floatExt) {
      canvas.style.background = "radial-gradient(ellipse at center, #0a0a0f 0%, #000 70%)"
      return
    }

    // ---------- Shaders ----------

    const baseVert = /* glsl */ `#version 300 es
    precision highp float;
    in vec2 a_pos;
    out vec2 v_uv;
    out vec2 v_l;
    out vec2 v_r;
    out vec2 v_t;
    out vec2 v_b;
    uniform vec2 u_texel;
    void main() {
      v_uv = a_pos * 0.5 + 0.5;
      v_l = v_uv - vec2(u_texel.x, 0.0);
      v_r = v_uv + vec2(u_texel.x, 0.0);
      v_t = v_uv + vec2(0.0, u_texel.y);
      v_b = v_uv - vec2(0.0, u_texel.y);
      gl_Position = vec4(a_pos, 0.0, 1.0);
    }`

    const copyFrag = /* glsl */ `#version 300 es
    precision highp float;
    in vec2 v_uv;
    uniform sampler2D u_tex;
    out vec4 o;
    void main() { o = texture(u_tex, v_uv); }`

    const clearFrag = /* glsl */ `#version 300 es
    precision highp float;
    in vec2 v_uv;
    uniform sampler2D u_tex;
    uniform float u_value;
    out vec4 o;
    void main() { o = u_value * texture(u_tex, v_uv); }`

    const splatFrag = /* glsl */ `#version 300 es
    precision highp float;
    in vec2 v_uv;
    uniform sampler2D u_target;
    uniform float u_aspect;
    uniform vec4 u_color;
    uniform vec2 u_point;
    uniform vec2 u_prev;
    uniform float u_radius;
    uniform float u_segment;
    out vec4 o;

    float sdSeg(vec2 p, vec2 a, vec2 b) {
      vec2 pa = p - a, ba = b - a;
      float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
      return length(pa - ba * h);
    }

    void main() {
      vec2 p = v_uv;
      p.x *= u_aspect;
      vec2 a = u_prev;  a.x *= u_aspect;
      vec2 b = u_point; b.x *= u_aspect;
      float d = mix(length(p - b), sdSeg(p, a, b), u_segment);
      float s = exp(-d * d / max(u_radius, 1e-5));
      vec4 base = texture(u_target, v_uv);
      o = base + s * u_color;
    }`

    const advectFrag = /* glsl */ `#version 300 es
    precision highp float;
    in vec2 v_uv;
    uniform sampler2D u_velocity;
    uniform sampler2D u_source;
    uniform vec2 u_texel;
    uniform vec2 u_velTexel;
    uniform float u_dt;
    uniform float u_dissipation;
    out vec4 o;

    vec4 sampleBi(sampler2D tex, vec2 uv) {
      return texture(tex, uv);
    }

    void main() {
      vec2 vel = texture(u_velocity, v_uv).xy;
      vec2 coord = v_uv - u_dt * vel * u_velTexel;
      vec4 result = sampleBi(u_source, coord);
      float decay = 1.0 + u_dissipation * u_dt;
      o = result / decay;
    }`

    const divergenceFrag = /* glsl */ `#version 300 es
    precision highp float;
    in vec2 v_uv;
    in vec2 v_l;
    in vec2 v_r;
    in vec2 v_t;
    in vec2 v_b;
    uniform sampler2D u_velocity;
    out vec4 o;
    void main() {
      float L = texture(u_velocity, v_l).x;
      float R = texture(u_velocity, v_r).x;
      float T = texture(u_velocity, v_t).y;
      float B = texture(u_velocity, v_b).y;
      vec2 c = texture(u_velocity, v_uv).xy;
      if (v_l.x < 0.0)  L = -c.x;
      if (v_r.x > 1.0)  R = -c.x;
      if (v_t.y > 1.0)  T = -c.y;
      if (v_b.y < 0.0)  B = -c.y;
      float div = 0.5 * (R - L + T - B);
      o = vec4(div, 0.0, 0.0, 1.0);
    }`

    const curlFrag = /* glsl */ `#version 300 es
    precision highp float;
    in vec2 v_uv;
    in vec2 v_l;
    in vec2 v_r;
    in vec2 v_t;
    in vec2 v_b;
    uniform sampler2D u_velocity;
    out vec4 o;
    void main() {
      float L = texture(u_velocity, v_l).y;
      float R = texture(u_velocity, v_r).y;
      float T = texture(u_velocity, v_t).x;
      float B = texture(u_velocity, v_b).x;
      float c = R - L - T + B;
      o = vec4(0.5 * c, 0.0, 0.0, 1.0);
    }`

    const vorticityFrag = /* glsl */ `#version 300 es
    precision highp float;
    in vec2 v_uv;
    in vec2 v_l;
    in vec2 v_r;
    in vec2 v_t;
    in vec2 v_b;
    uniform sampler2D u_velocity;
    uniform sampler2D u_curl;
    uniform float u_curlStrength;
    uniform float u_dt;
    out vec4 o;
    void main() {
      float L = texture(u_curl, v_l).x;
      float R = texture(u_curl, v_r).x;
      float T = texture(u_curl, v_t).x;
      float B = texture(u_curl, v_b).x;
      float C = texture(u_curl, v_uv).x;
      vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
      force /= max(length(force), 1e-4);
      force *= u_curlStrength * C;
      force.y *= -1.0;
      vec2 vel = texture(u_velocity, v_uv).xy;
      vel += force * u_dt;
      vel = clamp(vel, vec2(-1000.0), vec2(1000.0));
      o = vec4(vel, 0.0, 1.0);
    }`

    const pressureFrag = /* glsl */ `#version 300 es
    precision highp float;
    in vec2 v_uv;
    in vec2 v_l;
    in vec2 v_r;
    in vec2 v_t;
    in vec2 v_b;
    uniform sampler2D u_pressure;
    uniform sampler2D u_divergence;
    out vec4 o;
    void main() {
      float L = texture(u_pressure, v_l).x;
      float R = texture(u_pressure, v_r).x;
      float T = texture(u_pressure, v_t).x;
      float B = texture(u_pressure, v_b).x;
      float D = texture(u_divergence, v_uv).x;
      float p = (L + R + T + B - D) * 0.25;
      o = vec4(p, 0.0, 0.0, 1.0);
    }`

    const gradientFrag = /* glsl */ `#version 300 es
    precision highp float;
    in vec2 v_uv;
    in vec2 v_l;
    in vec2 v_r;
    in vec2 v_t;
    in vec2 v_b;
    uniform sampler2D u_pressure;
    uniform sampler2D u_velocity;
    out vec4 o;
    void main() {
      float L = texture(u_pressure, v_l).x;
      float R = texture(u_pressure, v_r).x;
      float T = texture(u_pressure, v_t).x;
      float B = texture(u_pressure, v_b).x;
      vec2 v = texture(u_velocity, v_uv).xy;
      v -= vec2(R - L, T - B);
      o = vec4(v, 0.0, 1.0);
    }`

    const renderFrag = /* glsl */ `#version 300 es
    precision highp float;
    in vec2 v_uv;
    uniform sampler2D u_dye;
    uniform sampler2D u_velocity;
    uniform vec2 u_resolution;
    uniform vec2 u_dyeTexel;
    uniform float u_time;

    out vec4 fragColor;

    float hash21(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    float vnoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      float a = hash21(i);
      float b = hash21(i + vec2(1.0, 0.0));
      float c = hash21(i + vec2(0.0, 1.0));
      float d = hash21(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }

    vec3 thinFilm(float opd) {
      const float PI = 3.14159265;
      float r = cos(2.0 * PI * opd / 650.0);
      float g = cos(2.0 * PI * opd / 550.0);
      float b = cos(2.0 * PI * opd / 450.0);
      vec3 c = vec3(r, g, b);
      return c * c;
    }

    vec3 aces(vec3 x) {
      const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
      return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
    }

    float fresnel(float cosTheta, float F0) {
      float m = clamp(1.0 - cosTheta, 0.0, 1.0);
      return F0 + (1.0 - F0) * pow(m, 5.0);
    }

    float ggx(float NdotH, float roughness) {
      float a = roughness * roughness;
      float a2 = a * a;
      float d = (NdotH * NdotH) * (a2 - 1.0) + 1.0;
      return a2 / (3.14159265 * d * d);
    }

    void main() {
      vec2 uv = v_uv;

      vec2 e = u_dyeTexel;
      float hC = clamp(texture(u_dye, uv).a, 0.0, 1.5);
      float hL = clamp(texture(u_dye, uv - vec2(e.x, 0.0)).a, 0.0, 1.5);
      float hR = clamp(texture(u_dye, uv + vec2(e.x, 0.0)).a, 0.0, 1.5);
      float hT = clamp(texture(u_dye, uv + vec2(0.0, e.y)).a, 0.0, 1.5);
      float hB = clamp(texture(u_dye, uv - vec2(0.0, e.y)).a, 0.0, 1.5);

      float heightScale = 60.0;
      vec3 n = normalize(vec3(
        (hL - hR) * heightScale,
        (hB - hT) * heightScale,
        1.0
      ));

      vec3 V = vec3(0.0, 0.0, 1.0);
      vec3 L1 = normalize(vec3(0.45, 0.55, 0.85));
      vec3 L2 = normalize(vec3(-0.6, -0.3, 0.7));

      float NdotV = clamp(dot(n, V), 0.0, 1.0);

      vec3 H1 = normalize(L1 + V);
      vec3 H2 = normalize(L2 + V);
      float spec1 = ggx(clamp(dot(n, H1), 0.0, 1.0), 0.18);
      float spec2 = ggx(clamp(dot(n, H2), 0.0, 1.0), 0.32);

      vec3 R = reflect(-V, n);
      vec2 envUV = uv + R.xy * 0.08;
      float envY = clamp(envUV.y, 0.0, 1.0);
      vec3 envCool = vec3(0.002, 0.004, 0.007);
      vec3 envWarm = vec3(0.008, 0.007, 0.005);
      vec3 env = mix(envCool, envWarm, smoothstep(0.0, 1.0, envY));

      float F = fresnel(NdotV, 0.012);

      float thickness = 1800.0 * hC;
      thickness += 12.0 * vnoise(uv * 6.0 + u_time * 0.05) * hC;
      float opd = thickness * (2.0 * NdotV);
      vec3 iri = thinFilm(opd);
      float iriMask = smoothstep(0.02, 0.35, hC);

      vec2 vel = texture(u_velocity, uv).xy;
      float speed = length(vel);
      vec2 vdir = speed > 1e-4 ? vel / speed : vec2(0.0, 1.0);
      float aniso = abs(dot(n.xy, vec2(-vdir.y, vdir.x)));
      float streak = pow(aniso, 6.0) * smoothstep(0.0, 8.0, speed);

      vec3 base = vec3(0.0008, 0.0012, 0.0020);

      vec3 col = base;
      col = mix(col, env, F * 0.30);
      col += iri * iriMask * (0.45 + 0.55 * F) * 0.85;
      col += vec3(1.1, 1.05, 0.95) * spec1 * (0.5 + 0.5 * F) * iriMask;
      col += vec3(0.85, 0.9, 1.05) * spec2 * (0.35 + 0.45 * F) * iriMask;
      col += streak * vec3(0.7, 0.65, 0.55) * 0.18 * iriMask;

      vec2 q = uv - 0.5;
      float vig = smoothstep(0.85, 0.15, length(q));
      col *= mix(0.45, 1.0, vig);

      float ca = clamp(speed * 0.0015, 0.0, 0.004);
      if (ca > 0.0001) {
        float rC = texture(u_dye, uv + vec2(ca, 0.0)).a;
        float bC = texture(u_dye, uv - vec2(ca, 0.0)).a;
        col.r += (rC - hC) * 0.10;
        col.b += (bC - hC) * 0.10;
      }

      col = aces(col * 0.85);
      col = pow(col, vec3(1.0 / 2.2));
      col = max(col - vec3(0.008), vec3(0.0));
      float grain = (hash21(gl_FragCoord.xy + fract(u_time) * 17.31) - 0.5) * 0.012;
      col += grain;

      fragColor = vec4(col, 1.0);
    }`

    // ---------- GL helpers ----------

    function compile(src, type) {
      const sh = gl.createShader(type)
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("[OilBackground] shader compile error:", gl.getShaderInfoLog(sh), src)
      }
      return sh
    }

    function program(vsSrc, fsSrc) {
      const vs = compile(vsSrc, gl.VERTEX_SHADER)
      const fs = compile(fsSrc, gl.FRAGMENT_SHADER)
      const p = gl.createProgram()
      gl.attachShader(p, vs)
      gl.attachShader(p, fs)
      gl.bindAttribLocation(p, 0, "a_pos")
      gl.linkProgram(p)
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        console.error("[OilBackground] program link error:", gl.getProgramInfoLog(p))
      }
      const uniforms = {}
      const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS)
      for (let i = 0; i < n; i++) {
        const info = gl.getActiveUniform(p, i)
        if (!info) continue
        uniforms[info.name] = gl.getUniformLocation(p, info.name)
      }
      return { p, u: uniforms }
    }

    const quadBuf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const vao = gl.createVertexArray()
    gl.bindVertexArray(vao)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.bindVertexArray(null)

    const progs = {
      copy: program(baseVert, copyFrag),
      clear: program(baseVert, clearFrag),
      splat: program(baseVert, splatFrag),
      advect: program(baseVert, advectFrag),
      divergence: program(baseVert, divergenceFrag),
      curl: program(baseVert, curlFrag),
      vorticity: program(baseVert, vorticityFrag),
      pressure: program(baseVert, pressureFrag),
      gradient: program(baseVert, gradientFrag),
      render: program(baseVert, renderFrag),
    }

    function createFBO(w, h, internal, format, type, filter) {
      const tex = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, type, null)

      const fbo = gl.createFramebuffer()
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
      gl.viewport(0, 0, w, h)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)

      return {
        tex,
        fbo,
        w,
        h,
        texelX: 1 / w,
        texelY: 1 / h,
        attach(id) {
          gl.activeTexture(gl.TEXTURE0 + id)
          gl.bindTexture(gl.TEXTURE_2D, tex)
          return id
        },
      }
    }

    function createDouble(w, h, internal, format, type, filter) {
      let a = createFBO(w, h, internal, format, type, filter)
      let b = createFBO(w, h, internal, format, type, filter)
      return {
        get read() {
          return a
        },
        get write() {
          return b
        },
        swap() {
          const t = a
          a = b
          b = t
        },
        w,
        h,
        texelX: 1 / w,
        texelY: 1 / h,
      }
    }

    // ---------- Sizes / FBOs ----------

    const SIM_RES = 256
    const DYE_RES = 1024

    let velocity
    let dye
    let pressure
    let divergenceFbo
    let curlFbo

    function getRes(target, w, h) {
      const ar = w / h
      if (ar > 1) return { w: Math.round(target * ar), h: target }
      return { w: target, h: Math.round(target / ar) }
    }

    let dprWidth = 0
    let dprHeight = 0

    function initFBOs() {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      dprWidth = Math.max(1, Math.floor(rect.width * dpr))
      dprHeight = Math.max(1, Math.floor(rect.height * dpr))
      canvas.width = dprWidth
      canvas.height = dprHeight

      const sim = getRes(SIM_RES, dprWidth, dprHeight)
      const dyeR = getRes(DYE_RES, dprWidth, dprHeight)

      const filter = linearFloat ? gl.LINEAR : gl.NEAREST
      velocity = createDouble(sim.w, sim.h, gl.RG16F, gl.RG, gl.HALF_FLOAT, filter)
      dye = createDouble(dyeR.w, dyeR.h, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, filter)
      pressure = createDouble(sim.w, sim.h, gl.R16F, gl.RED, gl.HALF_FLOAT, gl.NEAREST)
      divergenceFbo = createFBO(sim.w, sim.h, gl.R16F, gl.RED, gl.HALF_FLOAT, gl.NEAREST)
      curlFbo = createFBO(sim.w, sim.h, gl.R16F, gl.RED, gl.HALF_FLOAT, gl.NEAREST)
    }

    initFBOs()

    function blit(target) {
      if (target) {
        gl.viewport(0, 0, target.w, target.h)
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo)
      } else {
        gl.viewport(0, 0, dprWidth, dprHeight)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      }
      gl.bindVertexArray(vao)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    // ---------- Pointer (opsional, hanya aktif jika interactive=true) ------

    const pointer = {
      x: 0.5,
      y: 0.5,
      px: 0.5,
      py: 0.5,
      dx: 0,
      dy: 0,
      down: false,
      moved: false,
      speed: 0,
      smoothSpeed: 0,
    }

    function updatePointer(clientX, clientY) {
      const rect = canvas.getBoundingClientRect()
      const nx = (clientX - rect.left) / rect.width
      const ny = 1.0 - (clientY - rect.top) / rect.height
      pointer.px = pointer.x
      pointer.py = pointer.y
      pointer.x = nx
      pointer.y = ny
      pointer.dx = nx - pointer.px
      pointer.dy = ny - pointer.py
      pointer.speed = Math.sqrt(pointer.dx * pointer.dx + pointer.dy * pointer.dy)
      pointer.moved = true
    }

    const onMove = (e) => updatePointer(e.clientX, e.clientY)
    const onDown = (e) => {
      pointer.down = true
      const rect = canvas.getBoundingClientRect()
      pointer.x = (e.clientX - rect.left) / rect.width
      pointer.y = 1.0 - (e.clientY - rect.top) / rect.height
      pointer.px = pointer.x
      pointer.py = pointer.y
    }
    const onUp = () => {
      pointer.down = false
    }

    if (interactive) {
      canvas.addEventListener("pointermove", onMove, { passive: true })
      canvas.addEventListener("pointerdown", onDown, { passive: true })
      window.addEventListener("pointerup", onUp, { passive: true })
    }

    const ro = new ResizeObserver(() => initFBOs())
    ro.observe(canvas)

    let visible = !document.hidden
    const onVis = () => {
      visible = !document.hidden
    }
    document.addEventListener("visibilitychange", onVis)

    // ---------- Splat ----------

    function splat(target, x, y, px, py, color, radius, asSegment) {
      const { p, u } = progs.splat
      gl.useProgram(p)
      gl.uniform1i(u["u_target"], target.read.attach(0))
      gl.uniform1f(u["u_aspect"], target.w / target.h)
      gl.uniform2f(u["u_point"], x, y)
      gl.uniform2f(u["u_prev"], px, py)
      gl.uniform4f(u["u_color"], color[0], color[1], color[2], color[3])
      gl.uniform1f(u["u_radius"], radius)
      gl.uniform1f(u["u_segment"], asSegment ? 1.0 : 0.0)
      blit(target.write)
      target.swap()
    }

    function applyPointerSplats() {
      if (!interactive) return
      const dx = pointer.dx
      const dy = pointer.dy
      const dlen = Math.hypot(dx, dy)
      if (dlen < 1e-5) return

      pointer.smoothSpeed = pointer.smoothSpeed * 0.7 + dlen * 0.3
      const s = pointer.smoothSpeed

      const speedBoost = 1.0 + Math.min(s * 140.0, 22.0)
      const splatVx = dx * 4500.0 * speedBoost
      const splatVy = dy * 4500.0 * speedBoost

      const dyeAmount = Math.min(0.18 + s * 8.0, 1.4)

      const baseR = 0.00026
      const radius = baseR * (1.0 + Math.min(s * 18.0, 3.5))

      splat(velocity, pointer.x, pointer.y, pointer.px, pointer.py, [splatVx, splatVy, 0, 0], radius, true)
      splat(
        dye,
        pointer.x,
        pointer.y,
        pointer.px,
        pointer.py,
        [dyeAmount * 0.06, dyeAmount * 0.07, dyeAmount * 0.08, dyeAmount],
        radius * 1.15,
        true,
      )

      pointer.px = pointer.x
      pointer.py = pointer.y
      pointer.dx = 0
      pointer.dy = 0
      pointer.speed = 0
    }

    // Idle drift ambient: surface tetap "hidup" walau tanpa interaksi user —
    // ini yang dipakai sebagai latar biar halaman tidak terasa statis/bosan.
    let idleT = 0
    function idleDrift(dt) {
      idleT += dt
      if (interactive && pointer.moved) return
      const cx = 0.5 + 0.22 * Math.sin(idleT * 0.31)
      const cy = 0.5 + 0.22 * Math.cos(idleT * 0.24)
      const px = 0.5 + 0.22 * Math.sin((idleT - dt) * 0.31)
      const py = 0.5 + 0.22 * Math.cos((idleT - dt) * 0.24)
      const dx = cx - px
      const dy = cy - py
      splat(velocity, cx, cy, px, py, [dx * 2200, dy * 2200, 0, 0], 0.0004, true)
      splat(dye, cx, cy, px, py, [0.004, 0.005, 0.006, 0.08], 0.0005, true)
    }

    // ---------- Main loop ----------

    let last = performance.now()
    let raf = 0
    let startTime = performance.now()

    const VELOCITY_DISSIPATION = 0.6
    const DYE_DISSIPATION = 1.2
    const PRESSURE_ITERATIONS = 24
    const CURL_STRENGTH = 22.0

    function step(dt) {
      {
        const { p, u } = progs.curl
        gl.useProgram(p)
        gl.uniform2f(u["u_texel"], velocity.texelX, velocity.texelY)
        gl.uniform1i(u["u_velocity"], velocity.read.attach(0))
        blit(curlFbo)
      }
      {
        const { p, u } = progs.vorticity
        gl.useProgram(p)
        gl.uniform2f(u["u_texel"], velocity.texelX, velocity.texelY)
        gl.uniform1i(u["u_velocity"], velocity.read.attach(0))
        gl.uniform1i(u["u_curl"], curlFbo.attach(1))
        gl.uniform1f(u["u_curlStrength"], CURL_STRENGTH)
        gl.uniform1f(u["u_dt"], dt)
        blit(velocity.write)
        velocity.swap()
      }
      {
        const { p, u } = progs.divergence
        gl.useProgram(p)
        gl.uniform2f(u["u_texel"], velocity.texelX, velocity.texelY)
        gl.uniform1i(u["u_velocity"], velocity.read.attach(0))
        blit(divergenceFbo)
      }
      {
        const { p, u } = progs.clear
        gl.useProgram(p)
        gl.uniform1i(u["u_tex"], pressure.read.attach(0))
        gl.uniform1f(u["u_value"], 0.8)
        blit(pressure.write)
        pressure.swap()
      }
      {
        const { p, u } = progs.pressure
        gl.useProgram(p)
        gl.uniform2f(u["u_texel"], pressure.texelX, pressure.texelY)
        for (let i = 0; i < PRESSURE_ITERATIONS; i++) {
          gl.uniform1i(u["u_pressure"], pressure.read.attach(0))
          gl.uniform1i(u["u_divergence"], divergenceFbo.attach(1))
          blit(pressure.write)
          pressure.swap()
        }
      }
      {
        const { p, u } = progs.gradient
        gl.useProgram(p)
        gl.uniform2f(u["u_texel"], velocity.texelX, velocity.texelY)
        gl.uniform1i(u["u_pressure"], pressure.read.attach(0))
        gl.uniform1i(u["u_velocity"], velocity.read.attach(1))
        blit(velocity.write)
        velocity.swap()
      }
      {
        const { p, u } = progs.advect
        gl.useProgram(p)
        gl.uniform2f(u["u_texel"], velocity.texelX, velocity.texelY)
        gl.uniform2f(u["u_velTexel"], velocity.texelX, velocity.texelY)
        gl.uniform1i(u["u_velocity"], velocity.read.attach(0))
        gl.uniform1i(u["u_source"], velocity.read.attach(0))
        gl.uniform1f(u["u_dt"], dt)
        gl.uniform1f(u["u_dissipation"], VELOCITY_DISSIPATION)
        blit(velocity.write)
        velocity.swap()
      }
      {
        const { p, u } = progs.advect
        gl.useProgram(p)
        gl.uniform2f(u["u_texel"], dye.texelX, dye.texelY)
        gl.uniform2f(u["u_velTexel"], velocity.texelX, velocity.texelY)
        gl.uniform1i(u["u_velocity"], velocity.read.attach(0))
        gl.uniform1i(u["u_source"], dye.read.attach(1))
        gl.uniform1f(u["u_dt"], dt)
        gl.uniform1f(u["u_dissipation"], DYE_DISSIPATION)
        blit(dye.write)
        dye.swap()
      }
    }

    function render() {
      const { p, u } = progs.render
      gl.useProgram(p)
      gl.uniform1i(u["u_dye"], dye.read.attach(0))
      gl.uniform1i(u["u_velocity"], velocity.read.attach(1))
      gl.uniform2f(u["u_resolution"], dprWidth, dprHeight)
      gl.uniform2f(u["u_dyeTexel"], dye.texelX, dye.texelY)
      gl.uniform1f(u["u_time"], (performance.now() - startTime) / 1000)
      blit(null)
    }

    function frame() {
      const now = performance.now()
      let dt = (now - last) / 1000
      last = now
      if (dt > 0.05) dt = 0.05

      if (visible) {
        idleDrift(dt)
        applyPointerSplats()
        step(dt)
        render()
      }

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      if (interactive) {
        canvas.removeEventListener("pointermove", onMove)
        canvas.removeEventListener("pointerdown", onDown)
        window.removeEventListener("pointerup", onUp)
      }
      document.removeEventListener("visibilitychange", onVis)

      const lose = gl.getExtension("WEBGL_lose_context")
      lose?.loseContext()
    }
  }, [interactive])

  return (
    <canvas
      ref={canvasRef}
      className={`block h-full w-full select-none ${interactive ? "touch-none" : "pointer-events-none"} ${className}`}
      style={{ cursor: interactive ? "crosshair" : "default" }}
      aria-hidden="true"
    />
  )
}

/* -------------------------------------------------------------------------- */
/*  Komponen utama: ChatInterface                                            */
/* -------------------------------------------------------------------------- */
export default function ChatInterface({ onNavigateToAbout }) {
  const [darkMode, setDarkMode] = useState(true);
  const [status, setStatus] = useState("searching");
  const [onlineCount, setOnlineCount] = useState(0);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [selectedMsgId, setSelectedMsgId] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordTimerRef = useRef(null);
  const micStreamRef = useRef(null);

  /* --- Koneksi socket & listener utama ------------------------------------ */
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"], autoConnect: true });
    socketRef.current = socket;

    socket.on("connect", () => socket.emit("find_partner"));
    socket.on("disconnect", () => setStatus("disconnected"));
    socket.on("online_count", (count) => setOnlineCount(count));

    socket.on("partner_found", () => {
      setStatus("connected");
      setMessages([]);
    });

    socket.on("partner_disconnected", () => {
      setStatus("searching");
      setPartnerTyping(false);
    });

    socket.on("receive_message", (payload) => {
      setMessages((prev) => [
        ...prev,
        {
          id: payload.id || `${Date.now()}-r`,
          sender: "stranger",
          type: payload.type,
          content: payload.content,
          meta: payload.meta,
          timestamp: payload.timestamp || Date.now(),
        },
      ]);
      setPartnerTyping(false);
    });

    socket.on("partner_typing", () => setPartnerTyping(true));
    socket.on("partner_stop_typing", () => setPartnerTyping(false));

    socket.on("message_unsent", ({ id }) => {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, unsent: true } : m)));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  /* --- Auto-scroll ---------------------------------------------------------*/
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, partnerTyping]);

  /* --- Helper: kirim pesan apa pun ----------------------------------------*/
  const pushLocalMessage = useCallback((type, content, meta) => {
    const id = `${Date.now()}-m`;
    setMessages((prev) => [
      ...prev,
      { id, sender: "me", type, content, meta, timestamp: Date.now() },
    ]);
    socketRef.current?.emit("send_message", { id, type, content, meta });
  }, []);

  /* --- Input teks & indikator mengetik ------------------------------------*/
  const handleInputChange = (e) => {
    setInputText(e.target.value);
    socketRef.current?.emit("typing");
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit("stop_typing");
    }, 1200);
  };

  const sendText = () => {
    const text = inputText.trim();
    if (!text || status !== "connected") return;
    pushLocalMessage("text", text);
    setInputText("");
    socketRef.current?.emit("stop_typing");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendText();
    }
  };

  /* --- Unsend pesan ---------------------------------------------------------*/
  const handleUnsend = (id) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, unsent: true } : m)));
    socketRef.current?.emit("unsend_message", { id });
    setSelectedMsgId(null);
  };

  /* --- Kamera snap ---------------------------------------------------------*/
  const handleCapture = (dataUrl) => {
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
        const url = URL.createObjectURL(blob);
        pushLocalMessage("voice", url, { duration: recordSeconds });
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
    clearInterval(recordTimerRef.current);
    setIsRecording(false);
  };

  /* --- Stop & Next -----------------------------------------------------------*/
  const handleStop = () => {
    socketRef.current?.emit("stop_chat");
    setStatus("disconnected");
    setMessages([]);
    setPartnerTyping(false);
  };

  const handleNext = () => {
    socketRef.current?.emit("next_chat");
    setStatus("searching");
    setMessages([]);
    setPartnerTyping(false);
  };

  const s = STATUS[status];
  const canType = status === "connected";

  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="relative isolate flex flex-col h-[100dvh] w-full overflow-hidden bg-slate-50 dark:bg-[#020304] text-slate-800 dark:text-slate-100 transition-colors">
        {/* Latar animasi — hanya tampil di dark mode agar tetap jetblack & tidak bentrok warna teks light mode */}
        {darkMode && (
          <div className="absolute inset-0 -z-10">
            <OilBackground interactive={false} />
            {/* Overlay tipis agar iridescence tidak pernah bikin teks/bubble sulit dibaca */}
            <div className="absolute inset-0 bg-[#020304]/35" />
          </div>
        )}

        {/* ---------------------------------------------------------------- Header */}
        <header className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-200/80 dark:border-slate-800/60 bg-white/80 dark:bg-[#05070C]/75 backdrop-blur-xl sticky top-0 z-20">
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
                <span className="text-[11px] text-slate-500 dark:text-slate-300">{s.label}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/90 text-xs font-medium dark:text-slate-100">
              <Users size={13} className="text-emerald-500 dark:text-emerald-400" />
              <span className="tabular-nums">{onlineCount.toLocaleString("id-ID")}</span>
            </div>
            <button
              onClick={() => setDarkMode((v) => !v)}
              className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 dark:text-slate-100 transition-colors"
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

        {/* ------------------------------------------------------------- Chat body */}
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
                <p className="text-sm text-slate-500 dark:text-slate-300 dark:drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]">
                  Mencari lawan bicara acak untukmu…
                </p>
              </div>
            )}

            {status === "disconnected" && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center py-16 gap-3">
                <PhoneOff size={26} className="text-rose-400" />
                <p className="text-sm text-slate-500 dark:text-slate-300 dark:drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]">
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

        {/* --------------------------------------------------------------- Input bar */}
        <footer className="shrink-0 border-t border-slate-200/80 dark:border-slate-800/60 bg-white/90 dark:bg-[#05070C]/85 backdrop-blur-xl">
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
                  onClick={stopRecording}
                  className="px-3 py-1.5 rounded-full bg-rose-500 text-white text-xs font-medium"
                >
                  Selesai
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
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
                    onClick={() => setShowCamera(true)}
                    disabled={!canType}
                    className="h-8 w-8 shrink-0 flex items-center justify-center rounded-full text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                    aria-label="Buka kamera"
                    title="Kamera"
                  >
                    <Camera size={16} />
                  </button>

                  <button
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

            {/* --------------------------------------------------------- Footer link */}
            <div className="flex items-center justify-center gap-1.5 mt-2.5 text-[11px] text-slate-400 dark:text-slate-400">
              <span>🔒 Secured by Anonnect</span>
              <span className="opacity-40">•</span>
              <button
                onClick={() => (onNavigateToAbout ? onNavigateToAbout() : null)}
                className="flex items-center gap-1 underline-offset-2 hover:underline hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <Info size={11} /> Tentang Developer
              </button>
            </div>
          </div>
        </footer>

        {/* --------------------------------------------------------------- Modal kamera */}
        <AnimatePresence>
          {showCamera && (
            <CameraModal onClose={() => setShowCamera(false)} onCapture={handleCapture} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}