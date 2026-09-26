"use client";

import { useState, useRef, useEffect } from "react";
import { 
  X, 
  UserPlus, 
  UserCheck, 
  Search, 
  Loader2, 
  AlertCircle, 
  ImagePlus, 
  Trash2, 
  ScanLine, 
  Sparkles, 
  FileText,
  User,
  Home,
  Plane,
  CreditCard,
  BookOpen,
  CheckCircle2,
  Upload,
  Camera,
  ImageIcon,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

interface RegisterClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (client: any) => void;
  contractId: string;
  clientToEdit?: any;
}

export default function RegisterClientModal({
  isOpen,
  onClose,
  onSuccess,
  contractId,
  clientToEdit,
}: RegisterClientModalProps) {
  const [activeTab, setActiveTab] = useState<"search" | "register">("search");
  const [clientType, setClientType] = useState<"Resident" | "Tourist">("Resident");
  const [searchQuery, setSearchQuery] = useState("");
  const [clients, setClients] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [selectedExistingClient, setSelectedExistingClient] = useState<any | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [linkingClientId, setLinkingClientId] = useState<string | null>(null);
  const [scanningDoc, setScanningDoc] = useState(false);
  const [scanSlotLoading, setScanSlotLoading] = useState<string | null>(null);
  const [autoScannedSuccess, setAutoScannedSuccess] = useState(false);
  const [uploadMode, setUploadMode] = useState<"camera" | "gallery">("camera");
  const [error, setError] = useState<string | null>(null);
  const [docPreviews, setDocPreviews] = useState<string[]>([]);

  // Specific scan thumbnails
  const [passportThumb, setPassportThumb] = useState<string | null>(null);
  const [licenseFrontThumb, setLicenseFrontThumb] = useState<string | null>(null);
  const [licenseBackThumb, setLicenseBackThumb] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const scanCameraInputRef = useRef<HTMLInputElement>(null);
  const scanPassportRef = useRef<HTMLInputElement>(null);
  const scanLicenseFrontRef = useRef<HTMLInputElement>(null);
  const scanLicenseBackRef = useRef<HTMLInputElement>(null);
  const scanBatchRef = useRef<HTMLInputElement>(null);

  const toast = useToast();

  const [formData, setFormData] = useState({
    name: "",
    firstName: "",
    middleName: "",
    lastName: "",
    gender: "",
    dateOfBirth: "",

    phone: "",
    email: "",
    nationality: "Emirati",
    idNumber: "",
    address: "",

    // Passport Details
    passportNumber: "",
    passportIssuedBy: "",
    passportIssuedDate: "",
    passportExpiry: "",

    // Driving License Details
    licenseNumber: "",
    licenseIssuedBy: "",
    licenseIssuedDate: "",
    licenseExpiry: "",

    // International License Details
    internationalLicenseNumber: "",
    internationalLicenseIssuedBy: "",
    internationalLicenseIssuedDate: "",
    internationalLicenseExpiry: "",

    // Visa Details
    visaNumber: "",
    visaExpiry: "",
  });

  // Helper to check if a date string is expired (in the past compared to today)
  const isDateExpired = (dateStr: string | null | undefined): boolean => {
    if (!dateStr || !dateStr.trim()) return false;
    try {
      const parts = dateStr.trim().split("-");
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const expDate = new Date(year, month, day, 23, 59, 59, 999);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return expDate < today;
      }
      const expDate = new Date(dateStr);
      if (isNaN(expDate.getTime())) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return expDate < today;
    } catch {
      return false;
    }
  };

  const isLicenseExpired = isDateExpired(formData.licenseExpiry);
  const isInternationalLicenseExpired = isDateExpired(formData.internationalLicenseExpiry);

  // Fetch all existing clients on modal open
  const fetchClients = async () => {
    setLoadingClients(true);
    try {
      const res = await fetch("/api/clients", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || (Array.isArray(data) ? data : []));
      }
    } catch (err) {
      console.error("Failed to load clients list", err);
    } finally {
      setLoadingClients(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (clientToEdit) {
        setActiveTab("register");
        const type = clientToEdit.clientType || "Resident";
        setClientType(type);
        setFormData({
          name: clientToEdit.name || "",
          firstName: clientToEdit.firstName || "",
          middleName: clientToEdit.middleName || "",
          lastName: clientToEdit.lastName || "",
          gender: clientToEdit.gender || "",
          dateOfBirth: clientToEdit.dateOfBirth ? new Date(clientToEdit.dateOfBirth).toISOString().split("T")[0] : "",

          phone: clientToEdit.phone || "",
          email: clientToEdit.email || "",
          nationality: clientToEdit.nationality || (type === "Tourist" ? "" : "Emirati"),
          idNumber: clientToEdit.idNumber || "",
          address: clientToEdit.address || "",

          passportNumber: clientToEdit.passportNumber || (type === "Tourist" ? clientToEdit.idNumber || "" : ""),
          passportIssuedBy: clientToEdit.passportIssuedBy || "",
          passportIssuedDate: clientToEdit.passportIssuedDate ? new Date(clientToEdit.passportIssuedDate).toISOString().split("T")[0] : "",
          passportExpiry: clientToEdit.passportExpiry ? new Date(clientToEdit.passportExpiry).toISOString().split("T")[0] : "",

          licenseNumber: clientToEdit.licenseNumber || "",
          licenseIssuedBy: clientToEdit.licenseIssuedBy || "",
          licenseIssuedDate: clientToEdit.licenseIssuedDate ? new Date(clientToEdit.licenseIssuedDate).toISOString().split("T")[0] : "",
          licenseExpiry: clientToEdit.licenseExpiry ? new Date(clientToEdit.licenseExpiry).toISOString().split("T")[0] : "",

          internationalLicenseNumber: clientToEdit.internationalLicenseNumber || "",
          internationalLicenseIssuedBy: clientToEdit.internationalLicenseIssuedBy || "",
          internationalLicenseIssuedDate: clientToEdit.internationalLicenseIssuedDate ? new Date(clientToEdit.internationalLicenseIssuedDate).toISOString().split("T")[0] : "",
          internationalLicenseExpiry: clientToEdit.internationalLicenseExpiry ? new Date(clientToEdit.internationalLicenseExpiry).toISOString().split("T")[0] : "",

          visaNumber: clientToEdit.visaNumber || "",
          visaExpiry: clientToEdit.visaExpiry ? new Date(clientToEdit.visaExpiry).toISOString().split("T")[0] : "",
        });
        setDocPreviews(clientToEdit.documents || []);
      } else {
        setActiveTab("search");
        setClientType("Resident");
        setSearchQuery("");
        setSelectedExistingClient(null);
        resetForm();
      }
      setError(null);
      setAutoScannedSuccess(false);
      fetchClients();
    }
  }, [isOpen, clientToEdit]);

  const resetForm = () => {
    setFormData({
      name: "",
      firstName: "",
      middleName: "",
      lastName: "",
      gender: "",
      dateOfBirth: "",

      phone: "",
      email: "",
      nationality: "Emirati",
      idNumber: "",
      address: "",

      passportNumber: "",
      passportIssuedBy: "",
      passportIssuedDate: "",
      passportExpiry: "",

      licenseNumber: "",
      licenseIssuedBy: "",
      licenseIssuedDate: "",
      licenseExpiry: "",

      internationalLicenseNumber: "",
      internationalLicenseIssuedBy: "",
      internationalLicenseIssuedDate: "",
      internationalLicenseExpiry: "",

      visaNumber: "",
      visaExpiry: "",
    });
    setDocPreviews([]);
    setPassportThumb(null);
    setLicenseFrontThumb(null);
    setLicenseBackThumb(null);
    setAutoScannedSuccess(false);
  };

  const processFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (file.type === "application/pdf") {
          resolve(event.target?.result as string);
          return;
        }

        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1400;
          const MAX_HEIGHT = 1400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.8));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDocChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    const totalDocs = docPreviews.length + newFiles.length;
    if (totalDocs > 5) {
      toast.error("Maximum 5 documents allowed (الحد الأقصى 5 ملفات)");
      return;
    }

    toast.success("Uploading & displaying documents...");
    const processedFiles: string[] = [];

    for (const file of newFiles) {
      const processedBase64 = await processFile(file);
      if (processedBase64) {
        processedFiles.push(processedBase64);
      }
    }

    if (processedFiles.length > 0) {
      setDocPreviews((prev) => [...prev, ...processedFiles]);
      toast.success(`${processedFiles.length} document image(s) uploaded.`);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // AI OCR Scan Handler that updates and auto-fills all fields
  const executeScan = async (files: File[], slotName?: string) => {
    if (files.length === 0) return;

    setScanningDoc(true);
    if (slotName) setScanSlotLoading(slotName);
    setAutoScannedSuccess(false);
    setError(null);
    toast.success("جاري فحص وقراءة الوثيقة واستخراج المعلومات تلقائياً... (AI scanning & extracting...)");

    try {
      const base64List: string[] = [];
      for (const file of files) {
        const b64 = await processFile(file);
        if (b64) base64List.push(b64);
      }

      const allDocs = [...docPreviews];
      base64List.forEach((img) => {
        if (!allDocs.includes(img)) allDocs.push(img);
      });
      setDocPreviews(allDocs);

      if (slotName === "passport") setPassportThumb(base64List[0]);
      if (slotName === "license_front") setLicenseFrontThumb(base64List[0]);
      if (slotName === "license_back") setLicenseBackThumb(base64List[0]);

      // Send ALL documents (previous + new) so AI reads all documents and merges all details
      const targets = allDocs.length > 0 ? allDocs : base64List;
      const res = await fetch("/api/ocr/scan-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: targets }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "فشل مسح الوثيقة");
      }

      const { data, imageUrls, imageUrl } = resData;

      if (
        data.documentType === "passport" || 
        data.documentType === "tourist_bundle" || 
        data.passportNumber ||
        (data.nationality && data.nationality.toLowerCase() !== "emirati" && data.nationality.toLowerCase() !== "uae" && data.nationality.toLowerCase() !== "united arab emirates")
      ) {
        setClientType("Tourist");
      }

      setFormData((prev) => {
        const updated = { ...prev };

        // Personal
        if (data.firstName) updated.firstName = data.firstName;
        if (data.middleName) updated.middleName = data.middleName;
        if (data.lastName) updated.lastName = data.lastName;
        if (data.name) updated.name = data.name;
        if (data.gender) updated.gender = data.gender;
        if (data.dateOfBirth) updated.dateOfBirth = data.dateOfBirth;
        if (data.nationality) updated.nationality = data.nationality;

        // Passport
        if (data.passportNumber) updated.passportNumber = data.passportNumber;
        if (data.passportIssuedBy) updated.passportIssuedBy = data.passportIssuedBy;
        if (data.passportIssuedDate) updated.passportIssuedDate = data.passportIssuedDate;
        if (data.passportExpiry) updated.passportExpiry = data.passportExpiry;

        // Driving License
        if (data.licenseNumber) updated.licenseNumber = data.licenseNumber;
        if (data.licenseIssuedBy) updated.licenseIssuedBy = data.licenseIssuedBy;
        if (data.licenseIssuedDate) updated.licenseIssuedDate = data.licenseIssuedDate;
        if (data.licenseExpiry) updated.licenseExpiry = data.licenseExpiry;

        // International License
        if (data.internationalLicenseNumber) updated.internationalLicenseNumber = data.internationalLicenseNumber;
        if (data.internationalLicenseIssuedBy) updated.internationalLicenseIssuedBy = data.internationalLicenseIssuedBy;
        if (data.internationalLicenseIssuedDate) updated.internationalLicenseIssuedDate = data.internationalLicenseIssuedDate;
        if (data.internationalLicenseExpiry) updated.internationalLicenseExpiry = data.internationalLicenseExpiry;

        // Visa
        if (data.visaNumber) updated.visaNumber = data.visaNumber;
        if (data.visaExpiry) updated.visaExpiry = data.visaExpiry;

        // Standard
        if (data.idNumber) updated.idNumber = data.idNumber;
        if (data.address) updated.address = data.address;
        if (data.phone) updated.phone = data.phone;
        if (data.email) updated.email = data.email;

        if (!updated.name && (updated.firstName || updated.lastName)) {
          updated.name = [updated.firstName, updated.middleName, updated.lastName]
            .filter(Boolean)
            .join(" ");
        }

        if (clientType === "Tourist" && updated.passportNumber) {
          updated.idNumber = updated.passportNumber;
        }

        return updated;
      });

      const docsToAdd = imageUrls && imageUrls.length > 0 ? imageUrls : (imageUrl ? [imageUrl] : base64List);
      setDocPreviews((prev) => {
        const combined = [...prev];
        docsToAdd.forEach((img: string) => {
          if (!combined.includes(img)) combined.unshift(img);
        });
        return combined;
      });

      setAutoScannedSuccess(true);
      toast.success("تم مسح الوثيقة واستخراج البيانات وتعبئتها تلقائياً! ✓");
    } catch (err: any) {
      console.error("Scan error:", err);
      setError(err.message);
      toast.error(err.message || "حدث خطأ أثناء فحص الوثيقة");
    } finally {
      setScanningDoc(false);
      setScanSlotLoading(null);
    }
  };

  // Scan all currently uploaded document images with AI
  const scanUploadedDocs = async (imagesToScan?: string[]) => {
    const targets = imagesToScan || docPreviews;
    if (!targets || targets.length === 0) {
      toast.error("Please upload at least one document image first.");
      return;
    }

    setScanningDoc(true);
    setAutoScannedSuccess(false);
    setError(null);
    toast.success("جاري قراءة واستخراج بيانات الوثائق عبر الذكاء الاصطناعي...");

    try {
      const res = await fetch("/api/ocr/scan-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: targets }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "فشل مسح الوثائق");
      }

      const { data, imageUrls, imageUrl } = resData;

      if (data.documentType === "emirates_id" || (data.idNumber && data.idNumber.startsWith("784"))) {
        setClientType("Resident");
      } else if (data.documentType === "passport" || data.documentType === "tourist_bundle") {
        setClientType("Tourist");
      }

      setFormData((prev) => {
        const updated = { ...prev };

        // Personal
        if (data.firstName) updated.firstName = data.firstName;
        if (data.middleName) updated.middleName = data.middleName;
        if (data.lastName) updated.lastName = data.lastName;
        if (data.name) updated.name = data.name;
        if (data.gender) updated.gender = data.gender;
        if (data.dateOfBirth) updated.dateOfBirth = data.dateOfBirth;
        if (data.nationality) updated.nationality = data.nationality;

        // Passport
        if (data.passportNumber) updated.passportNumber = data.passportNumber;
        if (data.passportIssuedBy) updated.passportIssuedBy = data.passportIssuedBy;
        if (data.passportIssuedDate) updated.passportIssuedDate = data.passportIssuedDate;
        if (data.passportExpiry) updated.passportExpiry = data.passportExpiry;

        // Driving License
        if (data.licenseNumber) updated.licenseNumber = data.licenseNumber;
        if (data.licenseIssuedBy) updated.licenseIssuedBy = data.licenseIssuedBy;
        if (data.licenseIssuedDate) updated.licenseIssuedDate = data.licenseIssuedDate;
        if (data.licenseExpiry) updated.licenseExpiry = data.licenseExpiry;

        // International License
        if (data.internationalLicenseNumber) updated.internationalLicenseNumber = data.internationalLicenseNumber;
        if (data.internationalLicenseIssuedBy) updated.internationalLicenseIssuedBy = data.internationalLicenseIssuedBy;
        if (data.internationalLicenseIssuedDate) updated.internationalLicenseIssuedDate = data.internationalLicenseIssuedDate;
        if (data.internationalLicenseExpiry) updated.internationalLicenseExpiry = data.internationalLicenseExpiry;

        // Visa
        if (data.visaNumber) updated.visaNumber = data.visaNumber;
        if (data.visaExpiry) updated.visaExpiry = data.visaExpiry;

        // Standard / Common
        if (data.idNumber) updated.idNumber = data.idNumber;
        if (data.address) updated.address = data.address;
        if (data.phone) updated.phone = data.phone;
        if (data.email) updated.email = data.email;

        // Auto compose full name
        if (!updated.name && (updated.firstName || updated.lastName)) {
          updated.name = [updated.firstName, updated.middleName, updated.lastName]
            .filter(Boolean)
            .join(" ");
        }

        if (clientType === "Tourist" && updated.passportNumber) {
          updated.idNumber = updated.passportNumber;
        }

        return updated;
      });

      setAutoScannedSuccess(true);
      toast.success("✓ تم مسح الوثائق واستخراج كافة البيانات وتعبئتها تلقائياً!");
    } catch (err: any) {
      console.error("Scan error:", err);
      setError(err.message);
      toast.error(err.message || "حدث خطأ أثناء فحص الوثائق");
    } finally {
      setScanningDoc(false);
      setScanSlotLoading(null);
    }
  };

  const removeDoc = (index: number) => {
    setDocPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Link an existing client from search
  const handleLinkExistingClient = async (client: any) => {
    setLinkingClientId(client._id);
    try {
      if (contractId) {
        const patchRes = await fetch(`/api/contracts/${contractId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId: client._id }),
        });

        if (!patchRes.ok) {
          const patchErr = await patchRes.json();
          throw new Error(patchErr.error || "Failed to link client to contract.");
        }
      }

      toast.success(`Client "${client.name}" successfully linked to delivery task! ✓`);
      onSuccess(client);
      onClose();
    } catch (err: any) {
      console.error("Failed to link existing client:", err);
      toast.error(err.message || "Could not link existing client.");
    } finally {
      setLinkingClientId(null);
    }
  };

  // Submit and create brand new client
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const finalName = clientType === "Tourist"
      ? ([formData.firstName, formData.middleName, formData.lastName].filter(Boolean).join(" ") || formData.name.trim())
      : formData.name.trim();

    if (!finalName) {
      setError("Please provide or scan Customer Name.");
      return;
    }
    if (!formData.phone.trim()) {
      setError("Please enter customer's phone number.");
      return;
    }

    // BLOCK CREATION: If Licence Expiry is late (expired in the past)
    if (formData.licenseExpiry && isLicenseExpired) {
      const expiredMsg = "Driving licence is expired! Cannot create client with an expired licence. (رخصة القيادة منتهية الصلاحية! لا يمكن إنشاء العميل برخصة منتهية)";
      setError(expiredMsg);
      toast.error(expiredMsg);
      const el = document.getElementById(
        clientType === "Tourist" ? "reg-client-license-expiry-tourist" : "reg-client-license-expiry-resident"
      );
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.focus();
      return;
    }

    if (formData.internationalLicenseExpiry && isInternationalLicenseExpired) {
      const expiredMsg = "International Driving licence is expired! Cannot create client with an expired licence. (رخصة القيادة الدولية منتهية الصلاحية! لا يمكن إنشاء العميل)";
      setError(expiredMsg);
      toast.error(expiredMsg);
      return;
    }

    // MANDATORY: Documents are strictly required to create a client
    if (!docPreviews || docPreviews.length === 0) {
      const docMsg = clientType === "Tourist"
        ? "Upload Passport & Driver Licence (Front & Back) is required. Without upload we cannot create client. (يرجى تحميل جواز السفر ورخصة القيادة - الأمام والخلف)"
        : "Upload Emirates ID & UAE Driving Licence (Front & Back) is required. Without upload we cannot create client. (يرجى تحميل بطاقة الهوية الإماراتية ورخصة القيادة - الأمام والخلف)";
      setError(docMsg);
      toast.error(docMsg);
      document.getElementById("driver-doc-upload-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);

    try {
      // 1. Upload documents
      const newFiles = docPreviews.filter((img) => img.startsWith("data:image") || img.startsWith("data:application/pdf"));
      const existingUrls = docPreviews.filter((img) => img.startsWith("http"));
      let uploadedUrls: string[] = [];

      if (newFiles.length > 0) {
        for (const base64 of newFiles) {
          try {
            const res = await fetch("/api/upload", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ image: base64, folder: "client-documents" }),
            });
            if (res.ok) {
              const uploadData = await res.json();
              uploadedUrls.push(uploadData.url || uploadData.secure_url);
            }
          } catch (uploadErr) {
            console.error("Photo upload failed:", uploadErr);
          }
        }
      }

      const allDocuments = [...existingUrls, ...uploadedUrls];

      const cleanPhone = formData.phone.trim() || "N/A";
      const resolvedId = clientType === "Tourist"
        ? (formData.passportNumber.trim() || formData.idNumber.trim() || `T-${Date.now().toString().slice(-6)}`)
        : (formData.idNumber.trim() || `R-${Date.now().toString().slice(-6)}`);

      const safeId = resolvedId.replace(/[^a-zA-Z0-9]/g, "");
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const fallbackEmail = `client_${safeId || randomSuffix}_${Date.now().toString().slice(-4)}@wheelzie.local`;

      const clientPayload = {
        ...formData,
        name: finalName,
        phone: cleanPhone,
        email: formData.email.trim() || "",
        nationality: formData.nationality.trim() || (clientType === "Tourist" ? "International" : "Emirati"),
        idNumber: resolvedId,
        passportNumber: clientType === "Tourist" ? resolvedId : formData.passportNumber,
        licenseNumber: formData.licenseNumber.trim() || "N/A",
        licenseExpiry: formData.licenseExpiry || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        address: formData.address.trim() || (clientType === "Tourist" ? "Hotel / Tourist stay" : "Local residence"),
        clientType,
        documents: allDocuments,
      };

      const isEditing = Boolean(clientToEdit?._id);
      const url = isEditing ? `/api/clients/${clientToEdit._id}` : "/api/clients";
      const method = isEditing ? "PUT" : "POST";

      const clientRes = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientPayload),
      });

      if (!clientRes.ok) {
        const errData = await clientRes.json();
        throw new Error(errData.error || (isEditing ? "Failed to update client." : "Failed to create client."));
      }

      const newClient = await clientRes.json();
      const clientId = newClient._id || newClient.client?._id || clientToEdit?._id;

      // Link client to contract
      if (contractId) {
        const patchRes = await fetch(`/api/contracts/${contractId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId }),
        });

        if (!patchRes.ok) {
          const patchErr = await patchRes.json();
          toast.error(patchErr.error || "Client created but failed to link to contract.");
        }
      }

      toast.success("Client registered and linked to task successfully! ✓");
      onSuccess({ ...newClient, _id: clientId });
      onClose();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter clients based on search query, capped to recent 4
  const q = searchQuery.toLowerCase().trim();
  const matchedClients = clients.filter(c => {
    if (!q) return true;
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.idNumber && c.idNumber.toLowerCase().includes(q)) ||
      (c.licenseNumber && c.licenseNumber.toLowerCase().includes(q))
    );
  });
  const filteredClients = matchedClients.slice(0, 4);

  // Check if form data matches an existing client
  const matchedExistingInForm = clients.find(c => {
    if (formData.phone && formData.phone.trim().length > 6 && c.phone && c.phone.includes(formData.phone.trim())) return true;
    if (formData.idNumber && formData.idNumber.trim().length > 3 && c.idNumber && c.idNumber.toLowerCase() === formData.idNumber.trim().toLowerCase()) return true;
    if (formData.licenseNumber && formData.licenseNumber.trim().length > 3 && c.licenseNumber && c.licenseNumber.toLowerCase() === formData.licenseNumber.trim().toLowerCase()) return true;
    return false;
  });

  if (!isOpen) return null;

  const handleClose = () => {
    resetForm();
    setClientType("Resident");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in overflow-y-auto">
      {/* Widescreen Modal (max-w-5xl) */}
      <div className="bg-card w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0 bg-white">
          <div>
            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <UserPlus className="text-brand" size={22} />
              Customer Verification &amp; Registration
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              {activeTab === "search"
                ? "Check if customer already exists or register them with automated document AI."
                : "Register a new customer (Resident or Tourist) and link to delivery task."}
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-2 text-text-muted hover:text-text-primary hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 py-3 border-b border-border bg-gray-50/70 shrink-0 flex items-center">
          <div className="bg-gray-200/80 p-1 rounded-xl flex items-center w-full shadow-2xs">
            <button
              type="button"
              onClick={() => { setActiveTab("search"); setError(null); }}
              className={`flex-1 py-2 px-4 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === "search"
                  ? "bg-white text-brand shadow-xs font-bold"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              <Search size={15} className="shrink-0" />
              <span className="whitespace-nowrap">Check Existing Client (عميل مسجل)</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab("register"); setError(null); }}
              className={`flex-1 py-2 px-4 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === "register"
                  ? "bg-white text-brand shadow-xs font-bold"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              <UserPlus size={15} className="shrink-0" />
              <span className="whitespace-nowrap">Register New Customer (تسجيل جديد)</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6 bg-gray-50/40">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3.5 rounded-xl flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* TAB 1: CHECK & SEARCH EXISTING CLIENT */}
          {activeTab === "search" && (
            <div className="space-y-4 animate-fade-in">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by client name, phone number, national ID, or licence..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all bg-white"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm font-bold cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-text-secondary px-0.5">
                <span>
                  {loadingClients ? (
                    <span className="flex items-center gap-1.5 text-brand font-medium">
                      <Loader2 size={12} className="animate-spin" /> Loading clients...
                    </span>
                  ) : searchQuery ? (
                    <span>
                      Found <strong>{filteredClients.length}</strong> matching "{searchQuery}"
                    </span>
                  ) : (
                    <span>
                      Showing <strong>{filteredClients.length}</strong> recent customer{filteredClients.length === 1 ? "" : "s"}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab("register")}
                  className="text-brand font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <UserPlus size={12} /> Not in list? Register New
                </button>
              </div>

              {loadingClients ? (
                <div className="p-8 text-center text-text-muted text-sm flex flex-col items-center justify-center gap-2">
                  <Loader2 size={24} className="animate-spin text-brand" />
                  <span>Loading database...</span>
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="p-8 border border-dashed border-border rounded-2xl text-center space-y-3 bg-white">
                  <User size={32} className="text-gray-300 mx-auto" />
                  <p className="text-sm font-semibold text-text-primary">No customers found</p>
                  <p className="text-xs text-text-muted max-w-sm mx-auto">
                    {searchQuery
                      ? `No registered clients found matching "${searchQuery}".`
                      : "No clients registered yet."}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("register")}
                    className="px-4 py-2 bg-brand text-white rounded-xl text-xs font-semibold hover:bg-brand-dark transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <UserPlus size={14} /> Register New Customer
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5">
                  {filteredClients.map((client) => {
                    const isLinking = linkingClientId === client._id;
                    const isBlacklisted = client.status === "Blacklisted";

                    return (
                      <div
                        key={client._id}
                        className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white shadow-2xs hover:border-brand/40 ${
                          isBlacklisted ? "border-red-200 bg-red-50/20" : "border-border"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${
                            isBlacklisted 
                              ? "bg-red-100 text-red-700 border border-red-200" 
                              : "bg-brand/10 text-brand"
                          }`}>
                            {client.name ? client.name.charAt(0).toUpperCase() : <User size={16} />}
                          </div>
                          
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-text-primary truncate">{client.name}</h4>
                              {client.clientType && (
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                  client.clientType === "Tourist"
                                    ? "bg-red-50 text-brand border border-red-200"
                                    : "bg-gray-100 text-gray-700 border border-gray-200"
                                }`}>
                                  {client.clientType === "Tourist" ? "Tourist (سائح)" : "Resident (مقيم)"}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-text-secondary">
                              <span>Licence:</span>
                              <span className="font-mono font-bold text-text-primary bg-gray-100 px-2 py-0.5 rounded-md text-xs">
                                {client.licenseNumber || "N/A"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="w-full sm:w-auto shrink-0">
                          <button
                            type="button"
                            disabled={isLinking || isBlacklisted}
                            onClick={() => handleLinkExistingClient(client)}
                            className={`w-full sm:w-auto px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors font-medium text-xs inline-flex items-center justify-center gap-1.5 shadow-sm cursor-pointer ${
                              isBlacklisted ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                          >
                            {isLinking ? (
                              <>
                                <Loader2 size={12} className="animate-spin" />
                                <span>Linking...</span>
                              </>
                            ) : (
                              <>
                                <UserCheck size={14} />
                                <span>Select &amp; Link to Task (اختيار العميل)</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: REGISTER BRAND NEW CUSTOMER */}
          {activeTab === "register" && (
            <div className="space-y-6 animate-fade-in">
              {matchedExistingInForm && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs p-3 rounded-xl flex items-center justify-between gap-3 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-600 shrink-0" />
                    <div>
                      <strong className="block">Existing Customer Found in Database!</strong>
                      <span>
                        {matchedExistingInForm.name} (Licence: {matchedExistingInForm.licenseNumber || "N/A"})
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLinkExistingClient(matchedExistingInForm)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg text-xs transition-colors cursor-pointer shrink-0"
                  >
                    Select Existing
                  </button>
                </div>
              )}

              {/* Profile Type Selector (Resident vs Tourist) */}
              <div className="bg-white p-4 rounded-xl border border-border shadow-xs">
                <label className="block text-xs font-bold text-text-secondary mb-2">
                  Customer Profile Type (نوع العميل) <span className="text-red-500 font-bold">*</span>
                </label>
                <div className="bg-gray-100 p-1 rounded-xl flex items-center w-full">
                  <button
                    type="button"
                    onClick={() => {
                      setClientType("Resident");
                      if (!formData.nationality || formData.nationality === "International") {
                        setFormData(prev => ({ ...prev, nationality: "Emirati" }));
                      }
                    }}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      clientType === "Resident"
                        ? "bg-white text-brand shadow-sm font-bold"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    <Home size={16} className="shrink-0" />
                    <span className="whitespace-nowrap">Resident (مقيم / مواطن إماراتي)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setClientType("Tourist");
                      if (formData.nationality === "Emirati" || formData.nationality === "Moroccan") {
                        setFormData(prev => ({ ...prev, nationality: "" }));
                      }
                    }}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      clientType === "Tourist"
                        ? "bg-white text-brand shadow-sm font-bold"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    <Plane size={16} className="shrink-0" />
                    <span className="whitespace-nowrap">Tourist (سائح / أجنبي)</span>
                  </button>
                </div>
              </div>

              {/* Hidden Inputs for Documents and AI Scanners */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleDocChange}
                accept="image/*,application/pdf"
                multiple
                className="hidden"
              />
              {/* Camera input with capture="environment" for taking photo */}
              <input
                type="file"
                ref={cameraInputRef}
                onChange={handleDocChange}
                accept="image/*"
                capture="environment"
                className="hidden"
              />
              <input
                type="file"
                ref={scanInputRef}
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) executeScan(Array.from(files));
                  if (scanInputRef.current) scanInputRef.current.value = "";
                }}
                accept="image/*,application/pdf"
                multiple
                className="hidden"
              />
              {/* Direct Scan Camera input */}
              <input
                type="file"
                ref={scanCameraInputRef}
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) executeScan(Array.from(files));
                  if (scanCameraInputRef.current) scanCameraInputRef.current.value = "";
                }}
                accept="image/*"
                capture="environment"
                className="hidden"
              />
              <input
                type="file"
                ref={scanPassportRef}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) executeScan([f], "passport");
                  if (scanPassportRef.current) scanPassportRef.current.value = "";
                }}
                accept="image/*"
                className="hidden"
              />
              <input
                type="file"
                ref={scanLicenseFrontRef}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) executeScan([f], "license_front");
                  if (scanLicenseFrontRef.current) scanLicenseFrontRef.current.value = "";
                }}
                accept="image/*"
                className="hidden"
              />
              <input
                type="file"
                ref={scanLicenseBackRef}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) executeScan([f], "license_back");
                  if (scanLicenseBackRef.current) scanLicenseBackRef.current.value = "";
                }}
                accept="image/*"
                className="hidden"
              />
              <input
                type="file"
                ref={scanBatchRef}
                onChange={(e) => {
                  handleDocChange(e);
                  if (scanBatchRef.current) scanBatchRef.current.value = "";
                }}
                accept="image/*,application/pdf"
                multiple
                className="hidden"
              />

              {/* Document Upload Section (Camera or Gallery Upload) */}
              <div id="driver-doc-upload-section" className="bg-white p-5 rounded-2xl border border-border shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <label className="block text-sm font-bold text-gray-900 flex items-center gap-2">
                    <span>Documents (License, ID, etc.)</span>
                    <span className="text-red-500 font-bold">*</span>
                    <span className="text-xs text-gray-500 font-normal">
                      {docPreviews.length}/5
                    </span>
                  </label>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Mode Switcher: Camera vs Gallery (like car inspection) */}
                    <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setUploadMode("camera")}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                          uploadMode === "camera"
                            ? "bg-white text-brand shadow-xs font-bold"
                            : "text-text-muted hover:text-text-primary"
                        }`}
                        title="Camera Mode (التقاط بالكاميرا)"
                      >
                        <Camera size={14} className={uploadMode === "camera" ? "text-brand" : "text-text-muted"} />
                        <span>Camera</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setUploadMode("gallery")}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                          uploadMode === "gallery"
                            ? "bg-white text-brand shadow-xs font-bold"
                            : "text-text-muted hover:text-text-primary"
                        }`}
                        title="Gallery / Files Mode (رفع من الملفات)"
                      >
                        <ImageIcon size={14} className={uploadMode === "gallery" ? "text-brand" : "text-text-muted"} />
                        <span>Gallery</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={scanningDoc || submitting}
                      onClick={() => {
                        if (docPreviews.length > 0) {
                          scanUploadedDocs();
                        } else {
                          if (uploadMode === "camera") {
                            scanCameraInputRef.current?.click();
                          } else {
                            scanInputRef.current?.click();
                          }
                        }
                      }}
                      className="px-3.5 py-1.5 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      {scanningDoc ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          <span>Scanning...</span>
                        </>
                      ) : (
                        <>
                          {uploadMode === "camera" && docPreviews.length === 0 ? (
                            <Camera size={13} />
                          ) : (
                            <ScanLine size={13} />
                          )}
                          <span>
                            {docPreviews.length > 0 
                              ? "Scan Document" 
                              : uploadMode === "camera" 
                              ? "Take Photo & Scan" 
                              : "Scan Document"}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {docPreviews.map((doc, idx) => {
                    const isPdf = doc.includes("application/pdf") || doc.endsWith(".pdf");
                    return (
                      <div
                        key={idx}
                        className="relative w-24 h-24 rounded-xl border border-gray-200 overflow-hidden group shadow-2xs"
                      >
                        {isPdf ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-brand">
                            <FileText size={32} className="text-red-500 mb-1" />
                            <span className="text-[10px] font-medium text-gray-500 text-center mt-1 truncate w-full">PDF</span>
                          </div>
                        ) : (
                          <img
                            src={doc}
                            alt="Document"
                            className="w-full h-full object-cover"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => removeDoc(idx)}
                          className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white cursor-pointer"
                          title="Remove Document"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    );
                  })}

                  {/* Take Photo Button */}
                  {docPreviews.length < 5 && (
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className={`w-24 h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer group shadow-2xs ${
                        uploadMode === "camera"
                          ? "border-brand bg-brand/[0.04] text-brand hover:bg-brand/10"
                          : "border-gray-300 text-gray-500 hover:border-brand hover:text-brand hover:bg-brand/5"
                      }`}
                      title="Take Photo with Camera (التقاط بالكاميرا)"
                    >
                      <Camera size={22} className="mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-bold">Take Photo</span>
                      <span className="text-[8px] opacity-70">Camera</span>
                    </button>
                  )}

                  {/* Upload File Button */}
                  {docPreviews.length < 5 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={`w-24 h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer group shadow-2xs ${
                        uploadMode === "gallery"
                          ? "border-brand bg-brand/[0.04] text-brand hover:bg-brand/10"
                          : "border-gray-300 text-gray-500 hover:border-brand hover:text-brand hover:bg-brand/5"
                      }`}
                      title="Upload File or PDF from Device (رفع من الجهاز)"
                    >
                      <ImagePlus size={22} className="mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-bold">Upload</span>
                      <span className="text-[8px] opacity-70">Gallery / PDF</span>
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Take photos or upload copies of driver&apos;s license and national ID (max 5 files).
                </p>
              </div>

              {/* ================= FORM FIELDS ================= */}
              {clientType === "Tourist" ? (
                <div className="space-y-5 animate-fade-in">
                  
                  {/* SECTION 1: IDENTIFICATION */}
                  <div className="bg-white p-5 rounded-2xl border border-border shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 tracking-wide uppercase">
                          Identification
                        </h3>
                        <p className="text-xs text-text-secondary">
                          Enter Passport and International License
                        </p>
                      </div>
                      {autoScannedSuccess && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                          <Sparkles size={11} /> Auto-Filled by Scanner
                        </span>
                      )}
                    </div>

                    {/* Passport */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1">
                          Passport <span className="text-red-500 font-bold">*</span>
                        </label>
                        <input
                          placeholder="e.g. 1234567890"
                          className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand uppercase font-mono"
                          value={formData.passportNumber}
                          onChange={(e) =>
                            setFormData({ ...formData, passportNumber: e.target.value.toUpperCase() })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1">
                          Passport Issued By <span className="text-red-500 font-bold">*</span>
                        </label>
                        <input
                          placeholder="e.g. United States / France"
                          className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                          value={formData.passportIssuedBy}
                          onChange={(e) =>
                            setFormData({ ...formData, passportIssuedBy: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1">
                          Passport Issued Date
                        </label>
                        <input
                          type="date"
                          className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white"
                          value={formData.passportIssuedDate}
                          onChange={(e) =>
                            setFormData({ ...formData, passportIssuedDate: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1">
                          Passport Expiry
                        </label>
                        <input
                          type="date"
                          className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white"
                          value={formData.passportExpiry}
                          onChange={(e) =>
                            setFormData({ ...formData, passportExpiry: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    {/* Home Country Driving License */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-gray-100">
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1">
                          Driving License No (رخصة القيادة الأصلية)
                        </label>
                        <input
                          placeholder="e.g. 123456789"
                          className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand font-mono uppercase"
                          value={formData.licenseNumber}
                          onChange={(e) =>
                            setFormData({ ...formData, licenseNumber: e.target.value.toUpperCase() })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1">
                          License Issued By (جهة الإصدار)
                        </label>
                        <input
                          placeholder="e.g. France / United States / UK"
                          className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                          value={formData.licenseIssuedBy}
                          onChange={(e) =>
                            setFormData({ ...formData, licenseIssuedBy: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1">
                          License Issue Date (تاريخ الإصدار)
                        </label>
                        <input
                          type="date"
                          className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white"
                          value={formData.licenseIssuedDate}
                          onChange={(e) =>
                            setFormData({ ...formData, licenseIssuedDate: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-text-secondary">
                            License Expiry (تاريخ انتهاء صلاحية الرخصة)
                          </label>
                          {isLicenseExpired && (
                            <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                              <AlertTriangle size={11} /> منتهية الصلاحية
                            </span>
                          )}
                        </div>
                        <input
                          id="reg-client-license-expiry-resident"
                          type="date"
                          className={`w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none transition-all ${
                            isLicenseExpired
                              ? "border-red-500 bg-red-50/60 ring-2 ring-red-500/20 text-red-900 font-semibold"
                              : "border-border bg-white focus:ring-2 focus:ring-brand/20 focus:border-brand"
                          }`}
                          value={formData.licenseExpiry}
                          onChange={(e) =>
                            setFormData({ ...formData, licenseExpiry: e.target.value })
                          }
                        />
                        {isLicenseExpired && (
                          <div className="flex items-center gap-1.5 mt-1.5 text-xs font-bold text-red-600">
                            <AlertCircle size={14} className="shrink-0 text-red-600" />
                            <span>Driving License is expired / رخصة القيادة منتهية الصلاحية</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* International Driving License */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-gray-100">
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1">
                          International Driving License
                        </label>
                        <input
                          placeholder="e.g. 1234567890"
                          className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand font-mono"
                          value={formData.internationalLicenseNumber}
                          onChange={(e) =>
                            setFormData({ ...formData, internationalLicenseNumber: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1">
                          International Driving License Issued By
                        </label>
                        <input
                          placeholder="e.g. AAA / International Permitting"
                          className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                          value={formData.internationalLicenseIssuedBy}
                          onChange={(e) =>
                            setFormData({ ...formData, internationalLicenseIssuedBy: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1">
                          International License Issued
                        </label>
                        <input
                          type="date"
                          className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white"
                          value={formData.internationalLicenseIssuedDate}
                          onChange={(e) =>
                            setFormData({ ...formData, internationalLicenseIssuedDate: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-text-secondary">
                            International License Expiry
                          </label>
                          {isInternationalLicenseExpired && (
                            <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                              <AlertTriangle size={11} /> منتهية الصلاحية
                            </span>
                          )}
                        </div>
                        <input
                          type="date"
                          className={`w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none transition-all ${
                            isInternationalLicenseExpired
                              ? "border-red-500 bg-red-50/60 ring-2 ring-red-500/20 text-red-900 font-semibold"
                              : "border-border bg-white focus:ring-2 focus:ring-brand/20 focus:border-brand"
                          }`}
                          value={formData.internationalLicenseExpiry}
                          onChange={(e) =>
                            setFormData({ ...formData, internationalLicenseExpiry: e.target.value })
                          }
                        />
                        {isInternationalLicenseExpired && (
                          <div className="flex items-center gap-1.5 mt-1.5 text-xs font-bold text-red-600">
                            <AlertCircle size={14} className="shrink-0 text-red-600" />
                            <span>International License is expired / الرخصة الدولية منتهية</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Visa */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1">
                          Visa / Entry Stamp
                        </label>
                        <input
                          placeholder="e.g. 1234567890"
                          className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand font-mono"
                          value={formData.visaNumber}
                          onChange={(e) =>
                            setFormData({ ...formData, visaNumber: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1">
                          Visa Expiry
                        </label>
                        <input
                          type="date"
                          className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white"
                          value={formData.visaExpiry}
                          onChange={(e) =>
                            setFormData({ ...formData, visaExpiry: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: PERSONAL */}
                  <div className="bg-white p-5 rounded-2xl border border-border shadow-xs space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 tracking-wide uppercase">
                        Personal
                      </h3>
                      <p className="text-xs text-text-secondary">
                        Enter Personal Details
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1">
                          First Name (English) <span className="text-red-500 font-bold">*</span>
                        </label>
                        <input
                          required
                          placeholder="e.g. John"
                          className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand font-medium"
                          value={formData.firstName}
                          onChange={(e) =>
                            setFormData({ ...formData, firstName: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1">
                          Middle Name (English)
                        </label>
                        <input
                          placeholder="e.g. Robert"
                          className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                          value={formData.middleName}
                          onChange={(e) =>
                            setFormData({ ...formData, middleName: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1">
                          Last Name (English) <span className="text-red-500 font-bold">*</span>
                        </label>
                        <input
                          required
                          placeholder="e.g. Doe"
                          className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand font-medium"
                          value={formData.lastName}
                          onChange={(e) =>
                            setFormData({ ...formData, lastName: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-gray-100">
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1">
                          Gender <span className="text-red-500 font-bold">*</span>
                        </label>
                        <select
                          className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white cursor-pointer font-medium"
                          value={formData.gender}
                          onChange={(e) =>
                            setFormData({ ...formData, gender: e.target.value })
                          }
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male (ذكر)</option>
                          <option value="Female">Female (أنثى)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1">
                          Date Of Birth
                        </label>
                        <input
                          type="date"
                          className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white"
                          value={formData.dateOfBirth}
                          onChange={(e) =>
                            setFormData({ ...formData, dateOfBirth: e.target.value })
                          }
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1">
                          Nationality <span className="text-red-500 font-bold">*</span>
                        </label>
                        <input
                          required
                          placeholder="e.g. French, British, American..."
                          className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand font-medium"
                          value={formData.nationality}
                          onChange={(e) =>
                            setFormData({ ...formData, nationality: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3: CONTACT */}
                  <div className="bg-white p-5 rounded-2xl border border-border shadow-xs space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 tracking-wide uppercase">
                        Contact
                      </h3>
                      <p className="text-xs text-text-secondary">
                        Enter the current address, email and mobile numbers
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1">
                          Phone / Mobile Number <span className="text-red-500 font-bold">*</span>
                        </label>
                        <input
                          required
                          type="tel"
                          placeholder="e.g. +33 6 12 34 56 78"
                          className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand font-medium"
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData({ ...formData, phone: e.target.value })
                          }
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          placeholder="e.g. client@example.com"
                          className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-text-secondary mb-1">
                          Address * (Apt, Building, Locality, Area / Hotel in city)
                        </label>
                        <input
                          placeholder="Apt, Building, Locality, Area or Hotel Name"
                          className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                          value={formData.address}
                          onChange={(e) =>
                            setFormData({ ...formData, address: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                /* RESIDENT FORM LAYOUT */
                <div className="bg-white p-5 rounded-2xl border border-border shadow-xs space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-text-secondary mb-1">
                        Full Name (الاسم الكامل) <span className="text-red-500 font-bold">*</span>
                      </label>
                      <input
                        required
                        placeholder="e.g. Ahmed Al Rashid / أحمد الراشدي"
                        className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand font-medium"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">
                        Phone Number (رقم الهاتف) <span className="text-red-500 font-bold">*</span>
                      </label>
                      <input
                        required
                        type="tel"
                        placeholder="e.g. +971 50 123 4567"
                        className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand font-medium"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">
                        Email Address (البريد الإلكتروني)
                      </label>
                      <input
                        type="email"
                        placeholder="e.g. customer@example.com"
                        className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">
                        Emirates ID (بطاقة الهوية الإماراتية) <span className="text-red-500 font-bold">*</span>
                      </label>
                      <input
                        required
                        placeholder="e.g. 784-1990-1234567-1"
                        className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand uppercase font-mono"
                        value={formData.idNumber}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            idNumber: e.target.value.toUpperCase(),
                          })
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">
                        Date of Birth (تاريخ الميلاد)
                      </label>
                      <input
                        type="date"
                        className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white"
                        value={formData.dateOfBirth}
                        onChange={(e) =>
                          setFormData({ ...formData, dateOfBirth: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">
                        UAE Driving Licence (رخصة القيادة الإماراتية) <span className="text-red-500 font-bold">*</span>
                      </label>
                      <input
                        required
                        placeholder="e.g. 1234567"
                        className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand uppercase font-mono"
                        value={formData.licenseNumber}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            licenseNumber: e.target.value.toUpperCase(),
                          })
                        }
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-text-secondary">
                          Licence Expiry (تاريخ انتهاء صلاحية الرخصة)
                        </label>
                        {isLicenseExpired && (
                          <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                            <AlertTriangle size={11} /> منتهية الصلاحية
                          </span>
                        )}
                      </div>
                      <input
                        id="reg-client-license-expiry-tourist"
                        type="date"
                        className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-all ${
                          isLicenseExpired
                            ? "border-red-500 bg-red-50/60 ring-2 ring-red-500/20 text-red-900 font-semibold"
                            : "border-border bg-white focus:ring-2 focus:ring-brand/20 focus:border-brand"
                        }`}
                        value={formData.licenseExpiry}
                        onChange={(e) =>
                          setFormData({ ...formData, licenseExpiry: e.target.value })
                        }
                      />
                      {isLicenseExpired && (
                        <div className="flex items-center gap-1.5 mt-1.5 text-xs font-bold text-red-600">
                          <AlertCircle size={14} className="shrink-0 text-red-600" />
                          <span>Licence is expired / رخصة القيادة منتهية الصلاحية</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">
                        Nationality (الجنسية)
                      </label>
                      <input
                        placeholder="e.g. Emirati / إماراتي"
                        className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                        value={formData.nationality}
                        onChange={(e) =>
                          setFormData({ ...formData, nationality: e.target.value })
                        }
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-text-secondary mb-1">
                        Residential Address (عنوان السكن الدائم)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Full UAE residential address, building, district, Dubai / Abu Dhabi..."
                        className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand resize-none"
                        value={formData.address}
                        onChange={(e) =>
                          setFormData({ ...formData, address: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-border bg-white flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting || !!linkingClientId}
            className="px-4 py-2 text-sm font-semibold text-text-secondary border border-border rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          {activeTab === "register" ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || scanningDoc}
              className="px-6 py-2.5 bg-brand text-white rounded-xl hover:bg-brand-dark transition-colors font-bold text-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Saving &amp; Linking...
                </>
              ) : (
                "Create & Link Customer"
              )}
            </button>
          ) : (
            <span className="text-xs text-text-muted">
              Select a customer above or switch to <strong>Register New Customer</strong>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
