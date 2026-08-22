import React, { useEffect, useState } from "react";
import ChatInterface from "./ChatInterface";
import LandingPage from "./LandingPage";
import { socket } from "./socket";

/**
 * AnonnectApp — komponen akar yang mengatur transisi landing page -> chat.
 * Ganti pemakaian <ChatInterface /> langsung di root/page kamu jadi
 * <AnonnectApp />, dan sambungkan `onNavigateToAbout` ke route About-mu.
 */
export default function AnonnectApp() {
  const [view, setView] = useState<"landing" | "chat">("landing");
  const [landingOnlineCount, setLandingOnlineCount] = useState(0);

  // Sambung socket lebih awal di landing page HANYA untuk baca online_count —
  // belum emit "find_partner" apa pun, jadi tidak memicu pencarian pasangan.
  // Koneksi yang sama ini lanjut dipakai begitu view pindah ke "chat".
  useEffect(() => {
    if (view !== "landing") return;

    socket.connect();
    const handleOnlineCount = (count: number) => setLandingOnlineCount(count);
    socket.on("online_count", handleOnlineCount);

    return () => {
      socket.off("online_count", handleOnlineCount);
    };
  }, [view]);

  if (view === "chat") {
    return (
      <ChatInterface
        onNavigateToAbout={() => {
          // TODO: arahkan ke route/halaman "Tentang Developer" kamu, mis.:
          // router.push("/about")
        }}
      />
    );
  }

  return <LandingPage onStart={() => setView("chat")} onlineCount={landingOnlineCount} />;
}