"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  X,
  ArrowUp,
  Sparkles,
  Phone,
  Loader2,
  ArrowRight,
} from "lucide-react";
import CreateClientModal from "@/components/modals/CreateClientModal";
import CreateCompanyModal from "@/components/modals/CreateCompanyModal";
import CreateUnitModal from "@/components/modals/CreateUnitModal";
import { invalidateClientCache } from "@/lib/client-cache";
import { useToast } from "@/components/providers/ToastProvider";

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
}

const INITIAL_MESSAGE: Message = {
  id: "welcome",
  sender: "assistant",
  text: "Hi! How can I help you today?",
};

export default function SiriAssistant() {
  const router = useRouter();
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);

  // Direct Action Modals triggered by Leon Assistant
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [isAddCompanyModalOpen, setIsAddCompanyModalOpen] = useState(false);
  const [isAddUnitModalOpen, setIsAddUnitModalOpen] = useState(false);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const latestVoiceTextRef = useRef<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis || null;
    }
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isProcessing]);

  // Focus input when opening chat rectangle
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const speakText = useCallback((text: string) => {
    if (!synthRef.current || typeof window === "undefined") return;
    try {
      synthRef.current.cancel();
      const cleanText = text.replace(/[#*_~`]/g, "").trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const isArabicText = /[\u0600-\u06FF]/.test(cleanText);
      utterance.lang = isArabicText ? "ar-XA" : "en-US";
      utterance.rate = 1.0;

      const voices = synthRef.current.getVoices();
      const preferredVoice = voices.find((v) =>
        isArabicText ? v.lang.startsWith("ar") : v.lang.startsWith("en")
      );
      if (preferredVoice) utterance.voice = preferredVoice;

      synthRef.current.speak(utterance);
    } catch {}
  }, []);

  const executeDomClick = (targetText: string) => {
    if (typeof document === "undefined") return false;
    const lowerTarget = (targetText || "").toLowerCase().trim();
    const buttons = Array.from(document.querySelectorAll("button, a")) as HTMLElement[];

    for (const btn of buttons) {
      if (btn.closest("[data-leon-chat-box='true']")) continue;
      const text = (btn.innerText || btn.textContent || btn.getAttribute("title") || "")
        .toLowerCase()
        .trim();
      if (!text) continue;

      if (
        text.includes(lowerTarget) ||
        (lowerTarget.includes("next") &&
          (text.includes("next") || text.includes("continue") || text.includes("التالي"))) ||
        (lowerTarget.includes("back") &&
          (text.includes("back") || text.includes("previous") || text.includes("رجوع"))) ||
        (lowerTarget.includes("submit") &&
          (text.includes("create") ||
            text.includes("save") ||
            text.includes("dispatch") ||
            text.includes("confirm"))) ||
        (lowerTarget.includes("client") &&
          (text.includes("add customer") || text.includes("add client") || text.includes("new customer")))
      ) {
        btn.click();
        return true;
      }
    }
    return false;
  };

  const handleSendMessage = useCallback(
    async (text: string, shouldSpeak = false) => {
      const trimmed = text.trim();
      if (!trimmed || isProcessing) return;

      const userMsg: Message = {
        id: Date.now().toString(),
        sender: "user",
        text: trimmed,
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputValue("");
      latestVoiceTextRef.current = "";
      setIsProcessing(true);

      try {
        const detectedLang = /[\u0600-\u06FF]/.test(trimmed) ? "ar" : "en";
        const res = await fetch("/api/ai/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            lang: detectedLang,
            history: messages.slice(-6).map((m) => ({ sender: m.sender, text: m.text })),
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
        };

        setMessages((prev) => [...prev, assistantMsg]);

        if (shouldSpeak) {
          speakText(replyText);
        }

        if (data.action === "CLIENT_CREATED") {
          invalidateClientCache("clients");
        }

        if (data.uiAction === "OPEN_ADD_CLIENT_MODAL") {
          setIsAddClientModalOpen(true);
          return;
        }

        if (data.uiAction === "OPEN_ADD_COMPANY_MODAL") {
          setIsAddCompanyModalOpen(true);
          return;
        }

        if (data.uiAction === "OPEN_ADD_UNIT_MODAL") {
          setIsAddUnitModalOpen(true);
          return;
        }

        if (data.uiAction === "CLICK_BUTTON") {
          const clicked = executeDomClick(data.uiTarget || "next");
          if (clicked) {
            toast.success(`Clicked "${data.uiTarget || "Next"}"`);
          }
          return;
        }

        if (data.navigateUrl) {
          router.push(data.navigateUrl);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: "assistant",
            text: "Something went wrong. Please try again.",
          },
        ]);
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, messages, router, speakText, toast]
  );

  // Toggle voice recognition directly on user click (synchronously preserves browser gesture permission)
  const toggleListening = () => {
    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsListening(false);
      return;
    }

    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    try {
      if (synthRef.current) synthRef.current.cancel();
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      // Detect language from current input or last user message, defaulting to English
      const lastUserText =
        inputValue ||
        [...messages].reverse().find((m) => m.sender === "user")?.text ||
        "";
      recognition.lang = /[\u0600-\u06FF]/.test(lastUserText) ? "ar-AE" : "en-US";

      latestVoiceTextRef.current = "";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        latestVoiceTextRef.current = currentTranscript;
        setInputValue(currentTranscript);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        const captured = latestVoiceTextRef.current.trim();
        if (captured.length > 0) {
          latestVoiceTextRef.current = "";
          handleSendMessage(captured, true);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleClose = () => {
    if (synthRef.current) synthRef.current.cancel();
    try {
      recognitionRef.current?.stop();
    } catch {}
    setIsListening(false);
    setIsOpen(false);
  };

  return (
    <>
      {/* Bottom-Right Static Red Circle Button when Closed */}
      {!isOpen && (
        <div className="fixed bottom-5 right-5 z-[90]">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            title="Leon Assistant"
            className="w-13 h-13 rounded-full bg-brand text-white shadow-lg hover:bg-brand-dark flex items-center justify-center transition-colors cursor-pointer border border-white/20"
          >
            <Mic size={22} className="text-white" />
          </button>
        </div>
      )}

      {/* Compact Bottom-Right ChatGPT-Style Rectangle (No Full-Screen Backdrop) */}
      {isOpen && (
        <div
          data-leon-chat-box="true"
          className="fixed bottom-5 right-5 z-[95] w-[340px] sm:w-[370px] h-[460px] max-h-[82vh] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
        >
          {/* Minimal Header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-brand flex items-center justify-center text-white">
                <Sparkles size={13} />
              </div>
              <span className="text-sm font-bold text-gray-900">Leon Assistant</span>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Pure ChatGPT-Style Conversation Messages */}
          <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3 bg-white custom-scrollbar">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap max-w-[85%] ${
                    msg.sender === "user"
                      ? "bg-brand text-white rounded-2xl rounded-br-xs font-medium"
                      : "bg-gray-100 text-gray-900 rounded-2xl rounded-bl-xs"
                  }`}
                  dir={msg.text.match(/[\u0600-\u06FF]/) ? "rtl" : "ltr"}
                >
                  {msg.text}

                  {/* Compact Client Cards */}
                  {msg.data?.type === "clients" && msg.data.items && (
                    <div className="mt-2 space-y-1.5">
                      {msg.data.items.map((client: any, idx: number) => {
                        const targetId = client.id || client._id;
                        return (
                          <div
                            key={targetId || idx}
                            onClick={() => router.push(targetId ? `/clients/${targetId}` : `/clients`)}
                            className="bg-white p-2 rounded-xl border border-gray-200 hover:border-brand flex items-center justify-between gap-2 cursor-pointer transition-all"
                          >
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-gray-900 block truncate">
                                {client.name}
                              </span>
                              <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                <Phone size={9} className="text-brand" />
                                {client.phone}
                              </span>
                            </div>
                            <ArrowRight size={13} className="text-brand shrink-0" />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Compact Vehicle Cards */}
                  {msg.data?.type === "vehicles" && msg.data.items && (
                    <div className="mt-2 space-y-1.5">
                      {msg.data.items.map((veh: any, idx: number) => {
                        const targetId = veh.id || veh._id;
                        return (
                          <div
                            key={targetId || idx}
                            onClick={() => router.push(targetId ? `/units/${targetId}` : `/units`)}
                            className="bg-white p-2 rounded-xl border border-gray-200 hover:border-brand flex items-center justify-between gap-2 cursor-pointer transition-all"
                          >
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-gray-900 block truncate">
                                {veh.title || `${veh.make || ""} ${veh.model || ""}`}
                              </span>
                              <span className="text-[10px] text-gray-500 block">
                                Plate: <strong className="text-brand">{veh.plate}</strong>
                              </span>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-brand font-bold shrink-0">
                              {veh.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Compact Contract Cards */}
                  {msg.data?.type === "contracts" && msg.data.items && (
                    <div className="mt-2 space-y-1.5">
                      {msg.data.items.map((cnt: any, idx: number) => (
                        <div
                          key={cnt.id || idx}
                          onClick={() => router.push(`/bookings`)}
                          className="bg-white p-2 rounded-xl border border-gray-200 hover:border-brand flex items-center justify-between gap-2 cursor-pointer transition-all"
                        >
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-gray-900 block truncate">
                              #{cnt.contractNumber} • {cnt.customer}
                            </span>
                            <span className="text-[10px] text-gray-500 block truncate">
                              {cnt.vehicle}
                            </span>
                          </div>
                          <ArrowRight size={13} className="text-brand shrink-0" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isProcessing && (
              <div className="flex items-start">
                <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-xs bg-gray-100 text-gray-600 text-xs flex items-center gap-2">
                  <Loader2 size={13} className="animate-spin text-brand" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ChatGPT-Style Bottom Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputValue, false);
            }}
            className="p-2.5 border-t border-gray-100 bg-white shrink-0"
          >
            <div className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1.5 border border-gray-200 focus-within:border-brand focus-within:bg-white transition-all">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={isListening ? "Listening..." : "Message Leon Assistant..."}
                className="flex-1 bg-transparent text-xs sm:text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none min-w-0 py-1"
                dir={inputValue.match(/[\u0600-\u06FF]/) ? "rtl" : "ltr"}
              />

              <button
                type="button"
                onClick={toggleListening}
                title={isListening ? "Stop voice" : "Voice input"}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                  isListening
                    ? "bg-brand text-white"
                    : "text-gray-500 hover:text-brand hover:bg-gray-200/70"
                }`}
              >
                {isListening ? <MicOff size={14} /> : <Mic size={15} />}
              </button>

              <button
                type="submit"
                disabled={!inputValue.trim() || isProcessing}
                className="w-7 h-7 rounded-full bg-brand text-white hover:bg-brand-dark disabled:opacity-40 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <ArrowUp size={15} />
              </button>
            </div>
          </form>
        </div>
      )}

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
