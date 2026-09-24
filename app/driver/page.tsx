"use client";

import { 
  FileText, 
  CheckCircle, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  Loader2, 
  ArrowLeftRight, 
  Phone, 
  Navigation, 
  Search, 
  AlertCircle,
  LayoutGrid,
  List
} from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import { ExecutiveCarIcon } from "@/components/icons/ExecutiveCarIcon";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/providers/ToastProvider";
import { sparklineData } from "@/data/mock";
import ConfirmDeliveryModal from "@/components/modals/ConfirmDeliveryModal";

const getInitials = (name: string) => {
  if (!name) return "CL";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
};

const getAvatarColor = (name: string) => {
  if (!name) return "bg-blue-100 text-blue-700";
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

export const formatTimeDisplay = (rawTime?: string): string => {
  if (!rawTime || typeof rawTime !== "string") return "8:00 AM";
  const trimmed = rawTime.trim();
  if (!trimmed || trimmed.toLowerCase() === "pending handover") return "Pending Handover";

  // Case 1: Already has colon e.g. "8:00 AM", "08:00 AM", "14:30"
  const colonMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (colonMatch) {
    let h = parseInt(colonMatch[1], 10);
    const m = colonMatch[2];
    const ampm = colonMatch[3]?.toUpperCase();

    if (ampm) {
      if (ampm === "PM" && h < 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
    }
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${m} ${period}`;
  }

  // Case 2: Missing colon e.g. "800 AM", "0800 AM", "800", "0800", "1430"
  const noColonMatch = trimmed.match(/^(\d{1,2})(\d{2})\s*(AM|PM)?$/i);
  if (noColonMatch) {
    let h = parseInt(noColonMatch[1], 10);
    const m = noColonMatch[2];
    const ampm = noColonMatch[3]?.toUpperCase();

    if (ampm) {
      if (ampm === "PM" && h < 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
    }
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${m} ${period}`;
  }

  // Case 3: Hour only e.g. "8 AM", "8PM"
  const hourOnlyMatch = trimmed.match(/^(\d{1,2})\s*(AM|PM)$/i);
  if (hourOnlyMatch) {
    let h = parseInt(hourOnlyMatch[1], 10);
    const period = hourOnlyMatch[2].toUpperCase();
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:00 ${period}`;
  }

  return trimmed;
};

const matchDriverId = (field: any, targetId?: string): boolean => {
  if (!field || !targetId) return false;
  if (typeof field === "object") {
    const id = field._id?.toString() || field.id?.toString() || "";
    return id === targetId;
  }
  return String(field) === String(targetId);
};

export default function DriverDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [deliveryModalContract, setDeliveryModalContract] = useState<any | null>(null);
  const [isConfirmingDelivery, setIsConfirmingDelivery] = useState(false);
  const [activeTab, setActiveTab] = useState<"today" | "all">("today");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [hasManuallyChangedView, setHasManuallyChangedView] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Automatically select "cards" for phones and tablets (< 1024px), and "table" for laptops (>= 1024px)
  useEffect(() => {
    const handleScreenSize = () => {
      const isPhoneOrTablet = window.innerWidth < 1024;
      setViewMode(isPhoneOrTablet ? "cards" : "table");
    };

    handleScreenSize();

    const handleResize = () => {
      setHasManuallyChangedView((manual) => {
        if (!manual) {
          const isPhoneOrTablet = window.innerWidth < 1024;
          setViewMode(isPhoneOrTablet ? "cards" : "table");
        }
        return manual;
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    ended: 0,
    deliveriesToday: 0,
    returnsToday: 0
  });
  const [historyContracts, setHistoryContracts] = useState<any[]>([]);
  const [todayDeliveries, setTodayDeliveries] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    if (!session?.user?.id) return;

    try {
      const driverId = (session.user as any).id;
      const res = await fetch(`/api/contracts?driverId=${driverId}`, { cache: 'no-store' });
      const data = await res.json();

      const rawContracts: any[] = data.contracts || [];

      // Only include contracts where this driver is either the delivery driver or return driver
      const myContracts: any[] = rawContracts.filter((contract: any) => {
        const isDelivery = matchDriverId(contract.deliveryDriverId, driverId) || (!contract.deliveryDriverId && matchDriverId(contract.driverId, driverId));
        const isReturn = matchDriverId(contract.returnDriverId, driverId);
        return isDelivery || isReturn;
      });

      let activeCount = 0;
      let endedCount = 0;
      let pendingDeliveriesCount = 0;
      let assignedReturnsCount = 0;

      const activeTasksList: any[] = [];
      const historyList: any[] = [];

      myContracts.forEach((contract: any) => {
        const isDeliveryForMe = matchDriverId(contract.deliveryDriverId, driverId) || (!contract.deliveryDriverId && matchDriverId(contract.driverId, driverId));
        const isReturnForMe = matchDriverId(contract.returnDriverId, driverId);

        const isDelivered = contract.deliveryStatus === "Delivered";
        const isReturned = contract.status === "Completed" || contract.deliveryStatus === "Returned";
        const isPendingDelivery = !isDelivered && !isReturned;

        if (contract.status === "Active") activeCount++;
        if (isReturned) endedCount++;

        // 1. Pending Handover Delivery assigned to me (Active Task)
        if (isPendingDelivery && isDeliveryForMe) {
          pendingDeliveriesCount++;
          activeTasksList.push(contract);
        }

        // 2. Return Pickup assigned to me by admin (Active Task)
        if (isDelivered && !isReturned && isReturnForMe) {
          assignedReturnsCount++;
          activeTasksList.push(contract);
        }

        // 3. All History: Any contract where delivery is completed (car dropped off), or return is completed, or contract has ended
        const deliveryCompletedByMe = isDeliveryForMe && isDelivered;
        const returnCompletedByMe = isReturnForMe && isReturned;
        if (deliveryCompletedByMe || returnCompletedByMe || contract.status === "Completed" || contract.status === "Cancelled") {
          historyList.push(contract);
        }
      });

      setStats({
        total: myContracts.length,
        active: activeCount,
        ended: endedCount,
        deliveriesToday: pendingDeliveriesCount,
        returnsToday: assignedReturnsCount
      });

      setTodayDeliveries(activeTasksList);
      setHistoryContracts(historyList);
      setLoading(false);
    } catch (error) {
      console.error("Driver dashboard fetch error:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [session]);

  const handleConfirmDelivery = async (data: { 
    checkoutTime: string; 
    checkoutFuelLevel?: number;
    depositAmount: number; 
    rentalAmountCollected?: number;
    paymentMethod: string;
    paymentStatus: "Paid" | "Partial" | "Pending";
    notes?: string;
    inspectionPhotos?: string[];
    customerSignature?: string | null;
    clientId?: string;
    additionalDriverName?: string;
    additionalDriverLicense?: string;
    additionalDriverNationality?: string;
    additionalDriverPhone?: string;
    additionalDriverExpiry?: string;
    additionalDriverIssuedAt?: string;
  }) => {
    if (!deliveryModalContract) return;
    const contractId = deliveryModalContract._id || deliveryModalContract.id;
    const contractNumber = deliveryModalContract.id || deliveryModalContract._id?.substring(0,8);
    setIsConfirmingDelivery(true);
    try {
      let cleanHandoverNotes = deliveryModalContract.notes || "";
      const splitIdx = cleanHandoverNotes.indexOf("[Return Pickup Notes:");
      if (splitIdx !== -1) {
        cleanHandoverNotes = cleanHandoverNotes.substring(0, splitIdx).trim();
      }

      let paymentNote = "";
      if (data.paymentMethod) {
        paymentNote = `[Handover Payment: ${data.paymentMethod}, Collected: $${data.rentalAmountCollected ?? 0} (${data.paymentStatus})]`;
      }

      let finalNotes = cleanHandoverNotes;
      if (data.notes) {
        finalNotes = finalNotes ? `${finalNotes} | Delivery note: ${data.notes}` : data.notes;
      }
      if (paymentNote) {
        finalNotes = finalNotes ? `${finalNotes} ${paymentNote}` : paymentNote;
      }

      const payload: any = {
        deliveryStatus: "Delivered",
        depositAmount: data.depositAmount,
        paymentMethod: data.paymentMethod,
        paymentStatus: data.paymentStatus,
        notes: finalNotes,
      };

      if (data.clientId) {
        payload.clientId = data.clientId;
      }
      if (data.additionalDriverName !== undefined) {
        payload.additionalDriverName = data.additionalDriverName;
        payload.additionalDriverLicense = data.additionalDriverLicense || "";
        payload.additionalDriverNationality = data.additionalDriverNationality || "";
        payload.additionalDriverPhone = data.additionalDriverPhone || "";
        payload.additionalDriverExpiry = data.additionalDriverExpiry || "";
        payload.additionalDriverIssuedAt = data.additionalDriverIssuedAt || "";
      }

      if (data.checkoutTime) {
        payload.checkoutTime = data.checkoutTime;
      }
      if (data.checkoutFuelLevel !== undefined) {
        payload.checkoutFuelLevel = data.checkoutFuelLevel;
      }
      if (data.inspectionPhotos && data.inspectionPhotos.length > 0) {
        payload.inspectionPhotos = data.inspectionPhotos;
      }
      if (data.customerSignature) {
        payload.customerSignature = data.customerSignature;
      }

      const res = await fetch(`/api/contracts/${contractId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to update contract");
      }

      toast.success(`Vehicle successfully handed over to client for #${contractNumber}!`);
      setDeliveryModalContract(null);
      await fetchDashboardData();
    } catch (err: any) {
      toast.error(err.message || "Failed to mark as delivered");
    } finally {
      setIsConfirmingDelivery(false);
    }
  };

  const openGoogleMaps = (location: string) => {
    if (!location) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
    window.open(url, "_blank");
  };

  const getVehicleDisplay = (contract: any) => {
    const rawVehicle = contract.vehicle || "";
    const plateMatch = rawVehicle.match(/\(([^)]+)\)/);
    const plate = contract.vehiclePlate || contract.unitId?.plate || (plateMatch ? plateMatch[1] : "");
    const cleanName = rawVehicle.replace(/\s*\([^)]*\)/, "").trim() || "Vehicle";
    const color = contract.vehicleColor || contract.unitId?.color || "";
    const fuel = contract.vehicleFuel || contract.unitId?.fuelType || "";
    const year = contract.vehicleYear || contract.unitId?.year || "";

    return {
      name: cleanName,
      plate,
      color,
      fuel,
      year
    };
  };

  const getTaskTimeAndUrgency = (
    contract: any, 
    isPendingDelivery: boolean, 
    isReturnForMe: boolean = false, 
    isHistoryTab: boolean = false
  ) => {
    const isDelivered = contract.deliveryStatus === "Delivered";
    const isReturned = contract.status === "Completed" || contract.deliveryStatus === "Returned";

    // In History tab:
    // - If return is completed AND this driver was the return driver, show return schedule
    // - Otherwise (completed delivery handover), show handover delivery schedule
    // In Active Tasks tab:
    // - If isPendingDelivery is true -> Handover schedule
    // - If isReturnForMe and car is delivered -> Return pickup schedule
    let isReturnSchedule = false;
    if (isHistoryTab) {
      isReturnSchedule = isReturned && isReturnForMe;
    } else {
      isReturnSchedule = !isPendingDelivery && isReturnForMe;
    }

    const rawDateStr = isReturnSchedule ? contract.rawEndDate : contract.rawStartDate;
    const rawTime = isReturnSchedule 
      ? (contract.checkinTime || "8:00 AM") 
      : (contract.checkoutTime || "8:00 AM");
    const timeStr = formatTimeDisplay(rawTime);
    const label = isReturnSchedule ? "Return" : "Handover";

    if (!rawDateStr) {
      return {
        timeStr,
        dayLabel: "Today",
        urgency: "today" as const,
        badgeText: timeStr,
        badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
        label
      };
    }

    const taskDate = new Date(rawDateStr);
    const now = new Date();
    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const taskDateOnly = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());
    
    const diffDays = Math.round((taskDateOnly.getTime() - nowDateOnly.getTime()) / (1000 * 60 * 60 * 24));
    const isToday = diffDays === 0;
    const isTomorrow = diffDays === 1;
    const isYesterday = diffDays === -1;
    const isPast = diffDays < 0;

    const dayLabel = isToday 
      ? "Today" 
      : isYesterday 
      ? "Yesterday" 
      : isTomorrow 
      ? "Tomorrow" 
      : taskDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    // In History tab, or for any already completed action, display clean completed badge without overdue/countdown
    if (isHistoryTab || (isDelivered && !isReturnSchedule) || isReturned) {
      return {
        timeStr,
        dayLabel,
        urgency: "completed" as const,
        badgeText: dayLabel,
        badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200/80 font-medium",
        label
      };
    }

    let hours = 8, minutes = 0;
    const colonMatch = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (colonMatch) {
      hours = parseInt(colonMatch[1], 10);
      minutes = parseInt(colonMatch[2], 10);
      if (colonMatch[3]) {
        if (colonMatch[3].toUpperCase() === "PM" && hours < 12) hours += 12;
        if (colonMatch[3].toUpperCase() === "AM" && hours === 12) hours = 0;
      }
    }

    const taskDateTime = new Date(taskDate);
    taskDateTime.setHours(hours, minutes, 0, 0);

    let urgency: "overdue" | "urgent" | "soon" | "today" | "upcoming" = "upcoming";
    let badgeText = "";
    let badgeColor = "bg-gray-100 text-gray-700 border-gray-200";

    if (isPast) {
      urgency = "overdue";
      badgeText = "Overdue";
      badgeColor = "bg-red-50 text-red-700 border-red-200 font-bold";
    } else if (isToday) {
      const diffMinutes = Math.round((taskDateTime.getTime() - now.getTime()) / 60000);
      if (diffMinutes < -20) {
        urgency = "overdue";
        badgeText = "Overdue";
        badgeColor = "bg-red-50 text-red-700 border-red-200 font-bold";
      } else if (diffMinutes <= 60) {
        urgency = "urgent";
        badgeText = diffMinutes <= 0 ? "Due Now" : `Due in ${diffMinutes}m`;
        badgeColor = "bg-red-50 text-red-700 border-red-300 font-bold animate-pulse";
      } else if (diffMinutes <= 180) {
        urgency = "soon";
        badgeText = `In ${Math.round(diffMinutes / 60)}h`;
        badgeColor = "bg-amber-50 text-amber-800 border-amber-200 font-bold";
      } else {
        urgency = "today";
        badgeText = "Today";
        badgeColor = "bg-blue-50 text-blue-700 border-blue-200 font-semibold";
      }
    } else if (isTomorrow) {
      urgency = "upcoming";
      badgeText = "Tomorrow";
      badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
    } else {
      urgency = "upcoming";
      badgeText = dayLabel;
      badgeColor = "bg-gray-100 text-gray-700 border-gray-200";
    }

    return {
      timeStr,
      dayLabel,
      urgency,
      badgeText,
      badgeColor,
      label
    };
  };

  const baseList = activeTab === "today" ? todayDeliveries : historyContracts;
  const filteredContracts = baseList.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const customer = (c.customer || "").toLowerCase();
    const phone = (c.customerPhone || "").toLowerCase();
    const vehicle = (c.vehicle || "").toLowerCase();
    const plate = (c.vehiclePlate || "").toLowerCase();
    const id = (c.id || "").toLowerCase();
    const location = ((c.pickupLocation || "") + " " + (c.dropoffLocation || "")).toLowerCase();
    return customer.includes(q) || phone.includes(q) || vehicle.includes(q) || plate.includes(q) || id.includes(q) || location.includes(q);
  });

  const totalPages = Math.ceil(filteredContracts.length / itemsPerPage);
  const paginatedContracts = filteredContracts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Driver Operations Hub</h1>
          <p className="text-sm text-text-secondary mt-1">
            Welcome back, {session?.user?.name?.split(" ")[0] || "Driver"}. Manage your assigned delivery handovers and vehicle returns.
          </p>
        </div>
      </div>

      {/* Stats Cards - Inspired by admin drivers page */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up stagger-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card border border-border rounded-2xl h-[130px] p-5 animate-pulse">
              <div className="flex justify-between">
                <div className="w-11 h-11 bg-gray-200 rounded-xl mb-3"></div>
                <div className="w-16 h-8 bg-gray-100 rounded-md"></div>
              </div>
              <div className="w-24 h-4 bg-gray-200 rounded-md mb-2"></div>
              <div className="w-16 h-8 bg-gray-200 rounded-md"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up stagger-1">
          <div className="stagger-1">
            <StatCard 
              icon={ExecutiveCarIcon} 
              label="Pending Deliveries" 
              value={stats.deliveriesToday.toString()} 
              change={stats.deliveriesToday > 0 ? 100 : 0}
              subtitle="handover to client"
              accentColor="#F59E0B" 
              sparkData={sparklineData.performance}
            />
          </div>
          <div className="stagger-2">
            <StatCard 
              icon={ArrowLeftRight} 
              label="Assigned Returns" 
              value={stats.returnsToday.toString()} 
              change={stats.returnsToday > 0 ? 100 : 0}
              subtitle="pickups from client"
              accentColor="#8B5CF6" 
              sparkData={sparklineData.revenue}
            />
          </div>
          <div className="stagger-3">
            <StatCard 
              icon={CheckCircle} 
              label="Active In-Field" 
              value={stats.active.toString()} 
              change={5}
              subtitle="with client"
              accentColor="#22C55E" 
              sparkData={sparklineData.active}
            />
          </div>
          <div className="stagger-4">
            <StatCard 
              icon={FileText} 
              label="Total Jobs Handled" 
              value={stats.total.toString()} 
              change={12}
              subtitle="lifetime assignments"
              accentColor="#3B82F6" 
              sparkData={sparklineData.rentals}
            />
          </div>
        </div>
      )}

      {/* Main Content Section with Toolbar & View Switcher (Table or Cards) */}
      <div className="grid grid-cols-12 gap-6 animate-fade-in-up stagger-2">
        <div className="col-span-12 flex flex-col gap-6">
          {/* Toolbar */}
          <div className="relative z-20 bg-card rounded-2xl border border-border p-4 shadow-sm flex flex-col sm:flex-row justify-between gap-4 card-hover">
            <div className="relative max-w-sm w-full">
              <input
                type="text"
                placeholder="Search by client, plate, car, or contract..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-sm border border-border rounded-xl pl-10 pr-8 py-2.5 bg-white text-text-secondary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all shadow-sm"
              />
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-sm font-bold cursor-pointer"
                >
                  ×
                </button>
              )}
            </div>

            {/* Controls: Filter Tabs + View Mode Switcher */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Filter Tabs */}
              <div className="bg-gray-100/80 p-1 rounded-xl flex items-center gap-1 text-xs font-semibold shrink-0">
                <button
                  type="button"
                  onClick={() => { setActiveTab("today"); setCurrentPage(1); }}
                  className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                    activeTab === "today"
                      ? "bg-white text-text-primary shadow-xs font-bold"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  <span>Active Tasks</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
                    {todayDeliveries.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab("all"); setCurrentPage(1); }}
                  className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                    activeTab === "all"
                      ? "bg-white text-text-primary shadow-xs font-bold"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  <span>All History</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-gray-200 text-gray-700 font-bold">
                    {historyContracts.length}
                  </span>
                </button>
              </div>

              {/* View Switcher: Table or Cards */}
              <div className="bg-gray-100/80 p-1 rounded-xl flex items-center gap-1 text-xs font-semibold shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setHasManuallyChangedView(true);
                    setViewMode("table");
                  }}
                  className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewMode === "table"
                      ? "bg-white text-brand shadow-xs font-bold"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                  title="Table View"
                >
                  <List size={14} />
                  <span className="hidden sm:inline">Table</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHasManuallyChangedView(true);
                    setViewMode("cards");
                  }}
                  className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewMode === "cards"
                      ? "bg-white text-brand shadow-xs font-bold"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                  title="Cards View"
                >
                  <LayoutGrid size={14} />
                  <span className="hidden sm:inline">Cards</span>
                </button>
              </div>
            </div>
          </div>

          {/* Task Content: Empty State, Cards View, or Table View */}
          {loading ? (
            <div className="bg-card rounded-2xl border border-border p-6 animate-pulse">
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded-xl" />
                ))}
              </div>
            </div>
          ) : paginatedContracts.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-16 text-center">
              <div className="flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3 border border-dashed border-gray-300">
                  <ExecutiveCarIcon size={30} className="text-gray-300" />
                </div>
                <h2 className="text-base font-bold text-gray-900 mb-1">
                  {searchQuery ? "No matching tasks found" : (activeTab === "today" ? "No active tasks right now" : "No contract history found")}
                </h2>
                <p className="text-gray-500 text-xs max-w-sm mb-4">
                  {searchQuery ? "No tasks match your search criteria. Try a different search query." : "When an admin assigns a vehicle delivery or return to you, it will appear here."}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="px-3.5 py-1.5 text-xs font-semibold text-brand border border-brand/20 rounded-lg hover:bg-brand/5 transition-colors cursor-pointer"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            </div>
          ) : viewMode === "cards" ? (
            /* ================= CARDS VIEW ================= */
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedContracts.map((contract, idx) => {
                  const driverId = (session?.user as any)?.id;
                  const isDeliveryForMe = matchDriverId(contract.deliveryDriverId, driverId) || (!contract.deliveryDriverId && matchDriverId(contract.driverId, driverId));
                  const isReturnForMe = matchDriverId(contract.returnDriverId, driverId);

                  const isDelivered = contract.deliveryStatus === "Delivered";
                  const isReturned = contract.status === "Completed" || contract.deliveryStatus === "Returned";
                  const isPendingDelivery = !isDelivered && !isReturned;

                  const timeInfo = getTaskTimeAndUrgency(contract, isPendingDelivery, isReturnForMe, activeTab === "all");
                  const vehicleInfo = getVehicleDisplay(contract);
                  const isReturnTask = activeTab === "today" 
                    ? (!isPendingDelivery && isReturnForMe) 
                    : (isReturned && isReturnForMe);

                  const locationText = isReturnTask 
                    ? (contract.dropoffLocation || contract.pickupLocation || "Main Office")
                    : (contract.pickupLocation || "Main Office");

                  const locationLabel = isReturnTask ? "Return Location" : "Handover Location";

                  return (
                    <div 
                      key={contract._id || contract.id}
                      className="bg-white rounded-2xl border border-border shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between gap-4 group animate-fade-in-up card-hover"
                      style={{ animationDelay: `${idx * 0.04 + 0.05}s` }}
                    >
                      <div className="space-y-3.5">
                        {/* Top: Contract #, Task Type (no car icon), Time badge */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-md">
                              #{contract.id || contract._id?.substring(0,8).toUpperCase()}
                            </span>
                            
                            {isPendingDelivery ? (
                              <span className="text-[11px] font-bold text-amber-800 bg-amber-100/90 px-2.5 py-0.5 rounded-md">
                                Delivery Handover
                              </span>
                            ) : isReturnForMe && !isReturned && activeTab === "today" ? (
                              <span className="text-[11px] font-bold text-purple-800 bg-purple-100/90 px-2.5 py-0.5 rounded-md">
                                Assigned Return
                              </span>
                            ) : isReturned ? (
                              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-md">
                                Completed
                              </span>
                            ) : isDelivered ? (
                              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-md">
                                Delivered • With Client
                              </span>
                            ) : (
                              <span className="text-[11px] font-semibold text-gray-700 bg-gray-100 px-2.5 py-0.5 rounded-md">
                                Rental Active
                              </span>
                            )}
                          </div>

                          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs border ${timeInfo.badgeColor}`} title={`${timeInfo.label}: ${timeInfo.dayLabel} at ${timeInfo.timeStr}`}>
                            <Clock size={11} />
                            <span>{timeInfo.badgeText} • {timeInfo.timeStr}</span>
                          </div>
                        </div>

                        {/* Customer & Quick Contact */}
                        <div className="flex items-center justify-between gap-3 p-3 bg-gray-50/70 rounded-xl border border-border/60">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${getAvatarColor(
                                contract.customer
                              )}`}
                            >
                              {getInitials(contract.customer)}
                            </div>
                            <div className="min-w-0">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">Client</span>
                              <strong className="text-xs font-bold text-text-primary truncate block" title={contract.customer}>
                                {contract.customer || "Unknown Client"}
                              </strong>
                            </div>
                          </div>

                          {contract.customerPhone && (
                            <div className="flex items-center shrink-0">
                              <a
                                href={`tel:${contract.customerPhone.replace(/[^0-9+]/g, '')}`}
                                className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-95 text-text-primary flex items-center justify-center transition-all border border-border/80 shadow-2xs"
                                title={`Call ${contract.customerPhone}`}
                                aria-label={`Call ${contract.customerPhone}`}
                              >
                                <Phone size={14} className="text-text-primary" />
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Vehicle & Plate */}
                        <div className="flex items-center justify-between gap-2 p-3 bg-gray-50/70 rounded-xl border border-border/60">
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">Vehicle</span>
                            <span className="font-bold text-xs text-text-primary truncate block mt-0.5">
                              {vehicleInfo.name}
                              {vehicleInfo.year && <span className="text-text-muted font-normal ml-1">({vehicleInfo.year})</span>}
                            </span>
                          </div>
                          {vehicleInfo.plate && (
                            <div className="shrink-0 text-right">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">Plate</span>
                              <span className="font-bold text-xs text-text-primary block mt-0.5" title="Vehicle License Plate">
                                {vehicleInfo.plate}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Location & Maps Navigation */}
                        <div className="flex items-center justify-between gap-2 p-3 bg-gray-50/70 rounded-xl border border-border/60">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                              <MapPin size={11} className={isReturnTask ? "text-purple-600 shrink-0" : "text-emerald-600 shrink-0"} />
                              <span>{locationLabel}</span>
                            </div>
                            <span className="text-xs font-semibold text-text-primary truncate block mt-0.5" title={`${locationLabel}: ${locationText}`}>
                              {locationText}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => openGoogleMaps(locationText)}
                            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold border border-emerald-200 transition-colors shadow-2xs cursor-pointer"
                            title={`Open ${locationLabel} in Google Maps`}
                          >
                            <Navigation size={10} className="rotate-45" />
                            <span>Maps</span>
                          </button>
                        </div>
                      </div>

                      {/* Primary Action Button */}
                      <div className="pt-2 border-t border-border/60">
                        {isPendingDelivery && isDeliveryForMe ? (
                          <button
                            type="button"
                            onClick={() => router.push(`/driver/delivery?contractId=${contract._id || contract.id}`)}
                            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 transition-all shadow-xs hover:shadow-md cursor-pointer"
                            title="Confirm vehicle delivery to customer"
                          >
                            <CheckCircle2 size={15} />
                            <span>Confirm Handover</span>
                          </button>
                        ) : isDelivered && !isReturned && isReturnForMe && activeTab === "today" ? (
                          <button
                            type="button"
                            onClick={() => router.push(`/driver/return?contractId=${contract._id || contract.id}`)}
                            className="w-full py-2.5 px-4 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 transition-all shadow-xs hover:shadow-md cursor-pointer"
                            title="Admin assigned you to pick up this vehicle"
                          >
                            <ArrowLeftRight size={15} />
                            <span>Process Return</span>
                          </button>
                        ) : isDelivered && !isReturned ? (
                          <div className="w-full py-2 bg-emerald-50 text-emerald-800 text-center rounded-xl text-xs font-semibold border border-emerald-200/80 flex items-center justify-center gap-1.5">
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            <span>Delivered to Client</span>
                          </div>
                        ) : (
                          <div className="w-full py-2 bg-emerald-50 text-emerald-800 text-center rounded-xl text-xs font-semibold border border-emerald-200 flex items-center justify-center gap-1.5">
                            <CheckCircle2 size={13} />
                            <span>Completed</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Cards Pagination Footer */}
              {!loading && filteredContracts.length > 0 && (
                <div className="p-3.5 bg-white rounded-2xl border border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-secondary shadow-sm">
                  <p>
                    Showing{" "}
                    <span className="font-medium text-text-primary">
                      {filteredContracts.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-medium text-text-primary">
                      {Math.min(currentPage * itemsPerPage, filteredContracts.length)}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium text-text-primary">
                      {filteredContracts.length}
                    </span>{" "}
                    tasks
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-2.5 py-1 border border-border rounded-md bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Prev
                    </button>
                    <button className="px-2.5 py-1 bg-brand text-white rounded-md font-medium shadow-xs">
                      {currentPage}
                    </button>
                    <button 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages || totalPages === 0}
                      className="px-2.5 py-1 border border-border rounded-md bg-white hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ================= TABLE VIEW ================= */
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden card-hover">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-gray-50/50">
                      <th className="text-left py-3.5 px-4 text-text-muted font-semibold whitespace-nowrap">Task &amp; Schedule</th>
                      <th className="text-left py-3.5 px-4 text-text-muted font-semibold whitespace-nowrap">Customer</th>
                      <th className="text-left py-3.5 px-4 text-text-muted font-semibold whitespace-nowrap">Vehicle &amp; Plate</th>
                      <th className="text-left py-3.5 px-4 text-text-muted font-semibold whitespace-nowrap">Location</th>
                      <th className="text-right py-3.5 px-4 text-text-muted font-semibold whitespace-nowrap">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedContracts.map((contract, idx) => {
                      const driverId = (session?.user as any)?.id;
                      const isDeliveryForMe = matchDriverId(contract.deliveryDriverId, driverId) || (!contract.deliveryDriverId && matchDriverId(contract.driverId, driverId));
                      const isReturnForMe = matchDriverId(contract.returnDriverId, driverId);

                      const isDelivered = contract.deliveryStatus === "Delivered";
                      const isReturned = contract.status === "Completed" || contract.deliveryStatus === "Returned";
                      const isPendingDelivery = !isDelivered && !isReturned;

                      const timeInfo = getTaskTimeAndUrgency(contract, isPendingDelivery, isReturnForMe, activeTab === "all");
                      const vehicleInfo = getVehicleDisplay(contract);
                      const isReturnTask = activeTab === "today" 
                        ? (!isPendingDelivery && isReturnForMe) 
                        : (isReturned && isReturnForMe);

                      const locationText = isReturnTask 
                        ? (contract.dropoffLocation || contract.pickupLocation || "Main Office")
                        : (contract.pickupLocation || "Main Office");

                      const locationLabel = isReturnTask ? "Return Location" : "Handover Location";

                      return (
                        <tr
                          key={contract._id || contract.id}
                          className="border-b border-border/50 bg-white hover:bg-gray-50/50 transition-colors animate-fade-in-up group"
                          style={{ animationDelay: `${idx * 0.04 + 0.1}s` }}
                        >
                          {/* Task & Schedule */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-text-primary text-xs">
                                #{contract.id || contract._id?.substring(0,8).toUpperCase()}
                              </span>
                              {isPendingDelivery ? (
                                <span className="inline-flex items-center text-[11px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-md">
                                  Delivery Handover
                                </span>
                              ) : isReturnForMe && !isReturned && activeTab === "today" ? (
                                <span className="inline-flex items-center text-[11px] font-bold text-purple-800 bg-purple-100/90 px-2 py-0.5 rounded-md">
                                  Assigned Return
                                </span>
                              ) : isReturned ? (
                                <span className="inline-flex items-center text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md">
                                  Completed
                                </span>
                              ) : isDelivered ? (
                                <span className="inline-flex items-center text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md">
                                  Delivered • With Client
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-[11px] font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                                  Rental Active
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border ${timeInfo.badgeColor}`} title={`${timeInfo.label}: ${timeInfo.dayLabel} at ${timeInfo.timeStr}`}>
                                <Clock size={11} />
                                <span>{timeInfo.badgeText} • {timeInfo.timeStr}</span>
                              </div>
                            </div>
                          </td>

                          {/* Customer & Avatar (Admin Inspired) */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${getAvatarColor(
                                  contract.customer
                                )}`}
                              >
                                {getInitials(contract.customer)}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-semibold text-text-primary text-xs group-hover:text-brand transition-colors truncate max-w-[150px]" title={contract.customer}>
                                  {contract.customer || "Unknown Client"}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Vehicle & Plate */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-text-primary text-xs truncate max-w-[150px]" title={vehicleInfo.name}>
                                {vehicleInfo.name}
                                {vehicleInfo.year && <span className="text-text-muted font-normal ml-1">({vehicleInfo.year})</span>}
                              </span>
                              {vehicleInfo.plate && (
                                <span className="font-bold text-text-primary text-xs" title="Vehicle License Plate">
                                  • {vehicleInfo.plate}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Location & Navigation (Maps Only - Clean) */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 text-xs text-text-primary font-medium max-w-[240px]">
                              <MapPin size={13} className={isReturnTask ? "text-purple-600 shrink-0" : "text-emerald-600 shrink-0"} />
                              <span className="truncate font-semibold" title={`${locationLabel}: ${locationText}`}>{locationText}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-text-muted font-medium">{locationLabel}</span>
                              <button
                                type="button"
                                onClick={() => openGoogleMaps(locationText)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold border border-emerald-200 transition-colors shadow-2xs cursor-pointer"
                                title={`Open ${locationLabel} in Google Maps: ${locationText}`}
                              >
                                <Navigation size={10} className="rotate-45" />
                                <span>Maps</span>
                              </button>
                            </div>
                          </td>

                          {/* Action */}
                          <td className="py-3.5 px-4 text-right">
                            {isPendingDelivery && isDeliveryForMe ? (
                              <button
                                type="button"
                                onClick={() => router.push(`/driver/delivery?contractId=${contract._id || contract.id}`)}
                                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs hover:shadow-md cursor-pointer"
                                title="Confirm vehicle delivery to customer"
                              >
                                <CheckCircle2 size={13} />
                                <span>Confirm Handover</span>
                              </button>
                            ) : isDelivered && !isReturned && isReturnForMe && activeTab === "today" ? (
                              <button
                                type="button"
                                onClick={() => router.push(`/driver/return?contractId=${contract._id || contract.id}`)}
                                className="px-3.5 py-2 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs hover:shadow-md cursor-pointer"
                                title="Admin assigned you to pick up this vehicle"
                              >
                                <ArrowLeftRight size={13} />
                                <span>Process Return</span>
                              </button>
                            ) : isDelivered && !isReturned ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80">
                                <CheckCircle2 size={12} className="text-emerald-600" />
                                <span>Delivered to Client</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                                <CheckCircle2 size={12} />
                                <span>Completed</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Table Pagination Footer */}
            {!loading && filteredContracts.length > 0 && (
              <div className="p-3.5 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-secondary bg-white">
                <p>
                  Showing{" "}
                  <span className="font-medium text-text-primary">
                    {filteredContracts.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium text-text-primary">
                    {Math.min(currentPage * itemsPerPage, filteredContracts.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-text-primary">
                    {filteredContracts.length}
                  </span>{" "}
                  tasks
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1 border border-border rounded-md bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Prev
                  </button>
                  <button className="px-2.5 py-1 bg-brand text-white rounded-md font-medium shadow-xs">
                    {currentPage}
                  </button>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="px-2.5 py-1 border border-border rounded-md bg-white hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Handover Confirmation Modal */}
      <ConfirmDeliveryModal
        isOpen={!!deliveryModalContract}
        onClose={() => setDeliveryModalContract(null)}
        onConfirm={handleConfirmDelivery}
        contract={deliveryModalContract}
        isLoading={isConfirmingDelivery}
      />
    </div>
  );
}
