/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, MapPin, Mail, Instagram, Linkedin } from "lucide-react";
import AsciiImage from "./components/AsciiImage";
import ChatInterface from "./components/ChatInterface";
import { socket } from "./components/socket";

const words = ["rahasia", "anonim", "aman", "terjaga"];

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
/*  Sub-komponen: ShaderButton                                                */
/* -------------------------------------------------------------------------- */
function ShaderButton({ children, onClick, className = "h-11 w-32" }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
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
        style={{ width: "400%", height: "400%", top: "-150%", left: "-150%" }}
      />
      <span className="relative z-10 inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-[#09090b] text-sm font-medium text-zinc-200 transition-colors hover:bg-[#18181b] tracking-wide">
        {children}
      </span>
    </button>
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
/*  Sub-komponen: GradientBackground (Untuk halaman About)                    */
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
                <a href="mailto:rizkymahreza@anonnect.space" className="hover:text-white transition-colors truncate">
                  rizkymahreza@anonnect.space
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
/*  Komponen Induk Utama: App                                                 */
/* -------------------------------------------------------------------------- */
type Page = "landing" | "chat" | "about";

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("landing");

  useEffect(() => {
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, []);

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