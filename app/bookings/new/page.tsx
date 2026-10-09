"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { 
  User, 
  FileText, 
  CheckCircle,
  Search,
  ArrowRight,
  ArrowLeft,
  Calendar,
  MapPin,
  DollarSign,
  Clock,
  UserCheck,
  CheckCircle2,
  Loader2,
  Banknote,
  CreditCard,
  Coins,
  AlertCircle,
  Truck,
  Check,
  UserPlus,
  X,
  Camera,
  PenTool,
  RotateCcw,
  Gauge,
  ShieldCheck
} from "lucide-react";
import { ExecutiveCarIcon } from "@/components/icons/ExecutiveCarIcon";
import StatusBadge from "@/components/ui/StatusBadge";
import { useToast } from "@/components/providers/ToastProvider";
import CreateClientModal from "@/components/modals/CreateClientModal";
import AdditionalDriverModal from "@/components/modals/AdditionalDriverModal";
import SelectSecondDriverModal from "@/components/modals/SelectSecondDriverModal";
import FuelLevelSelector from "@/components/ui/FuelLevelSelector";
import PaymentMethodSelector from "@/components/ui/PaymentMethodSelector";
import { areDatesOverlapping } from "@/lib/date-overlap";
import VehicleInspectionPhotoCapture, { VEHICLE_ANGLES } from "@/components/ui/VehicleInspectionPhotoCapture";
import { DEFAULT_ADMIN_SIGNATURE } from "@/lib/default-admin-signature";

const formatDateToInput = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return new Date().toISOString().split("T")[0];
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch {
    return new Date().toISOString().split("T")[0];
  }
};

const DELIVERY_STEPS = [
  { id: 1, title: "Car", icon: ExecutiveCarIcon },
  { id: 2, title: "Rental Data & Driver", icon: Truck },
  { id: 3, title: "Review & Dispatch", icon: CheckCircle },
];

const SHOP_STEPS = [
  { id: 1, title: "Car", icon: ExecutiveCarIcon },
  { id: 2, title: "Client", icon: User },
  { id: 3, title: "Rental Data", icon: FileText },
  { id: 4, title: "Review & Create", icon: CheckCircle },
];

export function NewRentalAdminPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contractId = searchParams.get("contractId") || searchParams.get("edit");
  const isEditMode = Boolean(contractId);
  const [editingContract, setEditingContract] = useState<any>(null);

  const toast = useToast();
  const { data: session } = useSession();
  const pathname = usePathname();
  const isDriver = (session?.user as any)?.role === "driver" || pathname?.startsWith("/driver");
  const currentUserId = (session?.user as any)?.id;

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);

  // Contract Type (defaults to Delivery for drivers, Shop for admins)
  const [contractType, setContractType] = useState<"Delivery" | "Shop">("Shop");

  // Data State
  const [units, setUnits] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);

  const currentDriver = drivers.find(d => 
    (d._id && String(d._id) === String(currentUserId)) || 
    (d.userId && String(d.userId) === String(currentUserId)) ||
    (d.email && session?.user?.email && d.email.toLowerCase() === session.user.email.toLowerCase())
  );
  const resolvedDriverId = currentDriver?._id || currentDriver?.userId || currentUserId || "";

  useEffect(() => {
    if (isDriver) {
      setContractType("Delivery");
      const match = drivers.find(d => 
        (d._id && String(d._id) === String(currentUserId)) || 
        (d.userId && String(d.userId) === String(currentUserId)) ||
        (d.email && session?.user?.email && d.email.toLowerCase() === session.user.email.toLowerCase())
      );
      const targetId = match?._id || match?.userId || currentUserId || "";
      if (targetId) {
        setRentalData(prev => ({
          ...prev,
          deliveryDriverId: targetId,
          driverId: targetId,
        }));
      }
    }
  }, [isDriver, drivers, currentUserId, session]);

  // Search & Filter States
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState("");
  const [fleetFilter, setFleetFilter] = useState<"available" | "all">("all");
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isSelectSecondDriverModalOpen, setIsSelectSecondDriverModalOpen] = useState(false);
  const [secondDriverClient, setSecondDriverClient] = useState<any | null>(null);
  const [isAddingForSecondDriver, setIsAddingForSecondDriver] = useState(false);
  const [additionalDriver, setAdditionalDriver] = useState({
    name: "",
    license: "",
    nationality: "",
    phone: "",
    expiry: "",
    issuedAt: "",
  });

  const handleSelectSecondDriver = (client: any) => {
    if (!client) return;
    setSecondDriverClient(client);
    setAdditionalDriver({
      name: client.name || "",
      license: client.licenseNumber || "",
      nationality: client.nationality || "",
      phone: client.phone || "",
      expiry: client.licenseExpiry ? new Date(client.licenseExpiry).toISOString().split("T")[0] : "",
      issuedAt: client.address || "Dubai",
    });
    toast.success(`Selected "${client.name}" as Second Driver.`);
  };

  const handleRemoveSecondDriver = () => {
    setSecondDriverClient(null);
    setAdditionalDriver({
      name: "",
      license: "",
      nationality: "",
      phone: "",
      expiry: "",
      issuedAt: "",
    });
    toast.info("Second driver removed.");
  };

  const handleClientModalSuccess = (newClient?: any) => {
    fetchClients();
    if (newClient) {
      if (isAddingForSecondDriver) {
        handleSelectSecondDriver(newClient);
        setIsAddingForSecondDriver(false);
        toast.success(`Registered "${newClient.name}" and automatically selected as Second Driver!`);
      } else {
        setSelectedClient(newClient._id || newClient.id);
        toast.success(`Registered "${newClient.name}" and selected as Primary Customer!`);
      }
    }
    setIsClientModalOpen(false);
  };

  const getCurrentFormattedTime = () => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date());
  };

  // Form State
  const [rentalData, setRentalData] = useState({
    driverId: "",
    deliveryDriverId: "",
    returnDriverId: "",
    rentalType: "Daily" as "Daily" | "Monthly",
    customerType: "B2C" as "B2C" | "B2B",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    checkoutTime: "10:00 AM",
    checkinTime: "",
    collectionAmount: 595, // Price driver or admin will collect for the rental
    advancePayment: 0, // Prepaid advance / عربون حجز السيارة
    dailyRate: 85,
    dailyKmLimit: 0,
    pricePerExtraKm: 0,
    depositAmount: 0,
    pickupLocation: "Main Office",
    dropoffLocation: "",
    notes: "",
    babySeatFee: 0,
    deliveryFee: 0,
    salikFees: 0,
    tintingFees: 0,
    cleaningFees: 0,
    checkoutFuelLevel: 100,
    checkoutMileage: 0,
    paymentMethod: "Cash" as string,
    paymentStatus: "Pending" as "Pending" | "Partial" | "Paid"
  });

  const [inspectionPhotos, setInspectionPhotos] = useState<Record<string, string>>({});

  // Customer Signature Canvas State for Shop Contracts
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureData(canvas.toDataURL("image/png"));
    }
  };

  const clearSignature = () => {
    setSignatureData(null);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
    }
  };

  // Admin / Company Signature State (Defaults to Official Seal & Signature)
  const adminCanvasRef = useRef<HTMLCanvasElement>(null);
  const [adminSignatureData, setAdminSignatureData] = useState<string | null>(DEFAULT_ADMIN_SIGNATURE);
  const [isDrawingAdmin, setIsDrawingAdmin] = useState(false);

  const startDrawingAdmin = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawingAdmin(true);
    const canvas = adminCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const drawAdmin = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingAdmin) return;
    const canvas = adminCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawingAdmin = () => {
    if (!isDrawingAdmin) return;
    setIsDrawingAdmin(false);
    const canvas = adminCanvasRef.current;
    if (canvas) {
      setAdminSignatureData(canvas.toDataURL("image/png"));
    }
  };

  const clearAdminSignature = () => {
    setAdminSignatureData(null);
    const canvas = adminCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
    }
  };

  const autoSignAdmin = () => {
    const canvas = adminCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== rect.width * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    const adminName = session?.user?.name || "Leon Car Rental";
    ctx.font = "italic bold 22px 'Brush Script MT', 'Dancing Script', cursive, sans-serif";
    ctx.fillStyle = "#0f172a";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(adminName, rect.width / 2, rect.height / 2 - 4);

    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#0f172a";
    ctx.moveTo(rect.width / 2 - 80, rect.height / 2 + 12);
    ctx.quadraticCurveTo(rect.width / 2, rect.height / 2 + 20, rect.width / 2 + 80, rect.height / 2 + 10);
    ctx.stroke();

    ctx.restore();
    setAdminSignatureData(canvas.toDataURL("image/png"));
    toast.success(`Admin signature applied (${adminName})`);
  };

  // Canvas DPI initialization when reaching Review Step (Step 4 for Shop, Step 3 for Delivery)
  useEffect(() => {
    const isReviewStep = currentStep === (contractType === "Delivery" ? 3 : 4);
    if (isReviewStep) {
      const timer = setTimeout(() => {
        // Customer canvas (Shop only)
        if (contractType === "Shop" && canvasRef.current) {
          const canvas = canvasRef.current;
          const rect = canvas.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            const dpr = window.devicePixelRatio || 1;
            const prevSig = signatureData;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.scale(dpr, dpr);
              ctx.lineWidth = 3;
              ctx.lineCap = "round";
              ctx.lineJoin = "round";
              ctx.strokeStyle = "#0f172a";
              if (prevSig) {
                const img = new Image();
                img.onload = () => {
                  ctx.drawImage(img, 0, 0, rect.width, rect.height);
                };
                img.src = prevSig;
              }
            }
          }
        }

        // Admin canvas (Both Shop and Delivery)
        if (adminCanvasRef.current) {
          const canvas = adminCanvasRef.current;
          const rect = canvas.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            const dpr = window.devicePixelRatio || 1;
            const prevAdminSig = adminSignatureData;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.scale(dpr, dpr);
              ctx.lineWidth = 3;
              ctx.lineCap = "round";
              ctx.lineJoin = "round";
              ctx.strokeStyle = "#0f172a";
              if (prevAdminSig) {
                const img = new Image();
                img.onload = () => {
                  ctx.drawImage(img, 0, 0, rect.width, rect.height);
                };
                img.src = prevAdminSig;
              }
            }
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentStep, contractType]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (typeof document !== "undefined") {
      document.documentElement?.scrollTo({ top: 0, behavior: "smooth" });
      document.body?.scrollTo({ top: 0, behavior: "smooth" });
      document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Automatically scroll to top whenever the wizard step changes so user always sees the title and stepper
  useEffect(() => {
    scrollToTop();
  }, [currentStep]);

  const STEPS = contractType === "Shop" ? SHOP_STEPS : DELIVERY_STEPS;
  const totalSteps = STEPS.length;

  const fetchUnits = async () => {
    try {
      const res = await fetch("/api/units", { cache: "no-store" });
      const data = await res.json();
      setUnits(data.units || []);
    } catch (e) {
      console.error("Failed to load units", e);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/clients", { cache: "no-store" });
      const data = await res.json();
      setClients(data.clients || []);
    } catch (e) {
      console.error("Failed to load clients", e);
    }
  };

  const fetchDrivers = async () => {
    try {
      const res = await fetch("/api/drivers", { cache: "no-store" });
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.drivers || []);
      setDrivers(list);
    } catch (e) {
      console.error("Failed to load drivers", e);
    }
  };

  const fetchContract = async () => {
    if (!contractId) return;
    try {
      const res = await fetch(`/api/contracts/${contractId}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Contract not found");
      const c = await res.json();
      setEditingContract(c);

      // 1. Contract Type
      const editType = c.contractType || (c.deliveryDriverId ? "Delivery" : "Shop");
      setContractType(editType);

      // 2. Selected Vehicle & Client
      const unitId = c.unitId?._id || c.unitId || null;
      setSelectedVehicle(unitId);
      if (c.unitId && typeof c.unitId === "object" && c.unitId._id) {
        setUnits(prev => prev.some(u => u._id === c.unitId._id) ? prev : [c.unitId, ...prev]);
      }

      const clientId = c.clientId?._id || c.clientId || null;
      setSelectedClient(clientId);
      if (c.clientId && typeof c.clientId === "object" && c.clientId._id) {
        setClients(prev => prev.some(cl => cl._id === c.clientId._id) ? prev : [c.clientId, ...prev]);
      }

      // 3. Rental Data & Timing
      const editStart = c.startDate ? formatDateToInput(c.startDate) : new Date().toISOString().split("T")[0];
      const editEnd = c.endDate ? formatDateToInput(c.endDate) : new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
      const startD = new Date(editStart);
      const endD = new Date(editEnd);
      const days = Math.max(1, Math.ceil((endD.getTime() - startD.getTime()) / (1000 * 3600 * 24)));
      const editDailyRate = c.dailyRate || 85;
      const extraFees = (c.babySeatFees || 0) + (c.deliveryCharges || 0) + (c.salikFees || c.salikCharge || 0) + (c.tintingFees || 0) + (c.cleaningFees || 0);
      const editCollectionAmount = c.collectionAmount !== undefined 
        ? c.collectionAmount 
        : (c.totalAmount !== undefined 
            ? Math.max(0, c.totalAmount - extraFees)
            : (editDailyRate * days));

      setRentalData({
        driverId: c.driverId?._id || c.driverId || "",
        deliveryDriverId: c.deliveryDriverId?._id || c.deliveryDriverId || c.driverId?._id || c.driverId || "",
        returnDriverId: c.returnDriverId?._id || c.returnDriverId || "",
        rentalType: c.rentalType || (days >= 30 ? "Monthly" : "Daily"),
        customerType: c.customerType || "B2C",
        startDate: editStart,
        endDate: editEnd,
        checkoutTime: c.checkoutTime || "10:00 AM",
        checkinTime: c.checkinTime || "",
        collectionAmount: editCollectionAmount,
        advancePayment: c.advancePayment || 0,
        dailyRate: editDailyRate,
        dailyKmLimit: c.dailyKmLimit || 0,
        pricePerExtraKm: c.pricePerExtraKm || 0,
        depositAmount: c.depositAmount || 0,
        pickupLocation: c.pickupLocation || "Main Office",
        dropoffLocation: c.dropoffLocation || "",
        notes: c.notes || "",
        babySeatFee: c.babySeatFees || 0,
        deliveryFee: c.deliveryCharges || 0,
        salikFees: c.salikFees || c.salikCharge || 0,
        tintingFees: c.tintingFees || 0,
        cleaningFees: c.cleaningFees || 0,
        checkoutFuelLevel: c.checkoutFuelLevel !== undefined ? c.checkoutFuelLevel : 100,
        checkoutMileage: c.checkoutMileage !== undefined ? c.checkoutMileage : 0,
        paymentMethod: c.paymentMethod || "Cash",
        paymentStatus: c.paymentStatus || "Pending",
      });

      // 4. Second Driver
      if (c.additionalDriverName) {
        setAdditionalDriver({
          name: c.additionalDriverName || "",
          license: c.additionalDriverLicense || "",
          nationality: c.additionalDriverNationality || "",
          phone: c.additionalDriverPhone || "",
          expiry: c.additionalDriverExpiry ? formatDateToInput(c.additionalDriverExpiry) : "",
          issuedAt: c.additionalDriverIssuedAt || "",
        });
        setSecondDriverClient({
          name: c.additionalDriverName,
          licenseNumber: c.additionalDriverLicense,
          phone: c.additionalDriverPhone,
          nationality: c.additionalDriverNationality,
        });
      }

      // 5. Inspection Photos
      const initialPhotos: Record<string, string> = {};
      if (Array.isArray(c.inspectionPhotos)) {
        c.inspectionPhotos.forEach((url: string, idx: number) => {
          if (url && VEHICLE_ANGLES[idx]) {
            initialPhotos[VEHICLE_ANGLES[idx]] = url;
          }
        });
      }
      setInspectionPhotos(initialPhotos);

      // 6. Signatures
      if (c.customerSignature) {
        setSignatureData(c.customerSignature);
      }
      if (c.adminSignature) {
        setAdminSignatureData(c.adminSignature);
      } else {
        setAdminSignatureData(DEFAULT_ADMIN_SIGNATURE);
      }
    } catch (err: any) {
      console.error("Failed to load contract:", err);
      toast.error("Failed to load contract details for editing.");
    }
  };

  useEffect(() => {
    const promises: Promise<any>[] = [fetchUnits(), fetchClients(), fetchDrivers()];
    if (contractId) {
      promises.push(fetchContract());
    }
    Promise.all(promises).finally(() => {
      setIsPageLoading(false);
    });
  }, [contractId]);

  const getUnitConflict = (unit: any, startDateStr?: string, endDateStr?: string) => {
    if (!unit) return null;
    if (unit.status === "Maintenance" || unit.status === "Out of Service") {
      return { reason: unit.status };
    }
    const startStr = startDateStr || rentalData.startDate;
    const endStr = endDateStr || rentalData.endDate;
    if (!startStr || !endStr) return null;

    const start = new Date(startStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endStr);
    end.setHours(23, 59, 59, 999);

    if (Array.isArray(unit.activeBookings) && unit.activeBookings.length > 0) {
      for (const booking of unit.activeBookings) {
        if (
          contractId && 
          (booking.contractId === contractId || 
           booking._id === contractId || 
           booking.id === contractId || 
           (editingContract?.contractNumber && String(booking.contractNumber) === String(editingContract.contractNumber)))
        ) {
          continue;
        }

        if (areDatesOverlapping(booking.startDate, booking.endDate, startStr, endStr)) {
          return {
            reason: "Booked",
            startDate: booking.startDate,
            endDate: booking.endDate,
            contractNumber: booking.contractNumber || (booking.contractId ? booking.contractId.substring(0, 8).toUpperCase() : ""),
          };
        }
      }
    }
    return null;
  };

  const isUnitBookable = (unit: any, startDateStr?: string, endDateStr?: string) => {
    if (!unit) return false;
    if (unit.status === "Maintenance" || unit.status === "Out of Service") return false;
    return !getUnitConflict(unit, startDateStr, endDateStr);
  };

  const handleNext = () => {
    // Step 1: Vehicle selection (both Shop and Delivery)
    if (currentStep === 1) {
      if (!selectedVehicle) {
        toast.error("Please select a car first.");
        return;
      }
      const vehicle = units.find(u => u._id === selectedVehicle);
      if (vehicle && (vehicle.status === "Maintenance" || vehicle.status === "Out of Service")) {
        toast.error(`The selected car is currently in ${vehicle.status} and cannot be booked.`);
        return;
      }
    }

    // Delivery flow validation (Step 1: Car -> Step 2: Rental Data & Driver -> Step 3: Review & Dispatch)
    if (contractType === "Delivery") {
      if (currentStep === 2) {
        if (!rentalData.deliveryDriverId) {
          toast.error("Please assign a delivery driver for this contract.");
          return;
        }

        const vehicle = units.find(u => u._id === selectedVehicle);
        const conflict = vehicle ? getUnitConflict(vehicle, rentalData.startDate, rentalData.endDate) : null;
        if (conflict && conflict.reason === "Booked") {
          const conflictStart = new Date(conflict.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
          const conflictEnd = new Date(conflict.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
          toast.error(`Date Conflict: You cannot make the same dates for two clients. This car is already booked from ${conflictStart} to ${conflictEnd}. Please choose different dates.`);
          return;
        }
      }
    } else {
      // Shop flow validation (Step 1: Car -> Step 2: Client -> Step 3: Rental Data -> Step 4: Review & Create)
      if (currentStep === 2) {
        if (!selectedClient) {
          toast.error("Please select a client first.");
          return;
        }
      }

      if (currentStep === 3) {
        const vehicle = units.find(u => u._id === selectedVehicle);
        const conflict = vehicle ? getUnitConflict(vehicle, rentalData.startDate, rentalData.endDate) : null;
        if (conflict && conflict.reason === "Booked") {
          const conflictStart = new Date(conflict.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
          const conflictEnd = new Date(conflict.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
          toast.error(`Date Conflict: You cannot make the same dates for two clients. This car is already booked from ${conflictStart} to ${conflictEnd}. Please choose different dates.`);
          return;
        }
      }
    }

    if (currentStep < totalSteps) {
      setCurrentStep(c => c + 1);
      scrollToTop();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(c => c - 1);
      scrollToTop();
    }
  };

  // Submit contract to API
  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      if (!selectedVehicle) {
        toast.error("Please select a car.");
        setIsLoading(false);
        return;
      }

      // Shop contracts require a client
      if (contractType === "Shop" && !selectedClient) {
        toast.error("Please select a client.");
        setIsLoading(false);
        return;
      }

      // Delivery contracts require a driver
      if (contractType === "Delivery" && !rentalData.deliveryDriverId) {
        toast.error("Please assign a delivery driver.");
        setIsLoading(false);
        return;
      }

      const finalAdminSignature = adminSignatureData || DEFAULT_ADMIN_SIGNATURE;

      const vehicle = units.find(u => u._id === selectedVehicle);
      const conflict = vehicle ? getUnitConflict(vehicle, rentalData.startDate, rentalData.endDate) : null;
      if (conflict) {
        if (conflict.reason === "Booked") {
          const conflictStart = new Date(conflict.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
          const conflictEnd = new Date(conflict.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
          toast.error(`Date Conflict: This car is already booked from ${conflictStart} to ${conflictEnd}. Please select different dates.`);
        } else {
          toast.error(`The selected car is currently in ${conflict.reason} and cannot be booked.`);
        }
        setIsLoading(false);
        return;
      }

      const start = new Date(rentalData.startDate);
      const end = new Date(rentalData.endDate);
      const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));
      const collectionPrice = Number(rentalData.collectionAmount || 0);
      const calculatedDailyRate = totalDays > 0 ? Math.round((collectionPrice / totalDays) * 100) / 100 : collectionPrice;
      const extraFees = Number(rentalData.babySeatFee || 0) + Number(rentalData.deliveryFee || 0);
      const totalAmount = collectionPrice + extraFees;
      const advancePaid = Number(rentalData.advancePayment || 0);
      const determinedPaymentStatus = rentalData.paymentStatus !== "Pending" 
        ? rentalData.paymentStatus 
        : (advancePaid >= totalAmount ? "Paid" : (advancePaid > 0 ? "Partial" : "Pending"));

      const contractPayload: any = {
        unitId: selectedVehicle,
        contractType: contractType,
        rentalType: rentalData.rentalType,
        customerType: rentalData.customerType,
        startDate: rentalData.startDate,
        endDate: rentalData.endDate,
        dailyRate: calculatedDailyRate,
        dailyKmLimit: Number(rentalData.dailyKmLimit),
        pricePerExtraKm: Number(rentalData.pricePerExtraKm),
        depositAmount: Number(rentalData.depositAmount),
        advancePayment: advancePaid,
        pickupLocation: rentalData.pickupLocation,
        dropoffLocation: rentalData.dropoffLocation || "",
        checkoutTime: rentalData.checkoutTime || "Pending Handover",
        checkinTime: rentalData.checkinTime || "",
        notes: rentalData.notes,
        babySeatFees: Number(rentalData.babySeatFee || 0),
        deliveryCharges: Number(rentalData.deliveryFee || 0),
        salikFees: Number(rentalData.salikFees || 0),
        tintingFees: Number(rentalData.tintingFees || 0),
        cleaningFees: Number(rentalData.cleaningFees || 0),
        checkoutFuelLevel: Number(rentalData.checkoutFuelLevel || 100),
        checkoutMileage: Number(rentalData.checkoutMileage || units.find(u => u._id === selectedVehicle)?.mileage || 0),
        paymentMethod: rentalData.paymentMethod,
        paymentStatus: determinedPaymentStatus,
        customerSignature: (isEditMode && editingContract?.customerSignature) ? editingContract.customerSignature : (signatureData || null),
        adminSignature: finalAdminSignature,
        inspectionPhotos: (isEditMode && Array.isArray(editingContract?.inspectionPhotos) && editingContract.inspectionPhotos.length > 0)
          ? editingContract.inspectionPhotos
          : VEHICLE_ANGLES.map(angle => inspectionPhotos[angle] || ""),
        totalAmount,
        additionalDriverName: additionalDriver.name.trim(),
        additionalDriverLicense: additionalDriver.license.trim(),
        additionalDriverNationality: additionalDriver.nationality.trim(),
        additionalDriverPhone: additionalDriver.phone.trim(),
        additionalDriverExpiry: additionalDriver.expiry,
        additionalDriverIssuedAt: additionalDriver.issuedAt.trim(),
        ...(isEditMode && editingContract?.status && { status: editingContract.status }),
      };

      if (contractType === "Delivery") {
        contractPayload.driverId = rentalData.deliveryDriverId;
        contractPayload.deliveryDriverId = rentalData.deliveryDriverId;
        if (selectedClient) {
          contractPayload.clientId = selectedClient;
        }
        if (!isEditMode) {
          contractPayload.deliveryStatus = "Pending";
          contractPayload.status = "Draft";
          if (isDriver) {
            contractPayload.isDispatched = true;
          }
        }
      } else {
        contractPayload.clientId = selectedClient;
        if (!isEditMode) {
          contractPayload.deliveryStatus = "Pending";
          contractPayload.status = "Draft";
        }
      }

      const url = isEditMode ? `/api/contracts/${contractId}` : "/api/contracts";
      const method = isEditMode ? "PUT" : "POST";

      const contractRes = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contractPayload)
      });

      if (!contractRes.ok) {
        const err = await contractRes.json();
        toast.error(err.error || (isEditMode ? "Failed to update contract" : "Failed to create booking"));
        setIsLoading(false);
        return;
      }

      if (isEditMode) {
        toast.success("Contract updated successfully! (تم حفظ التعديلات بنجاح)");
      } else if (contractType === "Delivery") {
        toast.success(isDriver ? "Delivery Booking Created! It is now in your active tasks." : "Delivery Booking Created! Click 'Dispatch' in the contracts table to assign number and send to driver.");
      } else {
        toast.success("Shop Booking Created! Click 'Hand Over' in the contracts table when handing the car to the client. (تم إنشاء الحجز بنجاح! اضغط على 'تسليم' عند تسليم السيارة للعميل)");
      }
      if (isDriver) {
        router.push("/driver");
      } else {
        router.push("/bookings");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while creating booking");
      setIsLoading(false);
    }
  };

  // Filter Units: Show vehicles available for the selected dates by default
  const availableUnits = units.filter(u => isUnitBookable(u, rentalData.startDate, rentalData.endDate));
  const baseUnits = fleetFilter === "available" ? availableUnits : units;
  const filteredUnits = baseUnits.filter(u => {
    if (!vehicleSearchQuery) return true;
    const q = vehicleSearchQuery.toLowerCase();
    return (
      u.make?.toLowerCase().includes(q) ||
      u.model?.toLowerCase().includes(q) ||
      u.plate?.toLowerCase().includes(q)
    );
  });

  // Filter Clients
  const filteredClients = clientSearchQuery
    ? clients.filter(c =>
        c.name?.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
        c.phone?.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
        c.idNumber?.toLowerCase().includes(clientSearchQuery.toLowerCase())
      )
    : (() => {
        const top6 = clients.slice(0, 6);
        if (selectedClient && !top6.some(c => c._id === selectedClient)) {
          const selected = clients.find(c => c._id === selectedClient);
          if (selected) return [selected, ...top6];
        }
        return top6;
      })();

  if (isPageLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-pulse">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="h-8 w-64 bg-gray-200 rounded-lg"></div>
            <div className="h-4 w-96 bg-gray-200 rounded-lg mt-3"></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-8 flex items-center justify-between">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200"></div>
              <div className="w-16 h-2 bg-gray-200 rounded-full hidden sm:block"></div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 min-h-[400px]">
          <div className="h-6 w-48 bg-gray-200 rounded-lg mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             {[1, 2, 3].map(i => (
               <div key={i} className="h-48 bg-gray-100 rounded-xl"></div>
             ))}
          </div>
        </div>
      </div>
    );
  }

  // ===================== RENDER HELPERS =====================

  const renderVehicleSelector = () => (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Select Car</h2>
          <p className="text-xs text-text-muted mt-0.5">Select an available car to assign to this contract</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
          <div className="flex items-center bg-gray-100 p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setFleetFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                fleetFilter === "all"
                  ? "bg-white text-brand shadow-xs"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              All Cars ({units.length})
            </button>
            <button
              type="button"
              onClick={() => setFleetFilter("available")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                fleetFilter === "available"
                  ? "bg-white text-brand shadow-xs"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              Available ({availableUnits.length})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search by make, model, plate..."
              value={vehicleSearchQuery}
              onChange={(e) => setVehicleSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
            />
          </div>
        </div>
      </div>

      {filteredUnits.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl bg-gray-50/50">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3 border border-red-100">
            <AlertCircle size={28} />
          </div>
          <p className="text-sm font-bold text-text-primary">
            {fleetFilter === "available" ? "No Available Cars" : "No matching cars found"}
          </p>
          <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
            {fleetFilter === "available" 
              ? "All cars are currently booked or under maintenance. Switch to All Cars to view fleet."
              : "No cars match your search keywords. Try searching by make, model, or license plate."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUnits.map((unit) => {
            const isSelected = selectedVehicle === unit._id;
            const conflict = getUnitConflict(unit, rentalData.startDate, rentalData.endDate);
            const isAvailable = !conflict;

            return (
              <div
                key={unit._id}
                onClick={() => {
                  if (unit.status === "Maintenance" || unit.status === "Out of Service") {
                    toast.error(`This car is currently in ${unit.status} and cannot be booked.`);
                    return;
                  }
                  setSelectedVehicle(unit._id);
                  const start = new Date(rentalData.startDate);
                  const end = new Date(rentalData.endDate);
                  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));
                  const defaultRate = unit.dailyRate || 85;
                  setRentalData(prev => ({
                    ...prev,
                    dailyRate: defaultRate,
                    collectionAmount: defaultRate * days,
                    dailyKmLimit: unit.dailyKmLimit || 0,
                    pricePerExtraKm: unit.pricePerExtraKm || 0,
                    checkoutMileage: unit.mileage || 0,
                  }));

                  if (conflict && conflict.reason === "Booked") {
                    const conflictStart = new Date(conflict.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    const conflictEnd = new Date(conflict.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    toast.info(`Selected ${unit.make} ${unit.model}. Note: It is booked from ${conflictStart} to ${conflictEnd}. Please choose non-overlapping dates.`);
                  } else {
                    toast.success(`Selected ${unit.make} ${unit.model} (${unit.plate})`);
                  }
                }}
                className={`bg-card rounded-2xl border p-5 flex flex-col transition-all group cursor-pointer card-hover ${
                  isSelected 
                    ? "border-brand bg-brand-light/20 ring-2 ring-brand/30 shadow-md" 
                    : "border-border shadow-sm hover:border-gray-300"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-text-muted font-bold mb-0.5">
                      {unit.make} • {unit.year || new Date().getFullYear()}
                    </p>
                    <h3 className="text-base font-bold text-text-primary leading-tight">{unit.model}</h3>
                  </div>
                  {isSelected ? (
                    <span className="bg-brand text-white p-1 rounded-full"><CheckCircle2 size={16} /></span>
                  ) : conflict?.reason === "Booked" ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      Booked ({new Date(conflict.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {new Date(conflict.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })})
                    </span>
                  ) : unit.status === "Maintenance" || unit.status === "Out of Service" ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                      {unit.status}
                    </span>
                  ) : (
                    <StatusBadge variant="available" text="Available" />
                  )}
                </div>
                
                <div className="flex-1 flex items-center justify-center min-h-[130px] my-3 relative bg-gray-50/70 rounded-xl border border-gray-100 group-hover:bg-gray-100/60 transition-colors">
                  {unit.images && unit.images.length > 0 ? (
                    <img src={unit.images[0]} alt={unit.model} className="max-w-full max-h-28 object-contain drop-shadow-sm group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <ExecutiveCarIcon size={44} className="text-gray-300" />
                  )}
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                  <span className="font-mono text-text-muted bg-gray-100 px-2 py-0.5 rounded">{unit.plate}</span>
                  <div>
                    <span className="text-base font-bold text-text-primary">AED {unit.dailyRate || 85}</span>
                    <span className="text-text-muted text-[11px]">/day</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderClientSelector = () => {
    const selectedClientObj = clients.find(c => c._id === selectedClient);
    const secondDriverName = secondDriverClient?.name || additionalDriver.name;
    const secondDriverLicense = secondDriverClient?.licenseNumber || additionalDriver.license;
    const secondDriverPhone = secondDriverClient?.phone || additionalDriver.phone;

    return (
      <div className="space-y-5 animate-fade-in-up">
        {/* Step Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Select Customer (اختيار العميل)</h2>
            <p className="text-xs text-text-muted mt-0.5">Click a customer card to select, or register a new one</p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search by name, phone, license..."
                value={clientSearchQuery}
                onChange={(e) => setClientSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setIsAddingForSecondDriver(false);
                setIsClientModalOpen(true);
              }}
              className="px-3.5 py-2 bg-brand text-white rounded-xl text-xs font-semibold hover:bg-brand-dark transition-colors flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
            >
              <UserCheck size={14} />
              <span>+ New Client</span>
            </button>
            {/* Compact 2nd Driver Icon Button */}
            <button
              type="button"
              onClick={() => setIsSelectSecondDriverModalOpen(true)}
              className={`relative p-2 rounded-xl border transition-all cursor-pointer shrink-0 group ${
                secondDriverName
                  ? "bg-red-50 border-red-300 text-red-700 hover:bg-red-100"
                  : "bg-gray-50 border-border text-text-muted hover:border-red-400 hover:text-red-600 hover:bg-red-50/50"
              }`}
              title={secondDriverName ? `2nd Driver: ${secondDriverName}` : "Add 2nd Driver (إضافة سائق ثاني)"}
            >
              <User size={16} />
              <span className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-white text-[9px] font-black flex items-center justify-center shadow-xs ${
                secondDriverName ? "bg-red-600" : "bg-gray-400 group-hover:bg-red-600"
              }`}>
                2
              </span>
            </button>
          </div>
        </div>

        {/* Selection Chips — only when someone is selected */}
        {(selectedClientObj || secondDriverName) && (
          <div className="flex flex-wrap items-center gap-2">
            {selectedClientObj && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/8 border border-brand/20">
                <span className="w-5 h-5 rounded-full bg-brand text-white text-[9px] font-black flex items-center justify-center">1</span>
                <span className="text-xs font-semibold text-text-primary truncate max-w-[140px]">{selectedClientObj.name}</span>
                <CheckCircle2 size={13} className="text-brand shrink-0" />
                <button
                  type="button"
                  onClick={() => setSelectedClient(null)}
                  className="text-gray-400 hover:text-red-600 transition-colors cursor-pointer ml-0.5"
                  title="Remove selected customer"
                >
                  <X size={13} />
                </button>
              </div>
            )}
            {secondDriverName && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-200">
                <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center">2</span>
                <span className="text-xs font-semibold text-text-primary truncate max-w-[140px]">{secondDriverName}</span>
                {secondDriverLicense && (
                  <span className="text-[9px] font-mono text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                    {secondDriverLicense}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleRemoveSecondDriver}
                  className="text-red-400 hover:text-red-600 transition-colors cursor-pointer ml-0.5"
                  title="Remove second driver"
                >
                  <X size={13} />
                </button>
              </div>
            )}
          </div>
        )}

      {!clientSearchQuery && clients.length > 6 && (
        <p className="text-[11px] text-text-muted">
          Showing latest 6 customers. Use the search bar above to quickly find any other customer.
        </p>
      )}

      {filteredClients.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl bg-gray-50/50">
          <User size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-text-primary">No customers found</p>
          <p className="text-xs text-text-muted mt-1">Click &quot;+ New Client&quot; to register the customer right away.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => {
            const isSelected = selectedClient === client._id;
            return (
              <div
                key={client._id}
                onClick={() => setSelectedClient(isSelected ? null : client._id)}
                className={`bg-card rounded-2xl border p-4 flex items-center justify-between transition-all cursor-pointer group card-hover ${
                  isSelected 
                    ? "border-brand bg-brand-light/20 ring-2 ring-brand/30 shadow-md" 
                    : "border-border shadow-sm hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-sm shrink-0">
                    {client.name?.charAt(0)?.toUpperCase() || "C"}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-text-primary leading-snug truncate">{client.name}</h3>
                    <p className="text-xs text-text-muted truncate">{client.phone || "No phone"}</p>
                  </div>
                </div>
                {isSelected ? (
                  <span className="bg-brand text-white p-1 rounded-full shrink-0"><CheckCircle2 size={16} /></span>
                ) : (
                  <div className="w-5 h-5 rounded-full border border-gray-300 group-hover:border-brand shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
  };

  const renderRentalData = () => {
    const start = new Date(rentalData.startDate);
    const end = new Date(rentalData.endDate);
    const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));

    return (
      <div className="space-y-6 animate-fade-in-up">
        <div>
          <h2 className="text-lg font-bold text-text-primary">
            {contractType === "Delivery" ? "Driver, Rental Period & Financial Terms" : "Rental Period & Financial Terms"}
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            {contractType === "Delivery" 
              ? "Assign delivery driver, specify dates, locations, and pricing"
              : "Specify dates, locations, and pricing"}
          </p>
        </div>

        {/* Rental Plan & Customer Type Switchers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50/70 p-4 rounded-2xl border border-gray-200/80">
          {/* Rental Type: Daily vs Monthly */}
          <div>
            <label className="text-xs font-bold text-text-primary block mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} className="text-brand" />
                <span>Rental Type (نوع الإيجار)</span>
              </span>
              <span className="text-[11px] font-semibold text-brand">
                {rentalData.rentalType === "Monthly" ? "Monthly Plan (30+ Days)" : "Daily Rate"}
              </span>
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-white rounded-xl border border-gray-200 shadow-xs">
              <button
                type="button"
                onClick={() => setRentalData(prev => ({ ...prev, rentalType: "Daily" }))}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  rentalData.rentalType === "Daily"
                    ? "bg-brand text-white shadow-xs"
                    : "text-text-secondary hover:text-text-primary hover:bg-gray-100"
                }`}
              >
                Daily / يومي
              </button>
              <button
                type="button"
                onClick={() => {
                  const s = new Date(rentalData.startDate);
                  const monthEnd = new Date(s.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
                  setRentalData(prev => ({
                    ...prev,
                    rentalType: "Monthly",
                    endDate: monthEnd,
                    collectionAmount: Math.round(prev.dailyRate * 30 * 100) / 100
                  }));
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  rentalData.rentalType === "Monthly"
                    ? "bg-brand text-white shadow-xs"
                    : "text-text-secondary hover:text-text-primary hover:bg-gray-100"
                }`}
              >
                Monthly / شهري
              </button>
            </div>
          </div>

          {/* Customer Type: B2C vs B2B */}
          <div>
            <label className="text-xs font-bold text-text-primary block mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <User size={14} className="text-brand" />
                <span>Customer Type (نوع العميل)</span>
              </span>
              <span className="text-[11px] font-semibold text-brand">
                {rentalData.customerType === "B2B" ? "Corporate Account" : "Individual (B2C)"}
              </span>
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-white rounded-xl border border-gray-200 shadow-xs">
              <button
                type="button"
                onClick={() => setRentalData(prev => ({ ...prev, customerType: "B2C" }))}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  rentalData.customerType === "B2C"
                    ? "bg-brand text-white shadow-xs"
                    : "text-text-secondary hover:text-text-primary hover:bg-gray-100"
                }`}
              >
                B2C (Individual / فردي)
              </button>
              <button
                type="button"
                onClick={() => setRentalData(prev => ({ ...prev, customerType: "B2B" }))}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  rentalData.customerType === "B2B"
                    ? "bg-brand text-white shadow-xs"
                    : "text-text-secondary hover:text-text-primary hover:bg-gray-100"
                }`}
              >
                B2B (Corporate / شركات)
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1. Dates & Drivers */}
          <div className="space-y-4 bg-gray-50/60 p-4 sm:p-5 rounded-2xl border border-gray-100">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Calendar size={16} className="text-brand" /> Dates &amp; Logistics (المواعيد واللوجستيات)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">
                  Start Date
                </label>
                <input 
                  type="date" 
                  value={rentalData.startDate} 
                  onChange={e => {
                    const newStart = e.target.value;
                    const s = new Date(newStart);
                    const end = new Date(rentalData.endDate);
                    const days = Math.max(1, Math.ceil((end.getTime() - s.getTime()) / (1000 * 3600 * 24)));
                    const rate = Number(rentalData.dailyRate) || 0;
                    setRentalData(prev => ({
                      ...prev,
                      startDate: newStart,
                      collectionAmount: rate * days
                    }));
                  }} 
                  className="w-full p-2.5 rounded-xl border border-border bg-white text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none font-medium" 
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">
                  Expected End Date
                </label>
                <input 
                  type="date" 
                  value={rentalData.endDate} 
                  onChange={e => {
                    const newEnd = e.target.value;
                    const start = new Date(rentalData.startDate);
                    const eDate = new Date(newEnd);
                    const days = Math.max(1, Math.ceil((eDate.getTime() - start.getTime()) / (1000 * 3600 * 24)));
                    const rate = Number(rentalData.dailyRate) || 0;
                    setRentalData(prev => ({
                      ...prev,
                      endDate: newEnd,
                      collectionAmount: rate * days
                    }));
                  }} 
                  className="w-full p-2.5 rounded-xl border border-border bg-white text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none font-medium" 
                />
              </div>
            </div>

            {/* Conflict Alert Banner if selected vehicle is booked for these dates */}
            {(() => {
              const selectedUnit = units.find(u => u._id === selectedVehicle);
              const conflict = selectedUnit ? getUnitConflict(selectedUnit, rentalData.startDate, rentalData.endDate) : null;
              if (!conflict || conflict.reason !== "Booked") return null;
              const conflictStart = new Date(conflict.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
              const conflictEnd = new Date(conflict.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
              return (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 sm:p-3.5 flex items-start gap-2.5 text-xs text-red-700 animate-fade-in shadow-2xs">
                  <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-600" />
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 font-bold text-red-800 text-xs">
                      <span>Date Conflict Detected</span>
                      <span className="text-[11px] font-normal text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                        تعارض في التواريخ
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-red-700 leading-relaxed">
                      This car (<strong className="font-semibold">{selectedUnit.make} {selectedUnit.model} - {selectedUnit.plate}</strong>) is already booked from <span className="font-semibold underline">{conflictStart}</span> to <span className="font-semibold underline">{conflictEnd}</span>. Please choose different dates or select another car.
                    </p>
                  </div>
                </div>
              );
            })()}

            <div>
              <label className="text-xs font-semibold text-text-secondary flex items-center justify-between mb-1">
                <span className="flex items-center gap-1">
                  <Clock size={13} className="text-brand shrink-0" />
                  <span>{contractType === "Delivery" ? "Delivery / Handover Time" : "Checkout Time"}</span>
                  <span className="text-red-500">*</span>
                </span>
                <span className="text-[11px] text-text-muted font-normal">
                  {contractType === "Delivery" ? "(تسليم للسائق)" : "(وقت الاستلام)"}
                </span>
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input 
                    type="text" 
                    value={rentalData.checkoutTime} 
                    onChange={e => setRentalData({...rentalData, checkoutTime: e.target.value})} 
                    placeholder="e.g. 10:00 AM"
                    className="w-full p-2.5 pl-9 rounded-xl border border-border bg-white text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none font-medium text-text-primary" 
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setRentalData(prev => ({ ...prev, checkoutTime: getCurrentFormattedTime() }))}
                  className="px-3.5 py-2.5 bg-brand/10 hover:bg-brand/20 text-brand text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 border border-brand/20 flex items-center gap-1.5 shadow-2xs"
                  title="Set current time"
                >
                  <Clock size={13} />
                  <span>Now</span>
                </button>
              </div>
            </div>

            {/* Driver assignment — only for Delivery contracts */}
            {contractType === "Delivery" && (
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">
                  Assign Delivery Driver (سائق تسليم السيارة للعميل) <span className="text-red-500">*</span>
                </label>
                <select
                  value={rentalData.deliveryDriverId}
                  disabled={isDriver}
                  onChange={e => setRentalData({...rentalData, deliveryDriverId: e.target.value, driverId: e.target.value})}
                  className={`w-full p-2.5 rounded-xl border border-border text-sm outline-none ${
                    isDriver
                      ? "bg-gray-100/90 text-gray-800 font-semibold cursor-not-allowed select-none"
                      : "bg-white focus:ring-2 focus:ring-brand/20 focus:border-brand cursor-pointer"
                  }`}
                >
                  <option value="">-- Select Delivery Driver --</option>
                  {drivers.map(d => (
                    <option key={d._id || d.userId} value={d._id || d.userId}>
                      {d.name} {d.phone ? `(${d.phone})` : ""}
                    </option>
                  ))}
                  {isDriver && resolvedDriverId && !drivers.some(d => String(d._id || d.userId) === String(resolvedDriverId)) && (
                    <option value={resolvedDriverId}>
                      {session?.user?.name || "Driver (You)"}
                    </option>
                  )}
                </select>
                <p className="text-[11px] text-text-muted mt-1">
                  {isDriver
                    ? "Assigned to you automatically. The driver will go to the client, register them, and deliver the car."
                    : `The driver will go to the client, register them, and deliver the car at ${rentalData.checkoutTime || "10:00 AM"}.`}
                </p>
              </div>
            )}

            <div className="pt-2">
              <label className="text-xs font-semibold text-text-secondary block mb-1 flex items-center gap-1">
                <MapPin size={13} className="text-emerald-600" /> 
                {contractType === "Delivery" ? "Delivery Location (مكان التسليم)" : "Pickup Location (مكان الاستلام)"}
              </label>
              <input 
                type="text" 
                value={rentalData.pickupLocation} 
                onChange={e => setRentalData({...rentalData, pickupLocation: e.target.value})} 
                placeholder={contractType === "Delivery" ? "e.g. Client's address, Hotel..." : "e.g. Main Office"}
                className="w-full p-2.5 rounded-xl border border-border bg-white text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none" 
              />
            </div>

            {/* Vehicle Mileage Reference */}
            <div className="pt-2 border-t border-gray-200/70">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-text-muted">
                <span className="flex items-center gap-1.5 font-medium text-text-secondary">
                  <Gauge size={14} className="text-brand" />
                  <span>Vehicle Current Mileage:</span>
                  <strong className="text-text-primary">
                    {selectedVehicle ? (units.find(u => u._id === selectedVehicle)?.mileage || 0).toLocaleString() : 0} km
                  </strong>
                </span>
                <span className="text-[11px] text-brand font-semibold">
                  Handover Odometer &amp; Fuel Level are recorded at vehicle delivery
                </span>
              </div>
            </div>
          </div>

          {/* 2. Rates & Deposit */}
          <div className="space-y-4 bg-gray-50/60 p-5 rounded-2xl border border-gray-100">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <DollarSign size={16} className="text-brand" /> Collection Amount &amp; Deposit
            </h3>

            <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1 truncate" title="Daily Rate">
                  Daily Rate
                </label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={rentalData.dailyRate === 0 ? "" : rentalData.dailyRate} 
                    onChange={e => {
                      const val = Number(e.target.value);
                      setRentalData(prev => ({
                        ...prev, 
                        dailyRate: val,
                        collectionAmount: totalDays > 0 ? Math.round(val * totalDays * 100) / 100 : val
                      }));
                    }} 
                    placeholder="e.g. 50"
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none font-bold text-text-primary" 
                  />
                </div>
                <span className="text-[11px] text-text-muted mt-0.5 block truncate">
                  {selectedVehicle ? `Base vehicle rate (/day)` : "Daily rental rate"}
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1 truncate" title="Collection Amount">
                  Collection Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={rentalData.collectionAmount === 0 ? "" : rentalData.collectionAmount} 
                    onChange={e => {
                      const val = Number(e.target.value);
                      setRentalData(prev => ({
                        ...prev, 
                        collectionAmount: val,
                        dailyRate: totalDays > 0 && val > 0 ? Math.round((val / totalDays) * 100) / 100 : prev.dailyRate
                      }));
                    }} 
                    placeholder="e.g. 350"
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none font-bold text-text-primary" 
                  />
                </div>
                <span className="text-[11px] text-text-muted mt-0.5 block truncate">
                  Calculated: {rentalData.dailyRate || 0} × {totalDays}d (editable)
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-emerald-800 block mb-1 truncate" title="Advance">
                  Advance
                </label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={rentalData.advancePayment === 0 ? "" : rentalData.advancePayment} 
                    onChange={e => {
                      const val = Number(e.target.value);
                      const extraFees = Number(rentalData.babySeatFee || 0) + Number(rentalData.deliveryFee || 0);
                      const totalRent = Number(rentalData.collectionAmount || 0) + extraFees;
                      setRentalData(prev => ({ 
                        ...prev, 
                        advancePayment: val,
                        paymentStatus: val >= totalRent ? "Paid" : (val > 0 ? "Partial" : "Pending")
                      }));
                    }} 
                    placeholder="0"
                    className="w-full px-3 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50/40 text-sm focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-600 outline-none font-bold text-emerald-950" 
                  />
                </div>
                <span className="text-[11px] text-emerald-700/80 mt-0.5 block truncate">
                  Paid upfront now
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1 truncate" title="Deposit Amount">
                  Deposit Amount
                </label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={rentalData.depositAmount === 0 ? "" : rentalData.depositAmount} 
                    onChange={e => {
                      const val = Number(e.target.value);
                      setRentalData(prev => ({ ...prev, depositAmount: val }));
                    }} 
                    placeholder="0"
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none font-bold text-text-primary" 
                  />
                </div>
                <span className="text-[11px] text-text-muted mt-0.5 block truncate">
                  {contractType === "Delivery" 
                    ? "Driver collects upon car delivery" 
                    : "Collected at shop counter"}
                </span>
              </div>
            </div>

            {/* Total Handover Collection Card */}
            {(() => {
              const extraFees = Number(rentalData.babySeatFee || 0) + Number(rentalData.deliveryFee || 0);
              const totalCharges = Number(rentalData.collectionAmount || 0) + extraFees;
              const advancePaid = Number(rentalData.advancePayment || 0);
              const remainingToCollect = Math.max(0, totalCharges - advancePaid);
              return (
                <div className="bg-brand/5 p-4 rounded-2xl border border-brand/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary block">
                      Remaining to Collect on Handover
                    </span>
                    <p className="text-xs text-text-muted mt-0.5">
                      Total Charges: AED {totalCharges}
                      {advancePaid > 0 ? ` - Prepaid Advance: AED ${advancePaid}` : ""}
                      {rentalData.deliveryFee > 0 ? ` (inc. Delivery AED ${rentalData.deliveryFee})` : ""}
                      {rentalData.babySeatFee > 0 ? ` (inc. Baby Seat AED ${rentalData.babySeatFee})` : ""}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-2xl font-black text-brand">
                      AED {remainingToCollect}
                    </span>
                    {advancePaid > 0 && (
                      <span className="text-xs font-bold text-emerald-700 block">
                        ✓ Prepaid Advance: AED {advancePaid}
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">Daily KM Limit</label>
                <input 
                  type="number" 
                  value={rentalData.dailyKmLimit} 
                  onChange={e => setRentalData({...rentalData, dailyKmLimit: Number(e.target.value)})} 
                  placeholder="0 = Unlimited"
                  className="w-full p-2.5 rounded-xl border border-border bg-white text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none" 
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">Price per Extra KM</label>
                <input 
                  type="number" 
                  value={rentalData.pricePerExtraKm} 
                  onChange={e => setRentalData({...rentalData, pricePerExtraKm: Number(e.target.value)})} 
                  className="w-full p-2.5 rounded-xl border border-border bg-white text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none" 
                />
              </div>
            </div>

            {/* Extra Fees Grid (Baby Seat Fee & Delivery Charge) */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">Baby Seat Fee</label>
                <input 
                  type="number" 
                  value={rentalData.babySeatFee === 0 ? "" : rentalData.babySeatFee} 
                  onChange={e => setRentalData({...rentalData, babySeatFee: Number(e.target.value)})} 
                  placeholder="0"
                  className="w-full p-2.5 rounded-xl border border-border bg-white text-sm outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" 
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">Delivery Charge</label>
                <input 
                  type="number" 
                  value={rentalData.deliveryFee === 0 ? "" : rentalData.deliveryFee} 
                  onChange={e => setRentalData({...rentalData, deliveryFee: Number(e.target.value)})} 
                  placeholder="0"
                  className="w-full p-2.5 rounded-xl border border-border bg-white text-sm outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" 
                />
              </div>
            </div>

            {/* Payment Method (Supports 1, 2, or 3 Methods with optional Split) */}
            <div className="pt-2 border-t border-gray-200/70">
              <PaymentMethodSelector
                value={rentalData.paymentMethod}
                onChange={(val) => setRentalData({ ...rentalData, paymentMethod: val })}
                totalAmount={Number(rentalData.depositAmount || 0)}
                totalLabel="Deposit Total"
                label="Payment Method / طريقة الدفع"
              />
            </div>


            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">
                {contractType === "Delivery" ? "Driver Instructions / Remarks (تعليمات للسائق)" : "Notes / ملاحظات"}
              </label>
              <textarea 
                rows={2}
                value={rentalData.notes} 
                onChange={e => setRentalData({...rentalData, notes: e.target.value})} 
                placeholder={contractType === "Delivery" 
                  ? "Special instructions for driver (e.g. handover details, client preferences)..."
                  : "Any notes about this rental..."}
                className="w-full p-2.5 rounded-xl border border-border bg-white text-xs outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand resize-none" 
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderReview = () => {
    const start = new Date(rentalData.startDate || Date.now());
    const end = new Date(rentalData.endDate || Date.now() + 86400000);
    const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));

    const clientObj = contractType === "Shop" ? clients.find(c => c._id === selectedClient) : null;
    const vehicleObj = units.find(u => u._id === selectedVehicle);
    const deliveryDriverObj = contractType === "Delivery" 
      ? drivers.find(d => d._id === rentalData.deliveryDriverId || d.userId === rentalData.deliveryDriverId)
      : null;

    return (
      <div className="space-y-6 animate-fade-in-up">
        <div>
          <h2 className="text-lg font-bold text-text-primary">
            {isEditMode 
              ? "Review & Save Contract Changes" 
              : `Review Booking & ${contractType === "Delivery" ? "Dispatch" : "Create"}`}
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            {isEditMode
              ? "Confirm agreement details, updated terms, photos, and signatures before saving."
              : contractType === "Delivery" 
                ? "Confirm details and dispatch delivery to the driver. Driver will register the client on-site."
                : "Confirm agreement details for this shop contract. The car is ready for the client."}
          </p>
        </div>

        <div className="bg-gray-50/70 rounded-2xl p-6 border border-border space-y-6">
          <div className={`grid grid-cols-1 md:grid-cols-2 ${contractType === "Delivery" ? "lg:grid-cols-3" : "lg:grid-cols-4"} gap-4`}>
            {/* Customer — for Shop or whenever a client is selected */}
            {(contractType === "Shop" || selectedClient) && (
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
                <span className="text-text-muted text-xs block mb-1">Customer</span>
                <strong className="text-text-primary text-sm font-bold block truncate">{clientObj?.name || (editingContract?.clientId?.name) || "N/A"}</strong>
                <span className="text-xs text-text-muted">{clientObj?.phone || (editingContract?.clientId?.phone) || ""}</span>
              </div>
            )}

            {/* Second Driver — if added */}
            {contractType === "Shop" && additionalDriver.name && (
              <div className="bg-white p-4 rounded-xl border border-brand/20 shadow-2xs bg-brand/5">
                <span className="text-brand text-xs font-semibold block mb-1 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-brand text-white text-[9px] font-black flex items-center justify-center">2</span>
                  <span>Second Driver</span>
                </span>
                <strong className="text-text-primary text-sm font-bold block truncate">{additionalDriver.name}</strong>
                <span className="text-xs text-text-muted block truncate">
                  {additionalDriver.phone ? `${additionalDriver.phone} • ` : ""}Lic: {additionalDriver.license || "N/A"}
                </span>
              </div>
            )}

            {/* For Delivery — show "Client TBD" */}
            {contractType === "Delivery" && (
              <div className="bg-white p-4 rounded-xl border border-amber-200/50 shadow-2xs bg-amber-50/30">
                <span className="text-text-muted text-xs block mb-1">Customer</span>
                <strong className="text-amber-800 text-sm font-bold block">To be registered by driver</strong>
                <span className="text-xs text-amber-600">Driver will collect client info on-site</span>
              </div>
            )}

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
              <span className="text-text-muted text-xs block mb-1">Vehicle</span>
              <strong className="text-text-primary text-sm font-bold block truncate">
                {vehicleObj ? `${vehicleObj.make} ${vehicleObj.model}` : "N/A"}
              </strong>
              <span className="text-xs text-text-muted font-mono">{vehicleObj?.plate || ""}</span>
            </div>

            {/* Driver — only for Delivery */}
            {contractType === "Delivery" && (
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
                <span className="text-text-muted text-xs block mb-1">Assigned Driver</span>
                <strong className="text-text-primary text-sm font-bold block truncate">
                  {deliveryDriverObj ? deliveryDriverObj.name : "No driver"}
                </strong>
                <span className="text-xs text-text-muted block truncate">
                  {deliveryDriverObj ? (deliveryDriverObj.email || deliveryDriverObj.phone || "Assigned Driver") : ""}
                </span>
              </div>
            )}

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
              <span className="text-text-muted text-xs block mb-1">
                {contractType === "Delivery" ? "Delivery Location" : "Pickup Location"}
              </span>
              <strong className="text-text-primary text-xs font-bold block truncate" title={rentalData.pickupLocation}>
                {rentalData.pickupLocation || "Main Office"}
              </strong>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-2xs">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-text-muted">Rental Period:</span>
                <span className="font-semibold text-text-primary">{rentalData.startDate} to {rentalData.endDate} (Expected, {totalDays} days)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 items-center">
                <span className="text-text-muted">Rental &amp; Customer Type:</span>
                <span className="font-semibold text-text-primary flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    rentalData.rentalType === "Monthly" ? "bg-purple-100 text-purple-700" : "bg-amber-100 text-amber-800"
                  }`}>
                    {rentalData.rentalType}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    rentalData.customerType === "B2B" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"
                  }`}>
                    {rentalData.customerType}
                  </span>
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-text-muted">
                  {contractType === "Delivery" ? "Scheduled Delivery Time:" : "Checkout Time:"}
                </span>
                <span className="font-semibold text-brand">{rentalData.checkoutTime}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-text-muted">Rental Collection Amount:</span>
                <span className="font-bold text-text-primary">AED {rentalData.collectionAmount} (~AED {rentalData.dailyRate}/day)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-text-muted">Initial Fuel &amp; Odometer:</span>
                <span className="font-bold text-text-primary flex items-center gap-1.5">
                  <span className="text-emerald-600">{rentalData.checkoutFuelLevel || 100}% Fuel</span>
                  {rentalData.checkoutMileage > 0 && (
                    <span className="text-gray-500">({rentalData.checkoutMileage.toLocaleString()} km)</span>
                  )}
                </span>
              </div>
              {rentalData.deliveryFee > 0 && (
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-text-muted">Delivery Fee:</span>
                  <span className="font-semibold text-text-primary">AED {rentalData.deliveryFee}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-text-muted">Expected Deposit:</span>
                <span className="font-bold text-emerald-600">
                  AED {rentalData.depositAmount} {contractType === "Delivery" ? "(Collected by driver)" : "(Collected at shop)"}
                </span>
              </div>
              {Number(rentalData.advancePayment || 0) > 0 && (
                <div className="flex justify-between py-1 border-b border-gray-100 bg-emerald-50/50 px-2 rounded-lg items-center">
                  <span className="text-emerald-800 font-bold text-xs">Prepaid Advance:</span>
                  <span className="font-black text-emerald-700 text-xs">- AED {rentalData.advancePayment}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-gray-100 bg-brand/5 px-2.5 rounded-lg items-center">
                <div>
                  <span className="font-bold text-brand block">
                    {Number(rentalData.advancePayment || 0) > 0 
                      ? "Remaining Handover Collection:" 
                      : "Total Handover Collection:"}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    {Number(rentalData.advancePayment || 0) > 0 
                      ? `Total AED ${Number(rentalData.collectionAmount || 0) + Number(rentalData.deliveryFee || 0)} - Advance AED ${rentalData.advancePayment}`
                      : `Collection Price ${rentalData.deliveryFee > 0 ? "+ Delivery" : ""}`}
                  </span>
                </div>
                <span className="text-base font-black text-brand">
                  AED {Math.max(0, (Number(rentalData.collectionAmount || 0) + Number(rentalData.deliveryFee || 0)) - Number(rentalData.advancePayment || 0))}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 items-center">
                <span className="text-text-muted">Payment Method &amp; Status:</span>
                <span className="font-semibold text-text-primary flex items-center gap-1.5">
                  {rentalData.paymentMethod.includes("Crypto") && <Coins size={14} className="text-amber-600" />}
                  {rentalData.paymentMethod.includes("Card") && <CreditCard size={14} className="text-blue-600" />}
                  {rentalData.paymentMethod.includes("Cash") && <Banknote size={14} className="text-emerald-600" />}
                  <span>{rentalData.paymentMethod}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ml-1 ${
                    rentalData.paymentStatus === "Paid" 
                      ? "bg-emerald-100 text-emerald-800" 
                      : rentalData.paymentStatus === "Partial" || Number(rentalData.advancePayment || 0) > 0
                      ? "bg-blue-100 text-blue-800"
                      : "bg-amber-100 text-amber-800"
                  }`}>
                    {rentalData.paymentStatus === "Paid" ? "Paid" : (Number(rentalData.advancePayment || 0) > 0 ? "Advance Paid (Partial)" : "Pending")}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Existing Inspection Photos in Edit Mode */}
          {isEditMode && Array.isArray(editingContract?.inspectionPhotos) && editingContract.inspectionPhotos.some(Boolean) && (
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-2xs space-y-3">
              <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                <Camera size={14} className="text-brand" />
                Handover Vehicle Inspection ({editingContract.inspectionPhotos.filter(Boolean).length}/8 photos)
              </span>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {editingContract.inspectionPhotos.map((url: string, idx: number) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-gray-50 flex flex-col items-center justify-center text-center p-1">
                    {url ? (
                      <img src={url} alt={`Angle ${idx + 1}`} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[9px] text-text-muted font-medium leading-tight">#{idx + 1}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Signature Box */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Show existing customer signature in edit mode if already present */}
            {isEditMode && editingContract?.customerSignature && (
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-2">
                <label className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                  <PenTool size={16} className="text-brand" />
                  Customer Signature (توقيع العميل المسجل)
                </label>
                <div className="h-40 border border-gray-200 rounded-xl p-2 bg-gray-50 flex items-center justify-center">
                  <img src={editingContract.customerSignature} alt="Customer Signature" className="max-h-full max-w-full object-contain" />
                </div>
              </div>
            )}

            {/* Admin / Company Official Stamp & Signature Box */}
            <div id="admin-signature-box" className={`bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-3 ${(!isEditMode || !editingContract?.customerSignature) ? "md:col-span-2" : ""}`}>
              <label className="text-sm font-bold text-text-primary flex items-center gap-2">
                <ShieldCheck size={18} className="text-blue-600 shrink-0" />
                <span>Company Stamp &amp; Signature (الختم والتوقيع الرسمي للإدارة)</span>
              </label>

              <div className="border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden bg-gradient-to-b from-gray-50/70 to-white flex items-center justify-center p-4 h-44 relative shadow-inner">
                <img 
                  src={adminSignatureData || "/images/admin-signature.png"} 
                  alt="Leon Car Rental Official Stamp & Signature" 
                  className="max-h-full max-w-full object-contain filter drop-shadow-sm select-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderInspectionPhotos = () => (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Step 4: Pre-Handover Vehicle Inspection Photos</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Take or upload 8 standard angles to document vehicle condition before client handover at the shop
          </p>
        </div>
      </div>

      {/* Fuel Level at Checkout */}
      <div className="bg-gray-50/60 p-5 rounded-2xl border border-gray-100">
        <FuelLevelSelector
          value={rentalData.checkoutFuelLevel}
          onChange={(val) => setRentalData({ ...rentalData, checkoutFuelLevel: val })}
          label="Fuel Level Percentage (مستوى الوقود عند الاستلام بالمحل)"
        />
      </div>

      <VehicleInspectionPhotoCapture
        photos={inspectionPhotos}
        onChange={setInspectionPhotos}
        title="Shop Handover Inspection (فحص تسليم السيارة بالمحل)"
        subtitle="Capture photos using direct camera or upload from gallery across all 8 standard angles."
        badgeLabel="Shop Handover"
      />
    </div>
  );

  // ===================== DETERMINE WHAT TO RENDER =====================

  const renderStepContent = () => {
    if (contractType === "Delivery") {
      // 3 Steps for Driver Delivery: Car (1) → Rental Data & Driver (2) → Review & Dispatch (3)
      // Client is skipped — driver registers the client upon delivery on-site
      if (currentStep === 1) return renderVehicleSelector();
      if (currentStep === 2) return renderRentalData();
      if (currentStep === 3) return renderReview();
      return null;
    }

    // 4 Clean Steps for Shop: Car (1) → Client (2) → Rental Data (3) → Review & Create (4)
    if (currentStep === 1) return renderVehicleSelector();
    if (currentStep === 2) return renderClientSelector();
    if (currentStep === 3) return renderRentalData();
    if (currentStep === 4) return renderReview();
    return null;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-fade-in-up">
        <div>
          <button
            onClick={() => router.push(isDriver ? "/driver" : "/bookings")}
            className="text-xs text-text-muted hover:text-text-primary flex items-center gap-1 mb-2 transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} /> Back to {isDriver ? "Driver Operations" : "Bookings"}
          </button>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold text-text-primary">
              {isEditMode 
                ? `Edit Rental Contract ${editingContract?.contractNumber ? `#${editingContract.contractNumber}` : ""}`
                : "Create New Booking"}
            </h1>
            {isEditMode && editingContract?.status && (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                editingContract.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                editingContract.status === "Completed" ? "bg-blue-50 text-blue-700 border-blue-200" :
                editingContract.status === "Delivered" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                "bg-amber-50 text-amber-700 border-amber-200"
              }`}>
                {editingContract.status}
              </span>
            )}
          </div>
          <p className="text-sm text-text-secondary mt-1">
            {isEditMode 
              ? "Update vehicle, customer, rental schedule, extra fees, inspection photos, and terms."
              : contractType === "Delivery" 
                ? "Delivery contract — driver will take the car to the client and register them on-site."
                : "Shop contract — client is at the shop counter. Complete inspection, sign, and activate."}
          </p>
        </div>

        {/* Contract Type Pill Switcher (Admins Only) */}
        {!isDriver && (
          <div className="bg-gray-100 p-1 rounded-2xl flex items-center border border-gray-200/80 shadow-2xs self-start md:self-auto shrink-0">
            <button
              type="button"
              onClick={() => {
                setContractType("Shop");
                if (currentStep > 4) setCurrentStep(4);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                contractType === "Shop"
                  ? "bg-white text-brand shadow-xs"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              <span>In-Store / Shop Contract (بالمحل)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setContractType("Delivery");
                if (currentStep === 3) setCurrentStep(2);
                else if (currentStep > 3) setCurrentStep(3);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                contractType === "Delivery"
                  ? "bg-white text-brand shadow-xs"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              <span>Driver Delivery (توصيل للسائق)</span>
            </button>
          </div>
        )}
      </div>

      {/* Stepper Header */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-4 sm:p-6 animate-fade-in-up stagger-1">
        <div className="relative w-full max-w-4xl mx-auto px-2 sm:px-4">
          {/* Background Track Line (connected precisely through centers of first and last circles) */}
          <div 
            className="absolute top-[18px] -translate-y-1/2 h-[2px] bg-gray-200 z-0 hidden sm:block pointer-events-none" 
            style={{
              left: `${100 / (2 * totalSteps)}%`,
              right: `${100 / (2 * totalSteps)}%`,
            }}
          />
          {/* Active Progress Line */}
          <div 
            className="absolute top-[18px] -translate-y-1/2 h-[2px] bg-brand z-0 transition-all duration-300 hidden sm:block pointer-events-none" 
            style={{
              left: `${100 / (2 * totalSteps)}%`,
              width: totalSteps > 1 
                ? `${((currentStep - 1) / (totalSteps - 1)) * (100 - (100 / totalSteps))}%` 
                : "0%",
            }}
          />
          
          <div className="flex items-start w-full relative z-10">
            {STEPS.map((step) => (
              <div 
                key={step.id} 
                className={`flex-1 min-w-0 flex flex-col items-center ${isEditMode ? "cursor-pointer" : ""}`}
                onClick={() => {
                  if (isEditMode) setCurrentStep(step.id);
                }}
              >
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isEditMode) setCurrentStep(step.id);
                    else if (step.id < currentStep) setCurrentStep(step.id);
                    else if (step.id === currentStep + 1) handleNext();
                  }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 border-2 cursor-pointer ${
                    currentStep === step.id 
                      ? "border-brand bg-brand text-white shadow-md shadow-brand/20 scale-105 ring-4 ring-white" 
                      : currentStep > step.id 
                      ? "border-brand bg-white text-brand ring-4 ring-white" 
                      : "border-gray-200 bg-white text-gray-400 ring-4 ring-white"
                  }`}
                >
                  {currentStep > step.id ? (
                    <CheckCircle size={15} className="text-brand shrink-0" />
                  ) : (
                    <span className="leading-none">{step.id}</span>
                  )}
                </button>
                <span 
                  className={`text-xs font-semibold hidden sm:block text-center w-full px-1 mt-2.5 leading-snug transition-colors ${
                    currentStep === step.id 
                      ? "text-brand font-bold" 
                      : currentStep > step.id 
                      ? "text-text-primary font-medium" 
                      : "text-text-muted"
                  }`}
                  title={step.title}
                >
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Wizard Step Content */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-6 sm:p-8 animate-fade-in-up stagger-2">
        {renderStepContent()}

        {/* Step Navigation Buttons */}
        <div className="flex items-center justify-between border-t border-border pt-6 mt-8">
          {currentStep > 1 ? (
            <button
              onClick={handleBack}
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl border border-border text-text-secondary hover:bg-gray-50 text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} />
              Previous Step
            </button>
          ) : (
            <div />
          )}

          {currentStep < totalSteps ? (
            <div className="flex items-center gap-3">
              {isEditMode && (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center gap-2 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                  title="Save all changes immediately"
                >
                  {isLoading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                  <span>Save Changes (حفظ)</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
              >
                <span>Next Step</span>
                <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isLoading}
              className="px-7 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center gap-2 transition-colors shadow-md disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{isEditMode ? "Saving Changes..." : "Creating Booking..."}</span>
                </>
              ) : (
                <>
                  <CheckCircle size={18} />
                  <span>
                    {isEditMode 
                      ? "Save Changes (حفظ التعديلات)" 
                      : (contractType === "Delivery" 
                          ? (isDriver ? "Create Delivery Contract" : "Create & Dispatch to Driver") 
                          : "Create Shop Contract")}
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Modal for creating a new client on the fly (with OCR scanner) */}
      <CreateClientModal
        isOpen={isClientModalOpen}
        onClose={() => {
          setIsClientModalOpen(false);
          setIsAddingForSecondDriver(false);
        }}
        onSuccess={handleClientModalSuccess}
      />

      {/* Modal for selecting or creating second driver */}
      <SelectSecondDriverModal
        isOpen={isSelectSecondDriverModalOpen}
        onClose={() => setIsSelectSecondDriverModalOpen(false)}
        clients={clients}
        primaryClientId={selectedClient}
        selectedSecondDriverClientId={secondDriverClient?._id || null}
        onSelectSecondDriver={handleSelectSecondDriver}
        onOpenCreateClientModal={() => {
          setIsAddingForSecondDriver(true);
          setIsClientModalOpen(true);
        }}
      />
    </div>
  );
}

export default function NewRentalAdminPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-pulse p-4 sm:p-6">
          <div className="h-8 w-64 bg-gray-200 rounded-lg"></div>
          <div className="h-4 w-96 bg-gray-200 rounded-lg mt-2"></div>
          <div className="bg-white rounded-2xl border border-gray-100 p-8 h-28 mt-4"></div>
          <div className="bg-white rounded-2xl border border-gray-100 p-8 min-h-[400px]"></div>
        </div>
      }
    >
      <NewRentalAdminPageContent />
    </Suspense>
  );
}
