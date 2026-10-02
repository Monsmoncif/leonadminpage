"use client";

import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  FileText,
  Search,
  Plus,
  Check,
  Eye,
} from "lucide-react";
import Link from "next/link";
import ContractDetailsModal from "@/components/modals/ContractDetailsModal";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type BookingEvent = {
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
  isHandedOver: boolean;
  isReturned: boolean;
  isCompleted: boolean;
  isOverdue?: boolean;
  statusLabel: string;
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

const parseTimeSlot = (timeStr: string) => {
  if (!timeStr) return "08:00 AM";
  return timeStr;
};

const formatShortTime = (timeStr: string) => {
  if (!timeStr || !timeStr.trim()) return "";
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

const extractReturnTime = (c: any, isReturned: boolean) => {
  if (!isReturned) return ""; // No return time until car is actually back

  if (c.returnedAt) {
    try {
      const d = new Date(c.returnedAt);
      if (!isNaN(d.getTime())) {
        const hours = d.getHours();
        const minutes = d.getMinutes();
        const ampm = hours >= 12 ? 'p' : 'a';
        let h = hours % 12;
        if (h === 0) h = 12;
        const m = minutes < 10 ? `0${minutes}` : `${minutes}`;
        return minutes === 0 ? `${h}${ampm}` : `${h}:${m}${ampm}`;
      }
    } catch {}
  }

  if (c.checkinTime && c.checkinTime !== "Pending Return" && c.checkinTime !== "Pending Handover") {
    return formatShortTime(c.checkinTime);
  }

  return "";
};

export default function CalendarPage() {
  const [filter, setFilter] = useState<"all" | "pickup" | "return" | "pending">("all");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContractForDetails, setSelectedContractForDetails] = useState<any | null>(null);



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
        const mapped: any[] = [];

        (data.contracts || []).forEach((c: any) => {
          if (!c.rawStartDate || !c.rawEndDate) return;
          if (c.status === "Cancelled") return;

          const nowStartOfDay = new Date();
          nowStartOfDay.setHours(0, 0, 0, 0);

          // Handover (Pickup completed): true when car has been delivered/handed over to client
          const isHandedOver = c.deliveryStatus === "Delivered" || c.deliveryStatus === "Returned" || c.status === "Active" || c.status === "Completed";

          // Car Back (Return completed): true when car has been returned back to agency
          const isReturned = c.deliveryStatus === "Returned" || c.status === "Completed" || Boolean(c.returnedAt);

          let effectiveStatus: "Pending" | "Active" | "Completed" = "Pending";
          if (isReturned) {
            effectiveStatus = "Completed";
          } else if (isHandedOver) {
            effectiveStatus = "Active";
          } else {
            effectiveStatus = "Pending";
          }

          const pickupDate = startOfDay(new Date(c.rawStartDate));
          const returnDate = startOfDay(new Date(c.rawEndDate));

          if (pickupDate >= monthDates[0] && pickupDate <= monthEnd) {
            const pickupDriver = (c.deliveryDriver && c.deliveryDriver !== "None" && c.deliveryDriver.trim() !== "")
              ? c.deliveryDriver
              : (c.driver && c.driver !== "None" && c.driver.trim() !== "" ? c.driver : "");
            const pickupNotes = (c.notes && c.notes.trim() && c.notes !== "No notes provided.")
              ? c.notes.trim() : "";
            const pickupLocation = (c.pickupLocation && c.pickupLocation.trim())
              ? c.pickupLocation.trim() : "";

            const chipClass = isHandedOver
              ? "bg-blue-50/90 hover:bg-blue-100 text-blue-900 border-blue-200/80"
              : "bg-amber-50/90 hover:bg-amber-100 text-amber-900 border-amber-200/80";
            const dotClass = isHandedOver ? "bg-blue-500" : "bg-amber-500";
            const statusLabel = isHandedOver ? "Handed Over" : "To Hand Over (Pending)";

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
              isHandedOver,
              isReturned,
              isCompleted: isHandedOver,
              statusLabel,
              chipClass,
              dotClass,
              color: getAvatarColor(c.customer),
              dateStr: pickupDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
              notes: pickupNotes,
              location: pickupLocation,
              rawContract: c,
            });
          }

          if (returnDate >= monthDates[0] && returnDate <= monthEnd) {
            const returnDriver = (c.returnDriver && c.returnDriver !== "None" && c.returnDriver.trim() !== "")
              ? c.returnDriver
              : (c.returnDriverId?.name && c.returnDriverId.name !== "None" ? c.returnDriverId.name : "");
            const returnNotes = (c.returnNotes && c.returnNotes.trim() && c.returnNotes !== "No notes provided.")
              ? c.returnNotes.trim() : "";

            let returnLocation = "";
            if (c.dropoffLocation && c.dropoffLocation.trim() !== "" && c.dropoffLocation !== "Main Office") {
              const isAutoCloned = (c.dropoffLocation === c.pickupLocation) && !c.returnDriverId && !c.returnNotes && c.deliveryStatus !== "Returned";
              if (!isAutoCloned) {
                returnLocation = c.dropoffLocation.trim();
              }
            }

            const isOverdue = !isReturned && returnDate < nowStartOfDay;
            let chipClass = "bg-purple-50/90 hover:bg-purple-100 text-purple-900 border-purple-200/80";
            let dotClass = "bg-purple-500";
            let statusLabel = "Car Out (Expected Return)";

            if (isReturned) {
              chipClass = "bg-emerald-50/90 hover:bg-emerald-100 text-emerald-900 border-emerald-200/80";
              dotClass = "bg-emerald-500";
              statusLabel = "Car Back (Returned)";
            } else if (isOverdue) {
              chipClass = "bg-rose-50/90 hover:bg-rose-100 text-rose-900 border-rose-300";
              dotClass = "bg-rose-500";
              statusLabel = "Overdue Return (Late)";
            }

            mapped.push({
              id: `${c.id}-return`,
              contractId: c._id,
              displayId: c.id,
              time: isReturned ? (extractReturnTime(c, true) || "Returned") : "Pending Return",
              shortTime: extractReturnTime(c, isReturned),
              date: returnDate,
              car: c.vehicle,
              carImage: c.vehicleImage || null,
              client: c.customer,
              driver: returnDriver,
              type: "return",
              status: effectiveStatus,
              isHandedOver,
              isReturned,
              isCompleted: isReturned,
              isOverdue,
              statusLabel,
              chipClass,
              dotClass,
              color: getAvatarColor(c.customer),
              dateStr: returnDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
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

  const filteredBookings = bookings.filter((b) => {
    const matchesType =
      filter === "all" ||
      (filter === "pending" ? !b.isCompleted : b.type === filter);
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query ||
      (b.client && b.client.toLowerCase().includes(query)) ||
      (b.car && b.car.toLowerCase().includes(query)) ||
      (b.driver && b.driver.toLowerCase().includes(query)) ||
      (b.displayId && b.displayId.toLowerCase().includes(query));
    return matchesType && matchesSearch;
  });

  const prevMonth = () => {
    setCurrentDate(prev => { const d = new Date(prev); d.setMonth(d.getMonth() - 1); return d; });
  };
  const nextMonth = () => {
    setCurrentDate(prev => { const d = new Date(prev); d.setMonth(d.getMonth() + 1); return d; });
  };
  const goToday = () => {
    setCurrentDate(new Date());
  };

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

  return (
    <div className="space-y-5">
      {/* ===== Dashboard-Style Welcome Header ===== */}
      <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 relative overflow-hidden shadow-xs">
        {/* Decorative gradient blobs matching dashboard */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-brand/5 via-orange-500/3 to-transparent rounded-full -translate-y-32 translate-x-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-blue-500/5 to-transparent rounded-full translate-y-16 -translate-x-8 pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary mb-1">
              Fleet Calendar
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary">
              {monthYearStr} • Track pickups, returns, and fleet handover schedules
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/bookings/new"
              className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>New Contract</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ===== Full-Width Calendar (Dashboard Card Style) ===== */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        {/* Toolbar */}
        <div className="px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-border bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-border shadow-xs">
              <button 
                onClick={prevMonth} 
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <ChevronLeft size={15} />
              </button>
              <button 
                onClick={goToday} 
                className="px-2.5 py-1 text-xs font-bold rounded-lg text-text-secondary hover:text-text-primary hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Today
              </button>
              <button 
                onClick={nextMonth} 
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <ChevronRight size={15} />
              </button>
            </div>
            <h2 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
              <CalendarIcon size={15} className="text-brand" /> {monthYearStr}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Pills (Dashboard style tabs) */}
            <div className="flex items-center p-1 bg-white rounded-xl border border-border shadow-xs">
              {([
                { key: "all", label: "All" },
                { key: "pickup", label: "Pickups" },
                { key: "return", label: "Returns" },
                { key: "pending", label: "Pending" },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filter === key
                      ? "bg-brand text-white shadow-xs"
                      : "text-text-secondary hover:text-text-primary hover:bg-gray-100"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative max-w-[170px] w-full">
              <input
                type="text"
                placeholder="Search..."
                className="w-full text-xs border border-border rounded-xl pl-7 pr-2.5 py-1.5 bg-white text-text-secondary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all shadow-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
            </div>

            {/* Legend inline */}
            <div className="hidden xl:flex items-center gap-3 pl-1 text-[11px] font-semibold text-text-muted">
              <span className="flex items-center gap-1.5" title="Car waiting to be handed over to client">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> To Hand Over
              </span>
              <span className="flex items-center gap-1.5" title="Car handed over / delivered to client">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> Handed Over
              </span>
              <span className="flex items-center gap-1.5" title="Car currently on rental with client">
                <span className="w-2 h-2 rounded-full bg-purple-500" /> Car Out
              </span>
              <span className="flex items-center gap-1.5" title="Car returned back to fleet">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Car Back
              </span>
            </div>

            <span className="text-[11px] font-bold text-text-muted hidden md:inline">
              {filteredBookings.length} event{filteredBookings.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-gray-50/70 border-b border-border">
          {days.map((day) => (
            <div key={day} className="py-2.5 text-[10px] font-black text-text-muted text-center uppercase tracking-wider border-l border-border first:border-l-0">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid — Full Height */}
        <div className="grid grid-cols-7 grid-rows-6 bg-card" style={{ minHeight: 'calc(100vh - 270px)' }}>
          {monthDates.map((date, idx) => {
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();
            const isToday = date.toDateString() === new Date().toDateString();

            const dayBookings = filteredBookings.filter(
              (b) => b.date.toDateString() === date.toDateString()
            );

            return (
              <div
                key={idx}
                className={`p-1.5 border-b border-border [&:not(:nth-child(7n+1))]:border-l border-l-border transition-colors ${
                  !isCurrentMonth ? 'bg-gray-50/40' : 'bg-card'
                } ${isToday ? 'bg-brand/[0.03]' : ''}`}
              >
                {/* Date */}
                <div className={`text-xs font-black mb-1 w-6 h-6 flex items-center justify-center rounded-lg mx-auto md:mx-0 ${
                  isToday 
                    ? 'bg-brand text-white shadow-xs' 
                    : isCurrentMonth ? 'text-text-primary' : 'text-gray-300'
                }`}>
                  {date.getDate()}
                </div>

                {/* Events */}
                <div className="space-y-1 flex flex-col items-start overflow-hidden">
                  {dayBookings.slice(0, 4).map((booking, bIdx) => (
                    <div
                      key={bIdx}
                      className={`w-fit max-w-full inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-left transition-colors border shadow-2xs hover:shadow-xs group ${booking.chipClass}`}
                    >
                      <Link
                        href={booking.contractId ? `/bookings/${booking.contractId}/print` : "/bookings"}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`Contract #${booking.displayId} • ${booking.client} (${booking.car})${booking.shortTime ? ` • ${booking.shortTime}` : ""} • ${booking.statusLabel} • Click to view PDF`}
                        className="inline-flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${booking.dotClass}`} />
                        {booking.shortTime ? (
                          <span className="font-semibold text-[9px] opacity-75 whitespace-nowrap">
                            {booking.shortTime}
                          </span>
                        ) : null}
                        <span className="font-sans font-bold text-[11px] tracking-tight tabular-nums">
                          {booking.displayId?.startsWith("#") ? booking.displayId : `#${booking.displayId}`}
                        </span>
                        {booking.isCompleted && (
                          <Check size={10} className="shrink-0 text-current opacity-80" />
                        )}
                      </Link>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedContractForDetails(booking.rawContract);
                        }}
                        title="View Full Contract Details, Damage & Payment Photos (عرض تفاصيل العقد وتوثيق الأضرار والدفع)"
                        className="p-0.5 rounded hover:bg-black/10 active:scale-95 transition-all text-current opacity-70 hover:opacity-100 cursor-pointer flex items-center justify-center shrink-0 ml-0.5"
                      >
                        <Eye size={11} />
                      </button>
                    </div>
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

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-border flex items-center justify-between text-xs text-text-muted bg-gray-50/50">
          <span>
            <span className="font-bold text-text-primary">{filteredBookings.length}</span> events · <span className="font-bold text-text-primary">{monthYearStr}</span>
          </span>
          <div className="flex items-center gap-1.5">
            <button onClick={prevMonth} className="px-2.5 py-1 border border-border rounded-lg bg-white hover:bg-gray-50 transition-colors cursor-pointer text-xs font-bold text-text-secondary">
              ← Prev
            </button>
            <button onClick={goToday} className="px-2.5 py-1 bg-brand text-white rounded-lg font-bold cursor-pointer text-xs shadow-xs">
              {currentDate.toLocaleDateString("en-US", { month: "short" })}
            </button>
            <button onClick={nextMonth} className="px-2.5 py-1 border border-border rounded-lg bg-white hover:bg-gray-50 transition-colors cursor-pointer text-xs font-bold text-text-secondary">
              Next →
            </button>
          </div>
        </div>
      </div>

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
