"use client";

import React, { useState } from "react";
import { 
  X, 
  Search, 
  User, 
  UserPlus, 
  CheckCircle2, 
  CreditCard, 
  Phone, 
  ShieldCheck, 
  ScanLine,
  Sparkles
} from "lucide-react";

interface SelectSecondDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: any[];
  primaryClientId?: string | null;
  selectedSecondDriverClientId?: string | null;
  onSelectSecondDriver: (client: any) => void;
  onOpenCreateClientModal: () => void;
}

export default function SelectSecondDriverModal({
  isOpen,
  onClose,
  clients = [],
  primaryClientId,
  selectedSecondDriverClientId,
  onSelectSecondDriver,
  onOpenCreateClientModal,
}: SelectSecondDriverModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  const filteredClients = clients.filter((client) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = (client.name || "").toLowerCase();
    const phone = (client.phone || "").toLowerCase();
    const license = (client.licenseNumber || "").toLowerCase();
    return name.includes(q) || phone.includes(q) || license.includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-border flex flex-col max-h-[85vh] animate-scale-up">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-border/80 flex items-center justify-between bg-gradient-to-r from-gray-50 via-white to-red-50/40">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center shadow-2xs">
                <User size={20} />
              </div>
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                2
              </span>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-text-primary">
                Select Second Driver (اختيار السائق الثاني)
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Choose an existing customer or register a new one with instant OCR scan
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Action & Search Bar in Same Line */}
        <div className="p-4 sm:p-5 border-b border-border/60 bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customer by name, phone, or license..."
                className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-border bg-white text-xs sm:text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-600 outline-none transition-all shadow-2xs text-text-primary placeholder:text-text-muted"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-xs text-text-muted hover:text-text-primary rounded cursor-pointer"
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Add New Driver Button (Icon only: User with Plus) */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCreateClientModal();
              }}
              title="Add New Driver (إضافة سائق جديد)"
              aria-label="Add New Driver"
              className="h-10 w-10 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white flex items-center justify-center shrink-0 shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer group"
            >
              <UserPlus size={18} className="transition-transform group-hover:scale-110" />
            </button>
          </div>
        </div>

        {/* Customers List */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-2.5">
          {filteredClients.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-border rounded-2xl bg-gray-50/50">
              <User size={36} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-text-primary">No matching customers found</p>
              <p className="text-xs text-text-muted mt-1">Click the + button above to register and scan a new customer.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredClients.map((client) => {
                const isPrimary = primaryClientId && (client._id === primaryClientId || client.id === primaryClientId);
                const isSelectedSecond = selectedSecondDriverClientId && (client._id === selectedSecondDriverClientId || client.id === selectedSecondDriverClientId);

                return (
                  <div
                    key={client._id}
                    onClick={() => {
                      if (isPrimary) return;
                      onSelectSecondDriver(client);
                      onClose();
                    }}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isPrimary
                        ? "bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed"
                        : isSelectedSecond
                        ? "bg-red-50/80 border-red-500 ring-2 ring-red-500/20 shadow-sm cursor-pointer"
                        : "bg-white border-border hover:border-red-300 hover:bg-red-50/30 cursor-pointer shadow-2xs hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                        isSelectedSecond 
                          ? "bg-red-600 text-white shadow-xs" 
                          : "bg-red-100 text-red-800"
                      }`}>
                        {client.name?.charAt(0)?.toUpperCase() || "C"}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-text-primary truncate">
                          {client.name}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-text-muted truncate mt-0.5">
                          {client.phone && <span>{client.phone}</span>}
                          {client.licenseNumber && (
                            <span className="font-mono text-red-700 bg-red-100/60 px-1.5 py-0.2 rounded text-[10px]">
                              {client.licenseNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right status badge */}
                    <div className="shrink-0">
                      {isPrimary ? (
                        <span className="text-[10px] font-bold text-gray-500 bg-gray-200/80 px-2 py-0.5 rounded-md">
                          Primary
                        </span>
                      ) : isSelectedSecond ? (
                        <span className="p-1 bg-red-600 text-white rounded-full flex items-center justify-center">
                          <CheckCircle2 size={15} />
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-red-700 hover:underline">
                          Select
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border/80 bg-gray-50/60 flex items-center justify-between text-xs text-text-muted">
          <span>A driving license is required for insurance coverage of second driver.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border bg-white hover:bg-gray-100 text-text-secondary font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
