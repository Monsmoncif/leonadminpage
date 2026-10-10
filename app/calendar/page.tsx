"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Search,
  Plus,
  CheckCircle,
  Eye,
  Filter,
  ChevronDown,
  Clock,
  Key,
  LayoutGrid,
  List,
  AlertCircle,
  User,
  MapPin,
  X,
  FileText,
  CalendarDays,
} from "lucide-react";
import Link from "next/link";
import ContractDetailsModal from "@/components/modals/ContractDetailsModal";
import StatCard from "@/components/ui/StatCard";
import TablePagination from "@/components/ui/TablePagination";
import { ExecutiveCarIcon } from "@/components/icons/ExecutiveCarIcon";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type BookingEvent = {
  id: string;
  contractId: string;
  displayId: string;
  displayNum: string;
  contractNumber?: string | number;
  time: string;
  formattedHour: string;
  date: Date;
  car: string;
  carImage: string | null;
  client: string;
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

export default function CalendarPage() {
  const [filter, setFilter] = useState<"all" | "pickup" | "return" | "precontract" | "contract">("all");
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  
  // Default to 'table' on mobile, or user selection
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [bookings, setBookings] = useState<BookingEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContractForDetails, setSelectedContractForDetails] = useState<any | null>(null);

  // Pagination matching Bookings & Units pages
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Auto-set viewMode based on screen size on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.innerWidth >= 1024) {
        setViewMode("grid");
      } else {
        setViewMode("table");
      }
    }
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

  const monthYearStr = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        setIsLoading(true);
        const res = await fetch("/api/contracts", { cache: 'no-store' });
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        const mapped: BookingEvent[] = [];

        (data.contracts || []).forEach((c: any) => {
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

          // 1. Handover / Pickup Start Date & Hour
          const startDate = startOfDay(new Date(c.rawStartDate));
          const startHour = formatEventHour(c.checkoutTime, "08:00 AM");

          if (startDate >= monthDates[0] && startDate <= monthEnd) {
            const pickupDriver = (c.deliveryDriver && c.deliveryDriver !== "None" && c.deliveryDriver.trim() !== "")
              ? c.deliveryDriver
              : (c.driver && c.driver !== "None" && c.driver.trim() !== "" ? c.driver : "");
            const pickupNotes = (c.notes && c.notes.trim() && c.notes !== "No notes provided.")
              ? c.notes.trim() : "";
            const pickupLocation = (c.pickupLocation && c.pickupLocation.trim())
              ? c.pickupLocation.trim() : "";

            let chipClass = "";
            let dotClass = "";
            let badgeClass = "";
            let typeBadge = "Start";
            let statusLabel = "";
            let contractPill = "";

            if (isPreContract) {
              chipClass = "bg-amber-50 hover:bg-amber-100 text-amber-950 border-amber-200/90";
              dotClass = "bg-amber-500 animate-pulse";
              badgeClass = "bg-amber-100 text-amber-800 border-amber-300/80";
              typeBadge = "Start";
              statusLabel = "Pre-Contract";
              contractPill = `Pre-${displayNum}`;
            } else if (isReturned) {
              chipClass = "bg-blue-50 hover:bg-blue-100 text-blue-950 border-blue-200/80";
              dotClass = "bg-blue-500";
              badgeClass = "bg-blue-100 text-blue-800 border-blue-300/80";
              typeBadge = "Start";
              statusLabel = "Delivered (Past)";
              contractPill = `CON ${displayNum}`;
            } else {
              chipClass = "bg-blue-50 hover:bg-blue-100 text-blue-950 border-blue-200/90";
              dotClass = "bg-blue-600";
              badgeClass = "bg-blue-100 text-blue-800 border-blue-300/80";
              typeBadge = "Start";
              statusLabel = "Delivered (Active)";
              contractPill = `CON ${displayNum}`;
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
              carImage: c.vehicleImage || null,
              client: c.customer || "Client",
              driver: pickupDriver,
              type: "pickup",
              status: effectiveStatus,
              isPreContract,
              isHandedOver,
              isReturned,
              isCompleted: isHandedOver,
              isOverdue: false,
              statusLabel,
              typeBadge,
              badgeClass,
              contractPill,
              tooltipText: `${isPreContract ? "Pre-Contract" : "Contract"} ${displayNum} • Start / Handover at ${startHour} • Client: ${c.customer} (${c.vehicle})`,
              chipClass,
              dotClass,
              color: getAvatarColor(c.customer),
              dateStr: startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
              notes: pickupNotes,
              location: pickupLocation,
              rawContract: c,
            });
          }

          // 2. Expected Return / End Date & Hour
          const endDate = (isReturned && c.returnedAt)
            ? startOfDay(new Date(c.returnedAt))
            : startOfDay(new Date(c.rawEndDate));

          let endHour = "";
          if (isReturned && c.returnedAt) {
            try {
              const d = new Date(c.returnedAt);
              if (!isNaN(d.getTime())) {
                endHour = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
              }
            } catch {}
          }
          if (!endHour) {
            endHour = formatEventHour(c.checkinTime || c.checkoutTime, "08:00 PM");
          }

          const isOverdue = !isReturned && isHandedOver && c.rawEndDate && startOfDay(new Date(c.rawEndDate)) < nowStartOfDay;

          if (endDate >= monthDates[0] && endDate <= monthEnd) {
            const returnDriver = (c.returnDriver && c.returnDriver !== "None" && c.returnDriver.trim() !== "")
              ? c.returnDriver
              : (c.returnDriverId?.name && c.returnDriverId.name !== "None" ? c.returnDriverId.name : "");
            const returnNotes = (c.returnNotes && c.returnNotes.trim() && c.returnNotes !== "No notes provided.")
              ? c.returnNotes.trim() : "";
            const returnLocation = (c.dropoffLocation && c.dropoffLocation.trim())
              ? c.dropoffLocation.trim() : "";

            let chipClass = "";
            let dotClass = "";
            let badgeClass = "";
            let typeBadge = "Exp. End";
            let statusLabel = "";
            let contractPill = "";

            if (isReturned) {
              chipClass = "bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border-emerald-200/90";
              dotClass = "bg-emerald-500";
              badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-300/80";
              typeBadge = "Returned";
              statusLabel = "Returned";
              contractPill = `CON ${displayNum}`;
            } else if (isOverdue) {
              chipClass = "bg-rose-50 hover:bg-rose-100 text-rose-950 border-rose-300";
              dotClass = "bg-rose-500 animate-ping";
              badgeClass = "bg-rose-100 text-rose-800 border-rose-300";
              typeBadge = "Overdue";
              statusLabel = "Overdue";
              contractPill = `CON ${displayNum}`;
            } else if (isPreContract) {
              chipClass = "bg-orange-50 hover:bg-orange-100 text-orange-950 border-orange-200/90";
              dotClass = "bg-orange-500";
              badgeClass = "bg-orange-100 text-orange-800 border-orange-300/80";
              typeBadge = "Exp. End";
              statusLabel = "Pre-Contract";
              contractPill = `Pre-${displayNum}`;
            } else {
              chipClass = "bg-purple-50 hover:bg-purple-100 text-purple-950 border-purple-200/90";
              dotClass = "bg-purple-500";
              badgeClass = "bg-purple-100 text-purple-800 border-purple-300/80";
              typeBadge = "Exp. End";
              statusLabel = "Active Return";
              contractPill = `CON ${displayNum}`;
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
              carImage: c.vehicleImage || null,
              client: c.customer || "Client",
              driver: returnDriver,
              type: "return",
              status: effectiveStatus,
              isPreContract,
              isHandedOver,
              isReturned,
              isCompleted: isReturned,
              isOverdue,
              statusLabel,
              typeBadge,
              badgeClass,
              contractPill,
              tooltipText: `${isPreContract ? "Pre-Contract" : "Contract"} ${displayNum} • ${isReturned ? "Returned at" : "Expected End at"} ${endHour} • Client: ${c.customer} (${c.vehicle})`,
              chipClass,
              dotClass,
              color: getAvatarColor(c.customer),
              dateStr: endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
              notes: returnNotes,
              location: returnLocation,
              rawContract: c,
            });
          }
        });
        setBookings(mapped);
      } catch (error) {
        console.error("Failed to fetch contracts:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchContracts();
  }, [currentDate]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      let matchesType = true;
      if (filter === "pickup") matchesType = b.type === "pickup";
      else if (filter === "return") matchesType = b.type === "return";
      else if (filter === "precontract") matchesType = b.isPreContract;
      else if (filter === "contract") matchesType = !b.isPreContract;

      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query ||
        (b.client && b.client.toLowerCase().includes(query)) ||
        (b.car && b.car.toLowerCase().includes(query)) ||
        (b.driver && b.driver.toLowerCase().includes(query)) ||
        (b.displayId && b.displayId.toLowerCase().includes(query)) ||
        (b.contractNumber && String(b.contractNumber).toLowerCase().includes(query)) ||
        (b.contractPill && b.contractPill.toLowerCase().includes(query));
      return matchesType && matchesSearch;
    });
  }, [bookings, filter, searchQuery]);

  // Sort by date ascending for table view
  const sortedBookings = useMemo(() => {
    return [...filteredBookings].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [filteredBookings]);

  // Paginated bookings (Matches Bookings Page Pagination)
  const totalPages = Math.ceil(sortedBookings.length / itemsPerPage);
  const paginatedBookings = useMemo(() => {
    return sortedBookings.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [sortedBookings, currentPage, itemsPerPage]);

  // Selected Day Bookings for Grid Mode
  const selectedDayBookings = useMemo(() => {
    if (!selectedDay) return [];
    return filteredBookings.filter((b) => b.date.toDateString() === selectedDay.toDateString());
  }, [filteredBookings, selectedDay]);

  // Stats for the current month
  const monthStats = useMemo(() => {
    const currentMonthEvents = bookings.filter((b) => b.date.getMonth() === currentDate.getMonth());
    return {
      total: currentMonthEvents.length,
      pickups: currentMonthEvents.filter((b) => b.type === "pickup").length,
      returns: currentMonthEvents.filter((b) => b.type === "return").length,
      precontracts: currentMonthEvents.filter((b) => b.isPreContract).length,
    };
  }, [bookings, currentDate]);

  const sparklineData = {
    total: [10, 14, 12, 18, 22, 20, 26],
    pickups: [5, 8, 7, 10, 12, 11, 14],
    returns: [4, 5, 5, 8, 9, 8, 11],
    precontracts: [2, 3, 2, 4, 3, 2, 3],
  };

  const prevMonth = () => {
    setCurrentDate((prev) => { const d = new Date(prev); d.setMonth(d.getMonth() - 1); return d; });
    setCurrentPage(1);
  };
  const nextMonth = () => {
    setCurrentDate((prev) => { const d = new Date(prev); d.setMonth(d.getMonth() + 1); return d; });
    setCurrentPage(1);
  };
  const goToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDay(today);
    setCurrentPage(1);
  };

  const filterOptions = [
    { label: "All Schedules", val: "all", dot: "bg-gray-400" },
    { label: "Pickups (Start)", val: "pickup", dot: "bg-blue-500" },
    { label: "Returns (End)", val: "return", dot: "bg-purple-500" },
    { label: "Pre-Contracts", val: "precontract", dot: "bg-amber-500" },
    { label: "Active Contracts", val: "contract", dot: "bg-emerald-500" },
  ] as const;

  const currentFilterLabel = filterOptions.find((f) => f.val === filter)?.label || "All Schedules";

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6 max-w-[1600px] mx-auto pb-10 animate-fade-in">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-2">
          <div className="space-y-2">
            <div className="h-7 w-40 bg-gray-200 rounded-lg"></div>
            <div className="h-3.5 w-60 bg-gray-200 rounded-lg"></div>
          </div>
          <div className="h-10 w-32 bg-gray-200 rounded-xl"></div>
        </div>
        
        {/* Primary Stats Skeleton (Matches Bookings 2x2 on mobile, 4 on desktop) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl sm:rounded-2xl h-[105px] sm:h-[130px] p-3 sm:p-5">
              <div className="flex justify-between">
                <div className="w-8 h-8 sm:w-11 sm:h-11 bg-gray-200 rounded-xl mb-2 sm:mb-3"></div>
                <div className="w-12 sm:w-16 h-6 sm:h-8 bg-gray-100 rounded-md"></div>
              </div>
              <div className="w-20 h-3 bg-gray-200 rounded-md mb-2"></div>
              <div className="w-12 h-6 bg-gray-200 rounded-md"></div>
            </div>
          ))}
        </div>

        {/* Content Skeleton */}
        <div className="bg-card rounded-xl sm:rounded-2xl border border-border overflow-hidden h-[500px]">
          <div className="p-3 sm:p-4 border-b border-border flex justify-between bg-gray-50/30">
            <div className="h-9 w-56 bg-gray-200 rounded-xl"></div>
            <div className="h-9 w-24 bg-gray-200 rounded-xl"></div>
          </div>
          <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 sm:h-12 w-full bg-gray-100 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-[1600px] mx-auto pb-10">
      {/* ===== Summary Header (Matches Bookings & Units Pages) ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
            Fleet Calendar
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
            Track pickups, returns, and fleet handover schedules.
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/bookings/new"
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white px-4 py-2 sm:py-2.5 rounded-xl font-semibold text-xs sm:text-sm shadow-sm transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>New Booking</span>
          </Link>
        </div>
      </div>

      {/* ===== Primary Stats Cards (Matches Bookings 2x2 on Mobile, 4x1 on Desktop) ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="stagger-1">
          <StatCard 
            icon={CalendarIcon} 
            label="Total Schedules" 
            value={monthStats.total} 
            change={8} 
            subtitle="this month"
            accentColor="#8B5CF6" 
            sparkData={sparklineData.total}
          />
        </div>
        <div className="stagger-2">
          <StatCard 
            icon={Key} 
            label="Pickups / Starts" 
            value={monthStats.pickups} 
            change={12} 
            subtitle="this month"
            accentColor="#3B82F6" 
            sparkData={sparklineData.pickups}
          />
        </div>
        <div className="stagger-3">
          <StatCard 
            icon={CheckCircle} 
            label="Returns (End)" 
            value={monthStats.returns} 
            change={15} 
            subtitle="this month"
            accentColor="#22C55E" 
            sparkData={sparklineData.returns}
          />
        </div>
        <div className="stagger-4">
          <StatCard 
            icon={Clock} 
            label="Pre-Contracts" 
            value={monthStats.precontracts} 
            change={-4} 
            subtitle="awaiting handover"
            accentColor="#F59E0B" 
            sparkData={sparklineData.precontracts}
          />
        </div>
      </div>

      {/* ===== Main Content Area (Matches Bookings Page UI/UX) ===== */}
      <div className="grid grid-cols-12 gap-4 sm:gap-6 animate-fade-in-up stagger-2">
        <div className="col-span-12 flex flex-col gap-4 sm:gap-6">

          {/* ===== Responsive Toolbar (Matches Bookings Page) ===== */}
          <div className="relative z-20 bg-card rounded-xl sm:rounded-2xl border border-border p-3 sm:p-4 shadow-xs sm:shadow-sm flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 card-hover">
            
            {/* Search Input */}
            <div className="relative max-w-sm w-full">
              <input
                type="text"
                placeholder="Search contract no, customer, vehicle..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-xs sm:text-sm border border-border rounded-xl pl-9 sm:pl-10 pr-8 sm:pr-9 py-2 sm:py-2.5 bg-white text-text-secondary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all shadow-xs"
              />
              <Search size={15} className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setCurrentPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Controls Right Section */}
            <div className="flex items-center gap-2 relative w-full sm:w-auto flex-wrap sm:flex-nowrap justify-between sm:justify-end">
              
              {/* Month Navigation Buttons */}
              <div className="flex items-center gap-1 bg-white p-0.5 rounded-xl border border-border shadow-2xs">
                <button 
                  onClick={prevMonth} 
                  title="Previous Month"
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <button 
                  onClick={goToday} 
                  title="Jump to Today"
                  className="px-2 sm:px-2.5 py-1 text-xs font-bold rounded-lg text-text-secondary hover:text-text-primary hover:bg-gray-100 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                >
                  Today
                </button>
                <button 
                  onClick={nextMonth} 
                  title="Next Month"
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* View Switcher: Table List (Bookings Style) vs Grid */}
              <div className="flex items-center p-0.5 bg-gray-100 rounded-xl border border-border/80 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  title="Table / List View (Bookings Style)"
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === "table"
                      ? "bg-white text-text-primary shadow-xs"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <List size={14} />
                  <span>List</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  title="Month Calendar Grid View"
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === "grid"
                      ? "bg-white text-text-primary shadow-xs"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <LayoutGrid size={14} />
                  <span>Grid</span>
                </button>
              </div>

              {/* Status / Type Filter Dropdown (Matches Bookings Page) */}
              <div className="relative">
                <button 
                  type="button"
                  onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                  className="text-xs sm:text-sm border border-border rounded-xl px-3 py-2 text-text-secondary hover:bg-gray-50 flex items-center justify-between gap-2 font-medium transition-colors bg-white whitespace-nowrap shadow-xs cursor-pointer w-full sm:w-auto"
                >
                  <span className="flex items-center gap-2">
                    <Filter size={14} className="text-text-muted" /> 
                    <span>{currentFilterLabel}</span>
                  </span>
                  <ChevronDown size={14} className="text-text-muted ml-1" />
                </button>
                
                {isFilterDropdownOpen && (
                  <div className="absolute top-full mt-2 right-0 w-48 bg-white border border-border rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                    {filterOptions.map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => {
                          setFilter(item.val);
                          setIsFilterDropdownOpen(false);
                          setCurrentPage(1);
                        }}
                        className={`w-full text-left px-3.5 py-2 text-xs sm:text-sm hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-2 ${
                          filter === item.val ? "text-brand font-semibold bg-brand/5" : "text-text-secondary"
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

          {/* ===== Current Month & Schedule Indicator Banner ===== */}
          <div className="flex items-center justify-between px-1 text-xs text-text-secondary">
            <span className="flex items-center gap-2 font-bold text-text-primary">
              <CalendarDays size={15} className="text-brand shrink-0" />
              <span>{monthYearStr}</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20 tabular-nums">
                {filteredBookings.length} {filteredBookings.length === 1 ? "schedule" : "schedules"}
              </span>
            </span>

            {/* Legend Indicators */}
            <div className="hidden sm:flex items-center gap-3 text-[11px] font-medium text-text-secondary">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                <span>Pickup</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                <span>Return</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span>Pre-Contract</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span>Returned</span>
              </span>
            </div>
          </div>

          {/* ===== VIEW MODE 1: Table / List (Bookings Style - Default for Mobile!) ===== */}
          {viewMode === "table" && (
            <div className="bg-card rounded-xl sm:rounded-2xl border border-border shadow-xs sm:shadow-sm overflow-hidden card-hover animate-fade-in">
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] sm:text-xs md:text-sm">
                  <thead>
                    <tr className="border-b border-border bg-gray-50/75 text-[9.5px] sm:text-[11px] md:text-xs text-text-muted font-semibold uppercase tracking-wider">
                      <th className="text-left py-2 sm:py-2.5 px-2.5 sm:px-4 whitespace-nowrap">
                        Contract / Type
                      </th>
                      <th className="text-left py-2 sm:py-2.5 px-2.5 sm:px-4 min-w-[150px] sm:min-w-[220px]">
                        Customer / Driver
                      </th>
                      <th className="text-left py-2 sm:py-2.5 px-2.5 sm:px-4">
                        Vehicle
                      </th>
                      <th className="text-left py-2 sm:py-2.5 px-2 sm:px-4 whitespace-nowrap">
                        Schedule / Time
                      </th>
                      <th className="text-left py-2 sm:py-2.5 px-2 whitespace-nowrap w-[96px] sm:w-[120px]">
                        Status
                      </th>
                      <th className="text-right py-2 sm:py-2.5 px-2.5 sm:px-4 whitespace-nowrap">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filteredBookings.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 px-5 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <CalendarIcon size={32} className="text-gray-300 mb-4" />
                            <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-1.5">No schedules found</h2>
                            <p className="text-gray-500 text-xs sm:text-sm mb-4">No schedules match your search or filter criteria for {monthYearStr}.</p>
                            <button
                              type="button"
                              onClick={() => { setSearchQuery(""); setFilter("all"); setCurrentPage(1); }}
                              className="px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-brand border border-brand/20 rounded-lg hover:bg-brand/5 transition-colors cursor-pointer"
                            >
                              Clear Search
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedBookings.map((event, idx) => {
                        const isToday = event.date.toDateString() === new Date().toDateString();

                        return (
                          <tr 
                            key={event.id} 
                            onClick={() => setSelectedContractForDetails(event.rawContract)}
                            className="bg-white hover:bg-gray-50/75 transition-colors animate-fade-in-up cursor-pointer"
                            style={{ animationDelay: `${idx * 0.04 + 0.08}s` }}
                          >
                            {/* Contract / Event Column */}
                            <td className="py-2 sm:py-2.5 px-2.5 sm:px-4">
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5">
                                  {event.contractNumber ? (
                                    <span className="font-bold text-text-primary text-[11px] sm:text-xs md:text-sm tabular-nums">
                                      #{event.contractNumber}
                                    </span>
                                  ) : (
                                    <span 
                                      className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80 shadow-2xs whitespace-nowrap"
                                      title="Unconfirmed Contract"
                                    >
                                      <Clock size={10} className="text-amber-600 animate-pulse shrink-0" />
                                      <span>Pending</span>
                                    </span>
                                  )}
                                </div>
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[8.5px] sm:text-[9.5px] font-bold border w-fit leading-tight ${event.badgeClass}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${event.dotClass} shrink-0`} />
                                  {event.type === "pickup" ? "Pickup (Start)" : "Return (End)"}
                                </span>
                              </div>
                            </td>

                            {/* Customer / Driver Column */}
                            <td className="py-2 sm:py-2.5 px-2.5 sm:px-4 min-w-[150px] sm:min-w-[220px]">
                              <div className="flex items-center gap-2 sm:gap-2.5">
                                <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-[10px] sm:text-xs shrink-0 shadow-xs ${event.color}`}>
                                  {getInitials(event.client)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span 
                                    className="font-semibold text-text-primary text-[11px] sm:text-xs md:text-sm block break-words leading-tight"
                                    title={event.client}
                                  >
                                    {event.client}
                                  </span>
                                  <p className="text-[9.5px] sm:text-[11px] text-text-muted mt-0.5 break-words leading-tight">
                                    {event.driver ? `Driver: ${event.driver}` : "Self-drive"}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Vehicle Column */}
                            <td className="py-2 sm:py-2.5 px-2.5 sm:px-4">
                              <span className="font-medium text-text-primary text-[11px] sm:text-xs md:text-sm line-clamp-1" title={event.car}>
                                {event.car}
                              </span>
                              {event.rawContract?.vehiclePlate && (
                                <p className="text-[9.5px] sm:text-[11px] text-brand font-mono font-bold mt-0.5">
                                  {event.rawContract.vehiclePlate}
                                </p>
                              )}
                            </td>

                            {/* Period / Schedule Column */}
                            <td className="py-2 sm:py-2.5 px-2 sm:px-4 whitespace-nowrap">
                              <div className="text-[10px] sm:text-xs leading-tight">
                                <span className="font-semibold text-text-primary flex items-center gap-1">
                                  <CalendarIcon size={11} className="text-brand shrink-0 hidden sm:inline" />
                                  {event.dateStr}
                                  {isToday && (
                                    <span className="px-1 py-0.2 rounded-full bg-brand/10 text-brand text-[8.5px] font-bold border border-brand/20">
                                      Today
                                    </span>
                                  )}
                                </span>
                                <span className="text-text-muted text-[9px] sm:text-[10.5px] block font-medium mt-0.5">
                                  at {event.formattedHour}
                                </span>
                              </div>
                            </td>

                            {/* Status Column */}
                            <td className="py-2 sm:py-2.5 px-2 whitespace-nowrap w-[96px] sm:w-[120px]">
                              <div className="flex flex-col gap-1">
                                <span className={`px-2 py-0.5 rounded-full text-[9.5px] sm:text-[10.5px] font-bold border w-fit leading-tight ${event.badgeClass}`}>
                                  {event.statusLabel}
                                </span>
                                {event.isOverdue && (
                                  <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200 w-fit">
                                    Overdue
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Actions Column */}
                            <td className="py-2 sm:py-2.5 px-2.5 sm:px-4 whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1 sm:gap-1.5 transition-opacity">
                                <button 
                                  type="button"
                                  className="p-1 sm:p-1.5 text-text-muted hover:text-brand hover:bg-brand/10 rounded-md sm:rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center" 
                                  title="View Contract Details" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedContractForDetails(event.rawContract);
                                  }}
                                >
                                  <Eye size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination (Matches Bookings Page Pagination) */}
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={sortedBookings.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            </div>
          )}

          {/* ===== VIEW MODE 2: Month Grid View (For Desktop / Tablet) ===== */}
          {viewMode === "grid" && (
            <div className="bg-card rounded-xl sm:rounded-2xl border border-border shadow-xs sm:shadow-sm overflow-hidden card-hover animate-fade-in">
              <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
                <div className="min-w-[620px] sm:min-w-0">
                  {/* Day Headers */}
                  <div className="grid grid-cols-7 bg-gray-50/75 border-b border-border">
                    {days.map((day) => (
                      <div key={day} className="py-2 sm:py-2.5 text-[9.5px] sm:text-[11px] font-extrabold text-text-muted text-center uppercase tracking-wider border-l border-border first:border-l-0">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 grid-rows-6 bg-card" style={{ minHeight: 'calc(100vh - 330px)' }}>
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
                          onClick={() => setSelectedDay(date)}
                          className={`p-1 sm:p-1.5 border-b border-border [&:not(:nth-child(7n+1))]:border-l border-l-border transition-all cursor-pointer ${
                            !isCurrentMonth ? 'bg-gray-50/40' : 'bg-card'
                          } ${isToday ? 'bg-brand/[0.03]' : ''} ${
                            isSelected ? 'ring-2 ring-brand/50 ring-inset bg-brand/[0.02]' : ''
                          }`}
                        >
                          {/* Date Header */}
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-[10px] sm:text-xs font-black w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-lg ${
                              isToday 
                                ? 'bg-brand text-white shadow-xs' 
                                : isCurrentMonth ? 'text-text-primary' : 'text-gray-300'
                            }`}>
                              {date.getDate()}
                            </span>

                            {dayBookings.length > 0 && (
                              <span className="text-[9px] font-bold px-1 rounded-full bg-gray-100 text-text-secondary sm:hidden">
                                {dayBookings.length}
                              </span>
                            )}
                          </div>

                          {/* Event Chips */}
                          <div className="space-y-1 flex flex-col items-start overflow-hidden w-full">
                            {dayBookings.slice(0, 4).map((booking, bIdx) => (
                              <button
                                key={bIdx}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedContractForDetails(booking.rawContract);
                                }}
                                title={`${booking.tooltipText} • Click to view full details`}
                                className={`w-full max-w-full text-left px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg transition-all border shadow-2xs hover:shadow-xs hover:scale-[1.01] active:scale-[0.99] flex items-center justify-between gap-1 cursor-pointer select-none group ${booking.chipClass}`}
                              >
                                <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${booking.dotClass}`} />
                                  <span className="font-sans font-bold text-[9.5px] sm:text-[11px] tracking-tight tabular-nums truncate text-text-primary">
                                    {booking.displayNum}
                                  </span>
                                </div>
                                <span className="text-[9px] sm:text-[10px] font-bold tracking-tight tabular-nums text-text-secondary shrink-0 opacity-80">
                                  {booking.formattedHour}
                                </span>
                              </button>
                            ))}

                            {dayBookings.length > 4 && (
                              <span className="text-[9px] font-bold text-brand pl-1">
                                +{dayBookings.length - 4} more
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Selected Day Quick Inspector */}
              {selectedDay && (
                <div className="p-3 sm:p-4 border-t border-border bg-gray-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand" />
                    <span className="text-xs sm:text-sm font-bold text-text-primary">
                      Selected Day: {selectedDay.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white border border-border text-text-secondary">
                      {selectedDayBookings.length} {selectedDayBookings.length === 1 ? "schedule" : "schedules"}
                    </span>
                  </div>

                  {selectedDayBookings.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedDayBookings.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setSelectedContractForDetails(b.rawContract)}
                          className={`text-xs px-2.5 py-1 rounded-lg border font-bold flex items-center gap-1.5 shadow-2xs hover:shadow-xs cursor-pointer ${b.chipClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${b.dotClass}`} />
                          <span>{b.displayNum} ({b.car})</span>
                          <span className="opacity-75 text-[10px]">{b.formattedHour}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-text-muted italic">
                      No schedules booked for this specific day.
                    </span>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="px-3.5 sm:px-4 py-2.5 border-t border-border flex items-center justify-between text-xs text-text-muted bg-white">
                <span className="text-[11px] sm:text-xs">
                  <strong className="text-text-primary font-bold">{filteredBookings.length}</strong> events in <strong className="text-text-primary font-bold">{monthYearStr}</strong>
                </span>
                <div className="flex items-center gap-1.5">
                  <button onClick={prevMonth} className="px-2.5 py-1 border border-border rounded-lg bg-white hover:bg-gray-50 transition-colors cursor-pointer text-xs font-bold text-text-secondary">
                    ← Prev
                  </button>
                  <button onClick={goToday} className="px-2.5 py-1 bg-brand text-white rounded-lg font-bold cursor-pointer text-xs shadow-xs">
                    Today
                  </button>
                  <button onClick={nextMonth} className="px-2.5 py-1 border border-border rounded-lg bg-white hover:bg-gray-50 transition-colors cursor-pointer text-xs font-bold text-text-secondary">
                    Next →
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Contract Details Modal */}
      {selectedContractForDetails && (
        <ContractDetailsModal
          isOpen={Boolean(selectedContractForDetails)}
          onClose={() => setSelectedContractForDetails(null)}
          contract={selectedContractForDetails}
        />
      )}
    </div>
  );
}
