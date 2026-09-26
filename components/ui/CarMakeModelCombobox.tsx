"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, Check, X } from "lucide-react";
import { 
  searchMakes, 
  searchModels,
  getModelsForMake,
  CAR_CATALOG 
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

// ==========================================
// 1. CAR MAKE (MARQUE) COMBOBOX - CLEAN & MINIMAL
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

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

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

  const filteredMakes = useMemo(() => {
    return searchMakes(query);
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
      <label className="block text-xs font-semibold text-text-secondary mb-1">
        Make {required && <span className="text-red-500">*</span>}
      </label>

      {/* Input Field with Search Icon matching Model */}
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

      {/* Floating Dropdown - Just Names */}
      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden max-h-64 flex flex-col animate-in fade-in-50 duration-150">
          <div className="overflow-y-auto custom-scrollbar flex-1 divide-y divide-gray-50">
            {filteredMakes.length === 0 ? (
              <div className="p-3 text-center">
                <p className="text-xs text-gray-500">No results found</p>
              </div>
            ) : (
              filteredMakes.map((item) => {
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
                    <span>{item.name}</span>
                    {isSelected && <Check size={14} className="text-brand shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 2. CAR MODEL COMBOBOX - CLEAN & MINIMAL
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

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

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

  return (
    <div ref={containerRef} className="relative w-full">
      <label className="block text-xs font-semibold text-text-secondary mb-1">
        Model {required && <span className="text-red-500">*</span>}
      </label>

      {/* Input Field with Search Icon */}
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
          placeholder="e.g. C-Class, Camry, Golf..."
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

      {/* Floating Dropdown - Just Names */}
      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden max-h-64 flex flex-col animate-in fade-in-50 duration-150">
          <div className="overflow-y-auto custom-scrollbar flex-1 divide-y divide-gray-50">
            {filteredModels.length === 0 ? (
              <div className="p-3 text-center">
                <p className="text-xs text-gray-500">No results found</p>
              </div>
            ) : (
              filteredModels.map((item, idx) => {
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
                    <span>{item.model}</span>
                    {isSelected && <Check size={14} className="text-brand shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
