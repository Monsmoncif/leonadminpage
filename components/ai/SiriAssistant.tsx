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
  Trash2,
  Car,
  User,
  Calendar,
  FileText,
  Search,
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

const DEFAULT_WELCOME: Message = {
  id: "welcome",
  sender: "assistant",
  text: "مرحباً بك! أنا المساعد الذكي لنظام ليون. كيف يمكنني مساعدتك اليوم؟ يمكنك التحدث معي بالصوت أو الكتابة.",
  timestamp: new Date(),
};

export default function SiriAssistant() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [lang, setLang] = useState<"ar" | "en">("en");
  const [transcript, setTranscript] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([DEFAULT_WELCOME]);

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
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
        };

        recognition.onerror = (event: any) => {
          console.warn("Speech recognition error:", event.error);
          setIsListening(false);
          if (event.error === "not-allowed") {
            setTranscript("Microphone blocked. Please allow mic permission (يرجى السماح بالمايكروفون)");
          }
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
        utterance.pitch = 1.0;

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
          setIsOpen(false);
        }, 700);
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

  const handleClearHistory = () => {
    if (synthRef.current) synthRef.current.cancel();
    setIsSpeaking(false);
    setMessages([DEFAULT_WELCOME]);
  };

  return (
    <>
      {/* ============================================================ */}
      {/* 🔴 FLOATING CIRCLE BUTTON (Clean, Static, NO ANIMATION)       */}
      {/* ============================================================ */}
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
            className="w-14 h-14 sm:w-15 sm:h-15 rounded-full bg-brand text-white shadow-lg hover:bg-brand-dark flex items-center justify-center transition-all cursor-pointer border border-white/20 active:scale-95"
          >
            <Mic size={24} className="text-white" />
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* ⚪ RED & WHITE ASSISTANT CARD (Completely Redesigned UI/UX) */}
      {/* ============================================================ */}
      {isOpen && (
        <div
          className={`fixed z-[99] transition-all duration-200 ease-out flex flex-col ${
            isExpanded
              ? "inset-3 sm:inset-8 max-w-4xl mx-auto rounded-2xl"
              : "bottom-4 right-4 sm:bottom-6 sm:right-6 w-[380px] sm:w-[410px] max-w-[calc(100vw-2rem)] h-[580px] max-h-[calc(100vh-2.5rem)] rounded-2xl"
          } bg-white border border-border shadow-2xl overflow-hidden text-text-primary font-sans`}
        >
          {/* Top Brand Stripe */}
          <div className="h-1 w-full bg-brand" />

          {/* ===== HEADER ===== */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-white">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-brand text-white flex items-center justify-center shrink-0 shadow-2xs font-bold text-xs">
                L
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-bold text-text-primary truncate flex items-center gap-1.5">
                  <span>Leon Assistant</span>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${isListening ? "bg-brand" : "bg-emerald-500"}`} />
                </h3>
                <p className="text-[11px] text-text-muted truncate">
                  {isListening ? "جاري الاستماع إليك..." : isSpeaking ? "يتحدث الآن..." : "جاهز للرد عليك"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Language Switch */}
              <button
                type="button"
                onClick={() => setLang((l) => (l === "ar" ? "en" : "ar"))}
                className="px-2 py-1 text-[11px] font-bold rounded-md bg-gray-100 hover:bg-gray-200 text-text-secondary transition-colors cursor-pointer"
                title="Language"
              >
                {lang === "ar" ? "عربي" : "EN"}
              </button>

              {/* Mute Toggle */}
              <button
                type="button"
                onClick={() => {
                  setIsMuted(!isMuted);
                  if (synthRef.current) synthRef.current.cancel();
                  setIsSpeaking(false);
                }}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  isMuted ? "bg-red-50 text-brand" : "hover:bg-gray-100 text-text-secondary"
                }`}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>

              {/* Clear Chat */}
              <button
                type="button"
                onClick={handleClearHistory}
                className="p-1.5 rounded-md hover:bg-gray-100 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                title="Clear Chat"
              >
                <Trash2 size={14} />
              </button>

              {/* Expand Toggle */}
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="hidden sm:inline-flex p-1.5 rounded-md hover:bg-gray-100 text-text-secondary transition-colors cursor-pointer"
                title={isExpanded ? "Minimize" : "Expand"}
              >
                {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>

              {/* Close Button */}
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
                className="p-1.5 rounded-md hover:bg-gray-100 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* ===== VOICE STATUS BANNER (Sleek, Clean, No Gimmicks) ===== */}
          <div className="px-4 py-2.5 bg-gray-50 border-b border-border flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <button
                type="button"
                onClick={toggleListening}
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                  isListening
                    ? "bg-brand text-white shadow-xs"
                    : "bg-white border border-border text-text-secondary hover:text-brand hover:border-brand"
                }`}
                title={isListening ? "Stop listening" : "Tap to speak"}
              >
                {isListening ? <Mic size={14} /> : <Mic size={14} />}
              </button>
              <div className="min-w-0 flex-1">
                {isListening ? (
                  <p className="text-xs font-semibold text-brand truncate" dir="auto">
                    {transcript || "تفضل، أنا أستمع إليك..."}
                  </p>
                ) : isSpeaking ? (
                  <p className="text-xs font-semibold text-brand truncate">
                    جاري التحدث...
                  </p>
                ) : (
                  <p className="text-xs text-text-muted truncate">
                    اضغط على المايك للتحدث أو اكتب بالأسفل
                  </p>
                )}
              </div>
            </div>

            {/* Subtle voice bars */}
            {isListening && (
              <div className="flex items-center gap-0.5 shrink-0">
                <span className="w-1 h-3 bg-brand rounded-full animate-pulse" />
                <span className="w-1 h-4 bg-brand rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
                <span className="w-1 h-2.5 bg-brand rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
              </div>
            )}
          </div>

          {/* ===== CONVERSATION FEED ===== */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white scrollbar-thin scrollbar-thumb-gray-200">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-xl text-xs sm:text-sm leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-brand text-white rounded-br-none shadow-xs font-medium"
                      : "bg-gray-50 text-text-primary border border-border rounded-bl-none shadow-2xs"
                  }`}
                  dir={msg.text.match(/[\u0600-\u06FF]/) ? "rtl" : "ltr"}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Navigation Action */}
                  {msg.navigateUrl && (
                    <div className="mt-2.5 pt-2 border-t border-border">
                      <button
                        type="button"
                        onClick={() => {
                          router.push(msg.navigateUrl!);
                          setIsOpen(false);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand hover:bg-brand-dark text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        <span>الانتقال للصفحة الآن</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  )}

                  {/* ===== CLIENTS CARDS ===== */}
                  {msg.data?.type === "clients" && msg.data.items && (
                    <div className="mt-2.5 space-y-1.5 pt-2 border-t border-border">
                      {msg.data.items.map((client: SearchClientItem, idx: number) => {
                        const targetId = client.id || (client as any)._id;
                        return (
                          <div
                            key={targetId || idx}
                            onClick={() => {
                              router.push(targetId ? `/clients/${targetId}` : `/clients`);
                              setIsOpen(false);
                            }}
                            className="p-2.5 rounded-lg bg-white hover:bg-gray-50 border border-border flex items-center justify-between gap-2 transition-colors cursor-pointer"
                          >
                            <div className="min-w-0">
                              <strong className="text-xs font-bold text-text-primary block truncate">
                                {client.name}
                              </strong>
                              <p className="text-[11px] text-text-secondary flex items-center gap-1 mt-0.5">
                                <Phone size={10} className="text-brand shrink-0" />
                                <span>{client.phone}</span>
                              </p>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold shrink-0">
                              {client.status || "Active"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* ===== VEHICLES CARDS ===== */}
                  {msg.data?.type === "vehicles" && msg.data.items && (
                    <div className="mt-2.5 space-y-1.5 pt-2 border-t border-border">
                      {msg.data.items.map((veh: SearchVehicleItem, idx: number) => {
                        const targetId = veh.id || (veh as any)._id;
                        return (
                          <div
                            key={targetId || idx}
                            onClick={() => {
                              router.push(targetId ? `/units/${targetId}` : `/units`);
                              setIsOpen(false);
                            }}
                            className="p-2.5 rounded-lg bg-white hover:bg-gray-50 border border-border flex items-center justify-between gap-2 transition-colors cursor-pointer"
                          >
                            <div className="min-w-0">
                              <strong className="text-xs font-bold text-text-primary block truncate">
                                {veh.title || `${(veh as any).make || ""} ${(veh as any).model || ""}`}
                              </strong>
                              <p className="text-[11px] text-brand font-mono font-bold mt-0.5">
                                {veh.plate}
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
                        );
                      })}
                    </div>
                  )}

                  {/* ===== CONTRACTS CARDS ===== */}
                  {msg.data?.type === "contracts" && msg.data.items && (
                    <div className="mt-2.5 space-y-1.5 pt-2 border-t border-border">
                      {msg.data.items.map((cnt: SearchContractItem, idx: number) => (
                        <div
                          key={cnt.id || idx}
                          onClick={() => {
                            router.push(`/bookings`);
                            setIsOpen(false);
                          }}
                          className="p-2.5 rounded-lg bg-white hover:bg-gray-50 border border-border flex items-center justify-between gap-2 transition-colors cursor-pointer"
                        >
                          <div className="min-w-0">
                            <strong className="text-xs font-bold text-text-primary block truncate">
                              عقد #{cnt.contractNumber} • {cnt.customer}
                            </strong>
                            <p className="text-[11px] text-text-secondary truncate mt-0.5">{cnt.vehicle}</p>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-brand border border-red-200 font-bold shrink-0">
                            {cnt.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ===== OVERVIEW STATS ===== */}
                  {msg.data?.type === "overview" && msg.data.stats && (
                    <div className="mt-2.5 grid grid-cols-2 gap-1.5 pt-2 border-t border-border">
                      <div className="p-2 rounded-lg bg-white border border-border text-center">
                        <span className="text-[10px] text-text-secondary block">السيارات المتاحة</span>
                        <strong className="text-sm font-bold text-emerald-600">
                          {msg.data.stats.availableUnits}
                        </strong>
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-border text-center">
                        <span className="text-[10px] text-text-secondary block">العقود النشطة</span>
                        <strong className="text-sm font-bold text-brand">
                          {msg.data.stats.activeContracts}
                        </strong>
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-border text-center">
                        <span className="text-[10px] text-text-secondary block">السيارات المؤجرة</span>
                        <strong className="text-sm font-bold text-blue-600">
                          {msg.data.stats.rentedUnits}
                        </strong>
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-border text-center">
                        <span className="text-[10px] text-text-secondary block">إجمالي الأسطول</span>
                        <strong className="text-sm font-bold text-text-primary">
                          {msg.data.stats.totalUnits}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-text-muted mt-1 px-1">
                  {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}

            {isProcessing && (
              <div className="flex items-center gap-1.5 text-text-muted text-xs px-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand animate-ping" />
                <span>جاري المعالجة والبحث...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ===== SUGGESTION PILLS ===== */}
          <div className="px-3 py-2 border-t border-border flex items-center gap-1.5 overflow-x-auto scrollbar-none bg-white">
            <button
              type="button"
              onClick={() => handleSendMessage("أنشئ عقد جديد")}
              className="px-2.5 py-1 rounded-md bg-gray-50 hover:bg-red-50 text-text-secondary hover:text-brand text-[11px] font-semibold border border-border shrink-0 cursor-pointer transition-colors"
            >
              + عقد جديد
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage("كم سيارة متوفرة اليوم؟")}
              className="px-2.5 py-1 rounded-md bg-gray-50 hover:bg-red-50 text-text-secondary hover:text-brand text-[11px] font-semibold border border-border shrink-0 cursor-pointer transition-colors"
            >
              🚗 السيارات المتاحة
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage("ابحث عن عميل")}
              className="px-2.5 py-1 rounded-md bg-gray-50 hover:bg-red-50 text-text-secondary hover:text-brand text-[11px] font-semibold border border-border shrink-0 cursor-pointer transition-colors"
            >
              🔍 بحث عميل
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage("افتح التقويم")}
              className="px-2.5 py-1 rounded-md bg-gray-50 hover:bg-red-50 text-text-secondary hover:text-brand text-[11px] font-semibold border border-border shrink-0 cursor-pointer transition-colors"
            >
              📅 التقويم
            </button>
          </div>

          {/* ===== INPUT BAR ===== */}
          <div className="p-3 border-t border-border bg-gray-50">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputValue);
              }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2 rounded-lg transition-colors cursor-pointer shrink-0 border ${
                  isListening
                    ? "bg-brand text-white border-brand shadow-xs"
                    : "bg-white hover:bg-gray-100 text-text-secondary border-border"
                }`}
                title={isListening ? "إيقاف الاستماع" : "بدء التحدث بالصوت"}
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>

              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={lang === "ar" ? "اكتب أمرك أو استفسارك هنا..." : "Type your command here..."}
                className="flex-1 bg-white border border-border rounded-lg px-3 py-2 text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 font-medium"
                dir={inputValue.match(/[\u0600-\u06FF]/) ? "rtl" : "ltr"}
              />

              <button
                type="submit"
                disabled={!inputValue.trim() || isProcessing}
                className="p-2 rounded-lg bg-brand hover:bg-brand-dark disabled:opacity-40 text-white font-bold transition-colors cursor-pointer shrink-0"
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
