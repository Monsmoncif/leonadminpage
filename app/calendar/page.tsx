"use client";

import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  FileText,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Filter,
  ChevronDown,
  AlertCircle,
  Loader2,
  Eye,
  Truck,
  MoreHorizontal,
} from "lucide-react";
import Link from "next/link";
import { ExecutiveCarIcon } from "@/components/icons/ExecutiveCarIcon";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type SelectedBooking = {
  id: string;
  contractId: string;
  displayId: string;
  time: string;
  shortTime: string;
  date: Date;
  car: string;
  carImage: string | null;
  client: string;
  driver: string;
  type: "pickup" | "return";
  status: "Pending" | "Active" | "Completed";
  color: string;
  dateStr: string;
  notes: string;
  location: string;
} | null;

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

// Normalize date to start of day
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

// Parse time string to a displayable format
const parseTimeSlot = (timeStr: string) => {
  if (!timeStr) return "08:00 AM";
  return timeStr;
};

const formatShortTime = (timeStr: string) => {
  if (!timeStr) return "8a";
  const t = timeStr.toLowerCase().replace(' ', '');
  if (t.includes('am') || t.includes('pm')) {
    return t.replace(':00', '').replace('am', 'a').replace('pm', 'p');
  }
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    let h = parseInt(parts[0], 10);
    const m = parts[1];
    const ampm = h >= 12 ? 'p' : 'a';
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return m === '00' ? `${h}${ampm}` : `${h}:${m}${ampm}`;
  }
  return timeStr;
};

export default function CalendarPage() {
  const [filter, setFilter] = useState<"all" | "pickup" | "return" | "pending">("all");
  const [selectedBooking, setSelectedBooking] = useState<SelectedBooking>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  // Month calculation
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  
  const startDay = startOfMonth.getDay(); 
  const startDayIdx = startDay === 0 ? 6 : startDay - 1; // 0=Mon, 6=Sun

  const startDate = new Date(startOfMonth);
  startDate.setDate(startDate.getDate() - startDayIdx);

  const monthDates = Array.from({ length: 42 }).map((_, i) => {
    const d = new Date(startDate);
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
        const mapped: any[] = [];
        
        (data.contracts || []).forEach((c: any) => {
          if (!c.rawStartDate || !c.rawEndDate) return;
          if (c.status === "Cancelled") return;
          
          const contractStart = new Date(c.rawStartDate);
          const nowStartOfDay = new Date();
          nowStartOfDay.setHours(0, 0, 0, 0);

          let effectiveStatus: "Pending" | "Active" | "Completed" = "Pending";
          if (c.deliveryStatus === "Returned" || c.status === "Completed") {
            effectiveStatus = "Completed";
          } else if (c.deliveryStatus === "Delivered" && c.status === "Active" && contractStart <= nowStartOfDay) {
            effectiveStatus = "Active";
          } else {
            effectiveStatus = "Pending";
          }

          const pickupDate = startOfDay(new Date(c.rawStartDate));
          const returnDate = startOfDay(new Date(c.rawEndDate));
          
          // Map pickup
          if (pickupDate >= monthDates[0] && pickupDate <= monthEnd) {
             const pickupDriver = (c.deliveryDriver && c.deliveryDriver !== "None" && c.deliveryDriver.trim() !== "")
               ? c.deliveryDriver
               : (c.driver && c.driver !== "None" && c.driver.trim() !== "" ? c.driver : "");
             const pickupNotes = (c.notes && c.notes.trim() && c.notes !== "No notes provided.") 
               ? c.notes.trim() 
               : "";
             const pickupLocation = (c.pickupLocation && c.pickupLocation.trim()) 
               ? c.pickupLocation.trim() 
               : "";

             mapped.push({
               id: `${c.id}-pickup`,
               contractId: c._id,
               displayId: c.id,
               time: parseTimeSlot(c.checkoutTime), 
               shortTime: formatShortTime(c.checkoutTime),
               date: pickupDate,
               car: c.vehicle,
               carImage: c.vehicleImage || null,
               client: c.customer,
               driver: pickupDriver,
               type: "pickup",
               status: effectiveStatus,
               color: getAvatarColor(c.customer),
               dateStr: pickupDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
               notes: pickupNotes,
               location: pickupLocation
             });
          }
          
          // Map return
          if (returnDate >= monthDates[0] && returnDate <= monthEnd) {
             const returnDriver = (c.returnDriver && c.returnDriver !== "None" && c.returnDriver.trim() !== "")
               ? c.returnDriver
               : (c.returnDriverId?.name && c.returnDriverId.name !== "None" ? c.returnDriverId.name : "");
             const returnNotes = (c.returnNotes && c.returnNotes.trim() && c.returnNotes !== "No notes provided.") 
               ? c.returnNotes.trim() 
               : "";

             let returnLocation = "";
             if (c.dropoffLocation && c.dropoffLocation.trim() !== "" && c.dropoffLocation !== "Main Office") {
               const isAutoCloned = (c.dropoffLocation === c.pickupLocation) && !c.returnDriverId && !c.returnNotes && c.deliveryStatus !== "Returned";
               if (!isAutoCloned) {
                 returnLocation = c.dropoffLocation.trim();
               }
             }

             mapped.push({
               id: `${c.id}-return`,
               contractId: c._id,
               displayId: c.id,
               time: parseTimeSlot(c.checkinTime), 
               shortTime: formatShortTime(c.checkinTime),
               date: returnDate,
               car: c.vehicle,
               carImage: c.vehicleImage || null,
               client: c.customer,
               driver: returnDriver,
               type: "return",
               status: effectiveStatus,
               color: getAvatarColor(c.customer),
               dateStr: returnDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
               notes: returnNotes,
               location: returnLocation
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

  // Filtered bookings based on type filter AND search
  const filteredBookings = bookings.filter((b) => {
    const matchesType =
      filter === "all" ||
      (filter === "pending" ? b.status === "Pending" : b.type === filter);
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query || 
      (b.client && b.client.toLowerCase().includes(query)) ||
      (b.car && b.car.toLowerCase().includes(query)) ||
      (b.driver && b.driver.toLowerCase().includes(query)) ||
      (b.displayId && b.displayId.toLowerCase().includes(query));
    return matchesType && matchesSearch;
  });

  // Stats derived from bookings
  const totalPickups = bookings.filter(b => b.type === "pickup").length;
  const totalReturns = bookings.filter(b => b.type === "return").length;
  const todayBookings = bookings.filter(b => b.date.toDateString() === new Date().toDateString()).length;
  const pendingBookings = bookings.filter(b => b.status === "Pending").length;

  const prevMonth = () => {
    const next = new Date(currentDate);
    next.setMonth(currentDate.getMonth() - 1);
    setCurrentDate(next);
    setSelectedBooking(null);
  };

  const nextMonth = () => {
    const next = new Date(currentDate);
    next.setMonth(currentDate.getMonth() + 1);
    setCurrentDate(next);
    setSelectedBooking(null);
  };

  const goToday = () => {
    setCurrentDate(new Date());
    setSelectedBooking(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-gray-200 rounded-lg"></div>
            <div className="h-4 w-64 bg-gray-200 rounded-lg"></div>
          </div>
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl h-[88px] p-4">
              <div className="w-8 h-8 bg-gray-200 rounded-xl mb-2"></div>
              <div className="w-16 h-5 bg-gray-200 rounded-md"></div>
            </div>
          ))}
        </div>

        {/* Calendar Skeleton */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden h-[600px]">
          <div className="p-4 border-b border-gray-100 flex justify-between bg-gray-50/30">
            <div className="h-10 w-64 bg-gray-200 rounded-xl"></div>
            <div className="h-10 w-24 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  // Today's upcoming events for the sidebar
  const todayDate = new Date();
  const todayStr = todayDate.toDateString();
  const todaysEvents = filteredBookings.filter(b => b.date.toDateString() === todayStr);

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* ===== Page Header ===== */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Calendar</h1>
        <p className="text-xs text-text-muted mt-0.5">Track pickups, returns, and driver schedules across the fleet.</p>
      </div>

      {/* ===== Quick Stats Row (Rental Data Inspired) ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-100 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
              <ArrowUpRight size={18} className="text-blue-600" />
            </div>
            <span className="text-2xl font-black text-text-primary">{totalPickups}</span>
          </div>
          <span className="text-[11px] font-bold text-text-secondary block">Pickups This Month</span>
        </div>
        <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-100 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
              <ArrowDownLeft size={18} className="text-emerald-600" />
            </div>
            <span className="text-2xl font-black text-text-primary">{totalReturns}</span>
          </div>
          <span className="text-[11px] font-bold text-text-secondary block">Returns This Month</span>
        </div>
        <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-100 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
              <Clock size={18} className="text-amber-600" />
            </div>
            <span className="text-2xl font-black text-text-primary">{todayBookings}</span>
          </div>
          <span className="text-[11px] font-bold text-text-secondary block">Today&apos;s Events</span>
        </div>
        <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-100 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center">
              <AlertCircle size={18} className="text-orange-600" />
            </div>
            <span className="text-2xl font-black text-text-primary">{pendingBookings}</span>
          </div>
          <span className="text-[11px] font-bold text-text-secondary block">Pending Contracts</span>
        </div>
      </div>

      {/* ===== Main Content: Calendar + Sidebar ===== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* ===== Calendar Card (Left — 8 cols) ===== */}
        <div className="xl:col-span-8">
          <div className="bg-gray-50/60 rounded-2xl border border-gray-100 overflow-hidden">
            {/* Calendar Toolbar */}
            <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200/60 bg-white">
              <div className="flex items-center gap-3">
                {/* Month Navigation */}
                <div className="flex items-center gap-1.5">
                  <button onClick={prevMonth} className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-text-secondary hover:bg-gray-50 hover:text-text-primary transition-colors bg-white shadow-xs cursor-pointer">
                    <ChevronLeft size={16} />
                  </button>
                  <button onClick={goToday} className="px-3 py-2 text-xs font-bold border border-border rounded-xl text-text-secondary hover:bg-gray-50 hover:text-text-primary transition-colors bg-white shadow-xs cursor-pointer">
                    Today
                  </button>
                  <button onClick={nextMonth} className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-text-secondary hover:bg-gray-50 hover:text-text-primary transition-colors bg-white shadow-xs cursor-pointer">
                    <ChevronRight size={16} />
                  </button>
                </div>
                <h2 className="text-sm font-bold text-text-primary flex items-center gap-1.5 whitespace-nowrap">
                  <CalendarIcon size={15} className="text-brand" /> {monthYearStr}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative max-w-[180px] w-full">
                  <input 
                    type="text" 
                    placeholder="Search..." 
                    className="w-full text-xs border border-border rounded-xl pl-8 pr-3 py-2 bg-white text-text-secondary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all shadow-xs" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                </div>

                {/* Type Filter */}
                <div className="relative">
                  <button 
                    onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                    className="text-xs border border-border rounded-xl px-3 py-2 text-text-secondary hover:bg-gray-50 flex items-center gap-1.5 font-bold transition-colors bg-white whitespace-nowrap shadow-xs cursor-pointer"
                  >
                    <Filter size={13} className="text-text-muted" /> 
                    {filter === "all" ? "All" : filter === "pickup" ? "Pickups" : filter === "return" ? "Returns" : "Pending"}
                    <ChevronDown size={12} className="text-text-muted" />
                  </button>
                  {isFilterDropdownOpen && (
                    <div className="absolute top-full mt-2 right-0 w-36 bg-white border border-border rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                      {([
                        { key: "all", label: "All Types" },
                        { key: "pickup", label: "Pickups" },
                        { key: "return", label: "Returns" },
                        { key: "pending", label: "Pending" },
                      ] as const).map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => {
                            setFilter(key);
                            setIsFilterDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-xs hover:bg-gray-50 transition-colors cursor-pointer ${filter === key ? "text-brand font-bold bg-brand/5" : "text-text-secondary"}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 px-4 py-2.5 border-b border-gray-200/40 bg-gray-50/40 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> 
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Pickup</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> 
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Return</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> 
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Pending</span>
              </div>
              <div className="ml-auto text-[10px] text-text-muted font-bold">
                {filteredBookings.length} event{filteredBookings.length !== 1 ? "s" : ""}
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="overflow-hidden">
              {/* Day Headers */}
              <div className="grid grid-cols-7 bg-white border-b border-gray-200/60">
                {days.map((day) => (
                  <div key={day} className="py-2.5 text-[10px] font-black text-text-muted text-center uppercase tracking-widest border-l border-gray-100 first:border-l-0">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 grid-rows-6 min-h-[520px] bg-white">
                {monthDates.map((date, idx) => {
                  const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                  const isToday = date.toDateString() === new Date().toDateString();
                  
                  const dayBookings = filteredBookings.filter(
                    (b) => b.date.toDateString() === date.toDateString()
                  );
                  
                  return (
                    <div 
                      key={idx} 
                      className={`p-1 md:p-1.5 border-b border-gray-100/80 [&:not(:nth-child(7n+1))]:border-l transition-all duration-150 ${!isCurrentMonth ? 'bg-gray-50/40' : 'bg-white hover:bg-blue-50/20'} ${isToday ? 'bg-brand/[0.04] ring-1 ring-inset ring-brand/10' : ''}`}
                    >
                      {/* Date Number */}
                      <div className={`text-[11px] font-black mb-1 w-6 h-6 flex items-center justify-center rounded-lg ${isToday ? 'bg-brand text-white shadow-sm' : isCurrentMonth ? 'text-text-primary' : 'text-gray-300'}`}>
                        {date.getDate()}
                      </div>
                      
                      {/* Events */}
                      <div className="space-y-0.5 max-h-[72px] overflow-y-auto scrollbar-thin pr-0.5">
                        {dayBookings.slice(0, 3).map((booking, bIdx) => {
                          const isSelected = selectedBooking?.id === booking?.id;
                          const isPending = booking.status === "Pending";
                          return (
                            <button
                              key={bIdx}
                              onClick={() => setSelectedBooking(booking as any)}
                              className={`w-full px-1.5 py-1 rounded-lg text-left transition-all group border cursor-pointer ${
                                isPending
                                  ? 'bg-amber-50 hover:bg-amber-100/80 border-amber-200/60 text-amber-900'
                                  : booking.type === 'pickup' 
                                    ? 'bg-blue-50 hover:bg-blue-100/70 border-blue-200/60 text-blue-900' 
                                    : 'bg-emerald-50 hover:bg-emerald-100/70 border-emerald-200/60 text-emerald-900'
                              } ${isSelected ? "ring-2 ring-brand shadow-sm z-10 relative border-brand" : ""}`}
                            >
                              <div className="flex items-center gap-1 overflow-hidden">
                                <span className={`w-1 h-3 rounded-full shrink-0 ${
                                  isPending ? 'bg-amber-400' : booking.type === 'pickup' ? 'bg-blue-400' : 'bg-emerald-400'
                                }`} />
                                <span className="font-black text-[9px] whitespace-nowrap opacity-70">{booking.shortTime}</span>
                                <span className="font-bold text-[10px] truncate">{booking.client}</span>
                              </div>
                            </button>
                          );
                        })}
                        {dayBookings.length > 3 && (
                          <button 
                            onClick={() => {
                              if (dayBookings[3]) setSelectedBooking(dayBookings[3] as any);
                            }}
                            className="w-full text-center text-[9px] font-black text-brand hover:text-brand-dark cursor-pointer py-0.5"
                          >
                            +{dayBookings.length - 3} more
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Navigation */}
            <div className="p-3 border-t border-gray-200/60 flex items-center justify-between text-xs text-text-secondary bg-white">
              <p className="text-text-muted">
                <span className="font-bold text-text-primary">{filteredBookings.length}</span> event{filteredBookings.length !== 1 ? "s" : ""} · <span className="font-bold text-text-primary">{monthYearStr}</span>
              </p>
              <div className="flex items-center gap-1">
                <button onClick={prevMonth} className="px-2.5 py-1.5 border border-border rounded-lg bg-white hover:bg-gray-50 transition-colors cursor-pointer text-[11px] font-bold">← Prev</button>
                <button className="px-2.5 py-1.5 bg-brand text-white rounded-lg font-bold cursor-pointer text-[11px]">{currentDate.toLocaleDateString("en-US", { month: "short" })}</button>
                <button onClick={nextMonth} className="px-2.5 py-1.5 border border-border rounded-lg bg-white hover:bg-gray-50 transition-colors cursor-pointer text-[11px] font-bold">Next →</button>
              </div>
            </div>
          </div>
        </div>

        {/* ===== Detail Sidebar (Right — 4 cols) ===== */}
        <div className="xl:col-span-4">
          <div className="space-y-4 sticky top-6">
            
            {/* Selected Event Detail Card */}
            <div className="bg-gray-50/60 rounded-2xl border border-gray-100 overflow-hidden">
              {/* Sidebar Header */}
              <div className="bg-white px-5 py-3.5 border-b border-gray-200/60 flex items-center justify-between">
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <Clock size={15} className="text-brand" /> Event Detail
                </h3>
                {selectedBooking && (
                  <button 
                    onClick={() => setSelectedBooking(null)} 
                    className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-colors text-text-muted hover:text-text-primary cursor-pointer border border-gray-200/60"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Sidebar Content */}
              {selectedBooking ? (
                <div className="animate-fade-in-up">
                  {/* Profile Header Card */}
                  <div className="p-5 border-b border-gray-200/40 bg-white">
                    <div className="flex items-center gap-3.5">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-base font-black shadow-xs ${getAvatarColor(selectedBooking.client)}`}>
                        {getInitials(selectedBooking.client)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-text-primary truncate">{selectedBooking.client}</h4>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`text-[9px] uppercase tracking-wider font-black px-2 py-0.5 rounded-md ${
                            selectedBooking.type === 'pickup' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {selectedBooking.type === 'pickup' ? '↑ Pickup' : '↓ Return'}
                          </span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${
                            selectedBooking.status === 'Active'
                              ? 'bg-emerald-100 text-emerald-700'
                              : selectedBooking.status === 'Pending'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {selectedBooking.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Info Rows (Rental Data Style) */}
                  <div className="p-4 space-y-3">
                    {/* Time & Date */}
                    <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-xs">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Clock size={13} className="text-brand" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Time & Date</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-base font-black text-text-primary">{selectedBooking.time}</span>
                        <span className="text-xs font-bold text-text-secondary bg-gray-100 px-2.5 py-1 rounded-lg">{selectedBooking.dateStr}</span>
                      </div>
                    </div>

                    {/* Vehicle */}
                    <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-xs">
                      <div className="flex items-center gap-2 mb-1.5">
                        <ExecutiveCarIcon size={13} className="text-brand" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Vehicle</span>
                      </div>
                      <span className="text-sm font-bold text-text-primary">{selectedBooking.car}</span>
                    </div>

                    {/* Contract ID */}
                    <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-xs">
                      <div className="flex items-center gap-2 mb-1.5">
                        <FileText size={13} className="text-brand" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Contract</span>
                      </div>
                      <span className="text-sm font-bold text-text-primary font-mono">{selectedBooking.displayId}</span>
                    </div>

                    {/* Driver (if exists) */}
                    {selectedBooking.driver && selectedBooking.driver !== "None" && selectedBooking.driver.trim() !== "" && (
                      <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-xs">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Truck size={13} className="text-brand" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Driver</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-black ${getAvatarColor(selectedBooking.driver)}`}>
                            {getInitials(selectedBooking.driver)}
                          </div>
                          <span className="text-sm font-bold text-text-primary">{selectedBooking.driver}</span>
                        </div>
                      </div>
                    )}

                    {/* Location (if exists) */}
                    {selectedBooking.location && selectedBooking.location.trim() !== "" && (
                      <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-xs">
                        <div className="flex items-center gap-2 mb-1.5">
                          <MapPin size={13} className="text-emerald-600" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Location</span>
                        </div>
                        <span className="text-xs font-bold text-text-primary leading-relaxed">{selectedBooking.location}</span>
                      </div>
                    )}

                    {/* Notes (if exists) */}
                    {selectedBooking.notes && selectedBooking.notes.trim() !== "" && selectedBooking.notes !== "No notes provided." && (
                      <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200/60">
                        <div className="flex items-center gap-2 mb-1.5">
                          <AlertCircle size={13} className="text-amber-600" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Notes</span>
                        </div>
                        <p className="text-xs text-amber-800 leading-relaxed">{selectedBooking.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Action Footer */}
                  <div className="bg-white px-4 py-3 border-t border-gray-200/60">
                    <Link href={`/bookings`}>
                      <button className="w-full bg-brand hover:bg-brand-dark text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer flex items-center justify-center gap-2">
                        <Eye size={14} /> View Full Contract
                      </button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-12 px-6 animate-fade-in-up bg-white">
                  <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 border border-gray-100">
                    <CalendarIcon size={22} className="text-text-muted" />
                  </div>
                  <h4 className="text-sm font-bold text-text-primary mb-1">No Event Selected</h4>
                  <p className="text-[11px] text-text-muted max-w-[200px] leading-relaxed">
                    Click on a pickup or return event from the calendar to view its details here.
                  </p>
                </div>
              )}
            </div>

            {/* Today's Schedule Card */}
            <div className="bg-gray-50/60 rounded-2xl border border-gray-100 overflow-hidden">
              <div className="bg-white px-5 py-3.5 border-b border-gray-200/60 flex items-center justify-between">
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <CalendarIcon size={15} className="text-brand" /> Today&apos;s Schedule
                </h3>
                <span className="text-[10px] font-black text-brand bg-brand/10 px-2 py-0.5 rounded-md">
                  {todaysEvents.length} event{todaysEvents.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="bg-white">
                {todaysEvents.length > 0 ? (
                  <div className="divide-y divide-gray-100/80">
                    {todaysEvents.slice(0, 5).map((ev, i) => (
                      <button 
                        key={i}
                        onClick={() => setSelectedBooking(ev as any)}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50/60 transition-colors cursor-pointer text-left"
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${
                          ev.type === 'pickup' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {ev.type === 'pickup' ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-text-primary truncate">{ev.client}</span>
                            <span className="text-[10px] font-black text-text-muted whitespace-nowrap">{ev.shortTime}</span>
                          </div>
                          <span className="text-[10px] text-text-muted truncate block">{ev.car}</span>
                        </div>
                      </button>
                    ))}
                    {todaysEvents.length > 5 && (
                      <div className="px-4 py-2 text-center">
                        <span className="text-[10px] font-bold text-brand">+{todaysEvents.length - 5} more events today</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-xs text-text-muted">No events scheduled for today</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
