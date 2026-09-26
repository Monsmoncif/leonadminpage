"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { 
  Car, 
  ChevronDown, 
  Check, 
  X, 
  Sparkles, 
  Search,
  CheckCircle2
} from "lucide-react";
import { 
  CAR_CATALOG, 
  searchMakes, 
  getModelsForMake, 
  searchModels,
  CarMake 
} from "@/data/carCatalog";

interface CarMakeComboboxProps {
  value: string;
  onChange: (make: string) => void;
  onSelectMake?: (make: string) => void;
  required?: boolean;
  disabled?: boolean;
}

interface CarModelComboboxProps {
  value: string;
  make: string;
  onChange: (model: string) => void;
  onSelectMakeAndModel?: (make: string, model: string) => void;
  required?: boolean;
  disabled?: boolean;
}

/**
 * Highlights matching letters in the displayed label.
 */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query || !query.trim()) return <span>{text}</span>;
  const q = query.trim().toLowerCase();
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return <span>{text}</span>;

  const before = text.substring(0, idx);
  const match = text.substring(idx, idx + q.length);
  const after = text.substring(idx + q.length);

  return (
    <span>
      {before}
      <span className="font-extrabold text-brand underline decoration-brand/50">{match}</span>
      {after}
    </span>
  );
}

// ==========================================
// 1. CAR MAKE (MARQUE) COMBOBOX
// ==========================================
export function CarMakeCombobox({
  value,
  onChange,
  onSelectMake,
  required = false,
  disabled = false,
}: CarMakeComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Sync internal query with incoming value
  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // Filter makes based on query
  const filteredMakes = useMemo(() => {
    return searchMakes(query);
  }, [query]);

  // Check if current typed query exactly matches any catalog make
  const hasExactMatch = useMemo(() => {
    if (!query) return false;
    const clean = query.trim().toLowerCase();
    return CAR_CATALOG.some(
      (m) =>
        m.name.toLowerCase() === clean ||
        m.aliases?.some((a) => a.toLowerCase() === clean)
    );
  }, [query]);

  const handleSelect = (makeName: string) => {
    onChange(makeName);
    if (onSelectMake) onSelectMake(makeName);
    setQuery(makeName);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setQuery("");
    inputRef.current?.focus();
    setIsOpen(true);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-semibold text-text-secondary">
          Make {required && <span className="text-red-500">*</span>}
        </label>
        {value && (
          <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1">
            <Check size={10} /> Selected
          </span>
        )}
      </div>

      {/* Input Field */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
          <Car size={15} className={value ? "text-brand" : "text-gray-400"} />
        </div>

        <input
          ref={inputRef}
          type="text"
          required={required}
          disabled={disabled}
          value={query}
          placeholder="e.g. Mercedes, BMW, Toyota..."
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            onChange(val);
            setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setIsOpen(false);
            } else if (e.key === "Enter") {
              if (filteredMakes.length > 0 && isOpen) {
                e.preventDefault();
                handleSelect(filteredMakes[0].name);
              }
            } else if (e.key === "ArrowDown" && !isOpen) {
              setIsOpen(true);
            }
          }}
          className="w-full border border-border rounded-xl pl-9 pr-14 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white font-medium text-gray-900 transition-all placeholder:text-gray-400"
        />

        <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
          {query && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
              title="Clear Make"
            >
              <X size={14} />
            </button>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
            title="Toggle list"
          >
            <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {/* Floating Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden max-h-64 flex flex-col animate-in fade-in-50 duration-150">
          {/* Header info */}
          <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-medium shrink-0">
            <span>
              {query ? `Matching "${query}"` : "All Car Brands"} ({filteredMakes.length})
            </span>
            <span className="text-[10px] text-gray-400">Type 1-2 letters to filter</span>
          </div>

          {/* Options List */}
          <div className="overflow-y-auto custom-scrollbar flex-1 divide-y divide-gray-50">
            {filteredMakes.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-xs text-gray-500 mb-2">No brand matching "{query}"</p>
                {query.trim() && (
                  <button
                    type="button"
                    onClick={() => handleSelect(query.trim())}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand bg-brand/10 hover:bg-brand/20 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <span>Use custom make:</span>
                    <strong className="underline font-bold">"{query.trim()}"</strong>
                  </button>
                )}
              </div>
            ) : (
              <>
                {filteredMakes.map((item) => {
                  const isSelected = value.toLowerCase() === item.name.toLowerCase();
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => handleSelect(item.name)}
                      className={`w-full px-3.5 py-2.5 text-left text-sm flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected 
                          ? "bg-brand/10 text-brand font-bold" 
                          : "hover:bg-gray-50 text-gray-800"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <HighlightMatch text={item.name} query={query} />
                        {item.popular && (
                          <span className="text-[9px] uppercase tracking-wider font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                            Popular
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>{item.models.length} models</span>
                        {isSelected && <Check size={14} className="text-brand shrink-0" />}
                      </div>
                    </button>
                  );
                })}

                {/* Option to use custom typed text if not an exact match */}
                {query.trim() && !hasExactMatch && (
                  <button
                    type="button"
                    onClick={() => handleSelect(query.trim())}
                    className="w-full px-3.5 py-2.5 text-left text-xs flex items-center gap-2 bg-gray-50 hover:bg-brand/10 text-brand font-medium border-t border-gray-100 transition-colors cursor-pointer"
                  >
                    <Sparkles size={13} className="shrink-0 text-brand" />
                    <span>Use custom make: <strong>"{query.trim()}"</strong></span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 2. CAR MODEL COMBOBOX
// ==========================================
export function CarModelCombobox({
  value,
  make,
  onChange,
  onSelectMakeAndModel,
  required = false,
  disabled = false,
}: CarModelComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Sync internal query with incoming value
  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // Filter models based on selected make and search query
  const filteredModels = useMemo(() => {
    return searchModels(query, make || undefined);
  }, [query, make]);

  // Check if query matches exact model
  const hasExactMatch = useMemo(() => {
    if (!query) return false;
    const clean = query.trim().toLowerCase();
    return filteredModels.some((item) => item.model.toLowerCase() === clean);
  }, [query, filteredModels]);

  const handleSelect = (modelName: string, modelMake?: string) => {
    onChange(modelName);
    setQuery(modelName);
    if (onSelectMakeAndModel) {
      onSelectMakeAndModel(modelMake || make, modelName);
    }
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setQuery("");
    inputRef.current?.focus();
    setIsOpen(true);
  };

  const placeholderText = make 
    ? `Search ${make} models (e.g. C-Class, Golf)...` 
    : "Search or select model...";

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-semibold text-text-secondary flex items-center gap-1.5">
          Model {required && <span className="text-red-500">*</span>}
          {make && (
            <span className="text-[10px] font-bold text-brand bg-brand/10 px-1.5 py-0.2 rounded truncate max-w-[120px]">
              {make}
            </span>
          )}
        </label>
        {value && (
          <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1">
            <Check size={10} /> Selected
          </span>
        )}
      </div>

      {/* Input Field */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
          <Search size={15} className={value ? "text-brand" : "text-gray-400"} />
        </div>

        <input
          ref={inputRef}
          type="text"
          required={required}
          disabled={disabled}
          value={query}
          placeholder={placeholderText}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            onChange(val);
            setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setIsOpen(false);
            } else if (e.key === "Enter") {
              if (filteredModels.length > 0 && isOpen) {
                e.preventDefault();
                handleSelect(filteredModels[0].model, filteredModels[0].make);
              }
            } else if (e.key === "ArrowDown" && !isOpen) {
              setIsOpen(true);
            }
          }}
          className="w-full border border-border rounded-xl pl-9 pr-14 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white font-medium text-gray-900 transition-all placeholder:text-gray-400"
        />

        <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
          {query && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
              title="Clear Model"
            >
              <X size={14} />
            </button>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
            title="Toggle list"
          >
            <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {/* Floating Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden max-h-64 flex flex-col animate-in fade-in-50 duration-150">
          {/* Header info */}
          <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-medium shrink-0">
            <span>
              {make ? `${make} Models` : "All Models"} ({filteredModels.length})
            </span>
            <span className="text-[10px] text-gray-400">Enter 1-2 letters to filter</span>
          </div>

          {/* Options List */}
          <div className="overflow-y-auto custom-scrollbar flex-1 divide-y divide-gray-50">
            {filteredModels.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-xs text-gray-500 mb-2">No model found for "{query}"</p>
                {query.trim() && (
                  <button
                    type="button"
                    onClick={() => handleSelect(query.trim())}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand bg-brand/10 hover:bg-brand/20 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <span>Use custom model:</span>
                    <strong className="underline font-bold">"{query.trim()}"</strong>
                  </button>
                )}
              </div>
            ) : (
              <>
                {filteredModels.slice(0, 50).map((item, idx) => {
                  const isSelected = value.toLowerCase() === item.model.toLowerCase();
                  return (
                    <button
                      key={`${item.make}-${item.model}-${idx}`}
                      type="button"
                      onClick={() => handleSelect(item.model, item.make)}
                      className={`w-full px-3.5 py-2.5 text-left text-sm flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected 
                          ? "bg-brand/10 text-brand font-bold" 
                          : "hover:bg-gray-50 text-gray-800"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <HighlightMatch text={item.model} query={query} />
                        {!make && (
                          <span className="text-[10px] font-medium bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                            {item.make}
                          </span>
                        )}
                      </div>
                      {isSelected && <Check size={14} className="text-brand shrink-0" />}
                    </button>
                  );
                })}

                {/* Option to use custom typed text if not an exact match */}
                {query.trim() && !hasExactMatch && (
                  <button
                    type="button"
                    onClick={() => handleSelect(query.trim())}
                    className="w-full px-3.5 py-2.5 text-left text-xs flex items-center gap-2 bg-gray-50 hover:bg-brand/10 text-brand font-medium border-t border-gray-100 transition-colors cursor-pointer"
                  >
                    <Sparkles size={13} className="shrink-0 text-brand" />
                    <span>Use custom model: <strong>"{query.trim()}"</strong></span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
