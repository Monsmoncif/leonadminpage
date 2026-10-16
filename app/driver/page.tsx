"use client";

import { 
  FileText, 
  CheckCircle, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  ArrowLeftRight, 
  Phone, 
  Navigation, 
  Search, 
  AlertCircle,
  Plus,
  LayoutGrid,
  List,
  MessageSquare,
  Eye,
  Car
} from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import { ExecutiveCarIcon } from "@/components/icons/ExecutiveCarIcon";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/providers/ToastProvider";
import { sparklineData } from "@/data/mock";
import ConfirmDeliveryModal from "@/components/modals/ConfirmDeliveryModal";
import TablePagination from "@/components/ui/TablePagination";

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
  const [activeTab, setActiveTab] = useState<"tasks" | "withClient" | "all">("tasks");
  const [assignmentFilter, setAssignmentFilter] = useState<"all" | "mine">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("driver_view_mode") as "cards" | "table" | null;
      if (saved === "cards" || saved === "table") {
        setViewMode(saved);
      } else if (typeof window !== "undefined" && window.innerWidth < 1024) {
        setViewMode("cards");
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSetViewMode = (mode: "cards" | "table") => {
    setViewMode(mode);
    try {
      localStorage.setItem("driver_view_mode", mode);
    } catch {
      // ignore
    }
  };
  
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    ended: 0,
    deliveriesToday: 0,
    returnsToday: 0
  });
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);
  const [withClientContracts, setWithClientContracts] = useState<any[]>([]);
  const [historyContracts, setHistoryContracts] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    if (!session?.user?.id) return;

    try {
      // Fetch all contracts so all drivers can see all orders
      const res = await fetch(`/api/contracts`, { cache: 'no-store' });
      const data = await res.json();

      const rawContracts: any[] = data.contracts || [];

      let activeCount = 0;
      let endedCount = 0;
      let pendingDeliveriesCount = 0;
      let assignedReturnsCount = 0;

      const tasksList: any[] = [];
      const withClientsList: any[] = [];
      const allHistoryList: any[] = [];

      rawContracts.forEach((contract: any) => {
        const isDelivered = contract.deliveryStatus === "Delivered";
        const isReturned = contract.status === "Completed" || contract.deliveryStatus === "Returned";
        const isCancelled = contract.status === "Cancelled";

        // Unconfirmed / Undispatched contracts must NOT appear in Driver Dashboard (unless assigned to or created for driver)
        const isDispatched = Boolean(
          contract.isDispatched || 
          contract.contractNumber || 
          contract.deliveryStatus === "Delivered" || 
          contract.status === "Active" ||
          (contract.deliveryDriverId && matchDriverId(contract.deliveryDriverId, session?.user?.id))
        );
        if (!isDispatched && !isDelivered) {
          return;
        }

        // Shop contracts are handled in-store by admin
        if (contract.contractType === "Shop" && !isDelivered && !contract.deliveryDriverId && !contract.driverId) {
          return;
        }

        const isPendingDelivery = !isDelivered && !isReturned && !isCancelled;
        const isReturnForMe = matchDriverId(contract.returnDriverId, session?.user?.id);

        if (contract.status === "Active") activeCount++;
        if (isReturned || contract.status === "Completed") endedCount++;

        // Add to all history list
        allHistoryList.push(contract);

        // 1. Pending Tasks (Actionable by Driver: Delivery Handover OR Assigned Return)
        if (isPendingDelivery) {
          pendingDeliveriesCount++;
          tasksList.push(contract);
        } else if (isReturnForMe && !isReturned && !isCancelled) {
          assignedReturnsCount++;
          tasksList.push(contract);
        } else if (isDelivered && !isReturned && !isCancelled) {
          // 2. Active Out With Client (Car currently on rental with client)
          withClientsList.push(contract);
        }
      });

      setStats({
        total: rawContracts.length,
        active: withClientsList.length,
        ended: endedCount,
        deliveriesToday: pendingDeliveriesCount,
        returnsToday: assignedReturnsCount
      });

      setPendingTasks(tasksList);
      setWithClientContracts(withClientsList);
      setHistoryContracts(allHistoryList);
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
    checkoutMileage?: number;
    depositAmount: number; 
    rentalAmountCollected?: number;
    paymentMethod: string;
    paymentStatus: "Paid" | "Partial" | "Pending";
    notes?: string;
    moneyPhotos?: string[];
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

    const nowStartOfDay = new Date();
    nowStartOfDay.setHours(0, 0, 0, 0);
    const contractStartDate = new Date(deliveryModalContract.rawStartDate || deliveryModalContract.startDate);
    contractStartDate.setHours(0, 0, 0, 0);

    if (contractStartDate > nowStartOfDay) {
      const formattedDate = contractStartDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
      toast.error(`Handover can only be confirmed on the day of start (${formattedDate}). (لا يمكن تأكيد تسليم السيارة قبل حلول تاريخ بدء العقد)`);
      return;
    }

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
        paymentNote = `[Handover Payment: ${data.paymentMethod}, Collected: AED ${data.rentalAmountCollected ?? 0} (${data.paymentStatus})]`;
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
        status: "Active",
        notifyClient: true,
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
      if (data.checkoutMileage !== undefined) {
        payload.checkoutMileage = data.checkoutMileage;
      }
      if (data.inspectionPhotos && data.inspectionPhotos.length > 0) {
        payload.inspectionPhotos = data.inspectionPhotos;
      }
      if (data.customerSignature) {
        payload.customerSignature = data.customerSignature;
      }
      if (data.moneyPhotos && data.moneyPhotos.length > 0) {
        payload.moneyPhotos = data.moneyPhotos;
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

  const getAssignedDriverName = (contract: any) => {
    if (contract.contractType === "Shop") return "Showroom Handover";
    if (typeof contract.deliveryDriverId === "object" && contract.deliveryDriverId?.name) {
      return contract.deliveryDriverId.name;
    }
    if (typeof contract.driverId === "object" && contract.driverId?.name) {
      return contract.driverId.name;
    }
    if (contract.deliveryDriver && contract.deliveryDriver !== "None") return contract.deliveryDriver;
    if (contract.driver && contract.driver !== "None") return contract.driver;
    return null;
  };

  const getTaskTimeAndUrgency = (
    contract: any, 
    isPendingDelivery: boolean, 
    isReturnForMe: boolean = false, 
    isHistoryTab: boolean = false,
    isWithClientTab: boolean = false
  ) => {
    const isDelivered = contract.deliveryStatus === "Delivered";
    const isReturned = contract.status === "Completed" || contract.deliveryStatus === "Returned";

    // In WithClient tab: show return due date
    // In History tab:
    // - If return is completed, show return schedule
    // - Otherwise (completed delivery handover), show handover delivery schedule
    // In Active Tasks tab:
    // - If isPendingDelivery is true -> Handover schedule
    // - If car is delivered -> Return pickup schedule
    let isReturnSchedule = false;
    if (isWithClientTab) {
      isReturnSchedule = true;
    } else if (isHistoryTab) {
      isReturnSchedule = isReturned && (isReturnForMe || !!contract.returnDriverId);
    } else {
      isReturnSchedule = !isPendingDelivery;
    }

    const rawDateStr = isReturnSchedule 
      ? (contract.rawEndDate || contract.endDate) 
      : (contract.rawStartDate || contract.startDate);
    const rawTime = isReturnSchedule 
      ? (contract.checkinTime || "8:00 PM") 
      : (contract.checkoutTime || "8:00 AM");
    const timeStr = formatTimeDisplay(rawTime);
    const label = isWithClientTab ? "Return Due" : isReturnSchedule ? "Return" : "Handover";

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

    // In WithClient tab: calm scheduled return due badge
    if (isWithClientTab) {
      return {
        timeStr,
        dayLabel,
        urgency: "upcoming" as const,
        badgeText: dayLabel,
        badgeColor: "bg-blue-50 text-blue-800 border-blue-200 font-semibold",
        label
      };
    }

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

  const baseList = 
    activeTab === "tasks" ? pendingTasks :
    activeTab === "withClient" ? withClientContracts :
    historyContracts;

  const myAssignmentsCount = baseList.filter((c) => {
    const driverId = (session?.user as any)?.id;
    const isDelivery = matchDriverId(c.deliveryDriverId, driverId) || (!c.deliveryDriverId && matchDriverId(c.driverId, driverId));
    const isReturn = matchDriverId(c.returnDriverId, driverId);
    return isDelivery || isReturn;
  }).length;

  const filteredContracts = baseList.filter((c) => {
    const driverId = (session?.user as any)?.id;
    const isDeliveryForMe = matchDriverId(c.deliveryDriverId, driverId) || (!c.deliveryDriverId && matchDriverId(c.driverId, driverId));
    const isReturnForMe = matchDriverId(c.returnDriverId, driverId);

    if (assignmentFilter === "mine" && !(isDeliveryForMe || isReturnForMe)) {
      return false;
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const customer = (c.customer || "").toLowerCase();
    const vehicle = (c.vehicle || "").toLowerCase();
    const plate = (c.vehiclePlate || "").toLowerCase();
    const id = (c.id || "").toLowerCase();
    const location = ((c.pickupLocation || "") + " " + (c.dropoffLocation || "")).toLowerCase();
    const assigned = (getAssignedDriverName(c) || "").toLowerCase();
    return customer.includes(q) || vehicle.includes(q) || plate.includes(q) || id.includes(q) || location.includes(q) || assigned.includes(q);
  });

  const totalPages = Math.ceil(filteredContracts.length / itemsPerPage);
  const paginatedContracts = filteredContracts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      {/* Summary Header (Matches Bookings Page Style) */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Driver Operations Hub</h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Welcome back, {session?.user?.name?.split(" ")[0] || "Driver"}. Manage your assigned delivery handovers and vehicle returns.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link
            href="/driver/contracts/new"
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer shrink-0"
          >
            <Plus size={18} />
            <span>New Contract</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards - 2 Columns on Mobile, 4 on Desktop */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 animate-fade-in-up stagger-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl sm:rounded-2xl h-[120px] sm:h-[130px] p-3.5 sm:p-5 animate-pulse">
              <div className="flex justify-between">
                <div className="w-8 h-8 sm:w-11 sm:h-11 bg-gray-200 rounded-xl mb-2 sm:mb-3"></div>
                <div className="w-12 sm:w-16 h-6 sm:h-8 bg-gray-100 rounded-md"></div>
              </div>
              <div className="w-16 sm:w-24 h-3 sm:h-4 bg-gray-200 rounded-md mb-2"></div>
              <div className="w-12 sm:w-16 h-5 sm:h-8 bg-gray-200 rounded-md"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 animate-fade-in-up stagger-1">
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
          {/* Toolbar (Responsive for Mobile & Desktop) */}
          <div className="relative z-20 bg-card rounded-xl sm:rounded-2xl border border-border p-3 sm:p-4 shadow-xs sm:shadow-sm flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 card-hover">
            <div className="relative max-w-sm w-full">
              <input
                type="text"
                placeholder="Search by client, plate, car, or contract..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-xs sm:text-sm border border-border rounded-xl pl-9 sm:pl-10 pr-8 py-2 sm:py-2.5 bg-white text-text-secondary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all shadow-xs"
              />
              <Search
                size={15}
                className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
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

            {/* Controls: Filter Tabs + Assignment Filter + View Mode Switcher */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {/* Filter Tabs */}
              <div className="bg-gray-100/80 p-0.5 sm:p-1 rounded-xl flex items-center gap-0.5 sm:gap-1 text-[11px] sm:text-xs font-semibold shrink-0">
                <button
                  type="button"
                  onClick={() => { setActiveTab("tasks"); setCurrentPage(1); }}
                  className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 ${
                    activeTab === "tasks"
                      ? "bg-white text-text-primary shadow-xs font-bold"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  <span>Active Tasks</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[9.5px] sm:text-[10px] bg-amber-100 text-amber-800 font-bold tabular-nums">
                    {pendingTasks.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab("withClient"); setCurrentPage(1); }}
                  className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 ${
                    activeTab === "withClient"
                      ? "bg-white text-text-primary shadow-xs font-bold"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  <span>With Clients</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[9.5px] sm:text-[10px] bg-blue-100 text-blue-800 font-bold tabular-nums">
                    {withClientContracts.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab("all"); setCurrentPage(1); }}
                  className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 ${
                    activeTab === "all"
                      ? "bg-white text-text-primary shadow-xs font-bold"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  <span>All History</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[9.5px] sm:text-[10px] bg-gray-200 text-gray-700 font-bold tabular-nums">
                    {historyContracts.length}
                  </span>
                </button>
              </div>

              {/* Assignment Filter */}
              <div className="bg-gray-100/80 p-0.5 sm:p-1 rounded-xl flex items-center gap-0.5 sm:gap-1 text-[11px] sm:text-xs font-semibold shrink-0">
                <button
                  type="button"
                  onClick={() => { setAssignmentFilter("all"); setCurrentPage(1); }}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 ${
                    assignmentFilter === "all"
                      ? "bg-white text-brand shadow-xs font-bold"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                  title="View all company orders"
                >
                  <span>All Orders</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setAssignmentFilter("mine"); setCurrentPage(1); }}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 ${
                    assignmentFilter === "mine"
                      ? "bg-white text-brand shadow-xs font-bold"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                  title="Filter to tasks assigned to you"
                >
                  <span>Assigned to Me</span>
                  {myAssignmentsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9.5px] sm:text-[10px] bg-brand/10 text-brand font-bold">
                      {myAssignmentsCount}
                    </span>
                  )}
                </button>
              </div>

              {/* View Mode Toggle: Cards vs Table */}
              <div className="bg-gray-100/80 p-0.5 sm:p-1 rounded-xl flex items-center gap-0.5 text-[11px] sm:text-xs font-semibold shrink-0 border border-gray-200/60 shadow-2xs">
                <button
                  type="button"
                  onClick={() => handleSetViewMode("cards")}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewMode === "cards"
                      ? "bg-white text-brand shadow-xs font-bold"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                  title="Cards View (عرض البطاقات)"
                >
                  <LayoutGrid size={13} />
                  <span>Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSetViewMode("table")}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewMode === "table"
                      ? "bg-white text-brand shadow-xs font-bold"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                  title="Table View (عرض الجدول)"
                >
                  <List size={13} />
                  <span>Table</span>
                </button>
              </div>

            </div>
          </div>


          {/* Task Content: Empty State, Cards View, or Table View */}
          {loading ? (
            viewMode === "cards" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-card rounded-2xl border border-border p-4 sm:p-5 animate-pulse space-y-3.5">
                    <div className="flex justify-between items-center">
                      <div className="h-5 w-24 bg-gray-100 rounded-md" />
                      <div className="h-5 w-20 bg-gray-100 rounded-md" />
                    </div>
                    <div className="h-14 bg-gray-50 rounded-xl" />
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-16 bg-gray-50 rounded-xl" />
                      <div className="h-16 bg-gray-50 rounded-xl" />
                    </div>
                    <div className="h-10 bg-gray-50 rounded-xl" />
                    <div className="h-11 bg-gray-100 rounded-xl" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-card rounded-2xl border border-border p-6 animate-pulse">
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-12 bg-gray-100 rounded-xl" />
                  ))}
                </div>
              </div>
            )
          ) : paginatedContracts.length === 0 ? (
            <div className="bg-card rounded-xl sm:rounded-2xl border border-border p-8 sm:p-16 text-center">
              <div className="flex flex-col items-center justify-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3 border border-dashed border-gray-300">
                  <ExecutiveCarIcon size={26} className="text-gray-300" />
                </div>
                <h2 className="text-sm sm:text-base font-bold text-gray-900 mb-1">
                  {searchQuery 
                    ? "No matching tasks found" 
                    : activeTab === "tasks" 
                    ? "No pending tasks right now" 
                    : activeTab === "withClient"
                    ? "No vehicles currently with clients"
                    : "No contract history found"}
                </h2>
                <p className="text-gray-500 text-xs max-w-sm mb-4">
                  {searchQuery 
                    ? "No tasks match your search criteria. Try a different search query." 
                    : activeTab === "tasks" 
                    ? "When a vehicle delivery or return is scheduled, it will appear here." 
                    : activeTab === "withClient"
                    ? "Vehicles delivered to clients will appear here until returned."
                    : "When an admin assigns a vehicle delivery or return to you, it will appear here."}
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
            /* ================= CARDS VIEW (Touch-friendly & Optimized for Phone Devices) ================= */
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                {paginatedContracts.map((contract, idx) => {
                  const driverId = (session?.user as any)?.id;
                  const isDeliveryForMe = matchDriverId(contract.deliveryDriverId, driverId) || (!contract.deliveryDriverId && matchDriverId(contract.driverId, driverId));
                  const isReturnForMe = matchDriverId(contract.returnDriverId, driverId);

                  const isDelivered = contract.deliveryStatus === "Delivered";
                  const isReturned = contract.status === "Completed" || contract.deliveryStatus === "Returned";
                  const isPendingDelivery = !isDelivered && !isReturned;

                  const timeInfo = getTaskTimeAndUrgency(contract, isPendingDelivery, isReturnForMe, activeTab === "all", activeTab === "withClient");
                  const vehicleInfo = getVehicleDisplay(contract);
                  const assignedDriverName = getAssignedDriverName(contract);
                  const isReturnTask = activeTab === "tasks" 
                    ? (!isPendingDelivery && isReturnForMe) 
                    : (isReturned && isReturnForMe);

                  const locationText = isReturnTask 
                    ? (contract.dropoffLocation || contract.pickupLocation || "Main Office")
                    : (contract.pickupLocation || "Main Office");

                  const locationLabel = isReturnTask ? "Return" : "Handover";

                  const statusBadge = isPendingDelivery
                    ? { text: "Handover", cls: "bg-amber-50 text-amber-700 border-amber-300" }
                    : isReturnForMe && !isReturned && activeTab === "tasks"
                    ? { text: "Assigned Return", cls: "bg-purple-50 text-purple-700 border-purple-300" }
                    : isReturned
                    ? { text: "Completed", cls: "bg-emerald-50 text-emerald-700 border-emerald-300" }
                    : isDelivered
                    ? { text: "With Client", cls: "bg-blue-50 text-blue-700 border-blue-300" }
                    : { text: "Active", cls: "bg-gray-50 text-gray-700 border-gray-300" };

                  return (
                    <div
                      key={contract._id || contract.id}
                      onClick={() => router.push(`/driver/contracts/${contract._id || contract.id}`)}
                      className="bg-card rounded-2xl border border-border/80 shadow-xs hover:shadow-md hover:border-brand/40 transition-all duration-200 p-4 sm:p-5 flex flex-col justify-between gap-3.5 animate-fade-in-up relative overflow-hidden group cursor-pointer"
                      style={{ animationDelay: `${idx * 0.04 + 0.05}s` }}
                    >
                      {/* Top Status Accent Line */}
                      <div className={`absolute top-0 left-0 right-0 h-1.5 transition-colors ${
                        isPendingDelivery ? "bg-gradient-to-r from-amber-400 to-amber-500" :
                        isReturnTask ? "bg-gradient-to-r from-purple-400 to-purple-600" :
                        isDelivered && !isReturned ? "bg-gradient-to-r from-blue-400 to-blue-600" :
                        isReturned ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : "bg-gray-200"
                      }`} />

                      {/* Header: Contract # & Status Badge */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-text-primary tabular-nums tracking-tight">
                            #{contract.contractNumber || contract.id || contract._id?.substring(0,8).toUpperCase()}
                          </span>
                          {isPendingDelivery && isDeliveryForMe && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/90 px-2 py-0.5 rounded-full inline-flex items-center gap-1 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              For You
                            </span>
                          )}
                          {isReturnForMe && !isReturned && activeTab === "tasks" && (
                            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200/90 px-2 py-0.5 rounded-full inline-flex items-center gap-1 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                              Assigned Return
                            </span>
                          )}
                        </div>

                        <div>
                          <span className={`inline-flex items-center text-[10.5px] font-semibold px-2.5 py-1 rounded-md border ${statusBadge.cls} shadow-2xs`}>
                            {statusBadge.text}
                          </span>
                        </div>
                      </div>

                      {/* Customer Row (no phone number shown to drivers) */}
                      <div className="flex items-center gap-3 bg-gray-50/75 p-3 rounded-xl border border-gray-100 group-hover:border-gray-200/80 transition-colors">
                        <div
                          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ring-2 ring-white ${getAvatarColor(
                            contract.customer
                          )}`}
                        >
                          {getInitials(contract.customer)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-text-primary text-xs sm:text-sm truncate group-hover:text-brand transition-colors" title={contract.customer}>
                            {contract.customer || "Unknown Client"}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-text-muted mt-0.5 truncate">
                            {isPendingDelivery && isDeliveryForMe ? (
                              <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Handover assigned to you
                              </span>
                            ) : isReturnForMe && !isReturned && activeTab === "tasks" ? (
                              <span className="text-purple-700 font-medium inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                Return assigned to you
                              </span>
                            ) : assignedDriverName ? (
                              <span className="truncate">Driver: {assignedDriverName}</span>
                            ) : (
                              <span>Customer</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Vehicle & Schedule Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {/* Vehicle Box */}
                        <div className="bg-gray-50/70 p-2.5 sm:p-3 rounded-xl border border-gray-100 flex flex-col justify-between min-h-[64px]">
                          <div className="flex items-center gap-1 text-[9.5px] text-text-muted font-bold uppercase tracking-wider">
                            <Car size={11} className="text-text-muted shrink-0" />
                            <span>Vehicle</span>
                          </div>
                          <p className="font-bold text-text-primary text-xs truncate mt-1" title={vehicleInfo.name}>
                            {vehicleInfo.name}
                            {vehicleInfo.year && <span className="text-text-muted font-normal ml-1">({vehicleInfo.year})</span>}
                          </p>
                          {vehicleInfo.plate ? (
                            <div className="mt-1">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-white border border-gray-200 text-[10px] font-mono font-bold text-text-primary tracking-wider tabular-nums shadow-2xs">
                                {vehicleInfo.plate}
                              </span>
                            </div>
                          ) : (
                            <p className="text-[10px] text-text-muted mt-1">No plate</p>
                          )}
                        </div>

                        {/* Schedule Box */}
                        <div className="bg-gray-50/70 p-2.5 sm:p-3 rounded-xl border border-gray-100 flex flex-col justify-between min-h-[64px] overflow-hidden">
                          <div className="flex items-center gap-1 text-[9.5px] text-text-muted font-bold uppercase tracking-wider">
                            <Clock size={11} className="text-text-muted shrink-0" />
                            <span>{timeInfo.label || "Schedule"}</span>
                          </div>
                          <p className="font-semibold text-text-primary text-xs tabular-nums truncate mt-1">
                            {timeInfo.dayLabel} · {timeInfo.timeStr}
                          </p>
                          <div className="mt-1">
                            <span className={`inline-flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded border w-fit leading-none ${timeInfo.badgeColor}`}>
                              {timeInfo.badgeText || timeInfo.dayLabel}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Location with Google Maps button */}
                      <div className="flex items-center justify-between gap-2 py-2 px-3 bg-gray-50/50 rounded-xl border border-gray-100 text-xs">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                            isReturnTask ? "bg-purple-50 text-purple-600 border border-purple-200/60" : "bg-emerald-50 text-emerald-600 border border-emerald-200/60"
                          }`}>
                            <MapPin size={12} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[9.5px] font-bold text-text-muted uppercase tracking-wider block leading-tight">
                              {locationLabel} Location
                            </span>
                            <span className="text-xs font-medium text-text-primary truncate block" title={`${locationLabel}: ${locationText}`}>
                              {locationText}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openGoogleMaps(locationText);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-emerald-50 text-text-secondary hover:text-emerald-700 text-xs font-semibold border border-border hover:border-emerald-200 transition-all shadow-2xs hover:shadow-xs active:scale-95 shrink-0 cursor-pointer"
                          title={`Open in Google Maps: ${locationText}`}
                        >
                          <Navigation size={11} className="rotate-45" />
                          <span>Maps</span>
                        </button>
                      </div>

                      {/* Main Action Button & View Details */}
                      <div className="pt-0.5">
                        {isPendingDelivery && isDeliveryForMe ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/driver/delivery?contractId=${contract._id || contract.id}`);
                              }}
                              className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 transition-all shadow-xs hover:shadow-sm cursor-pointer"
                            >
                              <CheckCircle2 size={15} />
                              <span>Confirm Handover (تأكيد التسليم)</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/driver/contracts/${contract._id || contract.id}`);
                              }}
                              className="p-2.5 text-text-muted hover:text-brand hover:bg-brand/10 rounded-xl border border-border/80 hover:border-brand/30 transition-colors cursor-pointer inline-flex items-center justify-center shrink-0 shadow-2xs"
                              title="View Contract Details"
                            >
                              <Eye size={16} />
                            </button>
                          </div>
                        ) : isPendingDelivery ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 py-2.5 px-3 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-800 text-center text-xs font-semibold flex items-center justify-center gap-1.5 truncate" title={assignedDriverName ? `Assigned to: ${assignedDriverName}` : "Pending Handover"}>
                              <Clock size={13} className="text-amber-600 shrink-0" />
                              <span className="truncate">{assignedDriverName ? `Assigned: ${assignedDriverName}` : "Pending Handover"}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/driver/contracts/${contract._id || contract.id}`);
                              }}
                              className="p-2.5 text-text-muted hover:text-brand hover:bg-brand/10 rounded-xl border border-border/80 hover:border-brand/30 transition-colors cursor-pointer inline-flex items-center justify-center shrink-0 shadow-2xs"
                              title="View Contract Details"
                            >
                              <Eye size={16} />
                            </button>
                          </div>
                        ) : isDelivered && !isReturned && isReturnForMe && activeTab === "tasks" ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/driver/return?contractId=${contract._id || contract.id}`);
                              }}
                              className="flex-1 py-2.5 px-3 bg-brand hover:bg-brand-dark active:scale-[0.98] text-white rounded-xl text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 transition-all shadow-xs hover:shadow-sm cursor-pointer"
                            >
                              <ArrowLeftRight size={15} />
                              <span>Process Return (استلام السيارة)</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/driver/contracts/${contract._id || contract.id}`);
                              }}
                              className="p-2.5 text-text-muted hover:text-brand hover:bg-brand/10 rounded-xl border border-border/80 hover:border-brand/30 transition-colors cursor-pointer inline-flex items-center justify-center shrink-0 shadow-2xs"
                              title="View Contract Details"
                            >
                              <Eye size={16} />
                            </button>
                          </div>
                        ) : isDelivered && !isReturned ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 py-2.5 px-3 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-800 text-center text-xs font-semibold flex items-center justify-center gap-1.5">
                              <CheckCircle2 size={13} className="text-blue-600 shrink-0" />
                              <span>On Rent • With Client (مع العميل)</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/driver/contracts/${contract._id || contract.id}`);
                              }}
                              className="p-2.5 text-text-muted hover:text-brand hover:bg-brand/10 rounded-xl border border-border/80 hover:border-brand/30 transition-colors cursor-pointer inline-flex items-center justify-center shrink-0 shadow-2xs"
                              title="View Contract Details"
                            >
                              <Eye size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-800 text-center text-xs font-semibold flex items-center justify-center gap-1.5">
                              <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                              <span>Completed</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/driver/contracts/${contract._id || contract.id}`);
                              }}
                              className="p-2.5 text-text-muted hover:text-brand hover:bg-brand/10 rounded-xl border border-border/80 hover:border-brand/30 transition-colors cursor-pointer inline-flex items-center justify-center shrink-0 shadow-2xs"
                              title="View Contract Details"
                            >
                              <Eye size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Footer */}
              {!loading && filteredContracts.length > 0 && (
                <TablePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredContracts.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={(page) => {
                    setCurrentPage(page);
                    window.scrollTo({ top: 350, behavior: "smooth" });
                  }}
                  onItemsPerPageChange={setItemsPerPage}
                  itemLabel="tasks"
                />
              )}
            </div>
          ) : (
            /* ================= TABLE VIEW (Matches Admin Bookings & Clients Tables Style) ================= */
            <div className="bg-card rounded-xl sm:rounded-2xl border border-border shadow-xs sm:shadow-sm overflow-hidden card-hover">
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] sm:text-xs md:text-sm">
                  <thead>
                    <tr className="border-b border-border bg-gray-50/75 text-[9.5px] sm:text-[11px] md:text-xs text-text-muted font-semibold uppercase tracking-wider">
                      <th className="text-left py-2 sm:py-2.5 px-2.5 sm:px-4 whitespace-nowrap">Contract</th>
                      <th className="text-left py-2 sm:py-2.5 px-2.5 sm:px-4 min-w-[150px] sm:min-w-[220px]">Customer / Driver</th>
                      <th className="text-left py-2 sm:py-2.5 px-2.5 sm:px-4">Vehicle</th>
                      <th className="text-left py-2 sm:py-2.5 px-2.5 sm:px-4 whitespace-nowrap">Schedule</th>
                      <th className="text-left py-2 sm:py-2.5 px-2.5 sm:px-4">Location</th>
                      <th className="text-left py-2 sm:py-2.5 px-2 whitespace-nowrap w-[96px] sm:w-[120px]">Status</th>
                      <th className="text-right py-2 sm:py-2.5 px-2.5 sm:px-4 whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {paginatedContracts.map((contract, idx) => {
                      const driverId = (session?.user as any)?.id;
                      const isDeliveryForMe = matchDriverId(contract.deliveryDriverId, driverId) || (!contract.deliveryDriverId && matchDriverId(contract.driverId, driverId));
                      const isReturnForMe = matchDriverId(contract.returnDriverId, driverId);

                      const isDelivered = contract.deliveryStatus === "Delivered";
                      const isReturned = contract.status === "Completed" || contract.deliveryStatus === "Returned";
                      const isPendingDelivery = !isDelivered && !isReturned;

                      const timeInfo = getTaskTimeAndUrgency(contract, isPendingDelivery, isReturnForMe, activeTab === "all", activeTab === "withClient");
                      const vehicleInfo = getVehicleDisplay(contract);
                      const assignedDriverName = getAssignedDriverName(contract);
                      const isReturnTask = activeTab === "tasks"
                        ? (!isPendingDelivery && isReturnForMe)
                        : (isReturned && isReturnForMe);

                      const locationText = isReturnTask
                        ? (contract.dropoffLocation || contract.pickupLocation || "Main Office")
                        : (contract.pickupLocation || "Main Office");
                      const locationLabel = isReturnTask ? "Return" : "Handover";

                      const statusBadge = isPendingDelivery
                        ? { text: "Handover", cls: "bg-amber-50 text-amber-700 border-amber-300" }
                        : isReturnForMe && !isReturned && activeTab === "tasks"
                        ? { text: "Assigned Return", cls: "bg-purple-50 text-purple-700 border-purple-300" }
                        : isReturned
                        ? { text: "Completed", cls: "bg-emerald-50 text-emerald-700 border-emerald-300" }
                        : isDelivered
                        ? { text: "With Client", cls: "bg-blue-50 text-blue-700 border-blue-300" }
                        : { text: "Active", cls: "bg-gray-50 text-gray-700 border-gray-300" };

                      return (
                        <tr
                          key={contract._id || contract.id}
                          onClick={() => router.push(`/driver/contracts/${contract._id || contract.id}`)}
                          className="bg-white hover:bg-gray-50/75 transition-colors animate-fade-in-up cursor-pointer"
                          style={{ animationDelay: `${idx * 0.04 + 0.08}s` }}
                        >
                          {/* Contract Column */}
                          <td className="py-2 sm:py-2.5 px-2.5 sm:px-4 whitespace-nowrap">
                            <span className="font-bold text-text-primary text-[11px] sm:text-xs md:text-sm tabular-nums">
                              #{contract.contractNumber || contract.id || contract._id?.substring(0, 8).toUpperCase()}
                            </span>
                          </td>

                          {/* Customer / Driver Column (no phone number shown to drivers) */}
                          <td className="py-2 sm:py-2.5 px-2.5 sm:px-4 min-w-[150px] sm:min-w-[220px]">
                            <div className="flex items-center gap-2 sm:gap-2.5">
                              <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-[10px] sm:text-xs shrink-0 shadow-xs ${getAvatarColor(contract.customer)}`}>
                                {getInitials(contract.customer)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="font-semibold text-text-primary text-[11px] sm:text-xs md:text-sm block break-words leading-tight" title={contract.customer}>
                                  {contract.customer || "Unknown Client"}
                                </span>
                                <p className="text-[9.5px] sm:text-[11px] text-text-muted mt-0.5 break-words leading-tight">
                                  {isPendingDelivery && isDeliveryForMe
                                    ? "Assigned to you"
                                    : assignedDriverName
                                    ? `Driver: ${assignedDriverName}`
                                    : "Customer"}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Vehicle Column */}
                          <td className="py-2 sm:py-2.5 px-2.5 sm:px-4 whitespace-nowrap">
                            <span className="font-medium text-text-primary text-[11px] sm:text-xs md:text-sm line-clamp-1" title={vehicleInfo.name}>
                              {vehicleInfo.name}
                              {vehicleInfo.year && <span className="text-text-muted font-normal ml-1">({vehicleInfo.year})</span>}
                            </span>
                            {vehicleInfo.plate && (
                              <p className="text-[9.5px] sm:text-[11px] text-text-muted mt-0.5 font-bold tracking-wider uppercase tabular-nums">
                                • {vehicleInfo.plate}
                              </p>
                            )}
                          </td>

                          {/* Schedule Column */}
                          <td className="py-2 sm:py-2.5 px-2.5 sm:px-4 whitespace-nowrap">
                            <div className="text-[10px] sm:text-xs leading-tight">
                              <span className="font-medium text-text-secondary flex items-center gap-1.5 tabular-nums">
                                <Clock size={11} className="text-text-muted shrink-0" />
                                {timeInfo.dayLabel} · {timeInfo.timeStr}
                              </span>
                              <span className={`inline-block mt-0.5 text-[9px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded border leading-tight ${timeInfo.badgeColor}`}>
                                {timeInfo.label}{timeInfo.badgeText && timeInfo.badgeText !== timeInfo.dayLabel ? ` · ${timeInfo.badgeText}` : ""}
                              </span>
                            </div>
                          </td>

                          {/* Location Column */}
                          <td className="py-2 sm:py-2.5 px-2.5 sm:px-4">
                            <div className="text-[10px] sm:text-xs leading-tight max-w-[190px]">
                              <span className="font-medium text-text-secondary flex items-center gap-1.5 truncate" title={locationText}>
                                <MapPin size={11} className={isReturnTask ? "text-purple-600 shrink-0" : "text-emerald-600 shrink-0"} />
                                <span className="truncate">{locationText}</span>
                              </span>
                              <p className="text-[9.5px] sm:text-[10.5px] text-text-muted mt-0.5">
                                {locationLabel} Location
                              </p>
                            </div>
                          </td>

                          {/* Status Column (Dedicated column matching Admin Bookings & Clients) */}
                          <td className="py-2 sm:py-2.5 px-2 whitespace-nowrap w-[96px] sm:w-[120px]">
                            <span className={`inline-flex items-center text-[9.5px] sm:text-[11px] font-semibold px-2 py-0.5 rounded border ${statusBadge.cls}`}>
                              {statusBadge.text}
                            </span>
                          </td>

                          {/* Actions Column */}
                          <td className="py-2 sm:py-2.5 px-2.5 sm:px-4 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1 sm:gap-1.5">
                              {isPendingDelivery && isDeliveryForMe ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/driver/delivery?contractId=${contract._id || contract.id}`);
                                  }}
                                  className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10.5px] sm:text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                                  title="Confirm vehicle handover"
                                >
                                  <CheckCircle2 size={13} />
                                  <span>Handover</span>
                                </button>
                              ) : isDelivered && !isReturned && isReturnForMe && activeTab === "tasks" ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/driver/return?contractId=${contract._id || contract.id}`);
                                  }}
                                  className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-brand hover:bg-brand-dark text-white rounded-lg text-[10.5px] sm:text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                                  title="Process vehicle return"
                                >
                                  <ArrowLeftRight size={13} />
                                  <span>Return</span>
                                </button>
                              ) : null}
                              <div className="w-px h-3.5 sm:h-4 bg-border mx-0.5" />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/driver/contracts/${contract._id || contract.id}`);
                                }}
                                className="p-1 sm:p-1.5 text-text-muted hover:text-brand hover:bg-brand/10 rounded-md sm:rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                                title="View Details"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openGoogleMaps(locationText);
                                }}
                                className="p-1 sm:p-1.5 text-text-muted hover:text-emerald-600 hover:bg-emerald-50 rounded-md sm:rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                                title={`Open in Google Maps: ${locationText}`}
                              >
                                <Navigation size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredContracts.length}
                itemsPerPage={itemsPerPage}
                onPageChange={(page) => {
                  setCurrentPage(page);
                  window.scrollTo({ top: 350, behavior: "smooth" });
                }}
                onItemsPerPageChange={setItemsPerPage}
                itemLabel="tasks"
              />
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
