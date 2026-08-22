/**
 * ============================================================================
 *  i18n.ts — dictionary bahasa Indonesia/Inggris untuk Anonnect
 *  (sebelumnya bernama chatHelpers.ts — bot sudah dicabut sepenuhnya per
 *  permintaan; sekarang berisi murni terjemahan UI)
 * ============================================================================
 */

export type Lang = "id" | "en";

export interface TranslationStrings {
  statusSearching: string;
  statusConnected: string;
  statusDisconnected: string;
  partnerOnline: string;
  partnerOffline: string;
  inputPlaceholder: string;
  inputPlaceholderWaiting: string;
  nextConfirmTitle: string;
  nextConfirmMessage: string;
  nextConfirmYes: string;
  nextConfirmNo: string;
  incomingCallTitle: string;
  incomingCallSubtitle: string;
  callAccept: string;
  callDecline: string;
  callCalling: string;
  callLabel: string;
  footerSecured: string;
  footerAbout: string;
  cameraTitle: string;
  cameraRetry: string;
  cameraSend: string;
  cameraPermission: string;
  unsendMine: string;
  unsendTheirs: string;
  micPermission: string;
  micPermissionCall: string;
  micPermissionAccept: string;
  waitingMessage: string;
  realConnectedMessage: string;
  leftMessage: string;
  strangerLeftMessage: string;
  audioError: string;
  callConnectionFailed: string;
  stopChatTooltip: string;
  voiceCallTooltip: string;
  themeLight: string;
  themeDark: string;
}

export const translations: Record<Lang, TranslationStrings> = {
  id: {
    statusSearching: "Mencari Teman...",
    statusConnected: "Terhubung",
    statusDisconnected: "Terputus",
    partnerOnline: "Partner online",
    partnerOffline: "Partner offline",
    inputPlaceholder: "Tulis pesan…",
    inputPlaceholderWaiting: "Menunggu koneksi…",
    nextConfirmTitle: "Cari pasangan baru?",
    nextConfirmMessage: "Anda yakin menghentikan percakapan dengan orang ini dan mencari pasangan baru?",
    nextConfirmYes: "Ya, Lanjutkan",
    nextConfirmNo: "Tidak",
    incomingCallTitle: "Panggilan suara masuk",
    incomingCallSubtitle: "Orang asing mengajak voice call",
    callAccept: "Terima",
    callDecline: "Tolak",
    callCalling: "Memanggil…",
    callLabel: "Voice call",
    footerSecured: "🔒 Diamankan oleh Anonnect",
    footerAbout: "Tentang Developer",
    cameraTitle: "Kamera Snap",
    cameraRetry: "Ulangi",
    cameraSend: "Kirim",
    cameraPermission: "Gagal mengakses kamera.",
    unsendMine: "Kamu menarik pesan ini",
    unsendTheirs: "Pesan ditarik",
    micPermission: "Izinkan akses mikrofon untuk pesan suara.",
    micPermissionCall: "Izinkan akses mikrofon untuk memulai voice call.",
    micPermissionAccept: "Izinkan akses mikrofon untuk menerima voice call.",
    waitingMessage: "Mencari pasangan obrolan baru...",
    realConnectedMessage: "Pasangan ditemukan! Ucapkan Hai 👋",
    leftMessage: "Kamu telah meninggalkan obrolan.",
    strangerLeftMessage: "Orang asing telah meninggalkan obrolan.",
    audioError: "Gagal memutar pesan suara.",
    callConnectionFailed: "Koneksi audio gagal tersambung. Coba akhiri & mulai ulang panggilan ya.",
    stopChatTooltip: "Stop obrolan",
    voiceCallTooltip: "Voice call",
    themeLight: "Mode Terang",
    themeDark: "Mode Gelap",
  },
  en: {
    statusSearching: "Searching...",
    statusConnected: "Connected",
    statusDisconnected: "Disconnected",
    partnerOnline: "Partner online",
    partnerOffline: "Partner offline",
    inputPlaceholder: "Type a message…",
    inputPlaceholderWaiting: "Waiting for connection…",
    nextConfirmTitle: "Find a new match?",
    nextConfirmMessage: "Are you sure you want to end this conversation and find a new partner?",
    nextConfirmYes: "Yes, Continue",
    nextConfirmNo: "No",
    incomingCallTitle: "Incoming voice call",
    incomingCallSubtitle: "Stranger is inviting you to a voice call",
    callAccept: "Accept",
    callDecline: "Decline",
    callCalling: "Calling…",
    callLabel: "Voice call",
    footerSecured: "🔒 Secured by Anonnect",
    footerAbout: "About Developer",
    cameraTitle: "Snap Camera",
    cameraRetry: "Retake",
    cameraSend: "Send",
    cameraPermission: "Failed to access camera.",
    unsendMine: "You unsent this message",
    unsendTheirs: "Message was unsent",
    micPermission: "Please allow microphone access to send voice notes.",
    micPermissionCall: "Please allow microphone access to start a voice call.",
    micPermissionAccept: "Please allow microphone access to answer the call.",
    waitingMessage: "Looking for a new chat partner...",
    realConnectedMessage: "Partner found! Say hi 👋",
    leftMessage: "You left the chat.",
    strangerLeftMessage: "Stranger has left the chat.",
    audioError: "Failed to play voice message.",
    callConnectionFailed: "Audio connection failed. Try ending and restarting the call.",
    stopChatTooltip: "Stop chat",
    voiceCallTooltip: "Voice call",
    themeLight: "Light Mode",
    themeDark: "Dark Mode",
  },
};