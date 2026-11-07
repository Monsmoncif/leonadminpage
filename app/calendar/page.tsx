"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Search,
  Plus,
  Eye,
  Filter,
  ChevronDown,
  Clock,
  X,
  User,
  Phone,
  MapPin,
  FileText,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import ContractDetailsModal from "@/components/modals/ContractDetailsModal";
import { ExecutiveCarIcon } from "@/components/icons/ExecutiveCarIcon";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export type BookingEvent = {
  id: string;
  contractId: string;
  displayId: string;
  displayNum: string;
  contractNumber?: string | number;
  time: string;
  formattedHour: string;
  date: Date;
  car: string;
  carPlate?: string;
  carColor?: string;
  carImage: string | null;
  client: string;
  clientPhone?: string;
  driver: string;
  type: "pickup" | "return";
  status: "Pending" | "Active" | "Completed";
  isPreContract: boolean;
  isHandedOver: boolean;
  isReturned: boolean;
  isCompleted: boolean;
  isOverdue?: boolean;
  statusLabel: string;
  typeBadge: string;
  badgeClass: string;
  contractPill: string;
  tooltipText: string;
  chipClass: string;
  dotClass: string;
  color: string;
  dateStr: string;
  notes: string;
  location: string;
  rawContract?: any;
};

const getInitials = (name: string) => {
  if (!name) return "??";
  return name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
};

const getAvatarColor = (name: string) => {
  if (!name) return "bg-gray-100 text-gray-700";
  const colors = [
    "bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-purple-100 text-purple-700",
    "bg-rose-100 text-rose-700",
    "bg-cyan-100 text-cyan-700",
  ];
  const charCode = name.charCodeAt(0) || 0;
  return colors[charCode % colors.length];
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const formatEventHour = (timeStr?: string, defaultFallback: string = "08:00 AM") => {
  if (!timeStr || !timeStr.trim() || timeStr.toLowerCase().includes("pending")) {
    return defaultFallback;
  }
  const clean = timeStr.trim();
  if (/^\d{1,2}:\d{2}\s*(am|pm)$/i.test(clean)) {
    return clean.toUpperCase();
  }
  const parts = clean.split(":");
  if (parts.length >= 2) {
    let h = parseInt(parts[0], 10);
    const m = parts[1].substring(0, 2);
    if (!isNaN(h)) {
      const ampm = h >= 12 ? "PM" : "AM";
      if (h > 12) h -= 12;
      if (h === 0) h = 12;
      return `${h}:${m} ${ampm}`;
    }
  }
  return clean;
};

// Map raw contracts to all calendar events across all dates
function mapContractsToEvents(contracts: any[]): BookingEvent[] {
  const mapped: BookingEvent[] = [];

  (contracts || []).forEach((c: any) => {
    if (!c.rawStartDate || !c.rawEndDate) return;
    if (c.status === "Cancelled") return;

    const nowStartOfDay = new Date();
    nowStartOfDay.setHours(0, 0, 0, 0);

    const isReturned = Boolean(
      c.deliveryStatus === "Returned" ||
      c.status === "Completed" ||
      Boolean(c.returnedAt)
    );

    const isHandedOver = Boolean(
      c.deliveryStatus !== "Pending" &&
      (
        isReturned ||
        c.deliveryStatus === "Delivered" ||
        Boolean(c.deliveredAt || c.handoverCompletedAt) ||
        (c.status === "Active" && c.deliveryStatus !== "Draft")
      )
    );

    const isPreContract = !isHandedOver;

    let effectiveStatus: "Pending" | "Active" | "Completed" = "Pending";
    if (isReturned) {
      effectiveStatus = "Completed";
    } else if (isHandedOver) {
      effectiveStatus = "Active";
    } else {
      effectiveStatus = "Pending";
    }

    const contractNum = c.contractNumber ? String(c.contractNumber) : (c.id || "Pending");
    const displayNum = contractNum.startsWith("#") ? contractNum : `#${contractNum}`;

    // 2. Return / End Date & Hour
    const returnDateRaw = (isReturned && c.returnedAt)
      ? c.returnedAt
      : (isReturned && (c.status === "Completed" || c.deliveryStatus === "Returned"))
        ? (c.updatedAt || new Date().toISOString())
        : c.rawEndDate;
    const endDate = startOfDay(new Date(returnDateRaw));

    // 1. Handover / Pickup Start Date & Hour
    const rawStart = startOfDay(new Date(c.deliveredAt || c.handoverCompletedAt || c.rawStartDate));
    const startDate = (isReturned && rawStart > endDate) ? endDate : rawStart;
    const startHour = formatEventHour(c.checkoutTime, "08:00 AM");

    const pickupDriver = (c.deliveryDriver && c.deliveryDriver !== "None" && c.deliveryDriver.trim() !== "")
      ? c.deliveryDriver
      : (c.driver && c.driver !== "None" && c.driver.trim() !== "" ? c.driver : "");
    const pickupNotes = (c.notes && c.notes.trim() && c.notes !== "No notes provided.")
      ? c.notes.trim() : "";
    const pickupLocation = (c.pickupLocation && c.pickupLocation.trim())
      ? c.pickupLocation.trim() : "";

    let startChipClass = "";
    let startDotClass = "";
    let startBadgeClass = "";
    let startTypeBadge = "Start";
    let startStatusLabel = "";
    let startContractPill = "";

    if (isPreContract) {
      startChipClass = "bg-amber-50/95 hover:bg-amber-100/90 text-amber-950 border-amber-200/90";
      startDotClass = "bg-amber-500 animate-pulse";
      startBadgeClass = "bg-amber-100 text-amber-800 border-amber-300/80";
      startTypeBadge = "Start";
      startStatusLabel = "Pre-Contract";
      startContractPill = `Pre-${displayNum}`;
    } else if (isReturned) {
      startChipClass = "bg-blue-50/90 hover:bg-blue-100 text-blue-950 border-blue-200/80";
      startDotClass = "bg-blue-500";
      startBadgeClass = "bg-blue-100 text-blue-800 border-blue-300/80";
      startTypeBadge = "Start";
      startStatusLabel = "Handed Over (Past)";
      startContractPill = `CON ${displayNum}`;
    } else {
      startChipClass = "bg-blue-50/95 hover:bg-blue-100 text-blue-950 border-blue-200/90";
      startDotClass = "bg-blue-600";
      startBadgeClass = "bg-blue-100 text-blue-800 border-blue-300/80";
      startTypeBadge = "Start";
      startStatusLabel = "Handover (Active)";
      startContractPill = `CON ${displayNum}`;
    }

    mapped.push({
      id: `${c.id || c._id}-start`,
      contractId: c._id,
      displayId: c.id || "Booking",
      displayNum,
      contractNumber: c.contractNumber,
      time: startHour,
      formattedHour: startHour,
      date: startDate,
      car: c.vehicle || "Vehicle",
      carPlate: c.vehiclePlate || c.unitId?.plate || "",
      carColor: c.vehicleColor || c.unitId?.color || "",
      carImage: c.vehicleImage || null,
      client: c.customer || "Client",
      clientPhone: c.customerPhone || "",
      driver: pickupDriver,
      type: "pickup",
      status: effectiveStatus,
      isPreContract,
      isHandedOver,
      isReturned,
      isCompleted: isHandedOver,
      isOverdue: false,
      statusLabel: startStatusLabel,
      typeBadge: startTypeBadge,
      badgeClass: startBadgeClass,
      contractPill: startContractPill,
      tooltipText: `${isPreContract ? "Pre-Contract" : "Contract"} ${displayNum} • Start / Handover at ${startHour} • Client: ${c.customer} (${c.vehicle})`,
      chipClass: startChipClass,
      dotClass: startDotClass,
      color: getAvatarColor(c.customer),
      dateStr: startDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      notes: pickupNotes,
      location: pickupLocation,
      rawContract: c,
    });

    let endHour = "";
    if (isReturned && (c.returnedAt || c.updatedAt)) {
      try {
        const d = new Date(c.returnedAt || c.updatedAt);
        if (!isNaN(d.getTime())) {
          endHour = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
        }
      } catch {}
    }
    if (!endHour) {
      endHour = formatEventHour(c.checkinTime || c.checkoutTime, "08:00 PM");
    }

    const isOverdue = !isReturned && isHandedOver && c.rawEndDate && startOfDay(new Date(c.rawEndDate)) < nowStartOfDay;

    const returnDriver = (c.returnDriver && c.returnDriver !== "None" && c.returnDriver.trim() !== "")
      ? c.returnDriver
      : (c.returnDriverId?.name && c.returnDriverId.name !== "None" ? c.returnDriverId.name : "");
    const returnNotes = (c.returnNotes && c.returnNotes.trim() && c.returnNotes !== "No notes provided.")
      ? c.returnNotes.trim() : "";
    const returnLocation = (c.dropoffLocation && c.dropoffLocation.trim())
      ? c.dropoffLocation.trim() : "";

    let endChipClass = "";
    let endDotClass = "";
    let endBadgeClass = "";
    let endTypeBadge = "Exp. End";
    let endStatusLabel = "";
    let endContractPill = "";

    if (isReturned) {
      endChipClass = "bg-emerald-50/95 hover:bg-emerald-100 text-emerald-950 border-emerald-200/90";
      endDotClass = "bg-emerald-500";
      endBadgeClass = "bg-emerald-100 text-emerald-800 border-emerald-300/80";
      endTypeBadge = "Returned";
      endStatusLabel = "Returned";
      endContractPill = `CON ${displayNum}`;
    } else if (isOverdue) {
      endChipClass = "bg-rose-50/95 hover:bg-rose-100 text-rose-950 border-rose-300";
      endDotClass = "bg-rose-500 animate-ping";
      endBadgeClass = "bg-rose-100 text-rose-800 border-rose-300";
      endTypeBadge = "Overdue";
      endStatusLabel = "Overdue Return";
      endContractPill = `CON ${displayNum}`;
    } else if (isPreContract) {
      endChipClass = "bg-orange-50/95 hover:bg-orange-100 text-orange-950 border-orange-200/90";
      endDotClass = "bg-orange-500";
      endBadgeClass = "bg-orange-100 text-orange-800 border-orange-300/80";
      endTypeBadge = "Exp. End";
      endStatusLabel = "Pre-Contract";
      endContractPill = `Pre-${displayNum}`;
    } else {
      endChipClass = "bg-purple-50/95 hover:bg-purple-100 text-purple-950 border-purple-200/90";
      endDotClass = "bg-purple-500";
      endBadgeClass = "bg-purple-100 text-purple-800 border-purple-300/80";
      endTypeBadge = "Exp. End";
      endStatusLabel = "Expected Return";
      endContractPill = `CON ${displayNum}`;
    }

    mapped.push({
      id: `${c.id || c._id}-end`,
      contractId: c._id,
      displayId: c.id || "Booking",
      displayNum,
      contractNumber: c.contractNumber,
      time: endHour,
      formattedHour: endHour,
      date: endDate,
      car: c.vehicle || "Vehicle",
      carPlate: c.vehiclePlate || c.unitId?.plate || "",
      carColor: c.vehicleColor || c.unitId?.color || "",
      carImage: c.vehicleImage || null,
      client: c.customer || "Client",
      clientPhone: c.customerPhone || "",
      driver: returnDriver,
      type: "return",
      status: effectiveStatus,
      isPreContract,
      isHandedOver,
      isReturned,
      isCompleted: isReturned,
      isOverdue,
      statusLabel: endStatusLabel,
      typeBadge: endTypeBadge,
      badgeClass: endBadgeClass,
      contractPill: endContractPill,
      tooltipText: `${isPreContract ? "Pre-Contract" : "Contract"} ${displayNum} • ${isReturned ? "Returned at" : "Expected End at"} ${endHour} • Client: ${c.customer} (${c.vehicle})`,
      chipClass: endChipClass,
      dotClass: endDotClass,
      color: getAvatarColor(c.customer),
      dateStr: endDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      notes: returnNotes,
      location: returnLocation,
      rawContract: c,
    });
  });

  return mapped;
}

export default function CalendarPage() {
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState<"all" | "pickup" | "return" | "precontract" | "contract">("all");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [dayModalDate, setDayModalDate] = useState<Date | null>(null);
  const [dayModalFilter, setDayModalFilter] = useState<"all" | "pickup" | "return">("all");
  const [dayModalSearch, setDayModalSearch] = useState("");
  const [rawContracts, setRawContracts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContractForDetails, setSelectedContractForDetails] = useState<any | null>(null);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Month calculation
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const startDayRaw = startOfMonth.getDay();
  const startDayIdx = startDayRaw === 0 ? 6 : startDayRaw - 1;

  const startDateCalc = new Date(startOfMonth);
  startDateCalc.setDate(startDateCalc.getDate() - startDayIdx);

  const monthDates = Array.from({ length: 42 }).map((_, i) => {
    const d = new Date(startDateCalc);
    d.setDate(d.getDate() + i);
    return d;
  });

  const monthEnd = monthDates[41];
  monthEnd.setHours(23, 59, 59, 999);

  const monthYearStr = currentDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  // Fetch contracts once on initial mount (NEVER on month change)
  const fetchContracts = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const res = await fetch("/api/contracts?full=false", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setRawContracts(data.contracts || []);
    } catch (error) {
      console.error("Failed to fetch contracts:", error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  // Compute all bookings in-memory from rawContracts
  const allBookings = useMemo(() => {
    return mapContractsToEvents(rawContracts);
  }, [rawContracts]);

  // Filter bookings based on active filter and search query
  const filteredBookings = useMemo(() => {
    return allBookings.filter((b) => {
      let matchesType = true;
      if (filter === "pickup") matchesType = b.type === "pickup";
      else if (filter === "return") matchesType = b.type === "return";
      else if (filter === "precontract") matchesType = b.isPreContract;
      else if (filter === "contract") matchesType = !b.isPreContract;

      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        (b.client && b.client.toLowerCase().includes(query)) ||
        (b.car && b.car.toLowerCase().includes(query)) ||
        (b.driver && b.driver.toLowerCase().includes(query)) ||
        (b.displayId && b.displayId.toLowerCase().includes(query)) ||
        (b.contractNumber && String(b.contractNumber).toLowerCase().includes(query)) ||
        (b.contractPill && b.contractPill.toLowerCase().includes(query));
      return matchesType && matchesSearch;
    });
  }, [allBookings, filter, searchQuery]);

  // Selected Day Bookings for Mobile Drawer
  const selectedDayBookings = useMemo(() => {
    if (!selectedDay) return [];
    return filteredBookings.filter((b) => b.date.toDateString() === selectedDay.toDateString());
  }, [filteredBookings, selectedDay]);

  // All events on the date selected for the modal
  const allDayBookings = useMemo(() => {
    if (!dayModalDate) return [];
    const dateStr = dayModalDate.toDateString();
    return allBookings.filter((b) => b.date.toDateString() === dateStr);
  }, [allBookings, dayModalDate]);

  // Filtered events inside the Day Modal
  const modalDayBookings = useMemo(() => {
    return allDayBookings.filter((b) => {
      if (dayModalFilter === "pickup" && b.type !== "pickup") return false;
      if (dayModalFilter === "return" && b.type !== "return") return false;

      if (dayModalSearch.trim()) {
        const q = dayModalSearch.toLowerCase().trim();
        const matches =
          (b.client && b.client.toLowerCase().includes(q)) ||
          (b.car && b.car.toLowerCase().includes(q)) ||
          (b.carPlate && b.carPlate.toLowerCase().includes(q)) ||
          (b.driver && b.driver.toLowerCase().includes(q)) ||
          (b.displayNum && b.displayNum.toLowerCase().includes(q)) ||
          (b.contractNumber && String(b.contractNumber).toLowerCase().includes(q)) ||
          (b.location && b.location.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [allDayBookings, dayModalFilter, dayModalSearch]);

  const pickupCount = useMemo(() => {
    return allDayBookings.filter((b) => b.type === "pickup").length;
  }, [allDayBookings]);

  const returnCount = useMemo(() => {
    return allDayBookings.filter((b) => b.type === "return").length;
  }, [allDayBookings]);

  // Navigation handlers — ZERO page reload, instant month switch
  const prevMonth = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };
  const nextMonth = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };
  const goToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDay(today);
  };

  const filterOptions = [
    { key: "all", label: "All", dot: "bg-gray-400" },
    { key: "pickup", label: "Pickups (Start)", dot: "bg-blue-500" },
    { key: "return", label: "Returns (End)", dot: "bg-purple-500" },
    { key: "precontract", label: "Pre-Contracts", dot: "bg-amber-500" },
    { key: "contract", label: "Contracts", dot: "bg-emerald-500" },
  ] as const;

  const currentFilterLabel = filterOptions.find((f) => f.key === filter)?.label || "All";

  // Events count in current month view
  const currentMonthEventsCount = useMemo(() => {
    return filteredBookings.filter((b) => b.date >= monthDates[0] && b.date <= monthEnd).length;
  }, [filteredBookings, monthDates, monthEnd]);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-gray-200 rounded-lg"></div>
            <div className="h-4 w-64 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden h-[700px]">
          <div className="p-4 border-b border-gray-100 flex justify-between">
            <div className="h-10 w-64 bg-gray-200 rounded-xl"></div>
            <div className="h-10 w-24 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  // ========================================================
  // DAY EVENTS MODAL CONTENT (Inspired by CreateClientModal)
  // ========================================================
  const dayModalContent = dayModalDate ? (
    <div
      className="fixed inset-0 z-[100] w-screen h-screen min-h-screen flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in overflow-y-auto"
      onClick={() => {
        setDayModalDate(null);
        setDayModalSearch("");
      }}
    >
      {/* Widescreen Modal (max-w-4xl) - Height maximized cleanly on mobile */}
      <div
        className="bg-card w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94dvh] sm:max-h-[90vh] my-auto border border-border bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Identical styling to CreateClientModal */}
        <div className="px-3.5 py-2.5 sm:px-6 sm:py-4 border-b border-border flex items-center justify-between shrink-0 bg-white">
          <div>
            <h2 className="text-base sm:text-xl font-bold text-text-primary flex items-center gap-1.5 sm:gap-2">
              <CalendarIcon className="text-brand shrink-0" size={20} />
              <span>
                {dayModalDate.toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </h2>
            <p className="text-[10px] sm:text-xs text-text-secondary mt-0.5 line-clamp-1 sm:line-clamp-none">
              Daily fleet schedule • Review all handover deliveries and returns for this date.
            </p>
          </div>
          <button
            onClick={() => {
              setDayModalDate(null);
              setDayModalSearch("");
            }}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-gray-100 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-2.5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/40 space-y-3 sm:space-y-4">
          {/* Top Controls: Filter Tabs + Search (Matches CreateClientModal Profile Type Box) */}
          <div className="bg-white p-2.5 sm:p-4 rounded-xl border border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Segmented Filter Control */}
            <div className="grid grid-cols-3 gap-1 p-0.5 sm:p-1 bg-gray-100 rounded-lg sm:rounded-xl border border-gray-200 w-full sm:max-w-md">
              <button
                type="button"
                onClick={() => setDayModalFilter("all")}
                className={`py-1.5 sm:py-2 px-2 sm:px-3 rounded-md sm:rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 min-w-0 ${
                  dayModalFilter === "all"
                    ? "bg-white text-brand shadow-xs font-bold"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                <span>All Events</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    dayModalFilter === "all" ? "bg-brand/10 text-brand" : "bg-gray-200 text-text-secondary"
                  }`}
                >
                  {allDayBookings.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDayModalFilter("pickup")}
                className={`py-1.5 sm:py-2 px-2 sm:px-3 rounded-md sm:rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 min-w-0 ${
                  dayModalFilter === "pickup"
                    ? "bg-white text-brand shadow-xs font-bold"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                <span>Pickups</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    dayModalFilter === "pickup" ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-text-secondary"
                  }`}
                >
                  {pickupCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDayModalFilter("return")}
                className={`py-1.5 sm:py-2 px-2 sm:px-3 rounded-md sm:rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 min-w-0 ${
                  dayModalFilter === "return"
                    ? "bg-white text-brand shadow-xs font-bold"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                <span>Returns</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    dayModalFilter === "return" ? "bg-purple-100 text-purple-700" : "bg-gray-200 text-text-secondary"
                  }`}
                >
                  {returnCount}
                </span>
              </button>
            </div>

            {/* In-Modal Search Input */}
            <div className="relative w-full sm:w-64 shrink-0">
              <input
                type="text"
                placeholder="Search within this day..."
                value={dayModalSearch}
                onChange={(e) => setDayModalSearch(e.target.value)}
                className="w-full text-xs border border-border rounded-xl pl-8 pr-8 py-2 bg-white text-text-secondary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all shadow-xs"
              />
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
              {dayModalSearch && (
                <button
                  type="button"
                  onClick={() => setDayModalSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Cards List */}
          {modalDayBookings.length === 0 ? (
            <div className="bg-white rounded-xl border border-border p-8 sm:p-12 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
                <CalendarIcon size={24} />
              </div>
              <h4 className="text-sm font-bold text-text-primary">No events found for this selection</h4>
              <p className="text-xs text-text-secondary max-w-sm mx-auto">
                {dayModalSearch
                  ? `No events matching "${dayModalSearch}". Try clearing your search.`
                  : "There are no contracts or handovers scheduled under this filter."}
              </p>
              {dayModalSearch && (
                <button
                  type="button"
                  onClick={() => setDayModalSearch("")}
                  className="text-xs font-semibold text-brand hover:underline"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            modalDayBookings.map((b) => (
              <div
                key={b.id}
                className="bg-white p-3.5 sm:p-5 rounded-xl border border-border shadow-xs hover:border-gray-300 hover:shadow-sm transition-all flex flex-col gap-3.5"
              >
                {/* Card Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Time Badge */}
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 text-text-primary text-xs font-extrabold tabular-nums border border-gray-200">
                      <Clock size={13} className="text-brand shrink-0" />
                      <span>{b.formattedHour}</span>
                    </span>

                    {/* Contract Identifier */}
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-gray-100 text-text-primary border border-gray-200 tabular-nums">
                      {b.displayNum}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border self-start sm:self-auto ${b.badgeClass}`}>
                    {b.statusLabel}
                  </span>
                </div>

                {/* Card Details Grid (Customer & Vehicle in 2 neat boxes) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Customer Box */}
                  <div className="bg-gray-50/70 p-3 rounded-xl border border-gray-200/70 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      {getInitials(b.client)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                        Customer / Client
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-text-primary block truncate mt-0.5">
                        {b.client}
                      </span>
                      {b.clientPhone && (
                        <a
                          href={`tel:${b.clientPhone}`}
                          className="text-[11px] text-text-secondary hover:text-brand font-medium tabular-nums flex items-center gap-1 mt-0.5 truncate transition-colors"
                        >
                          <Phone size={11} className="text-text-muted shrink-0" />
                          <span>{b.clientPhone}</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Vehicle Box */}
                  <div className="bg-gray-50/70 p-3 rounded-xl border border-gray-200/70 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gray-200/70 text-text-muted flex items-center justify-center shrink-0">
                      <ExecutiveCarIcon size={14} className="text-text-muted" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                        Vehicle
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-text-primary block truncate mt-0.5">
                        {b.car}
                      </span>
                      {b.carPlate && (
                        <span className="text-[11px] font-medium text-text-muted block mt-0.5">
                          Plate: <strong className="text-text-primary font-bold">{b.carPlate}</strong>{b.carColor ? ` • ${b.carColor}` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Driver, Location & Notes Row + Action Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-text-secondary">
                  <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                    <div className="flex items-center gap-1.5 font-medium">
                      <User size={13} className="text-text-muted shrink-0" />
                      <span>
                        Driver: <strong className="text-text-primary">{b.driver || "Showroom Handover"}</strong>
                      </span>
                    </div>

                    {b.location && (
                      <div className="flex items-center gap-1.5 font-medium truncate max-w-[240px]">
                        <MapPin size={13} className="text-text-muted shrink-0" />
                        <span className="truncate">{b.location}</span>
                      </div>
                    )}

                    {b.notes && (
                      <div className="text-[11px] text-text-muted italic truncate max-w-[200px]" title={b.notes}>
                        "{b.notes}"
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <button
                    type="button"
                    onClick={() => setSelectedContractForDetails(b.rawContract)}
                    className="px-4 py-2 bg-brand text-white hover:bg-brand-dark rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0 active:scale-95"
                  >
                    <Eye size={13} />
                    <span>View Contract Details</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer - Identical styling to CreateClientModal */}
        <div className="px-3.5 py-2.5 sm:px-6 sm:py-3.5 border-t border-border bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] sm:text-xs text-text-secondary text-center sm:text-left">
            Showing <b>{modalDayBookings.length}</b> of <b>{allDayBookings.length}</b> events for this day
          </div>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setDayModalDate(null);
                setDayModalSearch("");
              }}
              className="flex-1 sm:flex-initial px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-text-secondary border border-border rounded-xl hover:bg-gray-100 transition-colors cursor-pointer text-center"
            >
              Close
            </button>
            <Link
              href="/bookings/new"
              className="flex-1 sm:flex-initial px-4 sm:px-6 py-2 sm:py-2.5 bg-brand text-white rounded-xl hover:bg-brand-dark transition-colors font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer shadow-sm text-center"
            >
              <Plus size={16} />
              <span>New Contract</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ===== Dashboard-Style Welcome Header ===== */}
      <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 relative overflow-hidden shadow-xs">
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-brand/5 via-orange-500/3 to-transparent rounded-full -translate-y-32 translate-x-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-blue-500/5 to-transparent rounded-full translate-y-16 -translate-x-8 pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 relative">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary mb-0.5 sm:mb-1">
              Fleet Calendar
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary">
              {monthYearStr} • Track pickups, returns, and fleet handover schedules
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/bookings/new"
              className="flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm shadow-sm hover:shadow transition-all cursor-pointer w-full sm:w-auto"
            >
              <Plus size={16} />
              <span>New Contract</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ===== Full-Width Calendar ===== */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        {/* ===== Desktop Toolbar ===== */}
        <div className="hidden md:flex px-4 py-3 items-center justify-between gap-3 border-b border-border bg-gray-50/60">
          {/* Left: Navigation, Month Title & Events Count Badge */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-0.5 bg-white p-0.5 rounded-xl border border-border shadow-2xs">
              <button
                onClick={prevMonth}
                title="Previous Month (Instant, no reload)"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={goToday}
                title="Jump to Today"
                className="px-2.5 py-1 text-xs font-bold rounded-lg text-text-secondary hover:text-text-primary hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
              >
                Today
              </button>
              <button
                onClick={nextMonth}
                title="Next Month (Instant, no reload)"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
              >
                <ChevronRight size={15} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-extrabold text-text-primary flex items-center gap-1.5 whitespace-nowrap tracking-tight">
                <CalendarIcon size={16} className="text-brand shrink-0" />
                <span>{monthYearStr}</span>
              </h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20 tabular-nums whitespace-nowrap shadow-2xs">
                {currentMonthEventsCount} {currentMonthEventsCount === 1 ? "event" : "events"}
              </span>
            </div>
          </div>

          {/* Center: Segmented Filter Tabs */}
          <div className="flex items-center p-0.5 bg-white rounded-xl border border-border shadow-2xs shrink-0 max-w-full overflow-x-auto no-scrollbar">
            {filterOptions.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap select-none ${
                  filter === key
                    ? "bg-brand text-white shadow-xs"
                    : "text-text-secondary hover:text-text-primary hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Right: Search Input */}
          <div className="relative w-44 lg:w-48 shrink-0">
            <input
              type="text"
              placeholder="Search..."
              className="w-full text-xs border border-border rounded-xl pl-7 pr-2.5 py-1.5 bg-white text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all shadow-2xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
          </div>
        </div>

        {/* ===== Mobile Toolbar ===== */}
        <div className="flex md:hidden p-3 flex-col gap-2.5 border-b border-border bg-gray-50/70">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search contract, client, car..."
              className="w-full text-xs border border-border rounded-xl pl-8 pr-8 py-2 bg-white text-text-secondary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all shadow-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5 bg-white p-0.5 rounded-xl border border-border shadow-2xs">
                <button
                  onClick={prevMonth}
                  title="Previous Month"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-gray-100 active:scale-95 transition-all"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  onClick={goToday}
                  title="Today"
                  className="px-2 py-1 text-xs font-bold rounded-lg text-text-secondary hover:text-text-primary hover:bg-gray-100 active:scale-95 transition-all"
                >
                  Today
                </button>
                <button
                  onClick={nextMonth}
                  title="Next Month"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-gray-100 active:scale-95 transition-all"
                >
                  <ChevronRight size={15} />
                </button>
              </div>

              <span className="text-xs font-bold text-text-primary truncate">{monthYearStr}</span>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
                className="text-xs border border-border rounded-xl px-2.5 py-1.5 text-text-secondary hover:bg-gray-50 flex items-center gap-1.5 font-medium bg-white shadow-xs"
              >
                <Filter size={13} className="text-text-muted" />
                <span className="truncate max-w-[85px]">{currentFilterLabel}</span>
                <ChevronDown size={12} className="text-text-muted ml-0.5" />
              </button>
              {isMobileFilterOpen && (
                <div className="absolute top-full mt-1.5 right-0 w-44 bg-white border border-border rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                  {filterOptions.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setFilter(item.key);
                        setIsMobileFilterOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                        filter === item.key ? "text-brand font-semibold bg-brand/5" : "text-text-secondary"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${item.dot} shrink-0`} />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===== Row 2: Status Legend & Hint ===== */}
        <div className="px-3 sm:px-4 py-2 flex items-center justify-between gap-3 border-b border-border bg-white text-xs overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2.5 sm:gap-4 text-[10px] sm:text-[11px] font-semibold text-text-secondary shrink-0 select-none">
            <span className="text-text-muted font-bold uppercase tracking-wider text-[9px] sm:text-[10px] mr-0.5">
              Legend:
            </span>
            <span className="flex items-center gap-1.5" title="Pre-contract awaiting handover (Start)">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span>Pre-CON (Start)</span>
            </span>
            <span className="w-px h-3 bg-border shrink-0" />
            <span className="flex items-center gap-1.5" title="Pre-contract scheduled end date (End)">
              <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
              <span>Pre-CON (End)</span>
            </span>
            <span className="w-px h-3 bg-border shrink-0" />
            <span className="flex items-center gap-1.5" title="Active contract vehicle handed over (Start)">
              <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
              <span>CON (Start)</span>
            </span>
            <span className="w-px h-3 bg-border shrink-0" />
            <span className="flex items-center gap-1.5" title="Active contract expected return date">
              <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
              <span>CON (Exp. End)</span>
            </span>
            <span className="w-px h-3 bg-border shrink-0" />
            <span className="flex items-center gap-1.5" title="Car returned back to fleet">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>Returned</span>
            </span>
          </div>

          <span className="text-[11px] text-text-muted hidden md:flex items-center gap-1 font-medium shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 inline-block" />
            Click any day to view all events · Click event for details
          </span>
        </div>

        {/* ===== CALENDAR GRID ===== */}
        <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
          <div className="min-w-[560px] sm:min-w-0">
            {/* Day Headers */}
            <div className="grid grid-cols-7 bg-gray-50/70 border-b border-border">
              {days.map((day) => (
                <div
                  key={day}
                  className="py-2 sm:py-2.5 text-[9.5px] sm:text-[10px] md:text-xs font-black text-text-muted text-center uppercase tracking-wider border-l border-border first:border-l-0"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid Cells */}
            <div className="grid grid-cols-7 grid-rows-6 bg-card" style={{ minHeight: "calc(100vh - 290px)" }}>
              {monthDates.map((date, idx) => {
                const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                const isToday = date.toDateString() === new Date().toDateString();
                const isSelected = selectedDay && date.toDateString() === selectedDay.toDateString();

                const dayBookings = filteredBookings.filter(
                  (b) => b.date.toDateString() === date.toDateString()
                );

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedDay(date);
                      setDayModalDate(date);
                      setDayModalFilter("all");
                      setDayModalSearch("");
                    }}
                    className={`p-1 sm:p-1.5 border-b border-border [&:not(:nth-child(7n+1))]:border-l border-l-border transition-colors cursor-pointer group/cell ${
                      !isCurrentMonth ? "bg-gray-50/40" : "bg-card"
                    } ${isToday ? "bg-brand/[0.03]" : ""} ${
                      isSelected ? "ring-1 sm:ring-2 ring-brand/50 ring-inset" : ""
                    } hover:bg-gray-50/80`}
                  >
                    {/* Date Number Badge */}
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-[10px] sm:text-xs font-black w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-lg transition-transform group-hover/cell:scale-105 ${
                          isToday
                            ? "bg-brand text-white shadow-xs"
                            : isCurrentMonth
                            ? "text-text-primary"
                            : "text-gray-300"
                        }`}
                      >
                        {date.getDate()}
                      </span>

                      {dayBookings.length > 0 && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full tabular-nums shadow-2xs ${
                            dayBookings.length >= 5
                              ? "bg-brand text-white"
                              : "bg-gray-100 text-text-secondary"
                          }`}
                          title={`${dayBookings.length} events on this day. Click to view all.`}
                        >
                          {dayBookings.length}
                        </span>
                      )}
                    </div>

                    {/* Events Chips (Shows up to 3 directly, then clickable +X more to open full modal) */}
                    <div className="space-y-0.5 sm:space-y-1 flex flex-col items-start overflow-hidden w-full">
                      {dayBookings.slice(0, 3).map((booking, bIdx) => (
                        <button
                          key={bIdx}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedContractForDetails(booking.rawContract);
                          }}
                          title={`${booking.tooltipText} • Click to view full contract`}
                          className={`w-full max-w-full text-left px-1 sm:px-2 py-0.5 sm:py-1 rounded sm:rounded-lg transition-all border shadow-2xs hover:shadow-xs hover:scale-[1.01] active:scale-[0.99] flex items-center justify-between gap-1 cursor-pointer select-none group ${booking.chipClass}`}
                        >
                          <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                            <span className={`w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full shrink-0 ${booking.dotClass}`} />
                            <span className="font-sans font-bold text-[9.5px] sm:text-[11px] tracking-tight tabular-nums truncate text-text-primary">
                              {booking.displayNum}
                            </span>
                          </div>
                          <span className="text-[8.5px] sm:text-[10px] font-bold tracking-tight tabular-nums text-text-secondary shrink-0 opacity-80">
                            {booking.formattedHour}
                          </span>
                        </button>
                      ))}

                      {/* Clickable +X more button that immediately opens the Day Events Modal */}
                      {dayBookings.length > 3 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDay(date);
                            setDayModalDate(date);
                            setDayModalFilter("all");
                            setDayModalSearch("");
                          }}
                          className="w-full text-left text-[9px] sm:text-[10px] font-bold text-brand hover:text-brand-dark bg-brand/5 hover:bg-brand/10 border border-brand/20 px-1.5 py-0.5 rounded-md flex items-center justify-between transition-all cursor-pointer shadow-2xs hover:shadow-xs"
                          title={`Click to view all ${dayBookings.length} events for ${date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
                        >
                          <span>+{dayBookings.length - 3} more</span>
                          <span className="text-[8px] opacity-75 font-normal">View all ({dayBookings.length}) →</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ===== Mobile Day Inspector (Quick bottom bar on Mobile) ===== */}
        {selectedDay && (
          <div className="md:hidden p-3 border-t border-border bg-gray-50/75 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                <CalendarIcon size={13} className="text-brand" />
                <span>
                  {selectedDay.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                </span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setDayModalDate(selectedDay);
                  setDayModalFilter("all");
                  setDayModalSearch("");
                }}
                className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand text-white shadow-2xs cursor-pointer flex items-center gap-1"
              >
                <span>{selectedDayBookings.length} {selectedDayBookings.length === 1 ? "schedule" : "schedules"}</span>
                <span>• View All →</span>
              </button>
            </div>

            {selectedDayBookings.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {selectedDayBookings.slice(0, 4).map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedContractForDetails(b.rawContract)}
                    className={`w-full text-left p-2 rounded-xl border flex items-center justify-between gap-2 shadow-2xs hover:shadow-xs transition-all cursor-pointer ${b.chipClass}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full ${b.dotClass} shrink-0`} />
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-text-primary block truncate">
                          {b.displayNum} • {b.car}
                        </span>
                        <span className="text-[10px] text-text-muted block truncate">
                          {b.client} {b.driver ? `• Driver: ${b.driver}` : ""}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold block text-text-primary">
                        {b.formattedHour}
                      </span>
                      <span className="text-[9px] font-semibold text-text-secondary">
                        {b.typeBadge}
                      </span>
                    </div>
                  </button>
                ))}
                {selectedDayBookings.length > 4 && (
                  <button
                    type="button"
                    onClick={() => {
                      setDayModalDate(selectedDay);
                      setDayModalFilter("all");
                      setDayModalSearch("");
                    }}
                    className="w-full text-center py-1.5 text-xs font-bold text-brand bg-white rounded-xl border border-brand/20 shadow-2xs"
                  >
                    Show all {selectedDayBookings.length} events for this day →
                  </button>
                )}
              </div>
            ) : (
              <span className="text-[11px] text-text-muted italic">
                No bookings scheduled for this day.
              </span>
            )}
          </div>
        )}

        {/* ===== Footer with Instant Month Switchers ===== */}
        <div className="px-3.5 sm:px-4 py-2.5 border-t border-border flex items-center justify-between text-xs text-text-muted bg-gray-50/50">
          <span className="text-[11px] sm:text-xs">
            <span className="font-bold text-text-primary">{currentMonthEventsCount}</span> events · <span className="font-bold text-text-primary">{monthYearStr}</span>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={prevMonth}
              title="Previous Month (Instant, no reload)"
              className="px-2 sm:px-2.5 py-1 border border-border rounded-lg bg-white hover:bg-gray-50 transition-colors cursor-pointer text-xs font-bold text-text-secondary active:scale-95"
            >
              ← Prev
            </button>
            <button
              onClick={goToday}
              className="px-2 sm:px-2.5 py-1 bg-brand text-white rounded-lg font-bold cursor-pointer text-xs shadow-xs active:scale-95"
            >
              {currentDate.toLocaleDateString("en-GB", { month: "short" })}
            </button>
            <button
              onClick={nextMonth}
              title="Next Month (Instant, no reload)"
              className="px-2 sm:px-2.5 py-1 border border-border rounded-lg bg-white hover:bg-gray-50 transition-colors cursor-pointer text-xs font-bold text-text-secondary active:scale-95"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* Render Day Events Modal into Portal (Identical to CreateClientModal Portal) */}
      {mounted && typeof document !== "undefined" && dayModalContent
        ? createPortal(dayModalContent, document.body)
        : null}

      {/* Contract Details Modal */}
      {selectedContractForDetails && (
        <ContractDetailsModal
          isOpen={Boolean(selectedContractForDetails)}
          onClose={() => {
            setSelectedContractForDetails(null);
            fetchContracts(true); // Silent background refresh
          }}
          contract={selectedContractForDetails}
        />
      )}
    </div>
  );
}
