"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Send,
  Sparkles,
  ExternalLink,
  Car,
  User,
  FileText,
  Calendar,
  Layers,
  Phone,
  ArrowRight,
  Maximize2,
  Minimize2,
  CheckCircle2,
} from "lucide-react";

interface SearchClientItem {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status?: string;
  clientType?: string;
  idNumber?: string;
}

interface SearchVehicleItem {
  id: string;
  title: string;
  plate: string;
  color?: string;
  status: string;
  dailyRate?: number;
  mileage?: number;
  image?: string;
}

interface SearchContractItem {
  id: string;
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

export default function SiriAssistant() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [transcript, setTranscript] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "مرحباً! أنا مساعد ليون الذكي ✦ يمكنك التحدث معي لإنشاء عقود جديدة، البحث عن عميل أو سيارة، معرفة السيارات المتوفرة، أو فتح أي صفحة.",
      timestamp: new Date(),
    },
  ]);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
        };

        recognition.onerror = (event: any) => {
          console.warn("Speech recognition error:", event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, [lang]);

  // When speech transcript stops and has text, automatically submit after a brief pause
  useEffect(() => {
    if (!isListening && transcript.trim().length > 0) {
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
        synthRef.current.cancel(); // Stop any previous speech
        const cleanText = text
          .replace(/[#*_~`]/g, "")
          .replace(/\[.*?\]/g, "")
          .trim();

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = lang === "ar" ? "ar-XA" : "en-US";
        utterance.rate = 1.0;
        utterance.pitch = 1.05;

        // Try to pick natural Arabic or English voice
        const voices = synthRef.current.getVoices();
        const preferredVoice = voices.find((v) =>
          lang === "ar" ? v.lang.startsWith("ar") : v.lang.startsWith("en")
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
    [isMuted, lang]
  );

  // Toggle listening
  const toggleListening = () => {
    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsListening(false);
    } else {
      // Cancel any ongoing speaking before listening
      if (synthRef.current) synthRef.current.cancel();
      setIsSpeaking(false);

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
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          lang,
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

      // If action is navigate or create contract, execute navigation after a brief speaking pause
      if (data.navigateUrl) {
        setTimeout(() => {
          router.push(data.navigateUrl);
        }, 1200);
      }
    } catch (err: any) {
      console.error("AI Error:", err);
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text: "عذراً، حدث خطأ أثناء الاتصال. يرجى المحاولة مرة أخرى.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {/* ============================================================ */}
      {/* 🔮 FLOATING SIRI ORB BUTTON (Bottom-Right)                    */}
      {/* ============================================================ */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-[90] flex items-center gap-3">
          {/* Subtle pulsating callout bubble */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 text-white text-xs font-semibold backdrop-blur-md border border-white/10 shadow-lg animate-fade-in pointer-events-none select-none">
            <Sparkles size={13} className="text-cyan-400 animate-spin-slow" />
            <span>Leon Siri Voice</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              // Start listening automatically on open for true Siri experience
              setTimeout(() => {
                toggleListening();
              }, 400);
            }}
            title="Leon Voice Assistant (اضغط للتحدث مع المساعد الصوتي)"
            className="group relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center p-0.5 cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_0_25px_rgba(99,102,241,0.5)] hover:shadow-[0_0_35px_rgba(6,182,212,0.7)]"
          >
            {/* Multi-layered Siri animated glowing ring */}
            <span className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-400 via-indigo-500 to-fuchsia-500 animate-spin-slow opacity-85 group-hover:opacity-100 blur-[2px]" />
            <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 opacity-40 blur-md group-hover:opacity-75 transition-opacity animate-pulse" />

            {/* Siri Orb Inner Core */}
            <span className="relative w-full h-full rounded-full bg-slate-950 flex items-center justify-center overflow-hidden border border-white/20">
              {/* Internal iridescent light mesh */}
              <span className="absolute inset-0 bg-radial from-cyan-400/30 via-indigo-600/30 to-transparent animate-pulse" />
              <div className="relative flex items-center justify-center">
                <Mic size={22} className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
              </div>
            </span>
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* 🌌 SIRI APPLE-STYLE VOICE OVERLAY MODAL                     */}
      {/* ============================================================ */}
      {isOpen && (
        <div
          className={`fixed z-[99] transition-all duration-300 ease-out flex flex-col ${
            isExpanded
              ? "inset-4 sm:inset-10 max-w-4xl mx-auto rounded-3xl"
              : "bottom-5 right-5 sm:bottom-6 sm:right-6 w-[390px] sm:w-[430px] max-w-[calc(100vw-2.5rem)] h-[620px] max-h-[calc(100vh-3rem)] rounded-3xl"
          } bg-slate-950/92 backdrop-blur-2xl border border-white/15 shadow-[0_25px_70px_rgba(0,0,0,0.75)] overflow-hidden text-white font-sans`}
        >
          {/* Glowing Atmospheric Aura */}
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-fuchsia-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* ===== HEADER ===== */}
          <div className="relative z-10 px-5 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.03]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-400 via-indigo-500 to-fuchsia-500 p-0.5 flex items-center justify-center shadow-[0_0_12px_rgba(99,102,241,0.5)]">
                <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center">
                  <Sparkles size={14} className="text-cyan-300" />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                  <span>Leon Siri AI</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                    Voice
                  </span>
                </h3>
                <p className="text-[10px] text-white/50">
                  {isListening ? "Listening..." : isSpeaking ? "Speaking..." : "Ready"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Language Switcher */}
              <button
                type="button"
                onClick={() => setLang((l) => (l === "ar" ? "en" : "ar"))}
                className="px-2 py-1 text-[11px] font-bold rounded-lg bg-white/5 hover:bg-white/10 text-white/80 transition-colors border border-white/10 cursor-pointer"
                title="Change language (تغيير اللغة)"
              >
                {lang === "ar" ? "عربي" : "EN"}
              </button>

              {/* Mute / Unmute */}
              <button
                type="button"
                onClick={() => {
                  setIsMuted(!isMuted);
                  if (synthRef.current) synthRef.current.cancel();
                  setIsSpeaking(false);
                }}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isMuted ? "bg-red-500/20 text-red-400" : "bg-white/5 hover:bg-white/10 text-white/70"
                }`}
                title={isMuted ? "Unmute voice" : "Mute voice"}
              >
                {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>

              {/* Expand / Minimize */}
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="hidden sm:inline-flex p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 transition-colors cursor-pointer"
                title={isExpanded ? "Minimize" : "Expand"}
              >
                {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>

              {/* Close */}
              <button
                type="button"
                onClick={() => {
                  if (synthRef.current) synthRef.current.cancel();
                  try {
                    recognitionRef.current?.stop();
                  } catch {}
                  setIsListening(false);
                  setIsSpeaking(false);
                  setIsOpen(false);
                }}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-colors cursor-pointer"
                title="Close Siri"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* ===== SIRI ANIMATED ORB (Center Highlight) ===== */}
          <div className="relative z-10 py-6 flex flex-col items-center justify-center border-b border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent">
            {/* Siri Orb Graphic */}
            <button
              type="button"
              onClick={toggleListening}
              className="group relative cursor-pointer focus:outline-none transition-transform duration-300 hover:scale-105 active:scale-95"
              title={isListening ? "Listening... Tap to stop" : "Tap to speak with Siri"}
            >
              {/* Outer Ripple Waves when active */}
              {(isListening || isSpeaking) && (
                <>
                  <span className="absolute -inset-4 rounded-full bg-cyan-500/25 animate-ping opacity-60" />
                  <span className="absolute -inset-8 rounded-full bg-indigo-500/20 animate-pulse blur-md" />
                </>
              )}

              {/* Siri Multi-Colored Swirling Orb */}
              <div
                className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-full p-1 flex items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.6)] ${
                  isListening
                    ? "shadow-[0_0_50px_rgba(6,182,212,0.8)] scale-105"
                    : isSpeaking
                    ? "shadow-[0_0_50px_rgba(236,72,153,0.8)]"
                    : ""
                }`}
              >
                {/* Dynamic rotating gradient mesh */}
                <div
                  className={`absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-400 via-indigo-600 via-purple-500 to-pink-500 transition-all duration-700 ${
                    isListening || isSpeaking ? "animate-spin-slow opacity-100" : "opacity-80"
                  }`}
                />

                {/* Inner glowing sphere */}
                <div className="relative w-full h-full rounded-full bg-slate-950/80 backdrop-blur-md flex items-center justify-center overflow-hidden border border-white/20">
                  <div
                    className={`absolute inset-0 bg-radial from-cyan-400/40 via-purple-600/30 to-transparent transition-all ${
                      isListening ? "animate-pulse" : ""
                    }`}
                  />
                  <Mic
                    size={28}
                    className={`relative z-10 transition-colors drop-shadow-[0_0_10px_rgba(255,255,255,0.9)] ${
                      isListening ? "text-cyan-300 animate-pulse" : "text-white"
                    }`}
                  />
                </div>
              </div>
            </button>

            {/* Transcript & Status Label */}
            <div className="mt-3 text-center px-6 max-w-sm">
              {isListening ? (
                <p className="text-xs text-cyan-300 font-semibold flex items-center justify-center gap-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>{transcript || "Listening... Speak now (تحدث الآن)"}</span>
                </p>
              ) : isSpeaking ? (
                <p className="text-xs text-pink-300 font-semibold flex items-center justify-center gap-1.5 animate-pulse">
                  <Volume2 size={14} />
                  <span>Leon is speaking...</span>
                </p>
              ) : (
                <p className="text-xs text-white/50 font-medium">
                  اضغط على الدائرة للتحدث • أو اكتب استفسارك بالأسفل
                </p>
              )}
            </div>
          </div>

          {/* ===== CONVERSATION FEED ===== */}
          <div className="relative z-10 flex-1 overflow-y-auto px-4 py-3 space-y-3.5 scrollbar-thin scrollbar-thumb-white/10">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"} animate-fade-in`}
              >
                <div
                  className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-gradient-to-r from-brand to-indigo-600 text-white rounded-br-xs shadow-md font-medium"
                      : "bg-white/[0.08] text-white/95 border border-white/10 rounded-bl-xs shadow-sm"
                  }`}
                  dir={msg.text.match(/[\u0600-\u06FF]/) ? "rtl" : "ltr"}
                >
                  <p>{msg.text}</p>

                  {/* Navigation Action Button */}
                  {msg.navigateUrl && (
                    <div className="mt-2.5 pt-2 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => router.push(msg.navigateUrl!)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                      >
                        <span>انتقل إلى الصفحة الآن</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  )}

                  {/* ===== RICH SEARCH RESULT CARDS ===== */}
                  {msg.data?.type === "clients" && msg.data.items && (
                    <div className="mt-2.5 space-y-2 pt-2 border-t border-white/10">
                      {msg.data.items.map((client: SearchClientItem) => (
                        <div
                          key={client.id}
                          onClick={() => router.push(`/clients`)}
                          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between gap-2 transition-all cursor-pointer"
                        >
                          <div className="min-w-0">
                            <strong className="text-xs font-bold text-cyan-300 block truncate">
                              {client.name}
                            </strong>
                            <p className="text-[11px] text-white/60 flex items-center gap-1 mt-0.5">
                              <Phone size={10} />
                              <span>{client.phone}</span>
                            </p>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                            {client.status || "Active"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {msg.data?.type === "vehicles" && msg.data.items && (
                    <div className="mt-2.5 space-y-2 pt-2 border-t border-white/10">
                      {msg.data.items.map((veh: SearchVehicleItem) => (
                        <div
                          key={veh.id}
                          onClick={() => router.push(`/units/${veh.id}`)}
                          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between gap-2 transition-all cursor-pointer"
                        >
                          <div className="min-w-0">
                            <strong className="text-xs font-bold text-white block truncate">
                              {veh.title}
                            </strong>
                            <p className="text-[11px] text-amber-300 font-mono mt-0.5">
                              Plate: {veh.plate}
                            </p>
                          </div>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${
                              veh.status === "Available"
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                : "bg-blue-500/20 text-blue-300 border-blue-500/30"
                            }`}
                          >
                            {veh.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {msg.data?.type === "contracts" && msg.data.items && (
                    <div className="mt-2.5 space-y-2 pt-2 border-t border-white/10">
                      {msg.data.items.map((cnt: SearchContractItem) => (
                        <div
                          key={cnt.id}
                          onClick={() => router.push(`/bookings`)}
                          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between gap-2 transition-all cursor-pointer"
                        >
                          <div className="min-w-0">
                            <strong className="text-xs font-bold text-cyan-300 block truncate">
                              Contract #{cnt.contractNumber} • {cnt.customer}
                            </strong>
                            <p className="text-[11px] text-white/60 truncate mt-0.5">{cnt.vehicle}</p>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                            {cnt.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {msg.data?.type === "overview" && msg.data.stats && (
                    <div className="mt-2.5 grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                      <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-center">
                        <span className="text-[10px] text-white/50 block">السيارات المتوفرة</span>
                        <strong className="text-sm font-bold text-emerald-400">
                          {msg.data.stats.availableUnits}
                        </strong>
                      </div>
                      <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-center">
                        <span className="text-[10px] text-white/50 block">العقود النشطة</span>
                        <strong className="text-sm font-bold text-cyan-400">
                          {msg.data.stats.activeContracts}
                        </strong>
                      </div>
                      <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-center">
                        <span className="text-[10px] text-white/50 block">السيارات المؤجرة</span>
                        <strong className="text-sm font-bold text-blue-400">
                          {msg.data.stats.rentedUnits}
                        </strong>
                      </div>
                      <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-center">
                        <span className="text-[10px] text-white/50 block">إجمالي الأسطول</span>
                        <strong className="text-sm font-bold text-white">
                          {msg.data.stats.totalUnits}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-white/40 mt-1 px-1">
                  {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}

            {isProcessing && (
              <div className="flex items-center gap-2 text-white/60 text-xs px-2 animate-pulse">
                <Sparkles size={13} className="text-cyan-400 animate-spin" />
                <span>جاري المعالجة والبحث...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ===== SUGGESTION PILLS ===== */}
          <div className="relative z-10 px-4 py-2 border-t border-white/5 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => handleSendMessage("أنشئ عقد جديد")}
              className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-white/80 text-[11px] font-medium border border-white/10 shrink-0 cursor-pointer transition-colors"
            >
              📝 إنشاء عقد
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage("كم سيارة متوفرة اليوم؟")}
              className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-white/80 text-[11px] font-medium border border-white/10 shrink-0 cursor-pointer transition-colors"
            >
              🚗 السيارات المتوفرة
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage("ابحث عن عميل")}
              className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-white/80 text-[11px] font-medium border border-white/10 shrink-0 cursor-pointer transition-colors"
            >
              🔍 بحث عن عميل
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage("افتح التقويم")}
              className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-white/80 text-[11px] font-medium border border-white/10 shrink-0 cursor-pointer transition-colors"
            >
              📅 التقويم
            </button>
          </div>

          {/* ===== INPUT BAR ===== */}
          <div className="relative z-10 p-3.5 border-t border-white/10 bg-slate-900/60">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputValue);
              }}
              className="flex items-center gap-2"
            >
              {/* Mic Button */}
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2.5 rounded-xl transition-all cursor-pointer shrink-0 ${
                  isListening
                    ? "bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.6)] animate-pulse"
                    : "bg-white/10 hover:bg-white/15 text-white"
                }`}
                title={isListening ? "Stop listening" : "Start voice recognition"}
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>

              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={lang === "ar" ? "تحدث أو اكتب أمرك هنا..." : "Speak or type a command..."}
                className="flex-1 bg-white/[0.06] border border-white/15 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40"
                dir={inputValue.match(/[\u0600-\u06FF]/) ? "rtl" : "ltr"}
              />

              <button
                type="submit"
                disabled={!inputValue.trim() || isProcessing}
                className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-95 disabled:opacity-30 disabled:hover:bg-cyan-500 text-slate-950 font-bold transition-all cursor-pointer shrink-0"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

