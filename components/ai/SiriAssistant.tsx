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
  Phone,
  ArrowRight,
  Maximize2,
  Minimize2,
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

  // When speech transcript stops and has text, automatically submit
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
        synthRef.current.cancel();
        const cleanText = text
          .replace(/[#*_~`]/g, "")
          .replace(/\[.*?\]/g, "")
          .trim();

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = lang === "ar" ? "ar-XA" : "en-US";
        utterance.rate = 1.0;
        utterance.pitch = 1.05;

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
      {/* 🔴 FLOATING BUTTON (Bottom-Right, Leon Red & White)          */}
      {/* ============================================================ */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-[90] flex items-center gap-2.5">
          {/* Subtle callout label */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-gray-800 text-xs font-bold border border-gray-200 shadow-md animate-fade-in pointer-events-none select-none">
            <span className="w-2 h-2 rounded-full bg-brand animate-ping" />
            <span>Leon Voice AI</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              setTimeout(() => {
                toggleListening();
              }, 400);
            }}
            title="Leon Voice Assistant (اضغط للتحدث مع المساعد الصوتي)"
            className="group relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-brand text-white shadow-[0_8px_25px_rgba(229,57,53,0.38)] hover:shadow-[0_12px_32px_rgba(229,57,53,0.55)] border-2 border-white flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
          >
            {/* Ambient red breathing wave */}
            <span className="absolute -inset-1 rounded-full bg-brand opacity-25 animate-ping pointer-events-none" />

            <div className="relative flex items-center justify-center">
              <Mic size={24} className="text-white drop-shadow-sm" />
            </div>
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* ⚪ RED & WHITE ASSISTANT MODAL                              */}
      {/* ============================================================ */}
      {isOpen && (
        <div
          className={`fixed z-[99] transition-all duration-300 ease-out flex flex-col ${
            isExpanded
              ? "inset-4 sm:inset-10 max-w-4xl mx-auto rounded-3xl"
              : "bottom-5 right-5 sm:bottom-6 sm:right-6 w-[390px] sm:w-[430px] max-w-[calc(100vw-2.5rem)] h-[620px] max-h-[calc(100vh-3rem)] rounded-3xl"
          } bg-white border border-gray-200 shadow-[0_20px_60px_rgba(0,0,0,0.18)] overflow-hidden text-gray-900 font-sans`}
        >
          {/* Subtle Red Top Gradient Accent Line */}
          <div className="h-1.5 w-full bg-gradient-to-r from-brand-dark via-brand to-red-400" />

          {/* ===== HEADER (Clean White & Red) ===== */}
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-red-50 text-brand border border-red-200 flex items-center justify-center shadow-2xs">
                <Sparkles size={16} className="text-brand" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <span>Leon Assistant</span>
                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-red-50 text-brand border border-red-200 font-bold">
                    Voice
                  </span>
                </h3>
                <p className="text-[10px] text-gray-500 font-medium">
                  {isListening ? "Listening..." : isSpeaking ? "Speaking..." : "Ready"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Language Switcher */}
              <button
                type="button"
                onClick={() => setLang((l) => (l === "ar" ? "en" : "ar"))}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors border border-gray-200 cursor-pointer"
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
                className={`p-1.5 rounded-lg transition-colors cursor-pointer border ${
                  isMuted
                    ? "bg-red-50 text-brand border-red-200"
                    : "bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200"
                }`}
                title={isMuted ? "Unmute voice" : "Mute voice"}
              >
                {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>

              {/* Expand / Minimize */}
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="hidden sm:inline-flex p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 transition-colors cursor-pointer"
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
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* ===== RED ORB CENTER (Iconic Brand Voice Visual) ===== */}
          <div className="py-5 flex flex-col items-center justify-center border-b border-gray-100 bg-gradient-to-b from-red-50/40 to-white">
            <button
              type="button"
              onClick={toggleListening}
              className="group relative cursor-pointer focus:outline-none transition-transform duration-300 hover:scale-105 active:scale-95"
              title={isListening ? "Listening... Tap to stop" : "Tap to speak with Leon"}
            >
              {/* Outer Ripple Wave Rings when active */}
              {(isListening || isSpeaking) && (
                <>
                  <span className="absolute -inset-3 rounded-full bg-red-500/20 animate-ping opacity-60" />
                  <span className="absolute -inset-6 rounded-full bg-red-500/10 animate-pulse border border-red-200" />
                </>
              )}

              {/* Leon Red Core Orb */}
              <div
                className={`relative w-20 h-20 sm:w-22 sm:h-22 rounded-full p-1 flex items-center justify-center shadow-[0_8px_30px_rgba(229,57,53,0.35)] transition-all duration-300 ${
                  isListening
                    ? "shadow-[0_10px_35px_rgba(229,57,53,0.55)] scale-105"
                    : isSpeaking
                    ? "shadow-[0_10px_35px_rgba(198,40,40,0.55)]"
                    : ""
                }`}
              >
                {/* Red Brand Gradient Background */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-brand-dark via-brand to-red-500" />

                {/* Inner Circle Sheen */}
                <div className="relative w-full h-full rounded-full bg-brand flex items-center justify-center border-2 border-white/30 shadow-inner">
                  <Mic
                    size={28}
                    className={`text-white transition-all drop-shadow-sm ${
                      isListening ? "scale-110 animate-pulse" : ""
                    }`}
                  />
                </div>
              </div>
            </button>

            {/* Transcript & Status Text */}
            <div className="mt-3 text-center px-6 max-w-sm">
              {isListening ? (
                <p className="text-xs text-brand font-bold flex items-center justify-center gap-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-brand animate-ping" />
                  <span>{transcript || "Listening... Speak now (تحدث الآن)"}</span>
                </p>
              ) : isSpeaking ? (
                <p className="text-xs text-brand font-bold flex items-center justify-center gap-1.5 animate-pulse">
                  <Volume2 size={14} className="text-brand" />
                  <span>Leon is speaking...</span>
                </p>
              ) : (
                <p className="text-xs text-gray-500 font-medium">
                  اضغط على الدائرة الحمراء للتحدث • أو اكتب استفسارك بالأسفل
                </p>
              )}
            </div>
          </div>

          {/* ===== CONVERSATION FEED (Pure White & Red) ===== */}
          <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-3.5 bg-white scrollbar-thin scrollbar-thumb-gray-200">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"} animate-fade-in`}
              >
                <div
                  className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-brand text-white rounded-br-xs shadow-xs font-semibold"
                      : "bg-gray-50 text-gray-900 border border-gray-200 rounded-bl-xs shadow-2xs font-normal"
                  }`}
                  dir={msg.text.match(/[\u0600-\u06FF]/) ? "rtl" : "ltr"}
                >
                  <p>{msg.text}</p>

                  {/* Navigation Action Button */}
                  {msg.navigateUrl && (
                    <div className="mt-2.5 pt-2 border-t border-gray-200/80">
                      <button
                        type="button"
                        onClick={() => router.push(msg.navigateUrl!)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                      >
                        <span>انتقل إلى الصفحة الآن</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  )}

                  {/* ===== CLIENTS SEARCH RESULTS ===== */}
                  {msg.data?.type === "clients" && msg.data.items && (
                    <div className="mt-2.5 space-y-2 pt-2 border-t border-gray-200">
                      {msg.data.items.map((client: SearchClientItem) => (
                        <div
                          key={client.id}
                          onClick={() => router.push(`/clients`)}
                          className="p-2.5 rounded-xl bg-white hover:bg-red-50/50 border border-gray-200 hover:border-red-300 flex items-center justify-between gap-2 transition-all cursor-pointer shadow-2xs"
                        >
                          <div className="min-w-0">
                            <strong className="text-xs font-bold text-gray-900 block truncate">
                              {client.name}
                            </strong>
                            <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                              <Phone size={10} className="text-brand" />
                              <span>{client.phone}</span>
                            </p>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold shrink-0">
                            {client.status || "Active"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ===== VEHICLES SEARCH RESULTS ===== */}
                  {msg.data?.type === "vehicles" && msg.data.items && (
                    <div className="mt-2.5 space-y-2 pt-2 border-t border-gray-200">
                      {msg.data.items.map((veh: SearchVehicleItem) => (
                        <div
                          key={veh.id}
                          onClick={() => router.push(`/units/${veh.id}`)}
                          className="p-2.5 rounded-xl bg-white hover:bg-red-50/50 border border-gray-200 hover:border-red-300 flex items-center justify-between gap-2 transition-all cursor-pointer shadow-2xs"
                        >
                          <div className="min-w-0">
                            <strong className="text-xs font-bold text-gray-900 block truncate">
                              {veh.title}
                            </strong>
                            <p className="text-[11px] text-brand font-mono font-bold mt-0.5">
                              Plate: {veh.plate}
                            </p>
                          </div>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full border font-bold shrink-0 ${
                              veh.status === "Available"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }`}
                          >
                            {veh.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ===== CONTRACTS SEARCH RESULTS ===== */}
                  {msg.data?.type === "contracts" && msg.data.items && (
                    <div className="mt-2.5 space-y-2 pt-2 border-t border-gray-200">
                      {msg.data.items.map((cnt: SearchContractItem) => (
                        <div
                          key={cnt.id}
                          onClick={() => router.push(`/bookings`)}
                          className="p-2.5 rounded-xl bg-white hover:bg-red-50/50 border border-gray-200 hover:border-red-300 flex items-center justify-between gap-2 transition-all cursor-pointer shadow-2xs"
                        >
                          <div className="min-w-0">
                            <strong className="text-xs font-bold text-gray-900 block truncate">
                              Contract #{cnt.contractNumber} • {cnt.customer}
                            </strong>
                            <p className="text-[11px] text-gray-500 truncate mt-0.5">{cnt.vehicle}</p>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-brand border border-red-200 font-bold shrink-0">
                            {cnt.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ===== OVERVIEW STATS CARDS ===== */}
                  {msg.data?.type === "overview" && msg.data.stats && (
                    <div className="mt-2.5 grid grid-cols-2 gap-2 pt-2 border-t border-gray-200">
                      <div className="p-2.5 rounded-xl bg-white border border-gray-200 text-center shadow-2xs">
                        <span className="text-[10px] text-gray-500 font-medium block">السيارات المتوفرة</span>
                        <strong className="text-sm font-bold text-emerald-600">
                          {msg.data.stats.availableUnits}
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white border border-gray-200 text-center shadow-2xs">
                        <span className="text-[10px] text-gray-500 font-medium block">العقود النشطة</span>
                        <strong className="text-sm font-bold text-brand">
                          {msg.data.stats.activeContracts}
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white border border-gray-200 text-center shadow-2xs">
                        <span className="text-[10px] text-gray-500 font-medium block">السيارات المؤجرة</span>
                        <strong className="text-sm font-bold text-blue-600">
                          {msg.data.stats.rentedUnits}
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white border border-gray-200 text-center shadow-2xs">
                        <span className="text-[10px] text-gray-500 font-medium block">إجمالي الأسطول</span>
                        <strong className="text-sm font-bold text-gray-900">
                          {msg.data.stats.totalUnits}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-gray-400 mt-1 px-1">
                  {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}

            {isProcessing && (
              <div className="flex items-center gap-2 text-gray-500 text-xs px-2 animate-pulse">
                <Sparkles size={13} className="text-brand animate-spin" />
                <span>جاري المعالجة والبحث...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ===== SUGGESTION PILLS (Clean White & Red) ===== */}
          <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none bg-white">
            <button
              type="button"
              onClick={() => handleSendMessage("أنشئ عقد جديد")}
              className="px-2.5 py-1 rounded-full bg-white hover:bg-red-50 text-gray-700 hover:text-brand text-[11px] font-bold border border-gray-200 hover:border-red-200 shrink-0 cursor-pointer transition-colors shadow-2xs"
            >
              📝 إنشاء عقد
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage("كم سيارة متوفرة اليوم؟")}
              className="px-2.5 py-1 rounded-full bg-white hover:bg-red-50 text-gray-700 hover:text-brand text-[11px] font-bold border border-gray-200 hover:border-red-200 shrink-0 cursor-pointer transition-colors shadow-2xs"
            >
              🚗 السيارات المتوفرة
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage("ابحث عن عميل")}
              className="px-2.5 py-1 rounded-full bg-white hover:bg-red-50 text-gray-700 hover:text-brand text-[11px] font-bold border border-gray-200 hover:border-red-200 shrink-0 cursor-pointer transition-colors shadow-2xs"
            >
              🔍 بحث عن عميل
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage("افتح التقويم")}
              className="px-2.5 py-1 rounded-full bg-white hover:bg-red-50 text-gray-700 hover:text-brand text-[11px] font-bold border border-gray-200 hover:border-red-200 shrink-0 cursor-pointer transition-colors shadow-2xs"
            >
              📅 التقويم
            </button>
          </div>

          {/* ===== INPUT BAR (Clean White & Red) ===== */}
          <div className="p-3.5 border-t border-gray-200 bg-gray-50/80">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputValue);
              }}
              className="flex items-center gap-2"
            >
              {/* Mic Toggle Button */}
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2.5 rounded-xl transition-all cursor-pointer shrink-0 border ${
                  isListening
                    ? "bg-brand text-white border-brand shadow-[0_0_12px_rgba(229,57,53,0.5)] animate-pulse"
                    : "bg-white hover:bg-red-50 text-gray-700 hover:text-brand border-gray-200 shadow-2xs"
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
                className="flex-1 bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 shadow-2xs font-medium"
                dir={inputValue.match(/[\u0600-\u06FF]/) ? "rtl" : "ltr"}
              />

              <button
                type="submit"
                disabled={!inputValue.trim() || isProcessing}
                className="p-2.5 rounded-xl bg-brand hover:bg-brand-dark active:scale-95 disabled:opacity-40 disabled:hover:bg-brand text-white font-bold transition-all cursor-pointer shrink-0 shadow-xs"
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
