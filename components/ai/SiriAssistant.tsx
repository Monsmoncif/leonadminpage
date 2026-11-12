"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Send,
  Sparkles,
  Phone,
  ArrowRight,
  Trash2,
  Loader2,
  User,
  Car,
  FileText,
  Calendar,
  Plus,
  UserPlus,
  Search,
  Eye,
  CheckCircle2,
} from "lucide-react";
import CreateClientModal from "@/components/modals/CreateClientModal";
import CreateCompanyModal from "@/components/modals/CreateCompanyModal";
import CreateUnitModal from "@/components/modals/CreateUnitModal";
import { invalidateClientCache } from "@/lib/client-cache";
import { useToast } from "@/components/providers/ToastProvider";

interface SearchClientItem {
  id: string;
  _id?: string;
  name: string;
  phone: string;
  email?: string;
  status?: string;
  clientType?: string;
  idNumber?: string;
}

interface SearchVehicleItem {
  id: string;
  _id?: string;
  title?: string;
  make?: string;
  model?: string;
  year?: number;
  plate: string;
  color?: string;
  status: string;
  dailyRate?: number;
  mileage?: number;
  image?: string;
}

interface SearchContractItem {
  id: string;
  _id?: string;
  contractNumber: number | string;
  customer: string;
  vehicle: string;
  status: string;
  deliveryStatus?: string;
  startDate?: string;
  endDate?: string;
  totalAmount?: number;
}

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  action?: string;
  navigateUrl?: string;
  data?: {
    type?: "clients" | "vehicles" | "contracts" | "overview";
    items?: any[];
    stats?: Record<string, any>;
  };
  timestamp: Date;
}

const DEFAULT_WELCOME: Message = {
  id: "welcome",
  sender: "assistant",
  text: "Welcome to Leon Assistant! You can speak or type commands to create a new contract, open client details, search vehicles, or navigate to any page.",
  timestamp: new Date(),
};

const getInitials = (name: string) => {
  if (!name) return "C";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
};

export default function SiriAssistant() {
  const router = useRouter();
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [lang, setLang] = useState<"ar" | "en">("en");
  const [transcript, setTranscript] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([DEFAULT_WELCOME]);

  // Autonomous Action Modals triggered directly by Leon Assistant
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [isAddCompanyModalOpen, setIsAddCompanyModalOpen] = useState(false);
  const [isAddUnitModalOpen, setIsAddUnitModalOpen] = useState(false);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize Speech Synthesis and Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis || null;

      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = lang === "ar" ? "ar-AE" : "en-US";

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          let currentTranscript = "";
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
        };

        recognition.onerror = (event: any) => {
          console.warn("Speech recognition error:", event.error);
          setIsListening(false);
          if (event.error === "not-allowed") {
            setTranscript("Microphone permission denied. Please allow mic access in browser.");
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, [lang]);

  // Automatically submit when voice recognition finishes capturing speech
  useEffect(() => {
    if (!isListening && transcript.trim().length > 0 && !transcript.startsWith("Microphone permission")) {
      const textToSubmit = transcript.trim();
      setTranscript("");
      handleSendMessage(textToSubmit);
    }
  }, [isListening, transcript]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isProcessing]);

  // Text to speech function
  const speakText = useCallback(
    (text: string) => {
      if (isMuted || !synthRef.current || typeof window === "undefined") return;

      try {
        synthRef.current.cancel();
        const cleanText = text
          .replace(/[#*_~`]/g, "")
          .replace(/\[.*?\]/g, "")
          .trim();

        const utterance = new SpeechSynthesisUtterance(cleanText);
        const isArabicText = /[\u0600-\u06FF]/.test(cleanText);
        utterance.lang = isArabicText ? "ar-XA" : "en-US";
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        const voices = synthRef.current.getVoices();
        const preferredVoice = voices.find((v) =>
          isArabicText ? v.lang.startsWith("ar") : v.lang.startsWith("en")
        );
        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        synthRef.current.speak(utterance);
      } catch (e) {
        console.warn("TTS error:", e);
        setIsSpeaking(false);
      }
    },
    [isMuted]
  );

  // Toggle listening
  const toggleListening = () => {
    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsListening(false);
    } else {
      if (synthRef.current) synthRef.current.cancel();
      setIsSpeaking(false);
      setTranscript("");

      if (recognitionRef.current) {
        try {
          recognitionRef.current.lang = lang === "ar" ? "ar-AE" : "en-US";
          recognitionRef.current.start();
        } catch (err) {
          console.warn("Error starting speech recognition:", err);
        }
      }
    }
  };

  const handleClose = () => {
    if (synthRef.current) synthRef.current.cancel();
    try {
      recognitionRef.current?.stop();
    } catch {}
    setIsListening(false);
    setIsSpeaking(false);
    setIsOpen(false);
  };

  const executeDomClick = (targetText: string) => {
    if (typeof document === "undefined") return false;
    const lowerTarget = (targetText || "").toLowerCase().trim();
    const buttons = Array.from(document.querySelectorAll("button, a")) as HTMLElement[];

    for (const btn of buttons) {
      if (btn.closest("[data-leon-assistant-modal='true']")) continue;
      const text = (btn.innerText || btn.textContent || btn.getAttribute("title") || "").toLowerCase().trim();
      if (!text) continue;

      if (
        text.includes(lowerTarget) ||
        (lowerTarget.includes("next") && (text.includes("next") || text.includes("continue") || text.includes("التالي"))) ||
        (lowerTarget.includes("back") && (text.includes("back") || text.includes("previous") || text.includes("رجوع"))) ||
        (lowerTarget.includes("submit") && (text.includes("create") || text.includes("save") || text.includes("dispatch") || text.includes("confirm"))) ||
        (lowerTarget.includes("client") && (text.includes("add customer") || text.includes("add client") || text.includes("new customer")))
      ) {
        btn.click();
        return true;
      }
    }
    return false;
  };

  // Send message to assistant
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isProcessing) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsProcessing(true);

    try {
      const detectedLang = /[\u0600-\u06FF]/.test(text) ? "ar" : lang;
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          lang: detectedLang,
        }),
      });

      const data = await res.json();
      const replyText = data.reply || "Done!";

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text: replyText,
        action: data.action,
        navigateUrl: data.navigateUrl,
        data: data.data,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      speakText(replyText);

      if (data.action === "CLIENT_CREATED") {
        invalidateClientCache("clients");
      }

      if (data.uiAction === "OPEN_ADD_CLIENT_MODAL") {
        setTimeout(() => {
          setIsOpen(false);
          setIsAddClientModalOpen(true);
        }, 500);
        return;
      }

      if (data.uiAction === "OPEN_ADD_COMPANY_MODAL") {
        setTimeout(() => {
          setIsOpen(false);
          setIsAddCompanyModalOpen(true);
        }, 500);
        return;
      }

      if (data.uiAction === "OPEN_ADD_UNIT_MODAL") {
        setTimeout(() => {
          setIsOpen(false);
          setIsAddUnitModalOpen(true);
        }, 500);
        return;
      }

      if (data.uiAction === "CLICK_BUTTON") {
        setTimeout(() => {
          setIsOpen(false);
          const clicked = executeDomClick(data.uiTarget || "next");
          if (clicked) {
            toast.success(`Leon Assistant clicked "${data.uiTarget || "Next"}"`);
          }
        }, 500);
        return;
      }

      if (data.navigateUrl) {
        setTimeout(() => {
          router.push(data.navigateUrl);
          setIsOpen(false);
        }, 650);
      }
    } catch (err: any) {
      console.error("AI Error:", err);
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text: "Connection error. Please try again. (حدث خطأ أثناء الاتصال، يرجى المحاولة مرة أخرى)",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearHistory = () => {
    if (synthRef.current) synthRef.current.cancel();
    setIsSpeaking(false);
    setMessages([DEFAULT_WELCOME]);
  };

  const modalContent = isOpen ? (
    <div
      className="fixed inset-0 z-[100] w-screen h-screen min-h-screen flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in overflow-y-auto"
      onClick={handleClose}
    >
      {/* Modal Container - Identical styling to Add New Customer (CreateClientModal) */}
      <div
        className="bg-card w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94dvh] sm:max-h-[88vh] my-auto border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Identical to Add New Customer Modal) */}
        <div className="px-3.5 py-2.5 sm:px-6 sm:py-4 border-b border-border flex items-center justify-between shrink-0 bg-white">
          <div>
            <h2 className="text-base sm:text-xl font-bold text-text-primary flex items-center gap-1.5 sm:gap-2">
              <Sparkles className="text-brand shrink-0" size={18} />
              <span>Leon Assistant</span>
            </h2>
            <p className="text-[10px] sm:text-xs text-text-secondary mt-0.5 line-clamp-1 sm:line-clamp-none">
              Voice & AI command center • Create contracts, open client details, search vehicles, and navigate pages.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-gray-100 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body (Identical to Add New Customer Modal) */}
        <div className="p-2.5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/40 space-y-3 sm:space-y-4">
          {/* Voice Language & Control Bar (Matches Customer Profile Type Selector Box) */}
          <div className="bg-white p-2.5 sm:p-4 rounded-xl border border-border shadow-xs space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-text-secondary mb-1.5">
                  Voice Recognition Language (لغة التحدث والتعرف الصوتي)
                </label>
                <div className="grid grid-cols-2 gap-1 p-0.5 sm:p-1 bg-gray-100 rounded-lg sm:rounded-xl border border-gray-200 w-full sm:w-72">
                  <button
                    type="button"
                    onClick={() => setLang("en")}
                    className={`py-1.5 sm:py-2 px-3 rounded-md sm:rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      lang === "en"
                        ? "bg-white text-brand shadow-xs font-bold"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    <span>English</span>
                    <span className="text-[10px] font-normal">(EN)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLang("ar")}
                    className={`py-1.5 sm:py-2 px-3 rounded-md sm:rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      lang === "ar"
                        ? "bg-white text-brand shadow-xs font-bold"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    <span>العربية</span>
                    <span className="text-[10px] font-normal">(عربي)</span>
                  </button>
                </div>
              </div>

              {/* Microphone & Audio Controls */}
              <div className="flex items-center gap-2 self-start sm:self-end">
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                    isListening
                      ? "bg-brand text-white border-brand shadow-xs"
                      : "bg-white hover:bg-gray-50 text-text-primary border-border shadow-2xs"
                  }`}
                >
                  {isListening ? <MicOff size={14} /> : <Mic size={14} className="text-brand" />}
                  <span>
                    {isListening
                      ? lang === "ar"
                        ? "جاري الاستماع..."
                        : "Listening..."
                      : lang === "ar"
                      ? "اضغط للتحدث"
                      : "Start Voice"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMuted(!isMuted);
                    if (synthRef.current) synthRef.current.cancel();
                    setIsSpeaking(false);
                  }}
                  className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                    isMuted
                      ? "bg-red-50 text-brand border-red-200"
                      : "bg-white hover:bg-gray-50 text-text-secondary border-border"
                  }`}
                  title={isMuted ? "Unmute Audio" : "Mute Audio"}
                >
                  {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                </button>

                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="p-2 rounded-xl bg-white hover:bg-red-50 text-text-secondary hover:text-red-600 border border-border transition-colors cursor-pointer"
                  title="Clear History"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            {/* Live Voice Transcript Banner */}
            {(isListening || transcript) && (
              <div className="p-2.5 rounded-xl bg-red-50/70 border border-red-200/80 flex items-center justify-between gap-2 text-xs text-brand font-semibold">
                <div className="flex items-center gap-2 min-w-0">
                  <Mic size={14} className="text-brand shrink-0" />
                  <span className="truncate" dir="auto">
                    {transcript || (lang === "ar" ? "تحدث الآن... أنا أستمع إليك" : "Speak now... Listening to your voice")}
                  </span>
                </div>
                {isListening && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-brand border border-red-200 font-bold shrink-0">
                    LIVE
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Quick Actions Card (Matches Add New Customer Section Card) */}
          <div className="bg-white p-2.5 sm:p-4 rounded-xl border border-border shadow-xs">
            <label className="block text-[11px] sm:text-xs font-bold text-text-secondary mb-2">
              Quick Actions (إجراءات تلقائية سريعة بضغطة واحدة)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleSendMessage("Auto create contract now")}
                className="p-2.5 rounded-xl border border-border bg-gray-50/70 hover:bg-red-50/60 hover:border-brand/40 text-left transition-all cursor-pointer flex items-center gap-2 group"
              >
                <div className="w-7 h-7 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
                  <Plus size={14} />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-text-primary block truncate group-hover:text-brand">
                    Auto Contract
                  </span>
                  <span className="text-[10px] text-text-muted block truncate">إنشاء عقد تلقائي</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSendMessage("Add new client")}
                className="p-2.5 rounded-xl border border-border bg-gray-50/70 hover:bg-red-50/60 hover:border-brand/40 text-left transition-all cursor-pointer flex items-center gap-2 group"
              >
                <div className="w-7 h-7 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
                  <UserPlus size={14} />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-text-primary block truncate group-hover:text-brand">
                    Add New Client
                  </span>
                  <span className="text-[10px] text-text-muted block truncate">إضافة عميل جديد</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSendMessage("open a client page details")}
                className="p-2.5 rounded-xl border border-border bg-gray-50/70 hover:bg-red-50/60 hover:border-brand/40 text-left transition-all cursor-pointer flex items-center gap-2 group"
              >
                <div className="w-7 h-7 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
                  <User size={14} />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-text-primary block truncate group-hover:text-brand">
                    Client Details
                  </span>
                  <span className="text-[10px] text-text-muted block truncate">صفحة تفاصيل العميل</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSendMessage("How many cars available today?")}
                className="p-2.5 rounded-xl border border-border bg-gray-50/70 hover:bg-red-50/60 hover:border-brand/40 text-left transition-all cursor-pointer flex items-center gap-2 group"
              >
                <div className="w-7 h-7 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
                  <Car size={14} />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-text-primary block truncate group-hover:text-brand">
                    Fleet Status
                  </span>
                  <span className="text-[10px] text-text-muted block truncate">السيارات المتوفرة</span>
                </div>
              </button>
            </div>
          </div>

          {/* Conversation & Results Section (Matches Add New Customer Section Cards) */}
          <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-border shadow-xs space-y-3.5 min-h-[240px]">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <span className="text-xs sm:text-sm font-bold text-text-primary flex items-center gap-1.5">
                <FileText size={15} className="text-brand" />
                <span>Assistant Activity & Results (سجل الأوامر والنتائج)</span>
              </span>
              <span className="text-[11px] text-text-muted">{messages.length} messages</span>
            </div>

            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 sm:p-4 rounded-xl border transition-all ${
                    msg.sender === "user"
                      ? "bg-red-50/50 border-red-200/80 ml-auto max-w-[90%]"
                      : "bg-gray-50/70 border-gray-200/80 mr-auto w-full"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
                      {msg.sender === "user" ? (
                        <>
                          <User size={11} className="text-brand" />
                          <span className="text-brand">You (أنت)</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={11} className="text-brand" />
                          <span className="text-text-primary">Leon Assistant</span>
                        </>
                      )}
                    </span>
                    <span className="text-[10px] text-text-muted tabular-nums">
                      {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <p
                    className="text-xs sm:text-sm font-medium text-text-primary leading-relaxed whitespace-pre-wrap"
                    dir={msg.text.match(/[\u0600-\u06FF]/) ? "rtl" : "ltr"}
                  >
                    {msg.text}
                  </p>

                  {/* Direct Navigation Button */}
                  {msg.navigateUrl && (
                    <div className="mt-3 pt-2.5 border-t border-gray-200/70 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          router.push(msg.navigateUrl!);
                          setIsOpen(false);
                        }}
                        className="px-4 py-2 bg-brand text-white hover:bg-brand-dark rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <span>Open Page Now (فتح الصفحة الآن)</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  )}

                  {/* ===== CLIENTS RESULTS ===== */}
                  {msg.data?.type === "clients" && msg.data.items && (
                    <div className="mt-3 pt-2.5 border-t border-gray-200/70 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {msg.data.items.map((client: SearchClientItem, idx: number) => {
                        const targetId = client.id || client._id;
                        return (
                          <div
                            key={targetId || idx}
                            onClick={() => {
                              router.push(targetId ? `/clients/${targetId}` : `/clients`);
                              setIsOpen(false);
                            }}
                            className="bg-white p-3 rounded-xl border border-border hover:border-brand shadow-2xs flex items-center justify-between gap-3 cursor-pointer transition-all"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-9 h-9 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-xs shrink-0">
                                {getInitials(client.name)}
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-text-primary block truncate">
                                  {client.name}
                                </span>
                                <span className="text-[11px] text-text-secondary flex items-center gap-1 mt-0.5">
                                  <Phone size={10} className="text-brand shrink-0" />
                                  <span>{client.phone}</span>
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="px-2.5 py-1.5 bg-brand text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0"
                            >
                              <Eye size={12} />
                              <span>Details</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* ===== VEHICLES RESULTS ===== */}
                  {msg.data?.type === "vehicles" && msg.data.items && (
                    <div className="mt-3 pt-2.5 border-t border-gray-200/70 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {msg.data.items.map((veh: SearchVehicleItem, idx: number) => {
                        const targetId = veh.id || veh._id;
                        return (
                          <div
                            key={targetId || idx}
                            onClick={() => {
                              router.push(targetId ? `/units/${targetId}` : `/units`);
                              setIsOpen(false);
                            }}
                            className="bg-white p-3 rounded-xl border border-border hover:border-brand shadow-2xs flex items-center justify-between gap-3 cursor-pointer transition-all"
                          >
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-text-primary block truncate">
                                {veh.title || `${veh.make || ""} ${veh.model || ""}`}
                              </span>
                              <span className="text-[11px] text-text-muted block mt-0.5">
                                Plate: <strong className="text-brand font-bold">{veh.plate}</strong>
                              </span>
                            </div>
                            <span
                              className={`text-[10px] px-2.5 py-1 rounded-full border font-bold shrink-0 ${
                                veh.status === "Available"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-blue-50 text-blue-700 border-blue-200"
                              }`}
                            >
                              {veh.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* ===== CONTRACTS RESULTS ===== */}
                  {msg.data?.type === "contracts" && msg.data.items && (
                    <div className="mt-3 pt-2.5 border-t border-gray-200/70 space-y-2">
                      {msg.data.items.map((cnt: SearchContractItem, idx: number) => (
                        <div
                          key={cnt.id || idx}
                          onClick={() => {
                            router.push(`/bookings`);
                            setIsOpen(false);
                          }}
                          className="bg-white p-3 rounded-xl border border-border hover:border-brand shadow-2xs flex items-center justify-between gap-3 cursor-pointer transition-all"
                        >
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-text-primary block truncate">
                              Contract #{cnt.contractNumber} • {cnt.customer}
                            </span>
                            <span className="text-[11px] text-text-secondary block truncate mt-0.5">
                              {cnt.vehicle}
                            </span>
                          </div>
                          <span className="text-[10px] px-2.5 py-1 rounded-full bg-red-50 text-brand border border-red-200 font-bold shrink-0">
                            {cnt.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ===== OVERVIEW STATS ===== */}
                  {msg.data?.type === "overview" && msg.data.stats && (
                    <div className="mt-3 pt-2.5 border-t border-gray-200/70 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="bg-white p-3 rounded-xl border border-border text-center shadow-2xs">
                        <span className="text-[10px] font-bold text-text-muted uppercase block">Available</span>
                        <strong className="text-base font-bold text-emerald-600 mt-0.5 block">
                          {msg.data.stats.availableUnits}
                        </strong>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-border text-center shadow-2xs">
                        <span className="text-[10px] font-bold text-text-muted uppercase block">Active Contracts</span>
                        <strong className="text-base font-bold text-brand mt-0.5 block">
                          {msg.data.stats.activeContracts}
                        </strong>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-border text-center shadow-2xs">
                        <span className="text-[10px] font-bold text-text-muted uppercase block">Rented</span>
                        <strong className="text-base font-bold text-blue-600 mt-0.5 block">
                          {msg.data.stats.rentedUnits}
                        </strong>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-border text-center shadow-2xs">
                        <span className="text-[10px] font-bold text-text-muted uppercase block">Total Fleet</span>
                        <strong className="text-base font-bold text-text-primary mt-0.5 block">
                          {msg.data.stats.totalUnits}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isProcessing && (
                <div className="p-3 rounded-xl bg-gray-50 border border-border flex items-center gap-2 text-xs text-text-secondary font-medium">
                  <Loader2 size={14} className="animate-spin text-brand" />
                  <span>Processing your request... (جاري تنفيذ طلبك...)</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Footer (Identical to Add New Customer Modal) */}
        <div className="px-3.5 py-2.5 sm:px-6 sm:py-4 border-t border-border bg-white shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputValue);
            }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3"
          >
            <div className="relative flex-1 flex items-center gap-2">
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2.5 rounded-xl border transition-colors cursor-pointer shrink-0 ${
                  isListening
                    ? "bg-brand text-white border-brand"
                    : "bg-gray-50 hover:bg-gray-100 text-text-secondary border-border"
                }`}
                title="Voice Input"
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} className="text-brand" />}
              </button>

              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={
                  lang === "ar"
                    ? "اكتب أمرك هنا (مثال: افتح تفاصيل العميل، عقد جديد)..."
                    : "Type your command (e.g. open a client page details, create contract)..."
                }
                className="w-full border border-border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white"
                dir={inputValue.match(/[\u0600-\u06FF]/) ? "rtl" : "ltr"}
              />
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-text-secondary border border-border rounded-xl hover:bg-gray-100 transition-colors cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!inputValue.trim() || isProcessing}
                className="flex-1 sm:flex-initial px-4 sm:px-6 py-2 sm:py-2.5 bg-brand text-white rounded-xl hover:bg-brand-dark transition-colors font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Send Command</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* Floating Static Red Circle Button (Bottom-Right, No Animation, No Text) */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-[90]">
          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              setTimeout(() => {
                toggleListening();
              }, 300);
            }}
            title="Leon Assistant"
            className="w-14 h-14 rounded-full bg-brand text-white shadow-lg hover:bg-brand-dark flex items-center justify-center transition-colors cursor-pointer border border-white/20"
          >
            <Mic size={24} className="text-white" />
          </button>
        </div>
      )}

      {mounted && typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent}

      {/* Direct Action Modals triggered by Leon Assistant */}
      <CreateClientModal
        isOpen={isAddClientModalOpen}
        onClose={() => setIsAddClientModalOpen(false)}
        onSuccess={(newClient) => {
          setIsAddClientModalOpen(false);
          invalidateClientCache("clients");
          if (newClient?._id || newClient?.id) {
            router.push(`/clients/${newClient._id || newClient.id}`);
          } else {
            router.push("/clients");
          }
        }}
      />

      <CreateCompanyModal
        isOpen={isAddCompanyModalOpen}
        onClose={() => setIsAddCompanyModalOpen(false)}
        onSuccess={(newCompany) => {
          setIsAddCompanyModalOpen(false);
          invalidateClientCache("clients");
          if (newCompany?._id || newCompany?.id) {
            router.push(`/clients/${newCompany._id || newCompany.id}`);
          } else {
            router.push("/clients");
          }
        }}
      />

      <CreateUnitModal
        isOpen={isAddUnitModalOpen}
        onClose={() => setIsAddUnitModalOpen(false)}
        onSuccess={(newUnit) => {
          setIsAddUnitModalOpen(false);
          invalidateClientCache("units");
          if (newUnit?._id || newUnit?.id) {
            router.push(`/units/${newUnit._id || newUnit.id}`);
          } else {
            router.push("/units");
          }
        }}
      />
    </>
  );
}
