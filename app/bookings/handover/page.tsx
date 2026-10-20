"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { 
  User, 
  FileText, 
  CheckCircle, 
  Search, 
  ArrowRight, 
  ArrowLeft, 
  Calendar, 
  Clock, 
  UserCheck, 
  CheckCircle2, 
  Loader2, 
  Banknote, 
  AlertCircle, 
  Camera, 
  PenTool, 
  RotateCcw,
  ShieldCheck,
  Image as ImageIcon,
  Plus,
  DollarSign,
  X,
  RefreshCw,
  Gauge
} from "lucide-react";
import { ExecutiveCarIcon } from "@/components/icons/ExecutiveCarIcon";
import FuelLevelSelector from "@/components/ui/FuelLevelSelector";
import PaymentMethodSelector from "@/components/ui/PaymentMethodSelector";
import VehicleInspectionPhotoCapture, { VEHICLE_ANGLES, EXTRA_PHOTO_PREFIX, getExtraPhotoKeys } from "@/components/ui/VehicleInspectionPhotoCapture";
import { useToast } from "@/components/providers/ToastProvider";

// 4 steps for Admin Shop Handover (Car -> Inspection Photos -> Rental Data -> Sign & Review)
const STEPS = [
  { id: 1, title: "Car", icon: ExecutiveCarIcon },
  { id: 2, title: "Inspection Photos", icon: Camera },
  { id: 3, title: "Rental Data", icon: FileText },
  { id: 4, title: "Sign & Review", icon: PenTool },
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

// Fast client-side image compression for mobile camera photos
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    try {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        try {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1000;
          const MAX_HEIGHT = 1000;
          let width = img.width || 800;
          let height = img.height || 600;
          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", 0.70));
            return;
          }
          resolve("");
        } catch {
          resolve("");
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        const reader = new FileReader();
        reader.onload = (event) => resolve((event.target?.result as string) || "");
        reader.onerror = () => resolve("");
        reader.readAsDataURL(file);
      };
      img.src = objectUrl;
    } catch {
      const reader = new FileReader();
      reader.onload = (event) => resolve((event.target?.result as string) || "");
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    }
  });
};

function ConfirmHandoverPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { data: session } = useSession();

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoadingContract, setIsLoadingContract] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contract, setContract] = useState<any | null>(null);
  const [contractsList, setContractsList] = useState<any[]>([]);
  const [isSwitchingContract, setIsSwitchingContract] = useState(false);
  const [contractSearchQuery, setContractSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Client list and selection (Matching Driver Step 2)
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<any | null>(null);

  // Second driver state (Matching Driver Step 2)
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

  // Rental Data state (Matching Driver Step 4)
  const [rentalData, setRentalData] = useState({
    rentalType: "Daily" as "Daily" | "Monthly",
    customerType: "B2C" as "B2C" | "B2B",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    checkoutTime: "10:00 AM",
    checkinTime: "10:00 AM",
    collectionAmount: 0,
    advancePayment: 0,
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
    checkoutMileage: 0,
    paymentMethod: "Cash" as string,
    paymentStatus: "Pending" as "Pending" | "Partial" | "Paid"
  });

  const [isDepositConfirmed, setIsDepositConfirmed] = useState(false);

  // Step 4: Rental Data - Money & Payment Documentation Photos
  const [moneyPhotos, setMoneyPhotos] = useState<string[]>([]);
  const [isUploadingMoneyPhoto, setIsUploadingMoneyPhoto] = useState(false);
  const [previewMoneyPhotoUrl, setPreviewMoneyPhotoUrl] = useState<string | null>(null);

  // Step 3: Vehicle Inspection Photos
  const [inspectionPhotos, setInspectionPhotos] = useState<Record<string, string>>({});

  // Step 5: Customer Signature Canvas
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
      document.body?.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Fetch contract and client list on mount or searchParams change
  useEffect(() => {
    const contractId = searchParams.get("contractId") || searchParams.get("id");

    const loadData = async () => {
      try {
        setIsLoadingContract(true);
        setError(null);

        // Fetch all contracts for switching/lookup
        let allContracts: any[] = [];
        try {
          const listRes = await fetch("/api/contracts", { cache: "no-store" });
          if (listRes.ok) {
            const listData = await listRes.json();
            allContracts = listData.contracts || [];
            setContractsList(allContracts);
          }
        } catch (lErr) {
          console.warn("Could not load contracts list:", lErr);
        }

        let targetContractId = contractId;
        if (!targetContractId) {
          const pending = allContracts.find((c: any) => c.deliveryStatus !== "Delivered" && c.status !== "Completed" && c.status !== "Cancelled");
          if (pending) {
            targetContractId = pending._id || pending.id;
          } else if (allContracts.length > 0) {
            targetContractId = allContracts[0]._id || allContracts[0].id;
          }
        }

        if (!targetContractId) {
          setError("No booking ID found or no pending contracts available.");
          setIsLoadingContract(false);
          return;
        }

        // Fetch target contract
        const res = await fetch(`/api/contracts/${targetContractId}`, { cache: "no-store" });
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

        const initialMileage = contractData.checkoutMileage !== undefined && Number(contractData.checkoutMileage) > 0
          ? Number(contractData.checkoutMileage)
          : Number(contractData.unitMileage || contractData.unitId?.mileage || 0);

        setRentalData({
          rentalType: contractData.rentalType || "Daily",
          customerType: contractData.customerType || "B2C",
          startDate: contractData.startDate ? new Date(contractData.startDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          endDate: contractData.endDate ? new Date(contractData.endDate).toISOString().split("T")[0] : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          checkoutTime: initialCheckoutTime,
          checkinTime: contractData.checkinTime || "10:00 AM",
          collectionAmount: collectionVal,
          advancePayment: Number(contractData.advancePayment) || 0,
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
          checkoutMileage: initialMileage,
          paymentMethod: contractData.paymentMethod || "Cash",
          paymentStatus: contractData.paymentStatus || "Pending",
        });

        // Initialize existing inspection photos (both standard angles and extra photos)
        if (Array.isArray(contractData.inspectionPhotos) && contractData.inspectionPhotos.length > 0) {
          const photoMap: Record<string, string> = {};
          contractData.inspectionPhotos.forEach((url: string, idx: number) => {
            if (!url) return;
            if (VEHICLE_ANGLES[idx]) {
              photoMap[VEHICLE_ANGLES[idx]] = url;
            } else if (idx >= VEHICLE_ANGLES.length) {
              photoMap[`${EXTRA_PHOTO_PREFIX}${idx - VEHICLE_ANGLES.length + 1}`] = url;
            }
          });
          setInspectionPhotos(photoMap);
        }

        // Initialize money proof photos
        if (Array.isArray(contractData.moneyPhotos) && contractData.moneyPhotos.length > 0) {
          setMoneyPhotos(contractData.moneyPhotos);
        }

        // Initialize customer signature if already present (e.g. editing handover)
        if (contractData.customerSignature) {
          setSignatureData(contractData.customerSignature);
        }

        // Initialize payment confirmation if contract was already delivered or paid
        if (contractData.deliveryStatus === "Delivered" || contractData.paymentStatus === "Paid") {
          setIsDepositConfirmed(true);
        }
      } catch (err: any) {
        console.error("Contract loading error:", err);
        setError(err.message || "Failed to load contract details.");
      } finally {
        setIsLoadingContract(false);
      }
    };

    loadData();
  }, [searchParams]);

  // Scroll to top on step changes
  useEffect(() => {
    scrollToTop();
  }, [currentStep]);

  // Canvas initialization when reaching Review Step (Step 4)
  useEffect(() => {
    const isReviewStep = currentStep === 4;
    if (!isReviewStep) return;

    const setup = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const targetWidth = Math.round(rect.width * dpr);
      const targetHeight = Math.round(rect.height * dpr);

      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        const currentImg = canvas.toDataURL();
        const toDraw = signatureData || (canvas.width > 0 && currentImg.length > 100 ? currentImg : null);

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          if (toDraw && typeof toDraw === "string") {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
              ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
            };
            img.src = toDraw;
          }
        }
      }
    };

    const t1 = setTimeout(setup, 50);
    const t2 = setTimeout(setup, 250);
    window.addEventListener("resize", setup);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", setup);
    };
  }, [currentStep, signatureData]);

  const getCanvasCoords = (canvas: HTMLCanvasElement, e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;
    if ("touches" in e) {
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ("changedTouches" in e && (e as any).changedTouches?.length > 0) {
        clientX = (e as any).changedTouches[0].clientX;
        clientY = (e as any).changedTouches[0].clientY;
      }
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
    const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
      scaleRatio: scaleX,
    };
  };

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if ("touches" in e && e.cancelable) {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    hasDrawnRef.current = true;
    const { x, y, scaleRatio } = getCanvasCoords(canvas, e);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.lineWidth = Math.max(2, 2.5 * scaleRatio);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
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

    const { x, y } = getCanvasCoords(canvas, e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSignatureData(canvas.toDataURL("image/png"));
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawnRef.current = false;
    setSignatureData(null);
  };

  // Second Driver Selection Handler
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
    setIsSelectSecondDriverModalOpen(false);
    toast.success(`Selected "${client.name}" as Authorized 2nd Driver!`);
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

  // Client Modal Success Handler
  const handleClientModalSuccess = (savedClient: any) => {
    setIsClientModalOpen(false);
    if (!savedClient) return;

    setClients((prev) => {
      const idx = prev.findIndex((c) => c._id === savedClient._id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = savedClient;
        return next;
      }
      return [savedClient, ...prev];
    });

    if (isAddingForSecondDriver) {
      handleSelectSecondDriver(savedClient);
      setIsAddingForSecondDriver(false);
    } else {
      setSelectedClient(String(savedClient._id));
      setClientToEdit(savedClient);
      toast.success(`Client "${savedClient.name}" updated successfully!`);
    }
  };

  // Step Validation & Navigation
  const handleNext = () => {
    setError(null);

    // Validation for Step 1: Car
    if (currentStep === 1) {
      if (!rentalData.checkoutTime.trim()) {
        setError("Please enter handover checkout time.");
        toast.error("Please enter handover checkout time.");
        return;
      }
    }

    // Validation for Step 3: Rental Data & Payment
    if (currentStep === 3) {
      if (!isDepositConfirmed) {
        setError("Please confirm receipt of money by checking 'Confirm Get All Money'.");
        toast.error("Please check 'Confirm Get All Money' before proceeding.");
        return;
      }
    }

    setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Money photo uploader
  const handleMoneyPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingMoneyPhoto(true);
    try {
      const fileArray = Array.from(files);
      const uploadPromises = fileArray.map(async (file) => {
        const base64 = await compressImage(file);
        if (!base64) return null;

        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64 }),
        });

        if (res.ok) {
          const data = await res.json();
          return (data.url || null) as string | null;
        }
        return null;
      });

      const uploadedUrls = (await Promise.all(uploadPromises)).filter(Boolean) as string[];
      if (uploadedUrls.length > 0) {
        setMoneyPhotos((prev) => [...prev, ...uploadedUrls]);
        toast.success("Payment proof photo(s) uploaded successfully!");
      }
    } catch (err) {
      console.error("Failed to upload money photo:", err);
      toast.error("Failed to upload payment proof photo.");
    } finally {
      setIsUploadingMoneyPhoto(false);
      e.target.value = "";
    }
  };

  const handleRemoveMoneyPhoto = (index: number) => {
    setMoneyPhotos((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Final Submission to API
  const handleConfirmHandover = async () => {
    const isEditingDelivered = contract?.deliveryStatus === "Delivered";

    if (!isDepositConfirmed) {
      setError("Please check 'Confirm Get All Money' in Step 3 before saving the contract.");
      toast.error("Please confirm payment in Step 3.");
      setCurrentStep(3);
      return;
    }

    const finalSignature = signatureData || contract.customerSignature;
    if (!finalSignature) {
      setError("Customer signature is required. Please capture customer signature in Step 4.");
      toast.error("Customer signature is required. (توقيع العميل مطلوب)");
      return;
    }

    // Only enforce day-of-start check for fresh initial handover, never for editing already handed over contracts
    if (!isEditingDelivered) {
      const nowStartOfDay = new Date();
      nowStartOfDay.setHours(0, 0, 0, 0);
      const contractStartDate = new Date(contract.rawStartDate || contract.startDate);
      contractStartDate.setHours(0, 0, 0, 0);

      if (contractStartDate > nowStartOfDay) {
        const formattedDate = contractStartDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
        setError(`Handover can only be confirmed on the day of start (${formattedDate}). (لا يمكن تأكيد تسليم السيارة قبل حلول تاريخ بدء العقد)`);
        toast.error(`Handover can only be confirmed on the day of start (${formattedDate}).`);
        return;
      }
    }

    setIsSubmitting(true);
    toast.success(isEditingDelivered ? "Saving handover modifications..." : "Activating contract and completing vehicle handover...");

    try {
      const contractId = contract._id || contract.id;
      const formattedCheckoutTime = formatTimeDisplay(rentalData.checkoutTime);

      const inspectionArray = [
        ...VEHICLE_ANGLES.map((angle) => inspectionPhotos[angle] || ""),
        ...getExtraPhotoKeys(inspectionPhotos).map((k) => inspectionPhotos[k]),
      ];

      const payload: any = {
        deliveryStatus: "Delivered",
        startDate: rentalData.startDate,
        endDate: rentalData.endDate,
        rentalType: rentalData.rentalType,
        customerType: rentalData.customerType,
        dailyRate: Number(rentalData.dailyRate) || 0,
        dailyKmLimit: Number(rentalData.dailyKmLimit) || 0,
        pricePerExtraKm: Number(rentalData.pricePerExtraKm) || 0,
        pickupLocation: rentalData.pickupLocation,
        babySeatFees: Number(rentalData.babySeatFee) || 0,
        deliveryCharges: Number(rentalData.deliveryFee) || 0,
        checkoutTime: formattedCheckoutTime,
        checkoutFuelLevel: rentalData.checkoutFuelLevel,
        checkoutMileage: Number(rentalData.checkoutMileage) || 0,
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
        moneyPhotos,
        notes: rentalData.notes,
        customerSignature: finalSignature,
        adminSignature: contract.adminSignature || "/images/admin-signature.png",
        inspectionPhotos: inspectionArray,
        handoverCompletedAt: contract.handoverCompletedAt || new Date().toISOString(),
        deliveredAt: contract.deliveredAt || new Date().toISOString(),
        deliveredBy: contract.deliveredBy || (session?.user as any)?.name || "Admin",
        notifyClient: !isEditingDelivered,
      };

      if (contract.status !== "Completed" && contract.status !== "Cancelled") {
        payload.status = "Active";
      }

      const res = await fetch(`/api/contracts/${contractId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const resData = await res.json();
        throw new Error(resData.error || "Failed to save vehicle handover.");
      }

      toast.success(
        isEditingDelivered 
          ? "Handover details updated successfully! ✓ (تم حفظ وتحديث بيانات التسليم بنجاح)"
          : "Vehicle handover completed and contract activated successfully! ✓"
      );
      router.push("/bookings");
    } catch (err: any) {
      console.error("Handover submit error:", err);
      setError(err.message || "Failed to complete vehicle handover.");
      toast.error(err.message || "Handover failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter Clients (Matching Driver Step 2)
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
          {[1, 2, 3, 4].map((i) => (
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
          onClick={() => router.push("/bookings")}
          className="px-6 py-2.5 bg-brand text-white text-xs font-bold rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer"
        >
          Back to Bookings
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
  const extraFees = Number(rentalData.babySeatFee || 0) + Number(rentalData.deliveryFee || 0);
  const rawCollectionTotal = Number(rentalData.collectionAmount || 0) + extraFees;
  const advancePaid = Number(contract?.advancePayment || rentalData.advancePayment || 0);
  const collectionTotal = Math.max(0, rawCollectionTotal - advancePaid);
  const depositTotal = Number(rentalData.depositAmount || 0);
  const grandTotal = collectionTotal + depositTotal;

  // Selected client object
  const selectedClientObj = selectedClient
    ? clients.find((c) => String(c._id) === String(selectedClient)) || (typeof clientToEdit === "object" && clientToEdit?._id ? clientToEdit : null)
    : (contract?.clientId && typeof contract.clientId === "object" ? contract.clientId : null);
  const secondDriverName = secondDriverClient?.name || additionalDriver.name;
  const secondDriverLicense = secondDriverClient?.licenseNumber || additionalDriver.license;

  // ===================== STEP 1: CAR (Matching Driver renderCarStep) =====================
  const renderCarStep = () => (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Assigned Car (السيارة المحددة للمهمة)</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Verify the assigned vehicle profile, set handover time, and inspect checkout fuel level
          </p>
        </div>
        {/* Customer Info Card */}
        <div className="flex items-center gap-3 bg-white border border-border px-4 py-2.5 rounded-2xl shadow-2xs">
          <div className="w-8 h-8 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-xs shrink-0">
            <User size={15} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-text-muted block leading-none">Customer / العميل</span>
            <span className="text-xs font-bold text-text-primary block leading-snug mt-0.5">
              {selectedClientObj?.name || contract?.customer || "Customer"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Vehicle Profile Card */}
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
                {rentalData.checkoutMileage > 0 ? `${rentalData.checkoutMileage.toLocaleString()} km` : "Recorded in Fleet"}
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

            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1 flex items-center gap-1">
                <span>Handover Checkout Time (وقت استلام السيارة)</span>
                <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={rentalData.checkoutTime}
                    onChange={(e) => setRentalData({ ...rentalData, checkoutTime: e.target.value })}
                    placeholder="e.g. 10:00 AM"
                    className="w-full p-2.5 pl-8 rounded-xl border border-border bg-white text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none font-medium"
                  />
                  <Clock size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                </div>
                <button
                  type="button"
                  onClick={() => setRentalData((prev: any) => ({ ...prev, checkoutTime: getCurrentFormattedTime() }))}
                  className="px-3.5 py-2.5 bg-brand/10 hover:bg-brand/20 text-brand text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 border border-brand/20 flex items-center gap-1.5 shadow-2xs"
                  title="Set current time"
                >
                  <Clock size={13} />
                  <span>Now</span>
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                  <Gauge size={13} className="text-brand shrink-0" />
                  <span>Handover Mileage (عداد الكيلومترات عند التسليم)</span>
                  <span className="text-red-500">*</span>
                </label>
                {(contract.unitMileage || contract.unitId?.mileage) && (
                  <span className="text-[10px] text-text-muted bg-gray-100 px-2 py-0.5 rounded font-medium">
                    Fleet: {(contract.unitMileage || contract.unitId?.mileage).toLocaleString()} km
                  </span>
                )}
              </div>
              <div className="relative">
                <Gauge size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="number"
                  value={rentalData.checkoutMileage === 0 ? "" : rentalData.checkoutMileage}
                  onChange={(e) => setRentalData({ ...rentalData, checkoutMileage: Number(e.target.value) })}
                  placeholder="e.g. 15300"
                  className="w-full pl-9 pr-12 py-2.5 bg-gray-50 border border-border rounded-xl text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted">KM</span>
              </div>
              <p className="text-[10px] text-text-muted mt-1">Current vehicle odometer reading recorded at handover to client.</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">Handover Location (مكان التسليم)</label>
              <input
                type="text"
                value={rentalData.pickupLocation}
                onChange={(e) => setRentalData({ ...rentalData, pickupLocation: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-border bg-white text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none"
              />
            </div>

            {/* Fuel Level Selector */}
            <div className="pt-2 border-t border-gray-100">
              <FuelLevelSelector
                value={rentalData.checkoutFuelLevel}
                onChange={(val) => setRentalData({ ...rentalData, checkoutFuelLevel: val })}
                label="Handover Fuel Level (مستوى الوقود عند التسليم)"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">Handover Notes (ملاحظات التسليم)</label>
              <textarea
                rows={2}
                value={rentalData.notes}
                onChange={(e) => setRentalData({ ...rentalData, notes: e.target.value })}
                placeholder="Any special handover instructions or remarks..."
                className="w-full p-2.5 rounded-xl border border-border bg-white text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none resize-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ===================== STEP 2: INSPECTION PHOTOS =====================
  const renderInspectionStep = () => (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-text-primary">
            Step 2: Handover Inspection Photos (صور فحص السيارة عند التسليم)
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Capture vehicle inspection photos to document condition before handover (optional)
          </p>
        </div>
      </div>

      <VehicleInspectionPhotoCapture
        photos={inspectionPhotos}
        onChange={setInspectionPhotos}
        allowExtra={true}
      />
    </div>
  );

  // ===================== STEP 3: RENTAL DATA =====================
  const renderRentalDataStep = () => (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-lg font-bold text-text-primary">Step 3: Rental Period &amp; Financial Terms</h2>
        <p className="text-xs text-text-muted mt-0.5">
          Specify dates, locations, payment method, and confirm collection of all required money
        </p>
      </div>

      {/* Rental Plan & Customer Type Toggle Buttons (Editable) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50/70 p-4 rounded-2xl border border-gray-200/80">
        {/* Rental Type: Daily vs Monthly */}
        <div>
          <span className="text-xs font-bold text-text-primary block mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Calendar size={14} className="text-brand" />
              <span>Rental Type (نوع الإيجار)</span>
            </span>
          </span>
          <div className="grid grid-cols-2 gap-2 p-1 bg-white rounded-xl border border-gray-200">
            <button
              type="button"
              onClick={() => setRentalData(prev => ({ ...prev, rentalType: "Daily" }))}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                rentalData.rentalType === "Daily"
                  ? "bg-brand text-white shadow-xs"
                  : "text-text-secondary hover:text-text-primary"
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
                  collectionAmount: Math.round(Number(prev.dailyRate || 85) * 30 * 100) / 100
                }));
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                rentalData.rentalType === "Monthly"
                  ? "bg-brand text-white shadow-xs"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Monthly / شهري
            </button>
          </div>
        </div>

        {/* Customer Type: B2C vs B2B */}
        <div>
          <span className="text-xs font-bold text-text-primary block mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <User size={14} className="text-brand" />
              <span>Customer Type (نوع العميل)</span>
            </span>
          </span>
          <div className="grid grid-cols-2 gap-2 p-1 bg-white rounded-xl border border-gray-200">
            <button
              type="button"
              onClick={() => setRentalData(prev => ({ ...prev, customerType: "B2C" }))}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                rentalData.customerType === "B2C"
                  ? "bg-brand text-white shadow-xs"
                  : "text-text-secondary hover:text-text-primary"
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
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              B2B (Corporate / شركات)
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Dates & Logistics (Editable) */}
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
                onChange={(e) => {
                  const newStart = e.target.value;
                  if (!newStart) return;
                  const s = new Date(newStart);
                  const end = new Date(rentalData.endDate);
                  const days = Math.max(1, Math.ceil((end.getTime() - s.getTime()) / (1000 * 3600 * 24)));
                  const rate = Number(rentalData.dailyRate) || 0;
                  setRentalData(prev => ({
                    ...prev,
                    startDate: newStart,
                    collectionAmount: rate > 0 ? rate * days : prev.collectionAmount
                  }));
                }}
                className="w-full p-2.5 rounded-xl border border-border bg-white text-gray-700 text-sm font-medium outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">
                End Date ({totalDays} days)
              </label>
              <input
                type="date"
                min={rentalData.startDate}
                value={rentalData.endDate}
                onChange={(e) => {
                  const newEnd = e.target.value;
                  if (!newEnd) return;
                  const start = new Date(rentalData.startDate);
                  const eDate = new Date(newEnd);
                  const days = Math.max(1, Math.ceil((eDate.getTime() - start.getTime()) / (1000 * 3600 * 24)));
                  const rate = Number(rentalData.dailyRate) || 0;
                  setRentalData(prev => ({
                    ...prev,
                    endDate: newEnd,
                    collectionAmount: rate > 0 ? rate * days : prev.collectionAmount
                  }));
                }}
                className="w-full p-2.5 rounded-xl border border-border bg-white text-gray-700 text-sm font-medium outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
              />
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

          {/* Daily KM Limit & Extra KM Price */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">
                Daily KM Limit (حد الكيلومتر)
              </label>
              <input
                type="number"
                value={rentalData.dailyKmLimit}
                onChange={(e) => setRentalData({ ...rentalData, dailyKmLimit: Number(e.target.value) })}
                placeholder="0 = Unlimited"
                className="w-full p-2.5 rounded-xl border border-border bg-white text-sm outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-[10px] text-text-muted mt-0.5 block">0 = Unlimited</span>
            </div>
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">
                Price per Extra KM (سعر كم الزائد)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-[10px]">AED</span>
                <input
                  type="number"
                  value={rentalData.pricePerExtraKm}
                  onChange={(e) => setRentalData({ ...rentalData, pricePerExtraKm: Number(e.target.value) })}
                  placeholder="0"
                  className="w-full pl-9 pr-2.5 py-2.5 rounded-xl border border-border bg-white text-sm outline-none font-bold focus:ring-2 focus:ring-brand/20 focus:border-brand [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>
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

        {/* Financial Terms & Payment Method (Editable) */}
        <div className="space-y-4 bg-gray-50/60 p-5 rounded-2xl border border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <DollarSign size={16} className="text-brand" /> Financial Terms &amp; Payment
            </h3>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              Admin Verified
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
                  onChange={(e) => setRentalData({ ...rentalData, collectionAmount: Number(e.target.value) })}
                  placeholder="0"
                  className="w-full p-2.5 rounded-xl border border-border bg-white text-text-primary text-sm font-bold focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-brand"
                />
              </div>
              <span className="text-[11px] text-text-muted mt-0.5 block truncate">
                Total rent ({totalDays} days{rentalData.dailyRate > 0 ? ` @ AED ${rentalData.dailyRate}/d` : ""})
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">
                Security Deposit (AED)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={rentalData.depositAmount === 0 ? "" : rentalData.depositAmount}
                  onChange={(e) => setRentalData({ ...rentalData, depositAmount: Number(e.target.value) })}
                  placeholder="0"
                  className="w-full p-2.5 rounded-xl border border-border bg-white text-text-primary text-sm font-bold focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <span className="text-[11px] text-text-muted mt-0.5 block truncate">
                Refundable upon return (مسترد)
              </span>
            </div>
          </div>

          {/* The Rest (الباقي) & The Deposit (التأمين) Breakdown */}
          <div className="p-3.5 bg-emerald-50/80 rounded-xl border border-emerald-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-950 font-semibold">Total Rent Charges:</span>
              <span className="font-bold text-emerald-950">AED {rawCollectionTotal.toLocaleString()}</span>
            </div>
            {advancePaid > 0 && (
              <div className="flex items-center justify-between text-xs text-emerald-800">
                <span className="font-medium flex items-center gap-1">
                  ✓ Prepaid Advance (الدفعة المقدمة المدفوعة):
                </span>
                <span className="font-black text-emerald-700">- AED {advancePaid.toLocaleString()}</span>
              </div>
            )}
            <div className="pt-2 border-t border-emerald-200/90 flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-emerald-950 block">The Rest / المبلغ المتبقي للتحصيل:</span>
                <span className="text-[10px] text-emerald-700 font-medium">Remaining to collect on handover</span>
              </div>
              <span className="text-base font-black text-emerald-800">AED {collectionTotal.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-emerald-200/50">
              <span className="text-emerald-900 font-semibold">Security Deposit (مبلغ التأمين):</span>
              <span className="font-bold text-emerald-950">AED {depositTotal.toLocaleString()}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="pt-1">
            <PaymentMethodSelector
              value={rentalData.paymentMethod}
              onChange={(pm) => setRentalData({ ...rentalData, paymentMethod: pm })}
              totalAmount={grandTotal}
              totalLabel="Total Due (The Rest + Deposit)"
              label="Payment Method (طريقة الدفع)"
            />
          </div>

          {/* Grand Total Collection Card */}
          <div className="p-3.5 bg-brand/5 rounded-xl border border-brand/20 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-brand block">Total Collection Due / إجمالي التحصيل:</span>
              <span className="text-[10px] text-text-muted">
                {advancePaid > 0 
                  ? `The Rest (AED ${collectionTotal.toLocaleString()}) + Deposit (AED ${depositTotal.toLocaleString()})`
                  : `Rent (AED ${collectionTotal.toLocaleString()}) + Deposit (AED ${depositTotal.toLocaleString()})`}
              </span>
            </div>
            <span className="text-xl font-black text-brand">AED {grandTotal.toLocaleString()}</span>
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
                  I certify that all required money (The Rest of AED {collectionTotal.toLocaleString()} + Deposit of AED {depositTotal.toLocaleString()} = Total AED {grandTotal.toLocaleString()}) has been received from the customer.
                </span>
              </div>
            </label>

            {/* Money Photo Proof Upload */}
            <div className="mt-3 pt-3 border-t border-amber-200/80">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <Banknote size={14} className="text-amber-800" />
                  <span className="text-xs font-bold text-amber-950">
                    Money / Payment Proof (صورة استلام المبلغ)
                  </span>
                  {moneyPhotos.length > 0 && (
                    <span className="bg-amber-200 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {moneyPhotos.length} {moneyPhotos.length === 1 ? "photo" : "photos"}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <label className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-amber-100/60 text-amber-900 text-xs font-semibold rounded-lg border border-amber-300 shadow-2xs cursor-pointer transition-all active:scale-95">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onClick={(e) => { e.currentTarget.value = ""; }}
                      onChange={handleMoneyPhotoUpload}
                      disabled={isUploadingMoneyPhoto}
                    />
                    <Camera size={13} className="text-amber-800" />
                    <span>Camera</span>
                  </label>

                  <label className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-amber-100/60 text-amber-900 text-xs font-semibold rounded-lg border border-amber-300 shadow-2xs cursor-pointer transition-all active:scale-95">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onClick={(e) => { e.currentTarget.value = ""; }}
                      onChange={handleMoneyPhotoUpload}
                      disabled={isUploadingMoneyPhoto}
                    />
                    <ImageIcon size={13} className="text-amber-800" />
                    <span>Gallery</span>
                  </label>
                </div>
              </div>

              {isUploadingMoneyPhoto && (
                <div className="flex items-center gap-2 text-xs text-amber-800 py-1">
                  <Loader2 size={13} className="animate-spin text-amber-700" />
                  <span>Processing payment proof photo...</span>
                </div>
              )}

              {moneyPhotos.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                  {moneyPhotos.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square rounded-lg overflow-hidden border border-amber-200 bg-white group shadow-2xs"
                    >
                      <img
                        src={url}
                        alt={`Payment proof ${idx + 1}`}
                        className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setPreviewMoneyPhotoUrl(url)}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveMoneyPhoto(idx)}
                        className="absolute top-1 right-1 p-1 bg-red-600/90 hover:bg-red-700 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        title="Remove photo"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ===================== STEP 4: SIGN & REVIEW =====================
  const renderReviewStep = () => (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Step 4: Review &amp; Sign Contract</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Review full handover terms and capture signatures to finalize and activate the rental contract
          </p>
        </div>
      </div>

      {/* Summary Profile Grid */}
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
          <div className="flex justify-between py-1 border-b border-gray-100">
            <span className="text-text-muted">Daily Rate:</span>
            <span className="font-semibold text-text-primary">AED {rentalData.dailyRate || 0} / day</span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-100">
            <span className="text-text-muted">Total Rental Amount:</span>
            <span className="font-semibold text-text-primary">AED {rawCollectionTotal}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-100">
            <span className="text-text-muted">Checkout Mileage (عداد الاستلام):</span>
            <span className="font-semibold text-text-primary">
              {rentalData.checkoutMileage > 0 ? `${Number(rentalData.checkoutMileage).toLocaleString()} km` : "Recorded in Fleet"}
            </span>
          </div>
          {advancePaid > 0 && (
            <div className="flex justify-between py-1 border-b border-gray-100 text-emerald-700 bg-emerald-50/50 px-2 rounded">
              <span className="font-medium">Prepaid Advance Payment (عربون مدفوع):</span>
              <span className="font-bold">- AED {advancePaid}</span>
            </div>
          )}
          <div className="flex justify-between py-1 border-b border-gray-100">
            <span className="text-text-muted font-semibold">Remaining Handover Collection:</span>
            <span className="font-bold text-brand">AED {collectionTotal}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-100">
            <span className="text-text-muted">Security Deposit:</span>
            <span className="font-semibold text-text-primary">AED {depositTotal}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-gray-100 bg-gray-50/80 px-2 rounded-lg font-bold text-xs">
            <span className="text-text-primary">Total Handover Cash / Card Collected:</span>
            <span className="text-brand text-sm font-black">AED {grandTotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-100 items-center">
            <span className="text-text-muted">Payment Method:</span>
            <span className="font-semibold text-text-primary">{rentalData.paymentMethod}</span>
          </div>
          <div className="flex justify-between py-1 items-center">
            <span className="text-text-muted">Payment Status:</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
              <CheckCircle2 size={12} />
              {collectionTotal === 0 && advancePaid > 0 ? "Paid in Advance" : "Collected & Confirmed"}
            </span>
          </div>
        </div>
      </div>

      {/* Inspection Photos Strip Preview */}
      {Object.keys(inspectionPhotos).some((k) => inspectionPhotos[k]) && (
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-3">
          <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
            <Camera size={14} className="text-brand" />
            Handover Vehicle Inspection ({Object.values(inspectionPhotos).filter(Boolean).length} photos)
          </span>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {[
              ...VEHICLE_ANGLES.map((angle) => ({ key: angle, label: angle.split(" ")[0], url: inspectionPhotos[angle] })),
              ...getExtraPhotoKeys(inspectionPhotos).map((k, i) => ({ key: k, label: `Extra ${i + 1}`, url: inspectionPhotos[k] }))
            ].map(({ key, label, url }, idx) => (
              <div
                key={key || idx}
                className="relative aspect-square rounded-lg overflow-hidden border border-border bg-gray-50 flex flex-col items-center justify-center text-center p-1"
              >
                {url ? (
                  <img src={url} alt={label} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[9px] text-text-muted font-medium leading-tight">{label}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customer Signature Canvas Card */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-text-primary flex items-center gap-2">
            <PenTool size={16} className="text-brand" />
            <span>Customer Signature (توقيع العميل المستأجر عند الاستلام)</span>
          </label>
          {signatureData && (
            <button
              type="button"
              onClick={clearSignature}
              className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw size={12} /> Clear Signature
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
            className="w-full h-44 cursor-crosshair block"
          />
          {signatureData && !hasDrawnRef.current && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4">
              <img
                src={signatureData}
                alt="Captured Customer Signature"
                className="max-h-32 max-w-[80%] object-contain select-none"
              />
            </div>
          )}
          {!signatureData && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-gray-400 space-y-1">
              <PenTool size={26} className="opacity-30" />
              <span className="text-xs font-medium">Customer signs here (finger, mouse, or stylus)</span>
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

      {/* Admin / Company Official Stamp & Signature Box (Clean, without redundant badges) */}
      <div id="admin-signature-box" className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-3">
        <label className="text-sm font-bold text-text-primary flex items-center gap-2">
          <ShieldCheck size={18} className="text-blue-600 shrink-0" />
          <span>Company Stamp &amp; Signature (الختم والتوقيع الرسمي للإدارة)</span>
        </label>

        <div className="border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden bg-gradient-to-b from-gray-50/70 to-white flex items-center justify-center p-4 h-40 relative shadow-inner">
          <img 
            src="/images/admin-signature.png" 
            alt="Leon Car Rental Official Stamp & Signature" 
            className="max-h-full max-w-full object-contain filter drop-shadow-sm select-none"
          />
        </div>
      </div>
    </div>
  );

  // Render active step content
  const renderStepContent = () => {
    if (currentStep === 1) return renderCarStep();
    if (currentStep === 2) return renderInspectionStep();
    if (currentStep === 3) return renderRentalDataStep();
    if (currentStep === 4) return renderReviewStep();
    return null;
  };

  const pendingCount = contractsList.filter(
    (c: any) => c.deliveryStatus !== "Delivered" && c.status !== "Completed" && c.status !== "Cancelled"
  ).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-fade-in-up">
        <div>
          <button
            onClick={() => router.push("/bookings")}
            className="text-xs text-text-muted hover:text-text-primary flex items-center gap-1 mb-2 transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} /> Back to Bookings
          </button>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-text-primary">
              {contract?.deliveryStatus === "Delivered" ? "Edit Vehicle Handover (تعديل بيانات التسليم)" : "Confirm Vehicle Handover"}
            </h1>
            {contract?.deliveryStatus === "Delivered" && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
                Editing Handover #{contractNum}
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted mt-1">
            {contract?.deliveryStatus === "Delivered"
              ? `You are editing existing handover data for Contract #${contractNum} (Handed over by: ${contract.deliveredBy || "Staff"}). Any changes will update the contract and the official PDF.`
              : "Verify assigned car, set handover time and fuel level, capture inspection photos, and complete client handover."}
          </p>
        </div>
      </div>

      {/* Stepper Header (100% IDENTICAL to Driver Handover) */}
      <div className="bg-card rounded-xl sm:rounded-2xl border border-border shadow-xs sm:shadow-sm p-3 sm:p-6 animate-fade-in-up stagger-1">
        <div className="relative w-full max-w-4xl mx-auto px-1 sm:px-4">
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
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 border-2 cursor-pointer ${
                    currentStep === step.id
                      ? "border-brand bg-brand text-white shadow-md shadow-brand/20 scale-105 ring-2 sm:ring-4 ring-white"
                      : currentStep > step.id
                      ? "border-brand bg-white text-brand ring-2 sm:ring-4 ring-white"
                      : "border-gray-200 bg-white text-gray-400 ring-2 sm:ring-4 ring-white"
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

          {/* Mobile Current Step Indicator */}
          <div className="sm:hidden text-center mt-2.5 pt-2 border-t border-border/50">
            <span className="text-[11px] font-bold text-brand uppercase tracking-wider">Step {currentStep} of {totalSteps}:</span>{" "}
            <span className="text-xs font-semibold text-text-primary">{STEPS[currentStep - 1]?.title}</span>
          </div>
        </div>
      </div>

      {/* Wizard Step Content (Matching Driver Handover Container & Navigation) */}
      <div className="bg-card rounded-xl sm:rounded-2xl border border-border shadow-xs sm:shadow-sm p-3.5 sm:p-6 md:p-8 animate-fade-in-up stagger-2 min-h-[480px]">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-xs text-red-700 animate-shake">
            <AlertCircle size={18} className="shrink-0 text-red-600" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {renderStepContent()}

        {/* Step Navigation Buttons (Matching Driver Handover Footer) */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 border-t border-border pt-4 sm:pt-6 mt-6 sm:mt-8">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-xl border border-border text-text-secondary hover:bg-gray-50 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>Previous Step</span>
            </button>
          ) : (
            <div className="hidden sm:block" />
          )}

          <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={handleNext}
                className="w-full sm:w-auto px-6 py-3 sm:py-2.5 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
              >
                <span>Next Step</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirmHandover}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-2.5 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>{contract?.deliveryStatus === "Delivered" ? "Saving Changes..." : "Activating Contract..."}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>{contract?.deliveryStatus === "Delivered" ? "Save Handover Changes (حفظ التعديلات)" : "Confirm Handover & Activate Contract"}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>



      {/* Lightbox Preview Modal for Money Proof Photos */}
      {previewMoneyPhotoUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewMoneyPhotoUrl(null)}
        >
          <div 
            className="relative max-w-2xl max-h-[85vh] w-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-2 text-white">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Banknote size={15} className="text-amber-400" />
                <span>Money / Payment Documentation Preview</span>
              </span>
              <button
                type="button"
                onClick={() => setPreviewMoneyPhotoUrl(null)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
                title="Close preview"
              >
                <X size={18} />
              </button>
            </div>
            <div className="rounded-xl overflow-hidden border border-white/20 shadow-2xl bg-black/50 max-h-[75vh]">
              <img
                src={previewMoneyPhotoUrl}
                alt="Money Proof Full Preview"
                className="max-h-[75vh] w-auto max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ConfirmHandoverPage() {
  return (
    <Suspense fallback={
      <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-pulse">
        <div className="h-8 w-64 bg-gray-200 rounded-lg"></div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 min-h-[400px]"></div>
      </div>
    }>
      <ConfirmHandoverPageContent />
    </Suspense>
  );
}
