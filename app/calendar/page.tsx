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
} from "lucide-react";
import Link from "next/link";
import StatCard from "@/components/ui/StatCard";
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
  const [filter, setFilter] = useState<"all" | "pickup" | "return">("all");
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
          if (c.status === "Cancelled" || c.status === "Draft") return;
          
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
    const matchesType = filter === "all" || b.type === filter;
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
  const totalEvents = bookings.length;

  const sparklineData = {
    pickups: [4, 6, 3, 8, 5, 7, totalPickups],
    returns: [3, 5, 4, 6, 7, 5, totalReturns],
    today: [2, 1, 3, 2, 4, 1, todayBookings],
    total: [8, 12, 9, 14, 11, 13, totalEvents],
  };

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card border border-border rounded-2xl h-[130px] p-5">
              <div className="flex justify-between">
                <div className="w-11 h-11 bg-gray-200 rounded-xl mb-3"></div>
                <div className="w-16 h-8 bg-gray-100 rounded-md"></div>
              </div>
              <div className="w-24 h-4 bg-gray-200 rounded-md mb-2"></div>
              <div className="w-16 h-8 bg-gray-200 rounded-md"></div>
            </div>
          ))}
        </div>

        {/* Calendar Skeleton */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden h-[700px]">
          <div className="p-4 border-b border-border flex justify-between bg-gray-50/30">
            <div className="h-10 w-64 bg-gray-200 rounded-xl"></div>
            <div className="h-10 w-24 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ===== Summary Header (Matching Bookings Style) ===== */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Calendar</h1>
          <p className="text-sm text-text-secondary mt-1">Track pickups, returns, and driver schedules across the fleet.</p>
        </div>
      </div>

      {/* ===== Stat Cards Row (Same as Bookings) ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stagger-1">
          <StatCard 
            icon={ArrowUpRight} 
            label="Pickups This Month" 
            value={totalPickups} 
            change={5} 
            subtitle="vs last month"
            accentColor="#3B82F6" 
            sparkData={sparklineData.pickups}
          />
        </div>
        <div className="stagger-2">
          <StatCard 
            icon={ArrowDownLeft} 
            label="Returns This Month" 
            value={totalReturns} 
            change={3} 
            subtitle="vs last month"
            accentColor="#22C55E" 
            sparkData={sparklineData.returns}
          />
        </div>
        <div className="stagger-3">
          <StatCard 
            icon={Clock} 
            label="Today's Events" 
            value={todayBookings} 
            change={0} 
            subtitle="scheduled today"
            accentColor="#F59E0B" 
            sparkData={sparklineData.today}
          />
        </div>
        <div className="stagger-4">
          <StatCard 
            icon={CalendarIcon} 
            label="Total Events" 
            value={totalEvents} 
            change={8} 
            subtitle="this month"
            accentColor="#8B5CF6" 
            sparkData={sparklineData.total}
          />
        </div>
      </div>

      {/* ===== Main Content Area ===== */}
      <div className="grid grid-cols-12 gap-6 animate-fade-in-up stagger-2">
        {/* Calendar Grid Area */}
        <div className="col-span-12 xl:col-span-8">
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden card-hover">
            {/* Toolbar (Matching Bookings Toolbar Style) */}
            <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/30">
              <div className="flex items-center gap-3">
                {/* Month Navigation */}
                <div className="flex items-center gap-1.5">
                  <button onClick={prevMonth} className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-text-secondary hover:bg-white hover:text-text-primary transition-colors bg-white shadow-sm cursor-pointer">
                    <ChevronLeft size={16} />
                  </button>
                  <button onClick={goToday} className="px-3 py-2 text-sm font-medium border border-border rounded-xl text-text-secondary hover:bg-white hover:text-text-primary transition-colors bg-white shadow-sm cursor-pointer">
                    Today
                  </button>
                  <button onClick={nextMonth} className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-text-secondary hover:bg-white hover:text-text-primary transition-colors bg-white shadow-sm cursor-pointer">
                    <ChevronRight size={16} />
                  </button>
                </div>
                <h2 className="text-base font-bold text-text-primary flex items-center gap-2 whitespace-nowrap">
                  <CalendarIcon size={16} className="text-brand" /> {monthYearStr}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative max-w-[200px] w-full">
                  <input 
                    type="text" 
                    placeholder="Search client, car..." 
                    className="w-full text-sm border border-border rounded-xl pl-9 pr-3 py-2 bg-white text-text-secondary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all shadow-sm" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                </div>

                {/* Type Filter Dropdown */}
                <div className="relative">
                  <button 
                    onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                    className="text-sm border border-border rounded-xl px-3 py-2 text-text-secondary hover:bg-white flex items-center gap-2 font-medium transition-colors bg-white whitespace-nowrap shadow-sm cursor-pointer"
                  >
                    <Filter size={14} className="text-text-muted" /> 
                    {filter === "all" ? "Type" : filter === "pickup" ? "Pickups" : "Returns"}
                    <ChevronDown size={14} className="text-text-muted ml-1" />
                  </button>
                  {isFilterDropdownOpen && (
                    <div className="absolute top-full mt-2 right-0 w-36 bg-white border border-border rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                      {([
                        { key: "all", label: "All Types" },
                        { key: "pickup", label: "Pickups" },
                        { key: "return", label: "Returns" },
                      ] as const).map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => {
                            setFilter(key);
                            setIsFilterDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors cursor-pointer ${filter === key ? "text-brand font-semibold bg-brand/5" : "text-text-secondary"}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Legend Bar */}
            <div className="flex items-center gap-5 px-5 py-3 border-b border-border/50 bg-white">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm" /> 
                <span className="text-xs font-medium text-text-secondary">Pickup</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" /> 
                <span className="text-xs font-medium text-text-secondary">Return</span>
              </div>
              <div className="ml-auto text-xs text-text-muted font-medium">
                {filteredBookings.length} event{filteredBookings.length !== 1 ? "s" : ""} this month
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="overflow-hidden">
              {/* Day Headers */}
              <div className="grid grid-cols-7 border-b border-border bg-gray-50/80">
                {days.map((day) => (
                  <div key={day} className="py-3 text-[11px] font-semibold text-text-muted text-center uppercase tracking-wider border-l border-border/50 first:border-l-0">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 grid-rows-6 min-h-[560px] bg-white">
                {monthDates.map((date, idx) => {
                  const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                  const isToday = date.toDateString() === new Date().toDateString();
                  
                  const dayBookings = filteredBookings.filter(
                    (b) => b.date.toDateString() === date.toDateString()
                  );
                  
                  return (
                    <div 
                      key={idx} 
                      className={`p-1.5 md:p-2 border-b border-border/50 [&:not(:nth-child(7n+1))]:border-l transition-colors ${!isCurrentMonth ? 'bg-gray-50/60' : 'bg-white hover:bg-gray-50/30'} ${isToday ? 'bg-brand/5' : ''}`}
                    >
                      <div className={`text-[13px] font-bold mb-1.5 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-brand text-white shadow-sm' : isCurrentMonth ? 'text-text-primary' : 'text-text-muted'}`}>
                        {date.getDate()}
                      </div>
                      
                      <div className="space-y-1 max-h-[80px] overflow-y-auto scrollbar-thin pr-0.5">
                        {dayBookings.map((booking, bIdx) => {
                          const isSelected = selectedBooking?.id === booking?.id;
                          return (
                            <button
                              key={bIdx}
                              onClick={() => setSelectedBooking(booking as any)}
                              className={`w-full px-2 py-1.5 mb-1 last:mb-0 rounded text-left transition-colors border-l-4 ${
                                booking.type === 'pickup' 
                                  ? 'bg-blue-50 hover:bg-blue-100 border-blue-500 text-blue-900' 
                                  : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-500 text-emerald-900'
                              } ${isSelected ? "ring-1 ring-brand shadow-sm z-10 relative" : ""} cursor-pointer`}
                            >
                              <div className="flex items-center gap-1.5 overflow-hidden">
                                <span className="font-bold text-[10px] whitespace-nowrap">{booking.shortTime}</span>
                                <span className="font-medium text-[11px] truncate">{booking.client}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer (matching bookings pagination style) */}
            <div className="p-4 border-t border-border flex items-center justify-between text-sm text-text-secondary bg-gray-50/30">
              <p>Showing <span className="font-medium text-text-primary">{filteredBookings.length}</span> event{filteredBookings.length !== 1 ? "s" : ""} for <span className="font-medium text-text-primary">{monthYearStr}</span></p>
              <div className="flex items-center gap-1">
                <button onClick={prevMonth} className="px-3 py-1.5 border border-border rounded-lg bg-white hover:bg-gray-50 transition-colors cursor-pointer text-xs font-medium">← Prev</button>
                <button className="px-3 py-1.5 bg-brand text-white rounded-lg font-medium cursor-pointer text-xs">{currentDate.toLocaleDateString("en-US", { month: "short" })}</button>
                <button onClick={nextMonth} className="px-3 py-1.5 border border-border rounded-lg bg-white hover:bg-gray-50 transition-colors cursor-pointer text-xs font-medium">Next →</button>
              </div>
            </div>
          </div>
        </div>

        {/* ===== Schedule Detail Sidebar ===== */}
        <div className="col-span-12 xl:col-span-4 animate-fade-in-up stagger-3">
          <div className="bg-card rounded-2xl border border-border shadow-sm sticky top-6 overflow-hidden flex flex-col min-h-[500px] card-hover">
            {/* Header */}
            <div className="bg-white px-5 py-4 border-b border-border flex items-center justify-between sticky top-0 z-10">
              <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                <Clock size={18} className="text-brand" /> Schedule Detail
              </h2>
              {selectedBooking && (
                <button 
                  onClick={() => setSelectedBooking(null)} 
                  className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-colors text-text-muted hover:text-text-primary cursor-pointer border border-border/50 shadow-sm"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Content */}
            <div className="p-0 flex-1 bg-white overflow-y-auto">
              {selectedBooking ? (
                <div className="animate-fade-in-up pb-4">
                  
                  {/* Profile Header (Simple style) */}
                  <div className="p-6 border-b border-border bg-gray-50/30">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shadow-sm ${getAvatarColor(selectedBooking.client)}`}>
                        {getInitials(selectedBooking.client)}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h2 className="text-lg font-bold text-text-primary">{selectedBooking.client}</h2>
                          <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border ${selectedBooking.type === 'pickup' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                            {selectedBooking.type === 'pickup' ? 'Pickup' : 'Return'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1.5">
                          <span className="text-sm text-text-muted flex items-center gap-1.5">
                            <FileText size={14} /> {selectedBooking.displayId}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Info Table */}
                  <div className="divide-y divide-border">
                    <div className="flex items-center px-6 py-4 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-3 w-32 shrink-0">
                        <Clock size={16} className="text-text-muted" />
                        <span className="text-sm font-medium text-text-muted">Time</span>
                      </div>
                      <div className="text-sm font-semibold text-text-primary">
                        <span className="text-lg font-bold mr-2">{selectedBooking.time}</span>
                        <span className="text-text-muted font-normal">{selectedBooking.dateStr}</span>
                      </div>
                    </div>

                    <div className="flex items-center px-6 py-4 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-3 w-32 shrink-0">
                        <ExecutiveCarIcon size={16} className="text-text-muted" />
                        <span className="text-sm font-medium text-text-muted">Vehicle</span>
                      </div>
                      <span className="text-sm font-semibold text-text-primary">
                         {selectedBooking.car}
                      </span>
                    </div>

                    {selectedBooking.driver && selectedBooking.driver !== "None" && selectedBooking.driver.trim() !== "" && (
                      <div className="flex items-center px-6 py-4 hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center gap-3 w-32 shrink-0">
                          <User size={16} className="text-text-muted" />
                          <span className="text-sm font-medium text-text-muted">Driver</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${getAvatarColor(selectedBooking.driver)}`}>
                             {getInitials(selectedBooking.driver)}
                           </div>
                           <span className="text-sm font-semibold text-text-primary">{selectedBooking.driver}</span>
                        </div>
                      </div>
                    )}

                    {selectedBooking.location && selectedBooking.location.trim() !== "" && (
                      <div className="flex items-center px-6 py-4 hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center gap-3 w-32 shrink-0">
                          <MapPin size={16} className="text-text-muted" />
                          <span className="text-sm font-medium text-text-muted">Location</span>
                        </div>
                        <span className="text-sm font-semibold text-text-primary leading-tight">{selectedBooking.location}</span>
                      </div>
                    )}

                    {selectedBooking.notes && selectedBooking.notes.trim() !== "" && selectedBooking.notes !== "No notes provided." && (
                      <div className="flex items-start px-6 py-4 hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center gap-3 w-32 shrink-0 mt-0.5">
                          <FileText size={16} className="text-text-muted" />
                          <span className="text-sm font-medium text-text-muted">Notes</span>
                        </div>
                        <span className="text-sm text-amber-800 bg-amber-50 border border-amber-200/60 p-3 rounded-xl leading-relaxed">{selectedBooking.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-16 animate-fade-in-up">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-5 border border-border">
                    <CalendarIcon size={26} className="text-text-muted" />
                  </div>
                  <h3 className="text-lg font-bold text-text-primary mb-2">No Event Selected</h3>
                  <p className="text-sm text-text-secondary max-w-[240px] leading-relaxed">
                    Select a pickup or return from the calendar to view its details.
                  </p>
                </div>
              )}
            </div>
            
            {/* Action Footer */}
            {selectedBooking && (
              <div className="bg-white px-5 py-4 border-t border-border mt-auto z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
                <Link href={`/bookings`}>
                  <button className="w-full bg-brand hover:bg-brand-dark text-white text-sm font-bold py-3 rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2">
                    <FileText size={16} /> View Full Contract
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
