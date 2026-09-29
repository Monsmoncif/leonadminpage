"use client";

import { useState, useRef, useEffect } from "react";
import { 
  X, 
  UserPlus, 
  Loader2, 
  AlertCircle, 
  ImagePlus, 
  Trash2, 
  FileText, 
  ScanLine, 
  Home, 
  Plane,
  CreditCard,
  BookOpen,
  Sparkles,
  CheckCircle2,
  Upload,
  Camera,
  ImageIcon,
  AlertTriangle,
  ShieldCheck
} from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

interface CreateClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (client?: any) => void;
  clientToEdit?: any;
}

export default function CreateClientModal({
  isOpen,
  onClose,
  onSuccess,
  clientToEdit,
}: CreateClientModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [scanningDoc, setScanningDoc] = useState(false);
  const [scanSlotLoading, setScanSlotLoading] = useState<string | null>(null);
  const [autoScannedSuccess, setAutoScannedSuccess] = useState(false);
  const [clientType, setClientType] = useState<"Resident" | "Tourist">("Resident");
  const [uploadMode, setUploadMode] = useState<"camera" | "gallery">("camera");
  const [error, setError] = useState<string | null>(null);
  const [docPreviews, setDocPreviews] = useState<string[]>([]);

  // Resident specific document previews
  const [licensePreviews, setLicensePreviews] = useState<string[]>([]);
  const [idCardPreviews, setIdCardPreviews] = useState<string[]>([]);

  // Specific scan thumbnails
  const [passportThumb, setPassportThumb] = useState<string | null>(null);
  const [licenseFrontThumb, setLicenseFrontThumb] = useState<string | null>(null);
  const [licenseBackThumb, setLicenseBackThumb] = useState<string | null>(null);

  // File input refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const scanCameraInputRef = useRef<HTMLInputElement>(null);
  const scanPassportRef = useRef<HTMLInputElement>(null);
  const scanLicenseFrontRef = useRef<HTMLInputElement>(null);
  const scanLicenseBackRef = useRef<HTMLInputElement>(null);
  const scanBatchRef = useRef<HTMLInputElement>(null);

  // Resident specific refs for Driving Licence & Emirates ID
  const licenseInputRef = useRef<HTMLInputElement>(null);
  const licenseCameraRef = useRef<HTMLInputElement>(null);
  const idInputRef = useRef<HTMLInputElement>(null);
  const idCameraRef = useRef<HTMLInputElement>(null);

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
    idIssuedBy: "",
    idIssuedDate: "",
    idExpiry: "",
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

  const formatDateForInput = (d: any) => {
    if (!d) return "";
    const str = String(d).trim();
    if (!str) return "";

    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }

    // If DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const dmy = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
    if (dmy) {
      const day = dmy[1].padStart(2, "0");
      const month = dmy[2].padStart(2, "0");
      const year = dmy[3];
      return `${year}-${month}-${day}`;
    }

    // If YYYY/MM/DD or YYYY.MM.DD
    const ymd = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (ymd) {
      const year = ymd[1];
      const month = ymd[2].padStart(2, "0");
      const day = ymd[3].padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    try {
      const parsed = new Date(str);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split("T")[0];
      }
    } catch {}
    return str;
  };

  // Helper to check if a date string is expired (in the past compared to today)
  const isDateExpired = (dateVal: any): boolean => {
    if (!dateVal) return false;
    const s = String(dateVal).trim();
    if (!s) return false;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // If YYYY-MM-DD or YYYY/MM/DD
      const ymdMatch = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
      if (ymdMatch) {
        const year = parseInt(ymdMatch[1], 10);
        const month = parseInt(ymdMatch[2], 10) - 1;
        const day = parseInt(ymdMatch[3], 10);
        const expDate = new Date(year, month, day, 23, 59, 59, 999);
        return expDate.getTime() < today.getTime();
      }

      // If DD-MM-YYYY or DD/MM/YYYY
      const dmyMatch = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
      if (dmyMatch) {
        const day = parseInt(dmyMatch[1], 10);
        const month = parseInt(dmyMatch[2], 10) - 1;
        const year = parseInt(dmyMatch[3], 10);
        const expDate = new Date(year, month, day, 23, 59, 59, 999);
        return expDate.getTime() < today.getTime();
      }

      const parsed = new Date(s);
      if (!isNaN(parsed.getTime())) {
        parsed.setHours(23, 59, 59, 999);
        return parsed.getTime() < today.getTime();
      }
    } catch {
      return false;
    }
    return false;
  };

  const isIdExpired = isDateExpired(formData.idExpiry);
  const isLicenseExpired = isDateExpired(formData.licenseExpiry);
  const isInternationalLicenseExpired = isDateExpired(formData.internationalLicenseExpiry);

  useEffect(() => {
    if (isOpen) {
      if (clientToEdit) {
        const type = clientToEdit.clientType || "Resident";
        setClientType(type);
        setFormData({
          name: clientToEdit.name || "",
          firstName: clientToEdit.firstName || "",
          middleName: clientToEdit.middleName || "",
          lastName: clientToEdit.lastName || "",
          gender: clientToEdit.gender || "",
          dateOfBirth: formatDateForInput(clientToEdit.dateOfBirth),

          phone: clientToEdit.phone || "",
          email: clientToEdit.email || "",
          nationality: clientToEdit.nationality || (type === "Tourist" ? "" : "Emirati"),
          idNumber: clientToEdit.idNumber || "",
          idIssuedBy: (clientToEdit as any).idIssuedBy || "",
          idIssuedDate: formatDateForInput((clientToEdit as any).idIssuedDate),
          idExpiry: formatDateForInput(clientToEdit.idExpiry),
          address: clientToEdit.address || "",

          passportNumber: clientToEdit.passportNumber || (type === "Tourist" ? clientToEdit.idNumber || "" : ""),
          passportIssuedBy: clientToEdit.passportIssuedBy || "",
          passportIssuedDate: formatDateForInput(clientToEdit.passportIssuedDate),
          passportExpiry: formatDateForInput(clientToEdit.passportExpiry),

          licenseNumber: clientToEdit.licenseNumber || "",
          licenseIssuedBy: clientToEdit.licenseIssuedBy || "",
          licenseIssuedDate: formatDateForInput(clientToEdit.licenseIssuedDate),
          licenseExpiry: formatDateForInput(clientToEdit.licenseExpiry),

          internationalLicenseNumber: clientToEdit.internationalLicenseNumber || "",
          internationalLicenseIssuedBy: clientToEdit.internationalLicenseIssuedBy || "",
          internationalLicenseIssuedDate: formatDateForInput(clientToEdit.internationalLicenseIssuedDate),
          internationalLicenseExpiry: formatDateForInput(clientToEdit.internationalLicenseExpiry),

          visaNumber: clientToEdit.visaNumber || "",
          visaExpiry: formatDateForInput(clientToEdit.visaExpiry),
        });
        const docs = clientToEdit.documents || [];
        setDocPreviews(docs);
        setLicensePreviews(docs);
        setIdCardPreviews(docs);
      } else {
        setClientType("Resident");
        resetForm();
      }
      setError(null);
      setAutoScannedSuccess(false);
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
      idIssuedBy: "",
      idIssuedDate: "",
      idExpiry: "",
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
    setLicensePreviews([]);
    setIdCardPreviews([]);
    setDocPreviews([]);
    setPassportThumb(null);
    setLicenseFrontThumb(null);
    setLicenseBackThumb(null);
    setAutoScannedSuccess(false);
  };

  const handleLicenseDocChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    if (licensePreviews.length + newFiles.length > 4) {
      toast.error("Maximum 4 images allowed for Driving Licence (الحد الأقصى 4 صور لرخصة القيادة)");
      return;
    }

    toast.success("Uploading driving licence image(s)...");
    const processedFiles: string[] = [];

    for (const file of newFiles) {
      const processedBase64 = await processFile(file);
      if (processedBase64) {
        processedFiles.push(processedBase64);
      }
    }

    if (processedFiles.length > 0) {
      setLicensePreviews((prev) => [...prev, ...processedFiles]);
      setDocPreviews((prev) => [...prev, ...processedFiles]);
      toast.success(`${processedFiles.length} licence image(s) uploaded.`);
    }
    if (e.target) e.target.value = "";
  };

  const handleIdCardDocChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    if (idCardPreviews.length + newFiles.length > 4) {
      toast.error("Maximum 4 images allowed for Emirates ID (الحد الأقصى 4 صور لبطاقة الهوية)");
      return;
    }

    toast.success("Uploading Emirates ID image(s)...");
    const processedFiles: string[] = [];

    for (const file of newFiles) {
      const processedBase64 = await processFile(file);
      if (processedBase64) {
        processedFiles.push(processedBase64);
      }
    }

    if (processedFiles.length > 0) {
      setIdCardPreviews((prev) => [...prev, ...processedFiles]);
      setDocPreviews((prev) => [...prev, ...processedFiles]);
      toast.success(`${processedFiles.length} Emirates ID image(s) uploaded.`);
    }
    if (e.target) e.target.value = "";
  };

  const removeLicenseDoc = (index: number) => {
    const target = licensePreviews[index];
    setLicensePreviews((prev) => prev.filter((_, i) => i !== index));
    if (target) {
      setDocPreviews((prev) => prev.filter((img) => img !== target));
    }
  };

  const removeIdCardDoc = (index: number) => {
    const target = idCardPreviews[index];
    setIdCardPreviews((prev) => prev.filter((_, i) => i !== index));
    if (target) {
      setDocPreviews((prev) => prev.filter((img) => img !== target));
    }
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
          const MAX_WIDTH = 1024;
          const MAX_HEIGHT = 1024;
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
          resolve(canvas.toDataURL("image/jpeg", 0.75));
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

  // AI OCR Scan Handler that uploads, scans, and auto-fills all fields
  const executeScan = async (files: File[], slotName?: string) => {
    if (files.length === 0) return;

    setScanningDoc(true);
    if (slotName) setScanSlotLoading(slotName);
    setAutoScannedSuccess(false);
    setError(null);
    toast.success("جاري فحص وقراءة الوثيقة واستخراج المعلومات تلقائياً عبر الذكاء الاصطناعي...");

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

      // Update slot preview thumbnails
      if (slotName === "passport") setPassportThumb(base64List[0]);
      if (slotName === "license_front") setLicenseFrontThumb(base64List[0]);
      if (slotName === "license_back") setLicenseBackThumb(base64List[0]);
      if (slotName === "license") setLicensePreviews((prev) => [...prev, ...base64List]);
      if (slotName === "id_card") setIdCardPreviews((prev) => [...prev, ...base64List]);

      // Send only the newly uploaded files for this slot scan for maximum speed
      const targets = base64List.length > 0 ? base64List : allDocs;
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

      // Smart resident vs tourist classification without forcing tourist for non-emirati residents
      if (data.documentType === "emirates_id" || (data.idNumber && data.idNumber.startsWith("784"))) {
        setClientType("Resident");
      } else if (
        (data.documentType === "passport" || data.documentType === "tourist_bundle" || data.passportNumber) &&
        !data.idNumber?.startsWith("784") &&
        data.documentType !== "emirates_id"
      ) {
        setClientType("Tourist");
      }

      // Auto-fill all fields without requiring user to type
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
        if (data.passportIssuedDate) updated.passportIssuedDate = formatDateForInput(data.passportIssuedDate);
        if (data.passportExpiry) updated.passportExpiry = formatDateForInput(data.passportExpiry);

        // Driving License
        if (data.licenseNumber) updated.licenseNumber = data.licenseNumber;
        if (data.licenseIssuedBy) updated.licenseIssuedBy = data.licenseIssuedBy;
        if (data.licenseIssuedDate) updated.licenseIssuedDate = formatDateForInput(data.licenseIssuedDate);
        if (data.licenseExpiry) updated.licenseExpiry = formatDateForInput(data.licenseExpiry);

        // International License
        if (data.internationalLicenseNumber) updated.internationalLicenseNumber = data.internationalLicenseNumber;
        if (data.internationalLicenseIssuedBy) updated.internationalLicenseIssuedBy = data.internationalLicenseIssuedBy;
        if (data.internationalLicenseIssuedDate) updated.internationalLicenseIssuedDate = formatDateForInput(data.internationalLicenseIssuedDate);
        if (data.internationalLicenseExpiry) updated.internationalLicenseExpiry = formatDateForInput(data.internationalLicenseExpiry);

        // Visa
        if (data.visaNumber) updated.visaNumber = data.visaNumber;
        if (data.visaExpiry) updated.visaExpiry = data.visaExpiry;

        // Standard / Common
        if (data.idNumber) updated.idNumber = data.idNumber;
        if (data.idIssuedBy) updated.idIssuedBy = data.idIssuedBy;
        if (data.idIssuedDate) updated.idIssuedDate = formatDateForInput(data.idIssuedDate);
        if (data.idExpiry) updated.idExpiry = formatDateForInput(data.idExpiry);
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

      // Add to previews
      const docsToAdd = imageUrls && imageUrls.length > 0 ? imageUrls : (imageUrl ? [imageUrl] : base64List);
      setDocPreviews((prev) => {
        const combined = [...prev];
        docsToAdd.forEach((img: string) => {
          if (!combined.includes(img)) combined.unshift(img);
        });
        return combined;
      });

      setAutoScannedSuccess(true);
      toast.success("✓ تم مسح الوثيقة واستخراج كافة البيانات وتعبئتها تلقائياً!");
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
      } else if (
        (data.documentType === "passport" || data.documentType === "tourist_bundle" || data.passportNumber) &&
        !data.idNumber?.startsWith("784") &&
        data.documentType !== "emirates_id"
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
        if (data.passportIssuedDate) updated.passportIssuedDate = formatDateForInput(data.passportIssuedDate);
        if (data.passportExpiry) updated.passportExpiry = formatDateForInput(data.passportExpiry);

        // Driving License
        if (data.licenseNumber) updated.licenseNumber = data.licenseNumber;
        if (data.licenseIssuedBy) updated.licenseIssuedBy = data.licenseIssuedBy;
        if (data.licenseIssuedDate) updated.licenseIssuedDate = formatDateForInput(data.licenseIssuedDate);
        if (data.licenseExpiry) updated.licenseExpiry = formatDateForInput(data.licenseExpiry);

        // International License
        if (data.internationalLicenseNumber) updated.internationalLicenseNumber = data.internationalLicenseNumber;
        if (data.internationalLicenseIssuedBy) updated.internationalLicenseIssuedBy = data.internationalLicenseIssuedBy;
        if (data.internationalLicenseIssuedDate) updated.internationalLicenseIssuedDate = formatDateForInput(data.internationalLicenseIssuedDate);
        if (data.internationalLicenseExpiry) updated.internationalLicenseExpiry = formatDateForInput(data.internationalLicenseExpiry);

        // Visa
        if (data.visaNumber) updated.visaNumber = data.visaNumber;
        if (data.visaExpiry) updated.visaExpiry = data.visaExpiry;

        // Standard / Common
        if (data.idNumber) updated.idNumber = data.idNumber;
        if (data.idIssuedBy) updated.idIssuedBy = data.idIssuedBy;
        if (data.idIssuedDate) updated.idIssuedDate = formatDateForInput(data.idIssuedDate);
        if (data.idExpiry) updated.idExpiry = formatDateForInput(data.idExpiry);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const finalName = clientType === "Tourist"
      ? ([formData.firstName, formData.middleName, formData.lastName].filter(Boolean).join(" ") || formData.name.trim())
      : formData.name.trim();

    if (!finalName) {
      setError("Please enter or scan the customer's name.");
      return;
    }
    if (!formData.phone.trim()) {
      setError("Please enter the customer's phone number.");
      return;
    }

    // BLOCK CREATION: If Emirates ID is expired (for Resident)
    if (clientType === "Resident" && formData.idExpiry && isIdExpired) {
      const expiredMsg = "Emirates ID is expired! Cannot create client with an expired ID. (بطاقة الهوية الإماراتية منتهية الصلاحية! لا يمكن إنشاء العميل بهوية منتهية)";
      setError(expiredMsg);
      toast.error(expiredMsg);
      const el = document.getElementById("client-id-expiry-resident");
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.focus();
      return;
    }

    // BLOCK CREATION: If Licence Expiry is late (expired)
    if (formData.licenseExpiry && isLicenseExpired) {
      const expiredMsg = "Driving licence is expired! Cannot create client with an expired licence. (رخصة القيادة منتهية الصلاحية! لا يمكن إنشاء العميل برخصة منتهية)";
      setError(expiredMsg);
      toast.error(expiredMsg);
      const el = document.getElementById(
        clientType === "Tourist" ? "client-license-expiry-tourist" : "client-license-expiry-resident"
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
    const totalDocs = docPreviews.length;

    if (totalDocs === 0) {
      const docMsg = clientType === "Tourist"
        ? "Upload Passport & Driver Licence (Front & Back) is required. Without upload we cannot create client. (يرجى تحميل جواز السفر ورخصة القيادة - الأمام والخلف)"
        : "Upload Emirates ID & UAE Driving Licence (Front & Back) is required. Without upload we cannot create client. (يرجى تحميل بطاقة الهوية الإماراتية ورخصة القيادة - الأمام والخلف)";
      setError(docMsg);
      toast.error(docMsg);
      document.getElementById("doc-upload-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);

    try {
      const allPreviewsToUpload = docPreviews;

      // 1. Upload new base64 documents if any
      const newFiles = allPreviewsToUpload.filter((img) => img.startsWith("data:image") || img.startsWith("data:application/pdf"));
      const existingUrls = allPreviewsToUpload.filter((img) => img.startsWith("http"));
      let uploadedUrls: string[] = [];

      if (newFiles.length > 0) {
        for (const base64 of newFiles) {
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: base64, folder: "client-documents" }),
          });
          if (!res.ok) {
            throw new Error("Document upload failed");
          }
          const uploadData = await res.json();
          uploadedUrls.push(uploadData.url || uploadData.secure_url);
        }
      }

      const allDocuments = [...existingUrls, ...uploadedUrls];

      const resolvedIdNumber = clientType === "Tourist"
        ? (formData.passportNumber.trim() || formData.idNumber.trim() || `T-${Date.now().toString().slice(-6)}`)
        : (formData.idNumber.trim() || `R-${Date.now().toString().slice(-6)}`);

      const payload = {
        ...formData,
        name: finalName,
        idNumber: resolvedIdNumber,
        idIssuedBy: formData.idIssuedBy || undefined,
        idIssuedDate: formData.idIssuedDate || undefined,
        idExpiry: formData.idExpiry || undefined,
        passportNumber: clientType === "Tourist" ? resolvedIdNumber : formData.passportNumber,
        passportIssuedBy: formData.passportIssuedBy || undefined,
        passportIssuedDate: formData.passportIssuedDate || undefined,
        passportExpiry: formData.passportExpiry || undefined,
        licenseNumber: formData.licenseNumber.trim() || "N/A",
        licenseIssuedBy: formData.licenseIssuedBy || undefined,
        licenseIssuedDate: formData.licenseIssuedDate || undefined,
        licenseExpiry: formData.licenseExpiry || undefined,
        nationality: formData.nationality.trim() || (clientType === "Tourist" ? "International" : "Emirati"),
        address: formData.address.trim() || (clientType === "Tourist" ? "Hotel / Tourist stay" : "Local residence"),
        clientType,
        documents: allDocuments,
      };

      const method = clientToEdit ? "PUT" : "POST";
      const url = clientToEdit
        ? `/api/clients/${clientToEdit._id}`
        : "/api/clients";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save client.");
      }

      const data = await res.json();
      toast.success(clientToEdit ? "Customer updated successfully! ✓" : "Customer created successfully! ✓");
      onSuccess(data);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const handleClose = () => {
    resetForm();
    setClientType("Resident");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in overflow-y-auto">
      {/* Widescreen Modal (max-w-5xl) - Height minimized on mobile to fit comfortably */}
      <div className="bg-card w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[82vh] sm:max-h-[90vh]">
        
        {/* Header */}
        <div className="px-3.5 py-2.5 sm:px-6 sm:py-4 border-b border-border flex items-center justify-between shrink-0 bg-white">
          <div>
            <h2 className="text-base sm:text-xl font-bold text-text-primary flex items-center gap-1.5 sm:gap-2">
              <UserPlus className="text-brand shrink-0" size={18} />
              <span>{clientToEdit ? "Edit Customer Profile" : "Add New Customer"}</span>
            </h2>
            <p className="text-[10px] sm:text-xs text-text-secondary mt-0.5 line-clamp-1 sm:line-clamp-none">
              {clientToEdit
                ? "Update customer identification, documents, and rental details."
                : "Register a Resident or Tourist client with automated AI document extraction."}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-gray-100 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-2.5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/40 space-y-3 sm:space-y-6">
          <form id="create-client-form" onSubmit={handleSubmit} className="space-y-3 sm:space-y-6">
            
            {/* Profile Type Selector (Resident vs Tourist) */}
            <div className="bg-white p-2.5 sm:p-4 rounded-xl border border-border shadow-xs">
              <label className="block text-[11px] sm:text-xs font-bold text-text-secondary mb-1.5 sm:mb-2">
                Customer Profile Type (نوع العميل) <span className="text-red-500 font-bold">*</span>
              </label>
              <div className="grid grid-cols-2 gap-1 p-0.5 sm:p-1 bg-gray-100 rounded-lg sm:rounded-xl border border-gray-200 w-full">
                <button
                  type="button"
                  onClick={() => {
                    setClientType("Resident");
                    if (!formData.nationality || formData.nationality === "International") {
                      setFormData(prev => ({ ...prev, nationality: "Emirati" }));
                    }
                  }}
                  className={`py-1.5 sm:py-2.5 px-2 sm:px-4 rounded-md sm:rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 min-w-0 ${
                    clientType === "Resident"
                      ? "bg-white text-brand shadow-xs font-bold"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  <Home size={13} className="shrink-0 text-brand" />
                  <span className="truncate text-center">
                    <span className="font-bold">Resident</span>
                    <span className="text-[10px] font-normal ml-1 hidden sm:inline">(مقيم / مواطن إماراتي)</span>
                    <span className="text-[10px] font-normal ml-1 sm:hidden">(مقيم)</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setClientType("Tourist");
                    if (formData.nationality === "Emirati" || formData.nationality === "Moroccan") {
                      setFormData(prev => ({ ...prev, nationality: "" }));
                    }
                  }}
                  className={`py-1.5 sm:py-2.5 px-2 sm:px-4 rounded-md sm:rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 min-w-0 ${
                    clientType === "Tourist"
                      ? "bg-white text-brand shadow-xs font-bold"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  <Plane size={13} className="shrink-0 text-brand" />
                  <span className="truncate text-center">
                    <span className="font-bold">Tourist</span>
                    <span className="text-[10px] font-normal ml-1 hidden sm:inline">(سائح / زائر أجنبي)</span>
                    <span className="text-[10px] font-normal ml-1 sm:hidden">(سائح)</span>
                  </span>
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

            {/* Resident specific hidden inputs */}
            <input
              type="file"
              ref={licenseInputRef}
              onChange={handleLicenseDocChange}
              accept="image/*,application/pdf"
              multiple
              className="hidden"
            />
            <input
              type="file"
              ref={licenseCameraRef}
              onChange={handleLicenseDocChange}
              accept="image/*"
              capture="environment"
              className="hidden"
            />
            <input
              type="file"
              ref={idInputRef}
              onChange={handleIdCardDocChange}
              accept="image/*,application/pdf"
              multiple
              className="hidden"
            />
            <input
              type="file"
              ref={idCameraRef}
              onChange={handleIdCardDocChange}
              accept="image/*"
              capture="environment"
              className="hidden"
            />

            {/* ================= DOCUMENT UPLOAD SECTION ================= */}
            <div id="doc-upload-section" className="bg-white p-2.5 sm:p-5 rounded-xl sm:rounded-2xl border border-border shadow-xs space-y-2 sm:space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2.5">
                <div className="flex items-center justify-between w-full sm:w-auto">
                  <label className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <span>Documents ({clientType === "Resident" ? "Emirates ID, License, etc." : "Passport, License, etc."})</span>
                    <span className="text-red-500 font-bold">*</span>
                    <span className="text-[11px] sm:text-xs text-gray-500 font-normal">
                      {docPreviews.length}/5
                    </span>
                  </label>
                  {autoScannedSuccess && (
                    <span className="sm:hidden text-[9px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 size={10} /> Auto-Filled
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 justify-between sm:justify-end w-full sm:w-auto flex-wrap">
                  {/* Mode Switcher: Camera vs Gallery */}
                  <div className="flex bg-gray-100 p-0.5 sm:p-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold shrink-0">
                    <button
                      type="button"
                      onClick={() => setUploadMode("camera")}
                      className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg transition-all cursor-pointer flex items-center gap-1 text-[11px] sm:text-xs ${
                        uploadMode === "camera"
                          ? "bg-white text-brand shadow-xs font-bold"
                          : "text-text-muted hover:text-text-primary"
                      }`}
                      title="Camera Mode (التقاط بالكاميرا)"
                    >
                      <Camera size={12} className={uploadMode === "camera" ? "text-brand" : "text-text-muted"} />
                      <span>Camera</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMode("gallery")}
                      className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg transition-all cursor-pointer flex items-center gap-1 text-[11px] sm:text-xs ${
                        uploadMode === "gallery"
                          ? "bg-white text-brand shadow-xs font-bold"
                          : "text-text-muted hover:text-text-primary"
                      }`}
                      title="Gallery / Files Mode (رفع من الملفات)"
                    >
                      <ImageIcon size={12} className={uploadMode === "gallery" ? "text-brand" : "text-text-muted"} />
                      <span>Gallery</span>
                    </button>
                  </div>

                  {docPreviews.length > 0 && (
                    <button
                      type="button"
                      disabled={scanningDoc || submitting}
                      onClick={() => scanUploadedDocs()}
                      className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-brand hover:bg-brand-dark text-white rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition-colors shadow-sm disabled:opacity-50 cursor-pointer shrink-0 animate-in fade-in"
                    >
                      {scanningDoc ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          <span>Scanning...</span>
                        </>
                      ) : (
                        <>
                          <ScanLine size={12} />
                          <span>Scan Document</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 sm:gap-3">
                {docPreviews.map((doc, idx) => {
                  const isPdf = doc.includes("application/pdf") || doc.endsWith(".pdf");
                  return (
                    <div
                      key={idx}
                      className="relative w-16 h-16 sm:w-24 sm:h-24 rounded-lg sm:rounded-xl border border-gray-200 overflow-hidden group shadow-2xs shrink-0"
                    >
                      {isPdf ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-brand">
                          <FileText size={20} className="text-red-500 mb-0.5" />
                          <span className="text-[9px] sm:text-[10px] font-medium text-gray-500 text-center mt-0.5 truncate w-full">PDF</span>
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
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}

                {docPreviews.length < 5 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (uploadMode === "camera") {
                        cameraInputRef.current?.click();
                      } else {
                        fileInputRef.current?.click();
                      }
                    }}
                    className={`w-16 h-16 sm:w-24 sm:h-24 rounded-lg sm:rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer group shadow-2xs shrink-0 ${
                      uploadMode === "camera"
                        ? "border-brand bg-brand/[0.04] text-brand hover:bg-brand/10"
                        : "border-gray-300 text-gray-500 hover:border-brand hover:text-brand hover:bg-brand/5"
                    }`}
                    title={uploadMode === "camera" ? "Take Photo with Camera (التقاط بالكاميرا)" : "Upload File or PDF (رفع ملف)"}
                  >
                    {uploadMode === "camera" ? (
                      <>
                        <Camera size={16} className="mb-0.5 group-hover:scale-110 transition-transform text-brand" />
                        <span className="text-[9px] sm:text-[10px] font-bold text-brand leading-tight">Take Photo</span>
                        <span className="text-[7px] sm:text-[8px] opacity-70">Camera</span>
                      </>
                    ) : (
                      <>
                        <ImagePlus size={16} className="mb-0.5 group-hover:scale-110 transition-transform text-gray-600 group-hover:text-brand" />
                        <span className="text-[9px] sm:text-[10px] font-bold text-gray-700 group-hover:text-brand leading-tight">Upload</span>
                        <span className="text-[7px] sm:text-[8px] opacity-70">Gallery / PDF</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-gray-500">
                {clientType === "Resident"
                  ? "Take photos or upload copies of Emirates ID and UAE driving licence (Front & Back, max 5 files)."
                  : "Take photos or upload copies of passport and international driver's license (max 5 files)."}
              </p>
            </div>

            {/* ================= FORM FIELDS ================= */}
            {clientType === "Tourist" ? (
              /* TOURIST FORM LAYOUT (MATCHING SCREENSHOTS) */
              <div className="space-y-5 animate-fade-in">
                
                {/* SECTION 1: IDENTIFICATION */}
                <div className="bg-white p-5 rounded-2xl border border-border shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 tracking-wide uppercase">
                        Identification
                      </h3>
                      <p className="text-xs text-text-secondary">
                        Enter Passport, Driving License, and International Permit
                      </p>
                    </div>
                    {autoScannedSuccess && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Sparkles size={11} /> Auto-Filled by Scanner
                      </span>
                    )}
                  </div>

                  {/* 1. Passport Row */}
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

                  {/* 2. Home Country Driving License Row */}
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
                      <label className="block text-xs font-semibold text-text-secondary mb-1">
                        License Expiry (تاريخ انتهاء صلاحية الرخصة)
                      </label>
                      {isLicenseExpired && (
                        <div className="flex items-center gap-1.5 mb-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg animate-in fade-in">
                          <AlertTriangle size={13} className="shrink-0 text-red-600" />
                          <span>(رخصة القيادة منتهية الصلاحية)</span>
                        </div>
                      )}
                      <input
                        id="client-license-expiry-resident"
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
                    </div>
                  </div>

                  {/* 3. International Driving License Row */}
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
                      <label className="block text-xs font-semibold text-text-secondary mb-1">
                        International License Expiry
                      </label>
                      {isInternationalLicenseExpired && (
                        <div className="flex items-center gap-1.5 mb-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg animate-in fade-in">
                          <AlertTriangle size={13} className="shrink-0 text-red-600" />
                          <span>(رخصة القيادة الدولية منتهية الصلاحية)</span>
                        </div>
                      )}
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
                    </div>
                  </div>

                  {/* 4. Visa Row */}
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
                        Address (Apt, Building, Locality, Area / Hotel in city)
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
              <div className="space-y-5 animate-fade-in">
                
                {/* SECTION 1: IDENTIFICATION */}
                <div className="bg-white p-5 rounded-2xl border border-border shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 tracking-wide uppercase">
                        Identification (بيانات الهوية ورخصة القيادة)
                      </h3>
                      <p className="text-xs text-text-secondary">
                        Enter Emirates ID and UAE Driving Licence details
                      </p>
                    </div>
                    {autoScannedSuccess && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Sparkles size={11} /> Auto-Filled by Scanner
                      </span>
                    )}
                  </div>

                  {/* 1. Emirates ID Row (Matching Passport 4-column row) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">
                        Emirates ID (بطاقة الهوية) <span className="text-red-500 font-bold">*</span>
                      </label>
                      <input
                        required
                        placeholder="e.g. 784-1990-1234567-1"
                        className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand uppercase font-mono"
                        value={formData.idNumber}
                        onChange={(e) =>
                          setFormData({ ...formData, idNumber: e.target.value.toUpperCase() })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">
                        ID Issued By (جهة الإصدار) <span className="text-red-500 font-bold">*</span>
                      </label>
                      <input
                        placeholder="e.g. ICP / UAE"
                        className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                        value={formData.idIssuedBy}
                        onChange={(e) =>
                          setFormData({ ...formData, idIssuedBy: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">
                        ID Issued Date (تاريخ الإصدار)
                      </label>
                      <input
                        type="date"
                        className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white"
                        value={formData.idIssuedDate}
                        onChange={(e) =>
                          setFormData({ ...formData, idIssuedDate: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">
                        ID Expiry (تاريخ انتهاء الصلاحية)
                      </label>
                      {isIdExpired && (
                        <div className="flex items-center gap-1.5 mb-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg animate-in fade-in">
                          <AlertTriangle size={13} className="shrink-0 text-red-600" />
                          <span>(بطاقة الهوية منتهية الصلاحية)</span>
                        </div>
                      )}
                      <input
                        id="client-id-expiry-resident"
                        type="date"
                        className={`w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none transition-all ${
                          isIdExpired
                            ? "border-red-500 bg-red-50/60 ring-2 ring-red-500/20 text-red-900 font-semibold"
                            : "border-border bg-white focus:ring-2 focus:ring-brand/20 focus:border-brand"
                        }`}
                        value={formData.idExpiry}
                        onChange={(e) =>
                          setFormData({ ...formData, idExpiry: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  {/* 2. UAE Driving Licence Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-gray-100">
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">
                        UAE Driving Licence (رخصة القيادة) <span className="text-red-500 font-bold">*</span>
                      </label>
                      <input
                        required
                        placeholder="e.g. 1234567"
                        className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand uppercase font-mono"
                        value={formData.licenseNumber}
                        onChange={(e) =>
                          setFormData({ ...formData, licenseNumber: e.target.value.toUpperCase() })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">
                        Licence Issued By (جهة الإصدار)
                      </label>
                      <input
                        placeholder="e.g. RTA Dubai / Abu Dhabi Police"
                        className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                        value={formData.licenseIssuedBy}
                        onChange={(e) =>
                          setFormData({ ...formData, licenseIssuedBy: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">
                        Licence Issue Date (تاريخ الإصدار)
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
                      <label className="block text-xs font-semibold text-text-secondary mb-1">
                        Licence Expiry (تاريخ انتهاء الصلاحية)
                      </label>
                      {isLicenseExpired && (
                        <div className="flex items-center gap-1.5 mb-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg animate-in fade-in">
                          <AlertTriangle size={13} className="shrink-0 text-red-600" />
                          <span>(رخصة القيادة منتهية الصلاحية)</span>
                        </div>
                      )}
                      <input
                        id="client-license-expiry-resident"
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
                    </div>
                  </div>
                </div>

                {/* SECTION 2: PERSONAL */}
                <div className="bg-white p-5 rounded-2xl border border-border shadow-xs space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 tracking-wide uppercase">
                      Personal Details (البيانات الشخصية)
                    </h3>
                    <p className="text-xs text-text-secondary">
                      Enter Contact, Personal, and Address Information
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 lg:col-span-1">
                      <label className="block text-xs font-semibold text-text-secondary mb-1">
                        Full Name (الاسم الكامل) <span className="text-red-500 font-bold">*</span>
                      </label>
                      <input
                        required
                        placeholder="e.g. Ahmed Al Rashid / أحمد الراشدي"
                        className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand font-medium"
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
                        className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand font-medium"
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
                        className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">
                        Date of Birth (تاريخ الميلاد)
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
                        Nationality (الجنسية)
                      </label>
                      <input
                        placeholder="e.g. Emirati / إماراتي"
                        className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                        value={formData.nationality}
                        onChange={(e) =>
                          setFormData({ ...formData, nationality: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">
                        Address (العنوان)
                      </label>
                      <input
                        placeholder="Apt, Building, Locality, Area / Dubai"
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
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3.5 rounded-xl flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}
          </form>
        </div>

        {/* Footer (Matching CreateClientModal) */}
        <div className="px-3.5 py-2.5 sm:px-6 sm:py-4 border-t border-border bg-white flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          <div>
            {autoScannedSuccess && (
              <span className="text-[11px] sm:text-xs text-emerald-700 font-bold flex items-center gap-1 sm:gap-1.5">
                <CheckCircle2 size={13} /> Information verified and ready to save
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-text-secondary border border-border rounded-xl hover:bg-gray-100 transition-colors cursor-pointer text-center"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="create-client-form"
              disabled={submitting || scanningDoc}
              className="flex-1 sm:flex-initial px-4 sm:px-6 py-2 sm:py-2.5 bg-brand text-white rounded-xl hover:bg-brand-dark transition-colors font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Saving...
                </>
              ) : clientToEdit ? (
                "Save Changes"
              ) : (
                "Create Customer"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
