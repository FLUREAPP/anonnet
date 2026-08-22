import React from "react";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, ShieldCheck, Zap, Video, Users2, Sparkles } from "lucide-react";

/**
 * ============================================================================
 *  LandingPage — halaman pembuka Anonnect sebelum masuk ke ruang obrolan
 * ============================================================================
 *  Konsep visual: dark aurora hero — blob gradient besar yang melayang
 *  lambat di belakang, glass navbar tipis, headline gradient raksasa,
 *  live online-count pill (data asli dari socket "online_count", dikirim
 *  lewat prop), CTA utama dengan glow + pulse ring, dan beberapa "kartu
 *  chat" dekoratif yang mengambang halus untuk memberi konteks produk
 *  tanpa perlu screenshot asli.
 *
 *  Landing ini sengaja SELALU dark (terlepas dari tema chat) — ini
 *  keputusan desain umum untuk hero/marketing page kelas atas.
 * ============================================================================
 */

interface LandingPageProps {
  onStart: () => void;
  onlineCount?: number;
}

const headlineContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.09, delayChildren: 0.15 },
  },
};

const headlineWord: Variants = {
  hidden: { y: 46, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

const fadeUp: Variants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.6, ease: "easeOut" } },
};

const FEATURES: { icon: React.ElementType; label: string }[] = [
  { icon: ShieldCheck, label: "100% Anonim" },
  { icon: Zap, label: "Real-time" },
  { icon: Video, label: "Voice & Video Call" },
  { icon: Users2, label: "Ribuan Pengguna" },
];

function FloatingCard({
  className,
  delay,
  duration,
  children,
}: {
  className: string;
  delay: number;
  duration: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className={`absolute rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl px-3.5 py-2.5 shadow-2xl shadow-black/40 ${className}`}
      initial={{ opacity: 0, y: 30 }}
      animate={{
        opacity: [0, 1, 1, 1],
        y: [30, 0, -14, 0],
      }}
      transition={{
        opacity: { duration: 1, delay },
        y: { duration, repeat: Infinity, repeatType: "mirror", ease: "easeInOut", delay: delay + 1 },
      }}
    >
      {children}
    </motion.div>
  );
}

export default function LandingPage({ onStart, onlineCount }: LandingPageProps) {
  const displayCount = onlineCount && onlineCount > 0 ? onlineCount.toLocaleString("id-ID") : null;

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#05060A] text-white">
      {/* ------------------------------------------------------------ Aurora background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-40 -left-32 h-[520px] w-[520px] rounded-full opacity-40 blur-[110px]"
          style={{ background: "radial-gradient(circle, #06B6D4 0%, transparent 70%)" }}
          animate={{ x: [0, 60, -20, 0], y: [0, 40, 80, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/3 -right-40 h-[560px] w-[560px] rounded-full opacity-40 blur-[120px]"
          style={{ background: "radial-gradient(circle, #7C3AED 0%, transparent 70%)" }}
          animate={{ x: [0, -50, 30, 0], y: [0, -60, 20, 0] }}
          transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[-160px] left-1/3 h-[480px] w-[480px] rounded-full opacity-30 blur-[120px]"
          style={{ background: "radial-gradient(circle, #EC4899 0%, transparent 70%)" }}
          animate={{ x: [0, 40, -40, 0], y: [0, -30, 10, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Grain halus supaya gradient tidak terlihat "plastik" */}
        <div
          className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
        {/* Vignette supaya teks tetap kebaca jelas di atas aurora */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,#05060A_88%)]" />
      </div>

      {/* ------------------------------------------------------------ Navbar */}
      <motion.header
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 flex items-center justify-between px-5 sm:px-8 py-5"
      >
        <div className="flex items-center gap-2.5">
          <img src="/anonnect-logo.svg" alt="Anonnect" className="h-8 w-8 rounded-lg shadow-lg shadow-violet-500/20" />
          <span className="text-sm font-bold tracking-tight">Anonnect</span>
        </div>

        {displayCount && (
          <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/70 backdrop-blur-md">
            <span className="relative flex h-1.5 w-1.5">
              <motion.span
                className="absolute inline-flex h-full w-full rounded-full bg-emerald-400"
                animate={{ scale: [1, 2.2], opacity: [0.7, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
              />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            {displayCount} online sekarang
          </div>
        )}
      </motion.header>

      {/* ------------------------------------------------------------ Hero */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
        {/* Kartu chat dekoratif — hanya elemen visual, disembunyikan di layar kecil */}
        <FloatingCard className="hidden lg:block left-[8%] top-[22%] w-52" delay={0.9} duration={7}>
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-full bg-gradient-to-br from-cyan-500 to-violet-600" />
            <div className="h-2 w-24 rounded-full bg-white/20" />
          </div>
          <div className="mt-2 h-2 w-32 rounded-full bg-white/10" />
        </FloatingCard>

        <FloatingCard className="hidden lg:block right-[9%] top-[30%] w-56" delay={1.3} duration={8.5}>
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-full bg-white/15" />
            <div className="h-2 w-20 rounded-full bg-white/20" />
          </div>
          <div className="mt-2 h-2 w-36 rounded-full bg-white/10" />
          <div className="mt-1.5 h-2 w-24 rounded-full bg-white/10" />
        </FloatingCard>

        <FloatingCard className="hidden lg:block left-[14%] bottom-[18%] w-44" delay={1.7} duration={6.5}>
          <div className="flex items-center gap-1.5">
            <Sparkles size={12} className="text-cyan-300" />
            <div className="h-2 w-20 rounded-full bg-white/15" />
          </div>
        </FloatingCard>

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[11px] font-medium text-cyan-300 backdrop-blur-md"
        >
          <Sparkles size={12} />
          Ngobrol tanpa identitas, kapan saja
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={headlineContainer}
          initial="hidden"
          animate="show"
          className="max-w-3xl text-[2.6rem] leading-[1.08] font-extrabold tracking-tight sm:text-6xl sm:leading-[1.05]"
        >
          <span className="block overflow-hidden">
            <motion.span variants={headlineWord} className="inline-block">
              Ngobrol&nbsp;Random.
            </motion.span>
          </span>
          <span className="block overflow-hidden">
            <motion.span
              variants={headlineWord}
              className="inline-block bg-gradient-to-r from-cyan-400 via-sky-300 to-violet-400 bg-clip-text text-transparent"
            >
              Sepenuhnya&nbsp;Anonim.
            </motion.span>
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.55 }}
          className="mt-5 max-w-md text-sm text-white/50 sm:text-base"
        >
          Temukan lawan bicara baru secara acak — chat, foto, voice note, sampai voice call. Tanpa akun, tanpa jejak, tanpa drama.
        </motion.p>

        {/* CTA */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.75 }}
          className="relative mt-10"
        >
          <motion.span
            className="absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 blur-xl"
            animate={{ opacity: [0.45, 0.75, 0.45], scale: [0.96, 1.04, 0.96] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.button
            onClick={onStart}
            whileHover={{ scale: 1.045 }}
            whileTap={{ scale: 0.965 }}
            className="group relative flex items-center gap-2.5 rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 px-8 py-4 text-base font-semibold text-white shadow-2xl shadow-violet-600/30"
          >
            Mulai Obrolan
            <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
          </motion.button>
        </motion.div>

        {/* Feature chips */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 0.95 } } }}
          className="mt-12 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3"
        >
          {FEATURES.map(({ icon: Icon, label }) => (
            <motion.div
              key={label}
              variants={fadeUp}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-white/60 backdrop-blur-md"
            >
              <Icon size={13} className="text-cyan-300" />
              {label}
            </motion.div>
          ))}
        </motion.div>
      </main>

      {/* ------------------------------------------------------------ Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.1 }}
        className="relative z-10 pb-6 text-center text-[11px] text-white/30"
      >
        🔒 Secured by Anonnect
      </motion.footer>
    </div>
  );
}