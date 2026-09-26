"use client";

import { useState, useEffect, useRef } from "react";
import { 
  X, 
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
  PenTool,
  Banknote,
  CreditCard,
  Coins,
  AlertCircle,
  UserPlus,
  Camera
} from "lucide-react";
import { ExecutiveCarIcon } from "@/components/icons/ExecutiveCarIcon";
import StatusBadge from "@/components/ui/StatusBadge";
import { useToast } from "@/components/providers/ToastProvider";
import { useSession } from "next-auth/react";
import CreateClientModal from "@/components/modals/CreateClientModal";
import SelectSecondDriverModal from "@/components/modals/SelectSecondDriverModal";
import FuelLevelSelector from "@/components/ui/FuelLevelSelector";
import PaymentMethodSelector from "@/components/ui/PaymentMethodSelector";
import VehicleInspectionPhotoCapture, { VEHICLE_ANGLES } from "@/components/ui/VehicleInspectionPhotoCapture";

const STEPS = [
  { id: 1, title: "Car", icon: ExecutiveCarIcon },
  { id: 2, title: "Client", icon: User },
  { id: 3, title: "Rental Data", icon: FileText },
  { id: 4, title: "Inspection", icon: Camera },
  { id: 5, title: "Review & Sign", icon: CheckCircle },
];

interface CreateContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  contractToEdit?: any;
}

export default function CreateContractModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  contractToEdit 
}: CreateContractModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const { data: session } = useSession();
  const isDriverRole = (session?.user as any)?.role === "driver";
  const currentUserId = (session?.user as any)?.id;

  // Search & Modals
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState("");
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [fleetFilter, setFleetFilter] = useState<"available" | "all">("available");
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isSelectSecondDriverModalOpen, setIsSelectSecondDriverModalOpen] = useState(false);
  const [secondDriverClient, setSecondDriverClient] = useState<any>(null);
  const [isAddingForSecondDriver, setIsAddingForSecondDriver] = useState(false);
  const modalBodyRef = useRef<HTMLDivElement>(null);
  const modalOverlayRef = useRef<HTMLDivElement>(null);

  // Automatically scroll modal body and overlay to top on step change
  useEffect(() => {
    if (modalBodyRef.current) {
      modalBodyRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
    if (modalOverlayRef.current) {
      modalOverlayRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentStep]);

  // Signature canvas (Client)
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Signature canvas (Admin / Company)
  const adminCanvasRef = useRef<HTMLCanvasElement>(null);
  const [adminSignatureData, setAdminSignatureData] = useState<string | null>(null);
  const [isDrawingAdmin, setIsDrawingAdmin] = useState(false);

  // Data arrays
  const [units, setUnits] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);

  // Form State
  const [inspectionPhotos, setInspectionPhotos] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    unitId: "",
    clientId: "",
    contractType: "Shop" as "Delivery" | "Shop",
    driverId: "",
    deliveryDriverId: "",
    returnDriverId: "",
    rentalType: "Daily" as "Daily" | "Monthly",
    customerType: "B2C" as "B2C" | "B2B",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    collectionAmount: 595, // Price driver or admin will collect for the rental
    dailyRate: 85,
    dailyKmLimit: 0,
    pricePerExtraKm: 0,
    depositAmount: 0,
    pickupLocation: "Main Office",
    dropoffLocation: "",
    checkoutTime: "10:00 AM",
    checkinTime: "10:00 AM",
    additionalDriverName: "",
    additionalDriverLicense: "",
    additionalDriverNationality: "",
    additionalDriverPhone: "",
    additionalDriverExpiry: "",
    additionalDriverIssuedAt: "",
    babySeatFees: 0,
    tintingFees: 0,
    deliveryCharges: 0,
    salikFees: 0,
    cleaningFees: 0,
    notes: "",
    checkoutFuelLevel: 100,
    paymentMethod: "Cash",
    paymentStatus: "Pending" as "Pending" | "Partial" | "Paid",
  });

  const handleSelectSecondDriver = (client: any) => {
    if (!client) return;
    setSecondDriverClient(client);
    setFormData((prev) => ({
      ...prev,
      additionalDriverName: client.name || "",
      additionalDriverLicense: client.licenseNumber || "",
      additionalDriverNationality: client.nationality || "",
      additionalDriverPhone: client.phone || "",
      additionalDriverExpiry: client.licenseExpiry
        ? new Date(client.licenseExpiry).toISOString().split("T")[0]
        : "",
      additionalDriverIssuedAt: client.address || "Dubai",
    }));
    toast.success(`Selected "${client.name}" as Second Driver.`);
  };

  const handleRemoveSecondDriver = () => {
    setSecondDriverClient(null);
    setFormData((prev) => ({
      ...prev,
      additionalDriverName: "",
      additionalDriverLicense: "",
      additionalDriverNationality: "",
      additionalDriverPhone: "",
      additionalDriverExpiry: "",
      additionalDriverIssuedAt: "",
    }));
    toast.info("Second driver removed.");
  };

  const handleClientModalSuccess = (newClient?: any) => {
    fetchData();
    if (newClient) {
      if (isAddingForSecondDriver) {
        handleSelectSecondDriver(newClient);
        setIsAddingForSecondDriver(false);
        toast.success(`Registered "${newClient.name}" and automatically selected as Second Driver!`);
      } else {
        setFormData((prev) => ({ ...prev, clientId: newClient._id || newClient.id }));
        toast.success(`Registered "${newClient.name}" and selected as Primary Customer!`);
      }
    }
    setIsClientModalOpen(false);
  };

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

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const [unitsRes, clientsRes, driversRes] = await Promise.all([
        fetch("/api/units", { cache: "no-store" }),
        fetch("/api/clients", { cache: "no-store" }),
        fetch("/api/drivers", { cache: "no-store" })
      ]);
      
      const unitsData = await unitsRes.json();
      const clientsData = await clientsRes.json();
      const driversData = await driversRes.json();

      setUnits(unitsData.units || (Array.isArray(unitsData) ? unitsData : []));
      setClients(clientsData.clients || (Array.isArray(clientsData) ? clientsData : []));
      setDrivers(Array.isArray(driversData) ? driversData : (driversData.drivers || []));
    } catch (err: any) {
      setError("Failed to load vehicles, customers, or drivers.");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setError(null);
      setVehicleSearchQuery("");
      setClientSearchQuery("");
      setFleetFilter("available");
      fetchData();

      if (contractToEdit) {
        const editUnitId = contractToEdit.unitId?._id || contractToEdit.unitId || "";
        const editClientId = contractToEdit.clientId?._id || contractToEdit.clientId || "";
        const editDeliveryDriverId = contractToEdit.deliveryDriverId?._id || contractToEdit.deliveryDriverId || contractToEdit.driverId?._id || contractToEdit.driverId || "";
        const editReturnDriverId = contractToEdit.returnDriverId?._id || contractToEdit.returnDriverId || "";

        const editDailyRate = contractToEdit.dailyRate || 85;
        const editStart = new Date(contractToEdit.startDate);
        const editEnd = new Date(contractToEdit.endDate);
        const editDays = Math.max(1, Math.ceil((editEnd.getTime() - editStart.getTime()) / (1000 * 3600 * 24)));
        const editCollectionAmount = contractToEdit.totalAmount || (editDailyRate * editDays);

        setSignatureData(contractToEdit.customerSignature || null);
        setAdminSignatureData(contractToEdit.adminSignature || null);
        setFormData({
          unitId: editUnitId,
          clientId: editClientId,
          contractType: contractToEdit.contractType || (editDeliveryDriverId ? "Delivery" : "Shop"),
          driverId: isDriverRole ? currentUserId : editDeliveryDriverId,
          deliveryDriverId: editDeliveryDriverId,
          returnDriverId: editReturnDriverId,
          rentalType: contractToEdit.rentalType || (editDays >= 30 ? "Monthly" : "Daily"),
          customerType: contractToEdit.customerType || "B2C",
          startDate: formatDateToInput(contractToEdit.startDate),
          endDate: formatDateToInput(contractToEdit.endDate),
          collectionAmount: editCollectionAmount,
          dailyRate: editDailyRate,
          dailyKmLimit: contractToEdit.dailyKmLimit || 0,
          pricePerExtraKm: contractToEdit.pricePerExtraKm || 0,
          depositAmount: contractToEdit.depositAmount || 0,
          pickupLocation: contractToEdit.pickupLocation || "Main Office",
          dropoffLocation: contractToEdit.dropoffLocation || "",
          checkoutTime: contractToEdit.checkoutTime || "10:00 AM",
          checkinTime: contractToEdit.checkinTime || "10:00 AM",
          additionalDriverName: contractToEdit.additionalDriverName || "",
          additionalDriverLicense: contractToEdit.additionalDriverLicense || "",
          additionalDriverNationality: contractToEdit.additionalDriverNationality || "",
          additionalDriverPhone: contractToEdit.additionalDriverPhone || "",
          additionalDriverExpiry: contractToEdit.additionalDriverExpiry ? formatDateToInput(contractToEdit.additionalDriverExpiry) : "",
          additionalDriverIssuedAt: contractToEdit.additionalDriverIssuedAt || "",
          babySeatFees: contractToEdit.babySeatFees || 0,
          tintingFees: contractToEdit.tintingFees || 0,
          deliveryCharges: contractToEdit.deliveryCharges || 0,
          salikFees: contractToEdit.salikFees || 0,
          cleaningFees: contractToEdit.cleaningFees || 0,
          notes: contractToEdit.notes || "",
          checkoutFuelLevel: contractToEdit.checkoutFuelLevel || 100,
          paymentMethod: contractToEdit.paymentMethod || "Cash",
          paymentStatus: contractToEdit.paymentStatus || "Pending",
        });
        const initialPhotos: Record<string, string> = {};
        if (Array.isArray(contractToEdit.inspectionPhotos)) {
          contractToEdit.inspectionPhotos.forEach((url: string, idx: number) => {
            if (url && VEHICLE_ANGLES[idx]) {
              initialPhotos[VEHICLE_ANGLES[idx]] = url;
            }
          });
        }
        setInspectionPhotos(initialPhotos);
        if (contractToEdit.additionalDriverName) {
          setSecondDriverClient({
            name: contractToEdit.additionalDriverName,
            licenseNumber: contractToEdit.additionalDriverLicense,
            phone: contractToEdit.additionalDriverPhone,
            nationality: contractToEdit.additionalDriverNationality,
          });
        } else {
          setSecondDriverClient(null);
        }
      } else {
        setSecondDriverClient(null);
        setSignatureData(null);
        setAdminSignatureData(null);
        setInspectionPhotos({});
        setFormData({
          unitId: "",
          clientId: "",
          contractType: "Shop" as "Shop" | "Delivery",
          driverId: isDriverRole ? currentUserId : "",
          deliveryDriverId: isDriverRole ? currentUserId : "",
          returnDriverId: "",
          rentalType: "Daily",
          customerType: "B2C",
          startDate: new Date().toISOString().split("T")[0],
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          collectionAmount: 595,
          dailyRate: 85,
          dailyKmLimit: 0,
          pricePerExtraKm: 0,
          depositAmount: 0,
          pickupLocation: "Main Office",
          dropoffLocation: "",
          checkoutTime: "10:00 AM",
          checkinTime: "10:00 AM",
          additionalDriverName: "",
          additionalDriverLicense: "",
          additionalDriverNationality: "",
          additionalDriverPhone: "",
          additionalDriverExpiry: "",
          additionalDriverIssuedAt: "",
          babySeatFees: 0,
          tintingFees: 0,
          deliveryCharges: 0,
          salikFees: 0,
          cleaningFees: 0,
          checkoutFuelLevel: 100,
          notes: "",
          paymentMethod: "Cash",
          paymentStatus: "Pending",
        });
      }
    }
  }, [isOpen, contractToEdit]);

  const isCurrentContractUnit = (unitId: string) => {
    if (!contractToEdit) return false;
    const currentId = contractToEdit.unitId?._id || contractToEdit.unitId;
    return currentId === unitId;
  };

  const isUnitBookable = (unit: any) => {
    if (!unit) return false;
    if (isCurrentContractUnit(unit._id)) return true;
    return unit.status?.toLowerCase() === "available";
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.unitId) {
        toast.error("Please select a car first.");
        return;
      }
      const selectedUnit = units.find(u => u._id === formData.unitId);
      if (selectedUnit && !isUnitBookable(selectedUnit)) {
        toast.error(`The selected car (${selectedUnit?.make || ""} ${selectedUnit?.model || ""}) is currently ${selectedUnit?.status || "Delivered/Rented"} and cannot be booked.`);
        return;
      }
    }
    if (currentStep === 2 && !formData.clientId) {
      toast.error("Please select a client first.");
      return;
    }
    if (currentStep < STEPS.length) {
      setCurrentStep((c) => c + 1);
      modalBodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      modalOverlayRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(1, prev - 1));
    modalBodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    modalOverlayRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Signature Handlers
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.width !== canvas.offsetWidth) {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    const rect = canvas.getBoundingClientRect();
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
    if ('touches' in e) {
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
    ctx.strokeStyle = "#000000";
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
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // Admin Signature Handlers
  const startDrawingAdmin = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawingAdmin(true);
    const canvas = adminCanvasRef.current;
    if (!canvas) return;
    if (canvas.width !== canvas.offsetWidth) {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    const rect = canvas.getBoundingClientRect();
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
    if ('touches' in e) {
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
    ctx.strokeStyle = "#000000";
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
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const autoSignAdmin = () => {
    const canvas = adminCanvasRef.current;
    if (!canvas) return;
    if (canvas.width !== canvas.offsetWidth) {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const adminName = session?.user?.name || "Leon Car Rental";
    ctx.font = "italic bold 22px cursive, sans-serif";
    ctx.fillStyle = "#0f172a";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(adminName, canvas.width / 2, canvas.height / 2);
    setAdminSignatureData(canvas.toDataURL("image/png"));
    toast.success(`Signed as ${adminName}`);
  };

  const handleSubmit = async () => {
    if (!formData.unitId || !formData.clientId) {
      toast.error("Please select both a car and a customer.");
      return;
    }

    const selectedUnit = units.find(u => u._id === formData.unitId);
    if (!selectedUnit || !isUnitBookable(selectedUnit)) {
      toast.error(`The selected car (${selectedUnit?.make || ""} ${selectedUnit?.model || ""}) is currently ${selectedUnit?.status || "Delivered/Rented"} and cannot be booked.`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));
      const collectionPrice = Number(formData.collectionAmount || (days * Number(formData.dailyRate)));
      const calculatedDailyRate = days > 0 ? Math.round((collectionPrice / days) * 100) / 100 : collectionPrice;
      const calculatedTotal = collectionPrice + 
        (Number(formData.babySeatFees) || 0) + 
        (Number(formData.tintingFees) || 0) + 
        (Number(formData.deliveryCharges) || 0) + 
        (Number(formData.salikFees) || 0) + 
        (Number(formData.cleaningFees) || 0);
      
      const contractId = contractToEdit?._id || contractToEdit?.id;
      const url = contractToEdit ? `/api/contracts/${contractId}` : "/api/contracts";
      const method = contractToEdit ? "PUT" : "POST";

      const orderedInspectionPhotos = VEHICLE_ANGLES.map(angle => inspectionPhotos[angle] || "");

      const determinedContractType = formData.deliveryDriverId ? "Delivery" : "Shop";

      const payload = {
        ...formData,
        contractType: determinedContractType,
        dailyRate: calculatedDailyRate,
        totalDays: days,
        totalAmount: calculatedTotal,
        inspectionPhotos: orderedInspectionPhotos,
        customerSignature: signatureData,
        adminSignature: adminSignatureData,
        ...(!contractToEdit && { status: isDriverRole ? "Active" : "Draft" })
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save contract.");
      }

      toast.success(contractToEdit ? "Contract updated successfully!" : "Booking created successfully!");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save contract");
      toast.error(err.message || "Failed to save contract");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Filter Units: By default show strictly Available vehicles; allow switching to All Fleet view
  const availableUnits = units.filter(u => isUnitBookable(u));
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

  // Filter Clients (show latest 6 by default, or all matching search, and always include selected)
  const filteredClients = clientSearchQuery
    ? clients.filter(c =>
        c.name?.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
        c.phone?.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
        c.idNumber?.toLowerCase().includes(clientSearchQuery.toLowerCase())
      )
    : (() => {
        const top6 = clients.slice(0, 6);
        if (formData.clientId && !top6.some(c => c._id === formData.clientId)) {
          const selected = clients.find(c => c._id === formData.clientId);
          if (selected) return [selected, ...top6];
        }
        return top6;
      })();

  const selectedVehicleObj = units.find((u) => u._id === formData.unitId);
  const selectedClientObj = clients.find((c) => c._id === formData.clientId);
  const selectedDeliveryDriverObj = drivers.find((d) => (d._id || d.userId) === formData.deliveryDriverId);

  const durationDays = Math.max(1, Math.ceil((new Date(formData.endDate).getTime() - new Date(formData.startDate).getTime()) / (1000 * 3600 * 24)));
  const calculatedTotalRent = (durationDays * Number(formData.dailyRate)) + 
    (Number(formData.babySeatFees) || 0) + 
    (Number(formData.tintingFees) || 0) + 
    (Number(formData.deliveryCharges) || 0) + 
    (Number(formData.salikFees) || 0) + 
    (Number(formData.cleaningFees) || 0);

  return (
    <div ref={modalOverlayRef} className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden border border-border flex flex-col max-h-[92vh]">
        
        {/* ================= MODAL HEADER ================= */}
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-white shrink-0">
          <div>
            <h1 className="text-xl font-bold text-text-primary">
              {contractToEdit ? "Edit Rental Contract" : "Create New Booking"}
            </h1>
            <p className="text-xs text-text-secondary mt-0.5">
              {contractToEdit 
                ? "Update vehicle, customer, rental schedule, and financial terms." 
                : "Configure vehicle, customer, and rental schedule. The official contract is signed and activated by the driver upon vehicle delivery."}
            </p>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-gray-100 active:scale-95 rounded-xl transition-all cursor-pointer shrink-0 ml-2"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* ================= STEPPER HEADER (MATCHES BOOKINGS/NEW) ================= */}
        <div className="bg-card border-b border-border p-4 sm:p-6 shrink-0">
          <div className="relative w-full max-w-3xl mx-auto px-2 sm:px-4">
            {/* Background Track Line (connected precisely through centers of first and last circles) */}
            <div 
              className="absolute top-[18px] -translate-y-1/2 h-[2px] bg-gray-200 z-0 hidden sm:block pointer-events-none" 
              style={{
                left: `${100 / (2 * STEPS.length)}%`,
                right: `${100 / (2 * STEPS.length)}%`,
              }}
            />
            {/* Active Progress Line */}
            <div 
              className="absolute top-[18px] -translate-y-1/2 h-[2px] bg-brand z-0 transition-all duration-300 hidden sm:block pointer-events-none" 
              style={{
                left: `${100 / (2 * STEPS.length)}%`,
                width: STEPS.length > 1 
                  ? `${((currentStep - 1) / (STEPS.length - 1)) * (100 - (100 / STEPS.length))}%` 
                  : "0%",
              }}
            />
            
            <div className="flex items-start w-full relative z-10">
              {STEPS.map((step) => (
                <div key={step.id} className="flex-1 min-w-0 flex flex-col items-center">
                  <button 
                    type="button"
                    onClick={() => {
                      if (contractToEdit || step.id <= currentStep) {
                        if (step.id > 1 && !formData.unitId) {
                          toast.error("Please select a car first.");
                          return;
                        }
                        const selectedUnit = units.find(u => u._id === formData.unitId);
                        if (step.id > 1 && selectedUnit && !isUnitBookable(selectedUnit)) {
                          toast.error(`The selected car is currently ${selectedUnit.status || "Delivered/Rented"} and cannot be booked.`);
                          return;
                        }
                        if (step.id > 2 && !formData.clientId) {
                          toast.error("Please select a client first.");
                          return;
                        }
                        setCurrentStep(step.id);
                      } else if (step.id === currentStep + 1) {
                        handleNext();
                      }
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

        {/* ================= MODAL BODY / WIZARD CONTENT ================= */}
        <div ref={modalBodyRef} className="p-6 sm:p-8 overflow-y-auto flex-1 custom-scrollbar overscroll-contain space-y-6">
          
          {error && (
            <div className="bg-red-50 text-red-700 p-3.5 sm:p-4 rounded-xl text-xs sm:text-sm font-medium border border-red-200 shadow-2xs animate-fade-in">
              <span>{error}</span>
            </div>
          )}

          {loadingData ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <Loader2 size={36} className="text-brand animate-spin" />
              <p className="text-sm text-text-secondary font-medium">Loading cars &amp; client records...</p>
            </div>
          ) : (
            <>
              {/* ==================== STEP 1: CAR ==================== */}
              {currentStep === 1 && (
                <div className="space-y-6 animate-fade-in-up">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-text-primary">Step 1: Select Car</h2>
                      <p className="text-xs text-text-muted mt-0.5">Select an available car to assign to this contract</p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                      {/* Car Availability Filter */}
                      <div className="flex bg-gray-100 p-0.5 rounded-xl border border-gray-200 shrink-0">
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
                          ? "All cars are currently rented, delivered, or under maintenance. Check in returned cars in Bookings to free them up."
                          : "No cars match your search keywords. Try searching by make, model, or license plate."}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredUnits.map((unit) => {
                        const isSelected = formData.unitId === unit._id;
                        const isAvailable = isUnitBookable(unit);

                        return (
                          <div
                            key={unit._id}
                            onClick={() => {
                              if (!isAvailable) {
                                toast.error(`This car is currently ${unit.status || "Delivered/Rented"} and cannot be booked until returned.`);
                                return;
                              }
                              const start = new Date(formData.startDate);
                              const end = new Date(formData.endDate);
                              const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));
                              const rate = unit.dailyRate || 85;
                              setFormData(prev => ({
                                ...prev,
                                unitId: unit._id,
                                dailyRate: rate,
                                collectionAmount: rate * days,
                                dailyKmLimit: unit.dailyKmLimit ?? prev.dailyKmLimit ?? 0,
                                pricePerExtraKm: unit.pricePerExtraKm ?? prev.pricePerExtraKm ?? 0,
                              }));
                            }}
                            className={`bg-card rounded-2xl border p-5 flex flex-col transition-all group ${
                              !isAvailable
                                ? "opacity-60 bg-gray-50/70 border-gray-200 cursor-not-allowed"
                                : isSelected 
                                ? "border-brand bg-brand-light/20 ring-2 ring-brand/30 shadow-md cursor-pointer card-hover" 
                                : "border-border shadow-sm hover:border-gray-300 cursor-pointer card-hover"
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
                              ) : !isAvailable ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  {unit.status === "Rented" ? "Delivered / Rented" : (unit.status || "Unavailable")}
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
                                {!isAvailable ? (
                                  <span className="text-[11px] font-semibold text-amber-700">Currently in use</span>
                                ) : (
                                  <>
                                    <span className="text-base font-bold text-text-primary">${unit.dailyRate || 85}</span>
                                    <span className="text-text-muted text-[11px]">/day</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ==================== STEP 2: CLIENT ==================== */}
              {currentStep === 2 && (
                <div className="space-y-5 animate-fade-in-up">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-text-primary">Step 2: Select Customer (اختيار العميل)</h2>
                      <p className="text-xs text-text-muted mt-0.5">Click a customer card to select, or register a new one</p>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="relative flex-1 sm:w-64">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                          type="text"
                          placeholder="Search by name, phone, national ID..."
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
                          formData.additionalDriverName
                            ? "bg-red-50 border-red-300 text-red-700 hover:bg-red-100"
                            : "bg-gray-50 border-border text-text-muted hover:border-red-400 hover:text-red-600 hover:bg-red-50/50"
                        }`}
                        title={formData.additionalDriverName ? `2nd Driver: ${formData.additionalDriverName}` : "Add 2nd Driver (إضافة سائق ثاني)"}
                      >
                        <User size={16} />
                        <span className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-white text-[9px] font-black flex items-center justify-center shadow-xs ${
                          formData.additionalDriverName ? "bg-red-600" : "bg-gray-400 group-hover:bg-red-600"
                        }`}>
                          2
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Selection Chips — only when someone is selected */}
                  {(selectedClientObj || formData.additionalDriverName) && (
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedClientObj && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/8 border border-brand/20">
                          <span className="w-5 h-5 rounded-full bg-brand text-white text-[9px] font-black flex items-center justify-center">1</span>
                          <span className="text-xs font-semibold text-text-primary truncate max-w-[140px]">{selectedClientObj.name}</span>
                          <CheckCircle2 size={13} className="text-brand shrink-0" />
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, clientId: "" }))}
                            className="text-gray-400 hover:text-red-600 transition-colors cursor-pointer ml-0.5"
                            title="Remove selected customer"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      )}
                      {formData.additionalDriverName && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-200">
                          <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center">2</span>
                          <span className="text-xs font-semibold text-text-primary truncate max-w-[140px]">{formData.additionalDriverName}</span>
                          {formData.additionalDriverLicense && (
                            <span className="text-[9px] font-mono text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                              {formData.additionalDriverLicense}
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
                      <p className="text-xs text-text-muted mt-1">Click "+ New Client" to register the customer right away.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredClients.map((client) => {
                        const isSelected = formData.clientId === client._id;
                        return (
                          <div
                            key={client._id}
                            onClick={() => setFormData(prev => ({ ...prev, clientId: isSelected ? "" : client._id }))}
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
              )}

              {/* ==================== STEP 3: RENTAL DATA ==================== */}
              {currentStep === 3 && (
                <div className="space-y-6 animate-fade-in-up">
                  <div>
                    <h2 className="text-lg font-bold text-text-primary">Step 3: Rental Period &amp; Financial Terms</h2>
                    <p className="text-xs text-text-muted mt-0.5">Specify dates, locations, assign delivery/return drivers, and pricing</p>
                  </div>

                  {/* Rental Type & Customer Type Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs">
                    {/* Rental Type: Daily vs Monthly */}
                    <div>
                      <label className="text-xs font-bold text-text-primary block mb-2 flex items-center justify-between">
                        <span>Rental Type (نوع الاستئجار)</span>
                        <span className="text-[11px] font-semibold text-brand">
                          {formData.rentalType === "Monthly" ? "Monthly Rate" : "Daily Rate"}
                        </span>
                      </label>
                      <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100/80 rounded-xl">
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, rentalType: "Daily" }));
                          }}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            formData.rentalType === "Daily"
                              ? "bg-brand text-white shadow-xs"
                              : "text-text-secondary hover:text-text-primary hover:bg-gray-200/60"
                          }`}
                        >
                          Daily / يومي
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const s = new Date(formData.startDate);
                            const monthEnd = new Date(s.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
                            setFormData(prev => ({ 
                              ...prev, 
                              rentalType: "Monthly",
                              endDate: monthEnd,
                              collectionAmount: Math.round(prev.dailyRate * 30 * 100) / 100
                            }));
                          }}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            formData.rentalType === "Monthly"
                              ? "bg-brand text-white shadow-xs"
                              : "text-text-secondary hover:text-text-primary hover:bg-gray-200/60"
                          }`}
                        >
                          Monthly / شهري
                        </button>
                      </div>
                    </div>

                    {/* Customer Type: B2C vs B2B */}
                    <div>
                      <label className="text-xs font-bold text-text-primary block mb-2 flex items-center justify-between">
                        <span>Customer Type (نوع العميل)</span>
                        <span className="text-[11px] font-semibold text-brand">
                          {formData.customerType === "B2B" ? "Corporate Account" : "Individual (B2C)"}
                        </span>
                      </label>
                      <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100/80 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, customerType: "B2C" }))}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            formData.customerType === "B2C"
                              ? "bg-brand text-white shadow-xs"
                              : "text-text-secondary hover:text-text-primary hover:bg-gray-200/60"
                          }`}
                        >
                          B2C (Individual / فردي)
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, customerType: "B2B" }))}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            formData.customerType === "B2B"
                              ? "bg-brand text-white shadow-xs"
                              : "text-text-secondary hover:text-text-primary hover:bg-gray-200/60"
                          }`}
                        >
                          B2B (Corporate / شركات)
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 1. Dates & Drivers */}
                    <div className="space-y-4 bg-gray-50/60 p-5 rounded-2xl border border-gray-100">
                      <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                        <Calendar size={16} className="text-brand" /> Dates &amp; Logistics
                      </h3>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-text-secondary block mb-1">Start Date</label>
                          <input 
                            type="date" 
                            value={formData.startDate} 
                            onChange={e => {
                              const newStart = e.target.value;
                              const s = new Date(newStart);
                              const end = new Date(formData.endDate);
                              const days = Math.max(1, Math.ceil((end.getTime() - s.getTime()) / (1000 * 3600 * 24)));
                              const rate = Number(formData.dailyRate) || 0;
                              setFormData(prev => ({
                                ...prev,
                                startDate: newStart,
                                collectionAmount: rate * days,
                              }));
                            }} 
                            className="w-full p-2.5 rounded-xl border border-border bg-white text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none" 
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-text-secondary block mb-1">End Date</label>
                          <input 
                            type="date" 
                            value={formData.endDate} 
                            onChange={e => {
                              const newEnd = e.target.value;
                              const start = new Date(formData.startDate);
                              const eDate = new Date(newEnd);
                              const days = Math.max(1, Math.ceil((eDate.getTime() - start.getTime()) / (1000 * 3600 * 24)));
                              const rate = Number(formData.dailyRate) || 0;
                              setFormData(prev => ({
                                ...prev,
                                endDate: newEnd,
                                collectionAmount: rate * days,
                              }));
                            }} 
                            className="w-full p-2.5 rounded-xl border border-border bg-white text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none" 
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-text-secondary block mb-1 flex items-center gap-1">
                          <Clock size={13} className="text-brand" />
                          Delivery / Handover Time (وقت تسليم السيارة للسائق) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input 
                            type="text" 
                            value={formData.checkoutTime} 
                            onChange={e => setFormData({...formData, checkoutTime: e.target.value})} 
                            placeholder="e.g. 10:00 AM"
                            className="w-full p-2.5 pl-8 rounded-xl border border-border bg-white text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none font-medium" 
                          />
                          <Clock size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-text-secondary block mb-1">
                          Assign Delivery Driver (سائق تسليم السيارة للعميل)
                        </label>
                        <select
                          value={formData.deliveryDriverId}
                          onChange={e => setFormData({...formData, deliveryDriverId: e.target.value, driverId: e.target.value})}
                          className="w-full p-2.5 rounded-xl border border-border bg-white text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none cursor-pointer"
                        >
                          <option value="">-- Select Delivery Driver (or Client Self-Pickup) --</option>
                          {drivers.map(d => (
                            <option key={d._id || d.userId} value={d._id || d.userId}>
                              {d.name} {d.phone ? `(${d.phone})` : ""}
                            </option>
                          ))}
                        </select>
                        <p className="text-[11px] text-text-muted mt-1">
                          The assigned driver will be notified to take and deliver the vehicle to the customer at <strong className="text-brand">{formData.checkoutTime || "10:00 AM"}</strong>.
                        </p>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-text-secondary block mb-1">
                          Assign Return Driver (سائق استلام السيارة من العميل)
                        </label>
                        <select
                          value={formData.returnDriverId}
                          onChange={e => setFormData({...formData, returnDriverId: e.target.value})}
                          className="w-full p-2.5 rounded-xl border border-border bg-white text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none cursor-pointer"
                        >
                          <option value="">-- Select Return Driver (or Client Self-Return) --</option>
                          {drivers.map(d => (
                            <option key={d._id || d.userId} value={d._id || d.userId}>
                              {d.name} {d.phone ? `(${d.phone})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="pt-2">
                        <label className="text-xs font-semibold text-text-secondary block mb-1 flex items-center gap-1">
                          <MapPin size={13} className="text-emerald-600" /> Handover Location (مكان التسليم)
                        </label>
                        <input 
                          type="text" 
                          value={formData.pickupLocation} 
                          onChange={e => setFormData({...formData, pickupLocation: e.target.value})} 
                          placeholder="e.g. Main Office, Oran Airport, Hotel..."
                          className="w-full p-2.5 rounded-xl border border-border bg-white text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none" 
                        />
                      </div>

                      {/* Fuel Level Selector */}
                      <div className="pt-2 border-t border-gray-200/70">
                        <FuelLevelSelector
                          value={formData.checkoutFuelLevel}
                          onChange={(val) => setFormData({ ...formData, checkoutFuelLevel: val })}
                          label="Fuel Level Percentage (مستوى الوقود عند الاستلام بالمحل)"
                        />
                      </div>
                    </div>

                    {/* 2. Rates & Deposit */}
                    <div className="space-y-4 bg-gray-50/60 p-5 rounded-2xl border border-gray-100">
                      <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                        <DollarSign size={16} className="text-brand" /> Collection Amount &amp; Deposit (مبلغ التحصيل والتأمين)
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-text-secondary block mb-1">
                            Daily Rate ($/day) / السعر اليومي
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">$</span>
                            <input 
                              type="number" 
                              value={formData.dailyRate === 0 ? "" : formData.dailyRate} 
                              onChange={e => {
                                const val = Number(e.target.value);
                                const start = new Date(formData.startDate);
                                const end = new Date(formData.endDate);
                                const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));
                                setFormData(prev => ({
                                  ...prev, 
                                  dailyRate: val,
                                  collectionAmount: days > 0 ? Math.round(val * days * 100) / 100 : val
                                }));
                              }} 
                              placeholder="e.g. 50"
                              className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-border bg-white text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none font-bold text-text-primary" 
                            />
                          </div>
                          <span className="text-[11px] text-text-muted mt-0.5 block">
                            {formData.unitId ? `Base vehicle rate ($/day)` : "Daily rental rate"}
                          </span>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-text-secondary block mb-1">
                            Collection Amount ($) / مبلغ التحصيل <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">$</span>
                            <input 
                              type="number" 
                              value={formData.collectionAmount === 0 ? "" : formData.collectionAmount} 
                              onChange={e => {
                                const val = Number(e.target.value);
                                const start = new Date(formData.startDate);
                                const end = new Date(formData.endDate);
                                const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));
                                setFormData(prev => ({
                                  ...prev, 
                                  collectionAmount: val,
                                  dailyRate: days > 0 && val > 0 ? Math.round((val / days) * 100) / 100 : prev.dailyRate
                                }));
                              }} 
                              placeholder="e.g. 350"
                              className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-border bg-white text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none font-bold text-text-primary" 
                            />
                          </div>
                          <span className="text-[11px] text-text-muted mt-0.5 block">
                            Calculated: ${formData.dailyRate || 0} × {Math.max(1, Math.ceil((new Date(formData.endDate).getTime() - new Date(formData.startDate).getTime()) / (1000 * 3600 * 24)))}d (editable)
                          </span>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-text-secondary block mb-1">
                            Deposit Amount ($) / مبلغ التأمين
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">$</span>
                            <input 
                              type="number" 
                              value={formData.depositAmount === 0 ? "" : formData.depositAmount} 
                              onChange={e => {
                                const val = Number(e.target.value);
                                setFormData(prev => ({ ...prev, depositAmount: val }));
                              }} 
                              placeholder="0"
                              className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-border bg-white text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none font-bold text-text-primary" 
                            />
                          </div>
                          <span className="text-[11px] text-text-muted mt-0.5 block">
                            {formData.deliveryDriverId || formData.deliveryCharges > 0 
                              ? "Driver collects upon car delivery" 
                              : "Collected at shop counter"}
                          </span>
                        </div>
                      </div>

                      {/* Total Handover Collection Card */}
                      <div className="bg-brand/5 p-4 rounded-2xl border border-brand/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary block">
                            Total to Collect on Handover (إجمالي المبلغ المطلوب تحصيله)
                          </span>
                          <p className="text-xs text-text-muted mt-0.5">
                            Collection Price (${formData.collectionAmount || 0}) + Deposit (${formData.depositAmount || 0})
                            {formData.deliveryCharges > 0 ? ` + Delivery Fee ($${formData.deliveryCharges})` : ""}
                          </p>
                        </div>
                        <div className="text-left sm:text-right">
                          <span className="text-2xl font-black text-brand">
                            ${Number(formData.collectionAmount || 0) + Number(formData.depositAmount || 0) + Number(formData.deliveryCharges || 0)}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-text-secondary block mb-1">Daily KM Limit</label>
                          <input 
                            type="number" 
                            value={formData.dailyKmLimit} 
                            onChange={e => setFormData({...formData, dailyKmLimit: Number(e.target.value)})} 
                            placeholder="0 = Unlimited"
                            className="w-full p-2.5 rounded-xl border border-border bg-white text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none" 
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-text-secondary block mb-1">Price per Extra KM ($)</label>
                          <input 
                            type="number" 
                            value={formData.pricePerExtraKm} 
                            onChange={e => setFormData({...formData, pricePerExtraKm: Number(e.target.value)})} 
                            className="w-full p-2.5 rounded-xl border border-border bg-white text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none" 
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div>
                          <label className="text-xs font-semibold text-text-secondary block mb-1">Baby Seat Fee ($)</label>
                          <input 
                            type="number" 
                            value={formData.babySeatFees} 
                            onChange={e => setFormData({...formData, babySeatFees: Number(e.target.value)})} 
                            className="w-full p-2.5 rounded-xl border border-border bg-white text-sm outline-none" 
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-text-secondary block mb-1">Delivery Charge ($)</label>
                          <input 
                            type="number" 
                            value={formData.deliveryCharges} 
                            onChange={e => setFormData({...formData, deliveryCharges: Number(e.target.value)})} 
                            className="w-full p-2.5 rounded-xl border border-border bg-white text-sm outline-none" 
                          />
                        </div>
                      </div>

                      {/* Payment Method Selector (1, 2, or 3 methods) */}
                      <PaymentMethodSelector
                        value={formData.paymentMethod}
                        onChange={(val) => setFormData({ ...formData, paymentMethod: val })}
                        totalAmount={Number(formData.depositAmount || 0)}
                        totalLabel="Deposit Total"
                        label="Payment Method / طريقة الدفع"
                      />


                      <div>
                        <label className="text-xs font-semibold text-text-secondary block mb-1">
                          Driver Instructions / Remarks (تعليمات للسائق)
                        </label>
                        <textarea 
                          rows={2}
                          value={formData.notes} 
                          onChange={e => setFormData({...formData, notes: e.target.value})} 
                          placeholder="Special instructions for driver (e.g. handover details, client preferences)..."
                          className="w-full p-2.5 rounded-xl border border-border bg-white text-xs outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand resize-none" 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== STEP 4: VEHICLE INSPECTION PHOTOS ==================== */}
              {currentStep === 4 && (
                <div className="space-y-6 animate-fade-in-up">
                  <div>
                    <h2 className="text-lg font-bold text-text-primary">
                      Step 4: Pre-Handover Vehicle Inspection Photos
                    </h2>
                    <p className="text-xs text-text-muted mt-0.5">
                      Capture or upload 8 standard angles to document vehicle condition before handing over to the client
                    </p>
                  </div>

                  <VehicleInspectionPhotoCapture
                    photos={inspectionPhotos}
                    onChange={setInspectionPhotos}
                    title="Vehicle Inspection Photos (صور فحص تسليم السيارة)"
                    subtitle="Capture photos using direct camera or upload from gallery across all 8 standard angles."
                    badgeLabel="Pre-Handover"
                  />
                </div>
              )}

              {/* ==================== STEP 5: REVIEW & FINALIZE ==================== */}
              {currentStep === 5 && (
                <div className="space-y-6 animate-fade-in-up">
                  <div>
                    <h2 className="text-lg font-bold text-text-primary">
                      {contractToEdit ? "Step 5: Review Contract Terms & Save" : "Step 5: Review Booking & Sign"}
                    </h2>
                    <p className="text-xs text-text-muted mt-0.5">
                      {contractToEdit ? "Verify agreement details, inspection photos, and customer signature" : "Confirm agreement details and sign before activating"}
                    </p>
                  </div>

                  <div className="bg-gray-50/70 rounded-2xl p-6 border border-border space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
                        <span className="text-text-muted text-xs block mb-1">Customer</span>
                        <strong className="text-text-primary text-sm font-bold block truncate">{selectedClientObj?.name || "N/A"}</strong>
                        <span className="text-xs text-text-muted">{selectedClientObj?.phone || ""}</span>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
                        <span className="text-text-muted text-xs block mb-1">Vehicle</span>
                        <strong className="text-text-primary text-sm font-bold block truncate">
                          {selectedVehicleObj ? `${selectedVehicleObj.make} ${selectedVehicleObj.model}` : "N/A"}
                        </strong>
                        <span className="text-xs text-text-muted font-mono">{selectedVehicleObj?.plate || ""}</span>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
                        <span className="text-text-muted text-xs block mb-1">Assigned Driver</span>
                        <strong className="text-text-primary text-sm font-bold block truncate">
                          {selectedDeliveryDriverObj ? selectedDeliveryDriverObj.name : "Self-Drive (Client Picks Up)"}
                        </strong>
                        <span className="text-xs text-text-muted block truncate">
                          {selectedDeliveryDriverObj ? (selectedDeliveryDriverObj.email || selectedDeliveryDriverObj.phone || "Assigned Driver") : "No driver assigned"}
                        </span>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
                        <span className="text-text-muted text-xs block mb-1">Handover Location</span>
                        <strong className="text-text-primary text-xs font-bold block truncate" title={formData.pickupLocation}>
                          {formData.pickupLocation || "Main Office"}
                        </strong>
                      </div>
                    </div>

                    {/* Second Driver — if added */}
                    {formData.additionalDriverName && (
                      <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 shadow-2xs flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shrink-0">
                            2
                          </div>
                          <div>
                            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                              Authorized Second Driver (السائق الثاني المصرح له)
                            </span>
                            <strong className="text-sm font-bold text-text-primary block">
                              {formData.additionalDriverName}
                            </strong>
                            <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                              <span>{formData.additionalDriverPhone || "No phone"}</span>
                              {formData.additionalDriverLicense && (
                                <span className="font-mono text-[10px] text-emerald-700 bg-white px-1.5 py-0.2 rounded border border-emerald-200">
                                  {formData.additionalDriverLicense}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="text-[11px] bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-1 rounded-full">
                          Coverage Included
                        </span>
                      </div>
                    )}

                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-2xs grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-gray-100">
                          <span className="text-text-muted">Rental Period:</span>
                          <span className="font-semibold text-text-primary">{formData.startDate} to {formData.endDate} ({durationDays} days)</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-100">
                          <span className="text-text-muted">Scheduled Delivery Time:</span>
                          <span className="font-semibold text-brand">{formData.checkoutTime}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-100">
                          <span className="text-text-muted">Rental Collection Amount:</span>
                          <span className="font-bold text-text-primary">${formData.collectionAmount} (~${formData.dailyRate}/day)</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-100">
                          <span className="text-text-muted">Initial Fuel Level:</span>
                          <span className="font-bold text-emerald-600">{formData.checkoutFuelLevel || 100}%</span>
                        </div>
                        {formData.deliveryCharges > 0 && (
                          <div className="flex justify-between py-1 border-b border-gray-100">
                            <span className="text-text-muted">Delivery Fee:</span>
                            <span className="font-semibold text-text-primary">${formData.deliveryCharges}</span>
                          </div>
                        )}
                        {formData.babySeatFees > 0 && (
                          <div className="flex justify-between py-1 border-b border-gray-100">
                            <span className="text-text-muted">Baby Seat Fee:</span>
                            <span className="font-semibold text-text-primary">${formData.babySeatFees}</span>
                          </div>
                        )}
                        <div className="flex justify-between py-1 border-b border-gray-100">
                          <span className="text-text-muted">Expected Deposit:</span>
                          <span className="font-bold text-emerald-600">
                            ${formData.depositAmount} {formData.deliveryDriverId || formData.deliveryCharges > 0 ? "(Collected upon delivery)" : "(Collected at shop)"}
                          </span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100 bg-brand/5 px-2.5 rounded-lg items-center">
                          <div>
                            <span className="font-bold text-brand block">Total Handover Collection (إجمالي التحصيل):</span>
                            <span className="text-[10px] text-text-muted">Collection Price + Deposit {formData.deliveryCharges > 0 ? "+ Delivery" : ""}</span>
                          </div>
                          <span className="text-base font-black text-brand">
                            ${Number(formData.collectionAmount || 0) + Number(formData.depositAmount || 0) + Number(formData.deliveryCharges || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-100 items-center">
                          <span className="text-text-muted">Payment Method &amp; Status:</span>
                          <span className="font-semibold text-text-primary flex items-center gap-1.5 flex-wrap justify-end text-right">
                            {formData.paymentMethod?.includes("Crypto") && <Coins size={14} className="text-amber-600 shrink-0" />}
                            {formData.paymentMethod?.includes("Card") && <CreditCard size={14} className="text-blue-600 shrink-0" />}
                            {formData.paymentMethod?.includes("Cash") && <Banknote size={14} className="text-emerald-600 shrink-0" />}
                            <span>{formData.paymentMethod}</span>
                          </span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-text-muted">Mileage Limit:</span>
                          <span className="font-semibold text-text-primary">
                            {formData.dailyKmLimit ? `${formData.dailyKmLimit} km/day (+$${formData.pricePerExtraKm}/km)` : "Unlimited mileage"}
                          </span>
                        </div>
                      </div>

                      <div className="bg-brand/5 p-4 rounded-xl border border-brand/20 text-center">
                        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                          Total Rental Amount
                        </span>
                        <span className="text-3xl font-black text-brand">${calculatedTotalRent.toFixed(2)}</span>
                        <span className="text-[11px] text-text-muted block mt-1">
                          Total rental charges (deposit of ${formData.depositAmount} held separately upon handover)
                        </span>
                      </div>
                    </div>

                    {/* Pre-Handover Photos Preview Strip */}
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                          <Camera size={14} className="text-brand" />
                          Pre-Handover Inspection Photos ({Object.values(inspectionPhotos).filter(Boolean).length}/8 photos captured)
                        </span>
                        <button
                          type="button"
                          onClick={() => setCurrentStep(4)}
                          className="text-[11px] text-brand font-semibold hover:underline cursor-pointer"
                        >
                          Edit Photos
                        </button>
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                        {VEHICLE_ANGLES.map((angle, idx) => {
                          const url = inspectionPhotos[angle];
                          return (
                            <div key={angle} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-gray-50 flex flex-col items-center justify-center text-center p-1">
                              {url ? (
                                <img src={url} alt={angle} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[9px] text-text-muted font-medium leading-tight">#{idx + 1}<br/>{angle.split(' ')[0]}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Two Signature Boxes: Customer & Admin */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 1. Customer Signature Box */}
                      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                            <PenTool size={14} className="text-brand" />
                            Customer Signature (توقيع العميل)
                          </label>
                          {signatureData && (
                            <button
                              type="button"
                              onClick={clearSignature}
                              className="text-[11px] text-red-600 hover:underline font-semibold cursor-pointer"
                            >
                              Clear
                            </button>
                          )}
                        </div>

                        <div className="border-2 border-border rounded-xl overflow-hidden bg-white relative shadow-inner group h-32">
                          <div className="absolute inset-0 pointer-events-none flex flex-col justify-end p-3 pb-4 z-0 opacity-40">
                            <div className="border-b border-dashed border-gray-300 w-full mb-1"></div>
                            <span className="text-gray-400 text-[9px] font-semibold uppercase tracking-widest text-center">
                              Customer signs here (touch or mouse)
                            </span>
                          </div>

                          {signatureData && !isDrawing && signatureData.startsWith("data:image") ? (
                            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none bg-white/40">
                              <img src={signatureData} alt="Client Signature" className="max-h-full max-w-full object-contain" />
                            </div>
                          ) : null}

                          <canvas
                            ref={canvasRef}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                            className="w-full h-full cursor-crosshair relative z-20"
                          />
                        </div>
                      </div>

                      {/* 2. Admin / Company Signature Box */}
                      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                            <PenTool size={14} className="text-emerald-600" />
                            Admin / Company Signature (توقيع الإدارة)
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={autoSignAdmin}
                              className="text-[11px] text-brand hover:underline font-semibold cursor-pointer"
                            >
                              Auto Sign
                            </button>
                            {adminSignatureData && (
                              <button
                                type="button"
                                onClick={clearAdminSignature}
                                className="text-[11px] text-red-600 hover:underline font-semibold cursor-pointer"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="border-2 border-border rounded-xl overflow-hidden bg-white relative shadow-inner group h-32">
                          <div className="absolute inset-0 pointer-events-none flex flex-col justify-end p-3 pb-4 z-0 opacity-40">
                            <div className="border-b border-dashed border-gray-300 w-full mb-1"></div>
                            <span className="text-gray-400 text-[9px] font-semibold uppercase tracking-widest text-center">
                              Admin / Agent signs here
                            </span>
                          </div>

                          {adminSignatureData && !isDrawingAdmin && adminSignatureData.startsWith("data:image") ? (
                            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none bg-white/40">
                              <img src={adminSignatureData} alt="Admin Signature" className="max-h-full max-w-full object-contain" />
                            </div>
                          ) : null}

                          <canvas
                            ref={adminCanvasRef}
                            onMouseDown={startDrawingAdmin}
                            onMouseMove={drawAdmin}
                            onMouseUp={stopDrawingAdmin}
                            onMouseLeave={stopDrawingAdmin}
                            onTouchStart={startDrawingAdmin}
                            onTouchMove={drawAdmin}
                            onTouchEnd={stopDrawingAdmin}
                            className="w-full h-full cursor-crosshair relative z-20"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

        </div>

        {/* ================= MODAL FOOTER (MATCHES BOOKINGS/NEW) ================= */}
        <div className="flex items-center justify-between border-t border-border pt-4 sm:pt-6 mt-2 px-6 pb-6 bg-white shrink-0">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl border border-border text-text-secondary hover:bg-gray-50 text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} />
              Previous Step
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-border text-text-secondary hover:bg-gray-50 text-sm font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}

          {currentStep < STEPS.length ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
            >
              <span>Next Step</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-7 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center gap-2 transition-colors shadow-md disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving Contract...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={18} />
                  <span>{contractToEdit ? "Update Contract Terms" : "Confirm & Create Booking"}</span>
                </>
              )}
            </button>
          )}
        </div>

      </div>

      {/* Embedded Create Client Modal */}
      <CreateClientModal
        isOpen={isClientModalOpen}
        onClose={() => {
          setIsClientModalOpen(false);
          setIsAddingForSecondDriver(false);
        }}
        onSuccess={handleClientModalSuccess}
      />

      {/* Embedded Select Second Driver Modal */}
      <SelectSecondDriverModal
        isOpen={isSelectSecondDriverModalOpen}
        onClose={() => setIsSelectSecondDriverModalOpen(false)}
        clients={clients}
        primaryClientId={formData.clientId}
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
