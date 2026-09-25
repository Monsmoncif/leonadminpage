"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Edit,
  ShieldCheck,
  Navigation,
  Trash2,
  Sparkles
} from "lucide-react";
import { ExecutiveCarIcon } from "@/components/icons/ExecutiveCarIcon";
import StatusBadge from "@/components/ui/StatusBadge";
import FuelLevelSelector from "@/components/ui/FuelLevelSelector";
import PaymentMethodSelector from "@/components/ui/PaymentMethodSelector";
import VehicleInspectionPhotoCapture, { VEHICLE_ANGLES } from "@/components/ui/VehicleInspectionPhotoCapture";
import CreateClientModal from "@/components/modals/CreateClientModal";
import SelectSecondDriverModal from "@/components/modals/SelectSecondDriverModal";
import { useToast } from "@/components/providers/ToastProvider";

// EXACT same 5 steps as Admin Create New Booking (Shop Contract)
const STEPS = [
  { id: 1, title: "Car", icon: ExecutiveCarIcon },
  { id: 2, title: "Client", icon: User },
  { id: 3, title: "Inspection Photos", icon: Camera },
  { id: 4, title: "Rental Data", icon: FileText },
  { id: 5, title: "Sign & Review", icon: PenTool },
];

export const formatTimeDisplay = (rawTime?: string): string => {
  if (!rawTime || typeof rawTime !== "string") return "8:00 AM";
  const trimmed = rawTime.trim();
  if (!trimmed || trimmed.toLowerCase() === "pending handover") return "Pending Handover";

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

  return trimmed;
};

export default function ConfirmDeliveryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { data: session } = useSession();

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoadingContract, setIsLoadingContract] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contract, setContract] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Client list and selection (Matching Admin Step 2)
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<any | null>(null);

  // Second driver state (Matching Admin Step 2)
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

  // Rental Data state (Matching Admin Step 3)
  const [rentalData, setRentalData] = useState({
    rentalType: "Daily" as "Daily" | "Monthly",
    customerType: "B2C" as "B2C" | "B2B",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    checkoutTime: "10:00 AM",
    checkinTime: "10:00 AM",
    collectionAmount: 0,
    dailyRate: 0,
    dailyKmLimit: 0,
    pricePerExtraKm: 0,
    depositAmount: 0,
    pickupLocation: "Main Office",
    dropoffLocation: "",
    notes: "",
    babySeatFee: 0,
    deliveryFee: 0,
    checkoutFuelLevel: 100,
    paymentMethod: "Cash" as string,
    paymentStatus: "Pending" as "Pending" | "Partial" | "Paid"
  });

  const [isDepositConfirmed, setIsDepositConfirmed] = useState(false);

  // Step 4: Vehicle Inspection Photos (Matching Admin Step 4)
  const [inspectionPhotos, setInspectionPhotos] = useState<Record<string, string>>({});

  // Step 5: Customer Signature Canvas (Matching Admin Step 5)
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const hasDrawnRef = useRef(false);

  const totalSteps = STEPS.length;

  const getCurrentFormattedTime = () => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date());
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (typeof document !== "undefined") {
      document.documentElement?.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Fetch contract and client list on mount
  useEffect(() => {
    const contractId = searchParams.get("contractId") || searchParams.get("id");
    if (!contractId) {
      setError("No contract ID provided in the URL.");
      setIsLoadingContract(false);
      return;
    }

    const loadData = async () => {
      try {
        setIsLoadingContract(true);
        setError(null);

        // Fetch contract
        const res = await fetch(`/api/contracts/${contractId}`, { cache: "no-store" });
        if (!res.ok) {
          throw new Error("Failed to load contract details. Contract may not exist.");
        }
        const contractData = await res.json();
        setContract(contractData);

        // Fetch all clients
        try {
          const clientRes = await fetch("/api/clients", { cache: "no-store" });
          if (clientRes.ok) {
            const clientData = await clientRes.json();
            const list = Array.isArray(clientData) ? clientData : clientData.clients || [];
            setClients(list);
          }
        } catch (cErr) {
          console.warn("Could not load clients list:", cErr);
        }

        // Initialize primary client
        if (contractData.clientId) {
          const cid = contractData.clientId._id || contractData.clientId.id || contractData.clientId;
          setSelectedClient(String(cid));
          setClientToEdit(typeof contractData.clientId === "object" ? contractData.clientId : null);
        }

        // Initialize additional / second driver
        if (contractData.additionalDriverName) {
          setAdditionalDriver({
            name: contractData.additionalDriverName || "",
            license: contractData.additionalDriverLicense || "",
            nationality: contractData.additionalDriverNationality || "",
            phone: contractData.additionalDriverPhone || "",
            expiry: contractData.additionalDriverExpiry ? new Date(contractData.additionalDriverExpiry).toISOString().split("T")[0] : "",
            issuedAt: contractData.additionalDriverIssuedAt || "Dubai",
          });
        }

        // Initialize rental and financial data
        const initialCheckoutTime = contractData.checkoutTime && contractData.checkoutTime !== "Pending Handover"
          ? formatTimeDisplay(contractData.checkoutTime)
          : getCurrentFormattedTime();

        const collectionVal = contractData.collectionAmount !== undefined
          ? Number(contractData.collectionAmount)
          : (contractData.totalAmount !== undefined ? Number(contractData.totalAmount) : 0);

        setRentalData({
          rentalType: contractData.rentalType || "Daily",
          customerType: contractData.customerType || "B2C",
          startDate: contractData.startDate ? new Date(contractData.startDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          endDate: contractData.endDate ? new Date(contractData.endDate).toISOString().split("T")[0] : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          checkoutTime: initialCheckoutTime,
          checkinTime: contractData.checkinTime || "10:00 AM",
          collectionAmount: collectionVal,
          dailyRate: Number(contractData.dailyRate) || 0,
          dailyKmLimit: Number(contractData.dailyKmLimit) || 0,
          pricePerExtraKm: Number(contractData.pricePerExtraKm) || 0,
          depositAmount: Number(contractData.depositAmount) || 0,
          pickupLocation: contractData.pickupLocation || "Main Office",
          dropoffLocation: contractData.dropoffLocation || "",
          notes: contractData.notes || "",
          babySeatFee: Number(contractData.babySeatFees) || 0,
          deliveryFee: Number(contractData.deliveryCharges) || 0,
          checkoutFuelLevel: Number(contractData.checkoutFuelLevel) || 100,
          paymentMethod: contractData.paymentMethod || "Cash",
          paymentStatus: contractData.paymentStatus || "Pending",
        });

        // Initialize existing inspection photos
        if (Array.isArray(contractData.inspectionPhotos) && contractData.inspectionPhotos.length > 0) {
          const photoMap: Record<string, string> = {};
          VEHICLE_ANGLES.forEach((angle, idx) => {
            if (contractData.inspectionPhotos[idx]) {
              photoMap[angle] = contractData.inspectionPhotos[idx];
            }
          });
          setInspectionPhotos(photoMap);
        }

        if (contractData.customerSignature) {
          setSignatureData(contractData.customerSignature);
        }
      } catch (err: any) {
        console.error("Error loading handover contract:", err);
        setError(err.message || "Failed to load contract");
      } finally {
        setIsLoadingContract(false);
      }
    };

    loadData();
  }, [searchParams]);
  // Canvas initialization with Retina DPI scaling for iPads and Phones
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const dpr = window.devicePixelRatio || 1;
    const targetWidth = Math.round(rect.width * dpr);
    const targetHeight = Math.round(rect.height * dpr);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      const prevSig = signatureData;
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#0f172a";
        if (prevSig && prevSig.startsWith("data:image")) {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0, rect.width, rect.height);
          };
          img.src = prevSig;
        }
      }
    }
  }, [signatureData]);

  useEffect(() => {
    if (currentStep === 5) {
      const timer1 = setTimeout(initCanvas, 50);
      const timer2 = setTimeout(initCanvas, 250);
      window.addEventListener("resize", initCanvas);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        window.removeEventListener("resize", initCanvas);
      };
    }
  }, [currentStep, initCanvas]);

  // Handle Client Selection & Modal Handlers
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

  const handleClientModalSuccess = (savedClient?: any) => {
    if (savedClient) {
      setClients((prev) => {
        const idx = prev.findIndex((c) => c._id === savedClient._id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = savedClient;
          return copy;
        }
        return [savedClient, ...prev];
      });

      if (isAddingForSecondDriver) {
        handleSelectSecondDriver(savedClient);
        setIsAddingForSecondDriver(false);
        toast.success(`Registered "${savedClient.name}" and selected as Second Driver!`);
      } else {
        setSelectedClient(savedClient._id || savedClient.id);
        setClientToEdit(savedClient);
        toast.success(`Client "${savedClient.name}" updated successfully!`);
      }
    }
    setIsClientModalOpen(false);
  };

  // Canvas Drawing Handlers - Customer Signature
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;
    if ("touches" in e) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ("changedTouches" in e && (e as any).changedTouches.length > 0) {
        clientX = (e as any).changedTouches[0].clientX;
        clientY = (e as any).changedTouches[0].clientY;
      }
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if ("touches" in e && e.cancelable) {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (canvas.width === 0 || canvas.height === 0) {
      initCanvas();
    }

    setIsDrawing(true);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if ("touches" in e && e.cancelable) {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(x, y);
    ctx.stroke();
    hasDrawnRef.current = true;
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas && hasDrawnRef.current) {
      setSignatureData(canvas.toDataURL("image/png"));
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    hasDrawnRef.current = false;
    setSignatureData(null);
  };

  // Navigation Validation
  const handleNext = () => {
    setError(null);

    if (currentStep === 1) {
      if (!rentalData.checkoutTime.trim()) {
        setError("Please enter the checkout handover time.");
        toast.error("Checkout handover time is required.");
        return;
      }
    }

    if (currentStep === 2) {
      if (!selectedClient) {
        setError("Please select or register the primary customer.");
        toast.error("A customer is strictly required before handover.");
        return;
      }
    }

    if (currentStep === 3) {
      const photoCount = Object.values(inspectionPhotos).filter(Boolean).length;
      if (photoCount < 8) {
        toast.info(`Note: ${photoCount}/8 inspection photos captured. You can proceed or add remaining angles.`);
      }
    }

    if (currentStep === 4) {
      if (!isDepositConfirmed) {
        setError("Please check 'Confirm Get All Money (تأكيد استلام كامل المبلغ)' to confirm collection of rental and deposit funds.");
        toast.error("Please confirm collection of all due money before proceeding.");
        return;
      }
    }

    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
      scrollToTop();
    }
  };

  const handleBack = () => {
    setError(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      scrollToTop();
    }
  };

  // Final Handover Submission
  const handleConfirmHandover = async () => {
    if (!contract) return;
    setError(null);

    if (!selectedClient) {
      setError("Please select or register the primary customer.");
      toast.error("A customer must be linked to the contract.");
      setCurrentStep(2);
      return;
    }

    if (!isDepositConfirmed) {
      setError("Please confirm collection of all due funds before completing handover.");
      toast.error("Confirm Get All Money is required.");
      setCurrentStep(4);
      return;
    }

    if (!signatureData) {
      setError("Customer signature is required. Please capture customer signature in Step 5.");
      toast.error("Customer signature is required. (توقيع العميل مطلوب)");
      return;
    }

    setIsSubmitting(true);
    toast.success("Activating contract and completing vehicle handover...");

    try {
      const contractId = contract._id || contract.id;
      const formattedCheckoutTime = formatTimeDisplay(rentalData.checkoutTime);

      const inspectionArray = VEHICLE_ANGLES.map((angle) => inspectionPhotos[angle] || "");

      const payload = {
        deliveryStatus: "Delivered",
        status: "Active",
        checkoutTime: formattedCheckoutTime,
        checkoutFuelLevel: rentalData.checkoutFuelLevel,
        clientId: selectedClient,
        additionalDriverName: additionalDriver.name.trim(),
        additionalDriverLicense: additionalDriver.license.trim(),
        additionalDriverNationality: additionalDriver.nationality.trim(),
        additionalDriverPhone: additionalDriver.phone.trim(),
        additionalDriverExpiry: additionalDriver.expiry,
        additionalDriverIssuedAt: additionalDriver.issuedAt.trim(),
        paymentMethod: rentalData.paymentMethod,
        depositAmount: Number(rentalData.depositAmount),
        collectionAmount: Number(rentalData.collectionAmount),
        notes: rentalData.notes,
        customerSignature: signatureData,
        adminSignature: contract.adminSignature || null,
        inspectionPhotos: inspectionArray,
        handoverCompletedAt: new Date().toISOString(),
        deliveredBy: (session?.user as any)?.name || "Driver",
      };

      const res = await fetch(`/api/contracts/${contractId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const resData = await res.json();
        throw new Error(resData.error || "Failed to confirm delivery handover.");
      }

      toast.success("Vehicle handover completed and contract activated successfully! ✓");
      router.push("/driver");
    } catch (err: any) {
      console.error("Handover submit error:", err);
      setError(err.message || "Failed to complete vehicle handover.");
      toast.error(err.message || "Handover failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter Clients (Matching Admin Step 2)
  const filteredClients = clientSearchQuery
    ? clients.filter(
        (c) =>
          c.name?.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
          c.phone?.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
          c.idNumber?.toLowerCase().includes(clientSearchQuery.toLowerCase())
      )
    : (() => {
        const top6 = clients.slice(0, 6);
        if (selectedClient && !top6.some((c) => String(c._id) === String(selectedClient))) {
          const selected = clients.find((c) => String(c._id) === String(selectedClient));
          if (selected) return [selected, ...top6];
        }
        return top6;
      })();

  if (isLoadingContract) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-pulse">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="h-8 w-64 bg-gray-200 rounded-lg"></div>
            <div className="h-4 w-96 bg-gray-200 rounded-lg mt-3"></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-8 flex items-center justify-between">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200"></div>
              <div className="w-16 h-2 bg-gray-200 rounded-full hidden sm:block"></div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 min-h-[400px]">
          <div className="h-6 w-48 bg-gray-200 rounded-lg mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-48 bg-gray-100 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && !contract) {
    return (
      <div className="max-w-lg mx-auto mt-20 p-8 bg-white rounded-3xl border border-border text-center shadow-lg">
        <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-100">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-text-primary mb-2">Contract Handover Error</h2>
        <p className="text-sm text-text-secondary mb-6">{error}</p>
        <button
          onClick={() => router.push("/driver")}
          className="px-6 py-2.5 bg-brand text-white text-xs font-bold rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer"
        >
          Back to Driver Dashboard
        </button>
      </div>
    );
  }

  // Contract Details
  const contractNum = contract.contractNumber
    ? String(contract.contractNumber)
    : contract.id || contract._id?.substring(0, 8)?.toUpperCase() || "N/A";
  const vehicleName =
    contract.vehicle?.replace(/\s*\([^)]*\)/, "").trim() ||
    (contract.unitId ? `${contract.unitId.make} ${contract.unitId.model}` : "Vehicle");
  const plateMatch = (contract.vehicle || "").match(/\(([^)]+)\)/);
  const plateNumber =
    contract.vehiclePlate || contract.unitId?.plate || contract.plate || (plateMatch ? plateMatch[1] : "");
  const vehicleColor = contract.vehicleColor || contract.unitId?.color || "";
  const vehicleYear = contract.vehicleYear || contract.unitId?.year || "";
  const vehicleFuel = contract.vehicleFuel || contract.unitId?.fuelType || "Petrol";
  const vehicleImage = contract.vehicleImage || contract.unitId?.images?.[0] || "";
  const pickupLoc = contract.pickupLocation || rentalData.pickupLocation || "Main Office";

  const totalDays = Math.max(
    1,
    Math.ceil(
      (new Date(rentalData.endDate).getTime() - new Date(rentalData.startDate).getTime()) /
        (1000 * 3600 * 24)
    )
  );
  const collectionTotal = Number(rentalData.collectionAmount || 0);
  const depositTotal = Number(rentalData.depositAmount || 0);
  const grandTotal = collectionTotal + depositTotal;

  // Selected client object (strictly null when deselected)
  const selectedClientObj = selectedClient
    ? clients.find((c) => String(c._id) === String(selectedClient)) || (typeof clientToEdit === "object" && clientToEdit?._id ? clientToEdit : null)
    : null;
  const secondDriverName = secondDriverClient?.name || additionalDriver.name;
  const secondDriverLicense = secondDriverClient?.licenseNumber || additionalDriver.license;

  // ===================== STEP 1: CAR =====================
  const renderCarStep = () => (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Assigned Car (السيارة المحددة للمهمة)</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Verify the assigned vehicle profile, set handover time, and inspect checkout fuel level
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Vehicle Profile Card (Matching Admin Car Card Style) */}
        <div className="bg-card rounded-2xl border border-brand bg-brand-light/10 ring-2 ring-brand/30 p-5 space-y-4 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-text-muted font-bold mb-0.5">
                {contract.unitId?.make || "Vehicle"} • {vehicleYear || new Date().getFullYear()}
              </p>
              <h3 className="text-base font-bold text-text-primary leading-tight">{vehicleName}</h3>
            </div>
            <span className="bg-brand text-white p-1 rounded-full shrink-0">
              <CheckCircle2 size={16} />
            </span>
          </div>

          <div className="flex-1 flex items-center justify-center min-h-[140px] my-2 relative bg-gray-50/70 rounded-xl border border-gray-100">
            {vehicleImage ? (
              <img
                src={vehicleImage}
                alt={vehicleName}
                className="max-w-full max-h-32 object-contain drop-shadow-sm"
              />
            ) : (
              <ExecutiveCarIcon size={52} className="text-gray-300" />
            )}
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
            {plateNumber && (
              <span className="font-mono text-brand font-bold bg-brand/10 px-2.5 py-1 rounded-md border border-brand/20">
                {plateNumber}
              </span>
            )}
            <div className="text-right">
              <span className="text-xs text-text-muted">Color: </span>
              <span className="font-semibold text-text-primary">{vehicleColor || "Standard"}</span>
              <span className="mx-1.5 text-gray-300">•</span>
              <span className="text-xs text-text-muted">Fuel: </span>
              <span className="font-semibold text-text-primary">{vehicleFuel}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs pt-1">
            <div className="bg-white p-3 rounded-xl border border-border/80">
              <span className="text-text-muted text-[11px] block">Checkout Mileage</span>
              <span className="font-bold text-text-primary text-sm">
                {contract.checkoutMileage ? `${contract.checkoutMileage.toLocaleString()} km` : "Recorded in Fleet"}
              </span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-border/80">
              <span className="text-text-muted text-[11px] block">Daily KM Limit</span>
              <span className="font-bold text-text-primary text-sm">
                {contract.dailyKmLimit > 0 ? `${contract.dailyKmLimit} km / day` : "Unlimited"}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Handover Schedule & Fuel */}
        <div className="space-y-5">
          {/* Checkout Time & Location Card */}
          <div className="bg-white rounded-2xl border border-border p-5 space-y-4 shadow-2xs">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Clock size={16} className="text-brand" />
              <span>Handover Schedule &amp; Destination</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">
                  Handover Checkout Time (وقت تسليم السيارة للعميل) <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Clock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      value={rentalData.checkoutTime}
                      onChange={(e) => setRentalData({ ...rentalData, checkoutTime: e.target.value })}
                      placeholder="e.g. 10:30 AM"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-gray-50 border border-border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setRentalData({ ...rentalData, checkoutTime: getCurrentFormattedTime() })}
                    className="px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-text-secondary text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0"
                    title="Set to Current Time"
                  >
                    Now
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">
                  Handover Location (مكان التسليم)
                </label>
                <div className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl border border-border/80">
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin size={15} className="text-brand shrink-0" />
                    <span className="text-xs font-semibold text-text-primary truncate">{pickupLoc}</span>
                  </div>
                  {pickupLoc && (
                    <button
                      type="button"
                      onClick={() =>
                        window.open(
                          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pickupLoc)}`,
                          "_blank"
                        )
                      }
                      className="px-2.5 py-1 bg-white hover:bg-brand/10 text-brand border border-brand/20 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 shrink-0 transition-all cursor-pointer shadow-2xs"
                    >
                      <Navigation size={12} />
                      <span>Open Maps</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Checkout Fuel Level */}
          <div className="bg-white rounded-2xl border border-border p-5 space-y-3 shadow-2xs">
            <FuelLevelSelector
              value={rentalData.checkoutFuelLevel}
              onChange={(lvl) => setRentalData({ ...rentalData, checkoutFuelLevel: lvl })}
              label="Checkout Fuel Level (مستوى الوقود عند التسليم)"
            />
          </div>
        </div>
      </div>
    </div>
  );

  // ===================== STEP 2: CLIENT (Matching Admin renderClientSelector) =====================
  const renderClientStep = () => (
    <div className="space-y-5 animate-fade-in-up">
      {/* Step Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Select Customer (اختيار العميل)</h2>
          <p className="text-xs text-text-muted mt-0.5">Click a customer card to select, or register / edit client</p>
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
              setClientToEdit(selectedClientObj || null);
              setIsClientModalOpen(true);
            }}
            className="px-3.5 py-2 bg-brand text-white rounded-xl text-xs font-semibold hover:bg-brand-dark transition-colors flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
            title="Edit selected client or register new"
          >
            <UserCheck size={14} />
            <span>{selectedClientObj ? "Edit Client" : "+ New Client"}</span>
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
            <span
              className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-white text-[9px] font-black flex items-center justify-center shadow-xs ${
                secondDriverName ? "bg-red-600" : "bg-gray-400 group-hover:bg-red-600"
              }`}
            >
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
              <span className="w-5 h-5 rounded-full bg-brand text-white text-[9px] font-black flex items-center justify-center">
                1
              </span>
              <span className="text-xs font-semibold text-text-primary truncate max-w-[160px]">
                {selectedClientObj.name}
              </span>
              <CheckCircle2 size={13} className="text-brand shrink-0" />
              <button
                type="button"
                onClick={() => {
                  setClientToEdit(selectedClientObj);
                  setIsClientModalOpen(true);
                }}
                className="text-brand hover:text-brand-dark transition-colors cursor-pointer text-[10px] font-bold underline ml-1"
                title="Edit Client Info"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedClient(null);
                  setClientToEdit(null);
                  setError(null);
                }}
                className="text-text-muted hover:text-red-500 transition-colors cursor-pointer ml-0.5"
                title="Deselect client"
              >
                <X size={13} />
              </button>
            </div>
          )}
          {secondDriverName && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-200">
              <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center">
                2
              </span>
              <span className="text-xs font-semibold text-text-primary truncate max-w-[140px]">
                {secondDriverName}
              </span>
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
          Showing latest 6 customers. Use search to find any other customer, or click &quot;Edit Client&quot; to update details.
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
            const isSelected = selectedClient ? String(selectedClient) === String(client._id) : false;
            return (
              <div
                key={client._id}
                onClick={() => {
                  setError(null);
                  if (selectedClient && String(selectedClient) === String(client._id)) {
                    // Clicked again on selected client -> Deselect
                    setSelectedClient(null);
                    setClientToEdit(null);
                  } else {
                    // Select client
                    setSelectedClient(String(client._id));
                    setClientToEdit(client);
                  }
                }}
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
                    {client.idNumber && (
                      <span className="text-[10px] font-mono text-gray-500 block truncate">
                        ID: {client.idNumber}
                      </span>
                    )}
                  </div>
                </div>
                {isSelected ? (
                  <span className="bg-brand text-white p-1 rounded-full shrink-0">
                    <CheckCircle2 size={16} />
                  </span>
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

  // ===================== STEP 3: RENTAL DATA (Matching Admin renderRentalData) =====================
  const renderRentalDataStep = () => (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-lg font-bold text-text-primary">Rental Period &amp; Financial Terms</h2>
        <p className="text-xs text-text-muted mt-0.5">
          Specify dates, locations, payment method, and confirm collection of all required money
        </p>
      </div>

      {/* Rental Plan & Customer Type Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50/70 p-4 rounded-2xl border border-gray-200/80">
        {/* Rental Type: Daily vs Monthly (Fixed by Admin) */}
        <div>
          <span className="text-xs font-bold text-text-primary block mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Calendar size={14} className="text-brand" />
              <span>Rental Type (نوع الإيجار)</span>
            </span>
            <span className="text-[11px] font-semibold text-brand">
              {rentalData.rentalType === "Monthly" ? "Monthly Plan (30+ Days)" : "Daily Rate"}
            </span>
          </span>
          <div className="p-2.5 bg-white rounded-xl border border-gray-200 flex items-center justify-between shadow-2xs">
            <span className="text-xs font-bold text-text-primary">
              {rentalData.rentalType === "Monthly" ? "Monthly / شهري" : "Daily / يومي"}
            </span>
            <span className="text-[10px] text-text-muted font-medium bg-gray-100 px-2 py-0.5 rounded">
              Contract Terms
            </span>
          </div>
        </div>

        {/* Customer Type: B2C vs B2B (Fixed by Admin) */}
        <div>
          <span className="text-xs font-bold text-text-primary block mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <User size={14} className="text-brand" />
              <span>Customer Type (نوع العميل)</span>
            </span>
            <span className="text-[11px] font-semibold text-brand">
              {rentalData.customerType === "B2B" ? "Corporate Account" : "Individual (B2C)"}
            </span>
          </span>
          <div className="p-2.5 bg-white rounded-xl border border-gray-200 flex items-center justify-between shadow-2xs">
            <span className="text-xs font-bold text-text-primary">
              {rentalData.customerType === "B2B" ? "B2B (Corporate / شركات)" : "B2C (Individual / فردي)"}
            </span>
            <span className="text-[10px] text-text-muted font-medium bg-gray-100 px-2 py-0.5 rounded">
              Contract Terms
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Dates & Logistics */}
        <div className="space-y-4 bg-gray-50/60 p-5 rounded-2xl border border-gray-100">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <Calendar size={16} className="text-brand" /> Dates &amp; Logistics
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">Start Date</label>
              <input
                type="date"
                value={rentalData.startDate}
                readOnly
                disabled
                className="w-full p-2.5 rounded-xl border border-border bg-gray-100/80 text-gray-700 text-sm font-medium cursor-not-allowed outline-none select-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">
                End Date ({totalDays} days)
              </label>
              <input
                type="date"
                value={rentalData.endDate}
                readOnly
                disabled
                className="w-full p-2.5 rounded-xl border border-border bg-gray-100/80 text-gray-700 text-sm font-medium cursor-not-allowed outline-none select-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1 flex items-center gap-1">
              <Clock size={13} className="text-brand" />
              <span>Checkout Time (وقت استلام السيارة)</span>
              <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={rentalData.checkoutTime}
                onChange={(e) => setRentalData({ ...rentalData, checkoutTime: e.target.value })}
                placeholder="e.g. 10:00 AM"
                className="w-full p-2.5 pl-8 rounded-xl border border-border bg-white text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none font-medium"
              />
              <Clock size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1">Handover Location</label>
            <input
              type="text"
              value={rentalData.pickupLocation}
              onChange={(e) => setRentalData({ ...rentalData, pickupLocation: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-border bg-white text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none"
            />
          </div>

          {/* Fuel Level Percentage */}
          <div className="pt-2 border-t border-gray-200/70">
            <FuelLevelSelector
              value={rentalData.checkoutFuelLevel}
              onChange={(val) => setRentalData({ ...rentalData, checkoutFuelLevel: val })}
              label="Handover Fuel Level (مستوى الوقود عند التسليم)"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1">Handover Notes</label>
            <textarea
              rows={2}
              value={rentalData.notes}
              onChange={(e) => setRentalData({ ...rentalData, notes: e.target.value })}
              placeholder="Any special handover instructions or damage remarks..."
              className="w-full p-2.5 rounded-xl border border-border bg-white text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none resize-none"
            />
          </div>
        </div>

        {/* Financial Terms & Payment Method (Locked & Non-Editable by Driver) */}
        <div className="space-y-4 bg-gray-50/60 p-5 rounded-2xl border border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <DollarSign size={16} className="text-brand" /> Financial Terms &amp; Payment
            </h3>
            <span className="text-[10px] font-bold text-text-muted bg-gray-200/80 px-2 py-0.5 rounded">
              Fixed by Admin
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">
                Rental Collection (AED)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={rentalData.collectionAmount === 0 ? "" : rentalData.collectionAmount}
                  readOnly
                  disabled
                  placeholder="0"
                  className="w-full p-2.5 rounded-xl border border-border bg-gray-100/90 text-text-primary text-sm font-bold cursor-not-allowed outline-none select-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">
                Security Deposit (AED)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={rentalData.depositAmount === 0 ? "" : rentalData.depositAmount}
                  readOnly
                  disabled
                  placeholder="0"
                  className="w-full p-2.5 rounded-xl border border-border bg-gray-100/90 text-text-primary text-sm font-bold cursor-not-allowed outline-none select-none"
                />
              </div>
            </div>
          </div>

          {/* Payment Method Selector (Cash, Card, Crypto, Multi-Split) */}
          <div className="pt-2">
            <PaymentMethodSelector
              value={rentalData.paymentMethod}
              onChange={(pm) => setRentalData({ ...rentalData, paymentMethod: pm })}
              totalAmount={collectionTotal}
              label="Payment Method (طريقة الدفع)"
            />
          </div>

          {/* Grand Total Collection Card */}
          <div className="p-3 bg-brand/5 rounded-xl border border-brand/20 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-brand block">Total Collection Due / المستحق:</span>
              <span className="text-[10px] text-text-muted">Rent Collection + Security Deposit</span>
            </div>
            <span className="text-lg font-black text-brand">AED {grandTotal.toLocaleString()}</span>
          </div>

          {/* Mandatory Checkbox: Confirm Get All Money */}
          <div className="p-3.5 bg-amber-50/80 rounded-xl border border-amber-200">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isDepositConfirmed}
                onChange={(e) => setIsDepositConfirmed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold text-amber-950 block">
                  Confirm Get All Money (تأكيد استلام كامل المبلغ) *
                </span>
                <span className="text-[11px] text-amber-800 mt-0.5 block">
                  I certify that all required money (Rental Collection of AED {collectionTotal.toLocaleString()} + Deposit of AED {depositTotal.toLocaleString()} = Total AED {grandTotal.toLocaleString()}) has been received from the customer.
                </span>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  // ===================== STEP 4: INSPECTION PHOTOS (Matching Admin renderInspectionPhotos) =====================
  const renderInspectionStep = () => (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Step 4: Pre-Handover Vehicle Inspection Photos</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Take or upload 8 standard angles to document vehicle condition before client handover
          </p>
        </div>
      </div>

      <VehicleInspectionPhotoCapture
        photos={inspectionPhotos}
        onChange={setInspectionPhotos}
        title="Vehicle Handover Inspection (فحص تسليم السيارة)"
        subtitle="Capture photos using direct camera or upload from gallery across all 8 standard angles."
        badgeLabel="Handover Inspection"
      />
    </div>
  );

  // ===================== STEP 5: SIGN & REVIEW (Matching Admin renderReview) =====================
  const renderReviewStep = () => (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Step 5: Review &amp; Sign Contract</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Review full handover terms and capture signatures to finalize and activate the rental contract
          </p>
        </div>
      </div>

      {/* Summary Profile Grid (Matching Admin Profile Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
          <span className="text-text-muted text-xs block mb-1">Customer</span>
          <strong className="text-text-primary text-sm font-bold block truncate">
            {selectedClientObj?.name || "No client selected"}
          </strong>
          <span className="text-xs text-text-muted block truncate">{selectedClientObj?.phone || ""}</span>
        </div>

        {secondDriverName ? (
          <div className="bg-white p-4 rounded-xl border border-red-200 shadow-2xs bg-red-50/20">
            <span className="text-red-700 text-xs font-bold block mb-1">2nd Driver (Authorized)</span>
            <strong className="text-text-primary text-sm font-bold block truncate">{secondDriverName}</strong>
            <span className="text-xs text-text-muted block truncate">
              {additionalDriver.phone ? `${additionalDriver.phone} • ` : ""}Lic: {secondDriverLicense || "N/A"}
            </span>
          </div>
        ) : (
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
            <span className="text-text-muted text-xs block mb-1">2nd Driver</span>
            <strong className="text-text-muted text-sm font-medium block">None Assigned</strong>
            <span className="text-xs text-text-muted">Only primary hirer</span>
          </div>
        )}

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
          <span className="text-text-muted text-xs block mb-1">Vehicle</span>
          <strong className="text-text-primary text-sm font-bold block truncate">{vehicleName}</strong>
          <span className="text-xs text-text-muted font-mono">{plateNumber || ""}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
          <span className="text-text-muted text-xs block mb-1">Handover Location</span>
          <strong className="text-text-primary text-xs font-bold block truncate" title={pickupLoc}>
            {pickupLoc}
          </strong>
          <span className="text-xs text-text-muted">{formatTimeDisplay(rentalData.checkoutTime)}</span>
        </div>
      </div>

      {/* Financial & Terms Breakdown Card */}
      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-2xs">
        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-gray-100">
            <span className="text-text-muted">Rental Period:</span>
            <span className="font-semibold text-text-primary">
              {rentalData.startDate} to {rentalData.endDate} ({totalDays} days)
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-100 items-center">
            <span className="text-text-muted">Rental &amp; Customer Type:</span>
            <span className="font-semibold text-text-primary flex items-center gap-1.5">
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  rentalData.rentalType === "Monthly" ? "bg-purple-100 text-purple-700" : "bg-amber-100 text-amber-800"
                }`}
              >
                {rentalData.rentalType}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  rentalData.customerType === "B2B" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"
                }`}
              >
                {rentalData.customerType}
              </span>
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-100">
            <span className="text-text-muted">Handover Checkout Time:</span>
            <span className="font-semibold text-brand">{formatTimeDisplay(rentalData.checkoutTime)}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-100">
            <span className="text-text-muted">Rental Collection Amount:</span>
            <span className="font-bold text-text-primary">AED {collectionTotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-100">
            <span className="text-text-muted">Initial Fuel Level:</span>
            <span className="font-bold text-emerald-600">{rentalData.checkoutFuelLevel || 100}%</span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-100">
            <span className="text-text-muted">Security Deposit:</span>
            <span className="font-bold text-emerald-600">AED {depositTotal.toLocaleString()} (Collected)</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100 bg-brand/5 px-2.5 rounded-lg items-center">
            <div>
              <span className="font-bold text-brand block">Total Handover Collection (إجمالي التحصيل):</span>
              <span className="text-[10px] text-text-muted">Collection Price + Deposit</span>
            </div>
            <span className="text-base font-black text-brand">AED {grandTotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-100 items-center">
            <span className="text-text-muted">Payment Method:</span>
            <span className="font-semibold text-text-primary flex items-center gap-1.5">
              {rentalData.paymentMethod.includes("Crypto") && <Coins size={14} className="text-amber-600" />}
              {rentalData.paymentMethod.includes("Card") && <CreditCard size={14} className="text-blue-600" />}
              {rentalData.paymentMethod.includes("Cash") && <Banknote size={14} className="text-emerald-600" />}
              <span>{rentalData.paymentMethod}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Inspection Photos Summary */}
      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
            <Camera size={14} className="text-brand" />
            Pre-Handover Vehicle Inspection ({Object.values(inspectionPhotos).filter(Boolean).length}/8 photos captured)
          </span>
          <button
            type="button"
            onClick={() => setCurrentStep(3)}
            className="text-[11px] text-brand font-semibold hover:underline cursor-pointer"
          >
            Edit Photos
          </button>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {VEHICLE_ANGLES.map((angle, idx) => {
            const url = inspectionPhotos[angle];
            return (
              <div
                key={angle}
                className="relative aspect-square rounded-lg overflow-hidden border border-border bg-gray-50 flex flex-col items-center justify-center text-center p-1"
              >
                {url ? (
                  <img src={url} alt={angle} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[9px] text-text-muted font-medium leading-tight">
                    #{idx + 1}
                    <br />
                    {angle.split(" ")[0]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Customer Signature Box (Only Hirer Signature Required) */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-bold text-text-primary flex items-center gap-1.5">
              <PenTool size={16} className="text-brand" />
              <span>Customer Signature (توقيع العميل)</span>
              <span className="text-red-500 font-bold">*</span>
            </label>
            <p className="text-xs text-text-muted mt-0.5">Customer signature acknowledging vehicle handover, inspection condition, and contract terms.</p>
          </div>
          {signatureData && (
            <button
              type="button"
              onClick={clearSignature}
              className="text-xs text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg flex items-center gap-1 font-semibold cursor-pointer transition-colors"
            >
              <RotateCcw size={12} /> Clear
            </button>
          )}
        </div>

        <div className="relative border-2 border-dashed border-gray-300 rounded-2xl bg-white overflow-hidden shadow-inner touch-none">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-48 sm:h-56 cursor-crosshair bg-white block"
          />
          {!signatureData && !isDrawing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-gray-400 space-y-1.5 select-none">
              <PenTool size={26} className="opacity-40" />
              <span className="text-xs font-semibold">Please draw customer signature here (finger or stylus)</span>
              <span className="text-[11px] text-gray-400/80 font-medium" dir="rtl">يرجى توقيع العميل هنا باليد أو القلم</span>
            </div>
          )}
          <div className="absolute bottom-3 left-4 right-4 pointer-events-none flex items-center justify-between border-t border-dashed border-gray-200 pt-1 text-[10px] text-gray-400 uppercase tracking-widest font-semibold select-none">
            <span>Customer Signature</span>
            <span>توقيع العميل</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
          <span className="text-text-muted">Touch screen or drag mouse/stylus to sign.</span>
          {signatureData ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
              <CheckCircle2 size={13} className="text-emerald-600" /> Signature Captured
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg">
              <AlertCircle size={13} className="text-red-600" /> Required / Touch to Sign
            </span>
          )}
        </div>
      </div>
    </div>
  );

  // Render active step content
  const renderStepContent = () => {
    if (currentStep === 1) return renderCarStep();
    if (currentStep === 2) return renderClientStep();
    if (currentStep === 3) return renderInspectionStep();
    if (currentStep === 4) return renderRentalDataStep();
    if (currentStep === 5) return renderReviewStep();
    return null;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header (Matching Admin Header Exactly) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-fade-in-up">
        <div>
          <button
            onClick={() => router.push("/driver")}
            className="text-xs text-text-muted hover:text-text-primary flex items-center gap-1 mb-2 transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} /> Back to Driver Dashboard
          </button>
          <h1 className="text-2xl font-bold text-text-primary">Confirm Vehicle Handover</h1>
          <p className="text-sm text-text-secondary mt-1">
            Handover delivery contract #{contractNum} — inspect vehicle, collect rental &amp; deposit, sign, and activate.
          </p>
        </div>

        {/* Contract Info Pill (Matching Admin Header Pill) */}
        <div className="bg-gray-100 p-1.5 rounded-2xl flex items-center gap-2 border border-gray-200/80 shadow-2xs self-start md:self-auto shrink-0">
          <span className="px-3 py-1.5 bg-white rounded-xl text-xs font-bold text-brand shadow-xs">
            Contract #{contractNum}
          </span>
          <span className="px-3 py-1.5 text-xs font-semibold text-text-secondary">
            {vehicleName}
          </span>
        </div>
      </div>

      {/* Stepper Header (100% IDENTICAL to Admin Create New Booking) */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-4 sm:p-6 animate-fade-in-up stagger-1">
        <div className="relative w-full max-w-4xl mx-auto px-2 sm:px-4">
          {/* Background Track Line */}
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
              width:
                totalSteps > 1
                  ? `${((currentStep - 1) / (totalSteps - 1)) * (100 - (100 / totalSteps))}%`
                  : "0%",
            }}
          />

          <div className="flex items-start w-full relative z-10">
            {STEPS.map((step) => (
              <div key={step.id} className="flex-1 min-w-0 flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => {
                    if (step.id < currentStep) setCurrentStep(step.id);
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

      {/* Wizard Step Content (Matching Admin Container & Inner Buttons) */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-6 sm:p-8 animate-fade-in-up stagger-2 min-h-[480px]">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-xs text-red-700 animate-shake">
            <AlertCircle size={18} className="shrink-0 text-red-600" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {renderStepContent()}

        {/* Step Navigation Buttons (Matching Admin Inner Navigation Footer) */}
        <div className="flex items-center justify-between border-t border-border pt-6 mt-8">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-border text-text-secondary hover:bg-gray-50 text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} />
              Previous Step
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
              >
                Next Step
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirmHandover}
                disabled={isSubmitting}
                className="px-8 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Activating Contract...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Confirm Handover &amp; Activate Contract</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modals for Client Registration/Editing and Second Driver (Matching Admin) */}
      {isClientModalOpen && (
        <CreateClientModal
          isOpen={isClientModalOpen}
          onClose={() => setIsClientModalOpen(false)}
          onSuccess={handleClientModalSuccess}
          clientToEdit={clientToEdit}
        />
      )}

      {isSelectSecondDriverModalOpen && (
        <SelectSecondDriverModal
          isOpen={isSelectSecondDriverModalOpen}
          onClose={() => setIsSelectSecondDriverModalOpen(false)}
          clients={clients}
          primaryClientId={selectedClient}
          onSelectSecondDriver={handleSelectSecondDriver}
          onOpenCreateClientModal={() => {
            setIsSelectSecondDriverModalOpen(false);
            setIsAddingForSecondDriver(true);
            setClientToEdit(null);
            setIsClientModalOpen(true);
          }}
        />
      )}
    </div>
  );
}
