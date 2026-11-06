"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Save,
  User,
  Lock,
  Upload,
  Loader2,
  CheckCircle2,
  Smartphone,
  MessageSquare,
  RefreshCw,
  Unlink,
  AlertCircle,
  ShieldCheck,
  Wifi,
  WifiOff,
  Send,
  Copy,
  Check,
} from "lucide-react";

export default function SettingsPage() {
  const { data: session } = useSession();

  // Active Tab: "profile" | "whatsapp"
  const [activeTab, setActiveTab] = useState<"profile" | "whatsapp">("profile");

  // Profile State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // WhatsApp Gateway State
  const [waStatus, setWaStatus] = useState<"LOADING" | "OFFLINE" | "SCAN_QR" | "CONNECTED" | "DISCONNECTED" | "STARTING">("LOADING");
  const [waPhone, setWaPhone] = useState<string | null>(null);
  const [waQr, setWaQr] = useState<string | null>(null);
  const [waConnectedAt, setWaConnectedAt] = useState<string | null>(null);
  const [isRefreshingWa, setIsRefreshingWa] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  // WhatsApp Test State
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState(
    "👋 مرحباً! هذه رسالة تجريبية لتأكيد ربط نظام ليون لتأجير السيارات بالواتساب بنجاح 🚗✨"
  );
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Fetch Profile
  useEffect(() => {
    if (session?.user?.id) {
      fetchUserProfile(session.user.id);
    }
  }, [session?.user?.id]);

  const fetchUserProfile = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${id}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setName(data.name || "");
        setEmail(data.email || "");
        setPhone(data.phone || "");
        setAvatarUrl(data.avatarUrl || "");
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    } finally {
      setLoading(false);
    }
  };

  // WhatsApp Status Fetcher
  const checkWhatsAppStatus = async (isManual = false) => {
    if (isManual) setIsRefreshingWa(true);
    try {
      const res = await fetch("/api/whatsapp/gateway", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.online) {
          setWaStatus(data.status || "DISCONNECTED");
          setWaPhone(data.phone || null);
          setWaQr(data.qr || null);
          setWaConnectedAt(data.connectedAt || null);
        } else {
          setWaStatus("OFFLINE");
          setWaPhone(null);
          setWaQr(null);
        }
      } else {
        setWaStatus("OFFLINE");
      }
    } catch {
      setWaStatus("OFFLINE");
    } finally {
      if (isManual) setIsRefreshingWa(false);
    }
  };

  // Poll WhatsApp Status
  useEffect(() => {
    checkWhatsAppStatus();

    const interval = setInterval(() => {
      // Poll faster if waiting for QR scan or starting
      if (waStatus === "SCAN_QR" || waStatus === "STARTING" || waStatus === "LOADING") {
        checkWhatsAppStatus();
      } else if (waStatus === "CONNECTED" || waStatus === "OFFLINE") {
        // Poll every 6 seconds when connected or offline
        checkWhatsAppStatus();
      }
    }, waStatus === "SCAN_QR" ? 2500 : 6000);

    return () => clearInterval(interval);
  }, [waStatus]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaving(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64Image = reader.result;
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64Image }),
        });

        if (res.ok) {
          const data = await res.json();
          setAvatarUrl(data.url);
        }
      };
    } catch (error) {
      console.error("Error uploading image:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!session?.user?.id) return;

    setSaving(true);
    setSaveMessage("");

    try {
      const payload: any = { name, email, phone, avatarUrl };
      if (password) {
        payload.password = password;
      }

      const res = await fetch(`/api/users/${session.user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSaveMessage("Profile updated successfully!");
        setPassword("");
        setTimeout(() => setSaveMessage(""), 3000);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  // WhatsApp Actions
  const handleSendTestMessage = async () => {
    if (!testPhone.trim()) {
      alert("يرجى إدخال رقم الهاتف للتجربة");
      return;
    }
    setIsSendingTest(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/whatsapp/gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test",
          phone: testPhone,
          message: testMessage,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: `تم إرسال الرسالة التجريبية بنجاح! كود الرسالة: ${data.messageId || "OK"}`,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || "فشل إرسال الرسالة، يرجى التأكد من الرقم وصلاحية الاتصال.",
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "حدث خطأ أثناء الإرسال",
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleDisconnectWa = async () => {
    if (!confirm("هل أنت متأكد من رغبتك في تسجيل الخروج وقطع اتصال الواتساب؟")) {
      return;
    }

    setIsDisconnecting(true);
    try {
      const res = await fetch("/api/whatsapp/gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect" }),
      });

      if (res.ok) {
        await checkWhatsAppStatus(true);
      }
    } catch (err) {
      console.error("Disconnect error:", err);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up pb-12">
      {/* ===== Header & Tabs ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Settings & Integration</h1>
          <p className="text-sm text-text-secondary">إدارة بيانات الحساب وإعدادات الربط التلقائي لنظام ليون لتأجير السيارات.</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-card border border-border p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "profile"
                ? "bg-white dark:bg-zinc-800 text-brand shadow-sm"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <User size={16} />
            My Profile
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("whatsapp")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "whatsapp"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <MessageSquare size={16} />
            WhatsApp Gateway
            {/* Live Indicator Dot */}
            <span
              className={`w-2 h-2 rounded-full ${
                waStatus === "CONNECTED"
                  ? "bg-emerald-400 animate-pulse"
                  : waStatus === "SCAN_QR"
                  ? "bg-amber-400 animate-ping"
                  : "bg-gray-400"
              }`}
            />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: PROFILE SETTINGS                                   */}
      {/* ======================================================== */}
      {activeTab === "profile" && (
        <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
          <div className="space-y-8 max-w-2xl">
            {loading ? (
              <div className="space-y-6 animate-pulse">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 rounded-full bg-gray-200 shrink-0"></div>
                  <div>
                    <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 w-48 bg-gray-200 rounded"></div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
                    <div className="h-10 w-full bg-gray-200 rounded-lg"></div>
                  </div>
                  <div>
                    <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                    <div className="h-10 w-full bg-gray-200 rounded-lg"></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Avatar Upload */}
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-2">Profile Picture</label>
                  <div className="flex items-center gap-6">
                    <div
                      className="relative w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 overflow-hidden flex items-center justify-center cursor-pointer hover:border-brand transition-colors group shadow-sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User size={32} className="text-gray-400 group-hover:text-brand transition-colors" />
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Upload size={20} className="text-white" />
                      </div>
                    </div>
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                      />
                      <p className="text-sm font-medium text-text-primary">Click avatar to upload</p>
                      <p className="text-xs text-text-muted mt-1">Recommended: Square image, max 2MB.</p>
                    </div>
                  </div>
                </div>

                {/* Personal Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-text-primary mb-1.5">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-white text-text-secondary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-text-primary mb-1.5">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-white text-text-secondary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-text-primary mb-1.5">Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-white text-text-secondary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all shadow-sm"
                    />
                  </div>
                </div>

                {/* Security */}
                <div className="pt-6 border-t border-border">
                  <h3 className="text-sm font-bold text-text-primary mb-5 flex items-center gap-2">
                    Security Settings
                  </h3>
                  <div className="max-w-md">
                    <label className="block text-sm font-semibold text-text-primary mb-1.5">New Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Leave blank to keep current password"
                      className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-white text-text-secondary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all shadow-sm"
                    />
                  </div>
                </div>

                {/* Save Button for Profile */}
                <div className="mt-8 pt-6 border-t border-border flex items-center justify-end gap-4">
                  {saveMessage && (
                    <span className="text-sm font-medium text-emerald-600 flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                      <CheckCircle2 size={16} /> {saveMessage}
                    </span>
                  )}
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold px-6 py-2.5 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-70 shadow-sm hover:shadow-md cursor-pointer"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: WHATSAPP GATEWAY (FREE SELF-HOSTED BAILEYS)        */}
      {/* ======================================================== */}
      {activeTab === "whatsapp" && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-2xl shrink-0">
                <Smartphone size={32} />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl font-bold text-text-primary">بوابة واتساب التلقائية (Free WhatsApp Gateway)</h2>
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                    مجاني 100% / بدون اشتراك
                  </span>
                </div>
                <p className="text-sm text-text-secondary mt-1">
                  خادم محلي داخلي لإرسال رسائل تأكيد الحجوزات وإرسال عقود الإيجار الموقعة بصيغة PDF مباشرة لرقم العميل.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => checkWhatsAppStatus(true)}
                disabled={isRefreshingWa}
                className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-text-primary transition-colors cursor-pointer border border-border"
              >
                <RefreshCw size={14} className={isRefreshingWa ? "animate-spin" : ""} />
                تحديث الحالة
              </button>
            </div>
          </div>

          {/* ================= STATUS: OFFLINE ================= */}
          {waStatus === "OFFLINE" && (
            <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-6 sm:p-8 space-y-5">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-500/20 text-amber-600 rounded-xl shrink-0">
                  <WifiOff size={28} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-amber-900 dark:text-amber-300">
                    خادم الواتساب غير مشغل حالياً (Server Offline)
                  </h3>
                  <p className="text-sm text-amber-800 dark:text-amber-200/90 mt-1 leading-relaxed">
                    لكي يتمكن النظام من الاتصال بواتساب وإرسال العقود تلقائياً للعملاء، يجب تشغيل خادم الواتساب المحلي في جهازك أو السيرفر.
                  </p>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-white/80 dark:bg-zinc-900/80 rounded-xl p-4 border border-amber-200/50 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                  خطوات التشغيل السريع (في نافذة Terminal / سطر الأوامر):
                </div>

                <div className="flex items-center justify-between bg-zinc-900 text-emerald-400 font-mono text-sm px-4 py-3 rounded-lg border border-zinc-800">
                  <span>npm run whatsapp</span>
                  <button
                    type="button"
                    onClick={() => copyCommand("npm run whatsapp")}
                    className="flex items-center gap-1 text-xs text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 rounded cursor-pointer transition-colors"
                  >
                    {copiedCmd ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    {copiedCmd ? "تم النسخ" : "نسخ الأمر"}
                  </button>
                </div>

                <p className="text-xs text-text-muted">
                  💡 ملاحظة: إذا كنت تستخدم <code className="bg-gray-100 px-1 py-0.5 rounded text-text-primary">npm run dev:all</code> لتشغيل المشروع والباك إند، فقد قمنا بإضافة خادم الواتساب إليها ليعمل تلقائياً مع التطبيق!
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => checkWhatsAppStatus(true)}
                  disabled={isRefreshingWa}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                >
                  <RefreshCw size={16} className={isRefreshingWa ? "animate-spin" : ""} />
                  التحقق من تشغيل الخادم الآن
                </button>
              </div>
            </div>
          )}

          {/* ================= STATUS: SCAN_QR ================= */}
          {(waStatus === "SCAN_QR" || (waStatus === "STARTING" && waQr)) && (
            <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-sm space-y-6">
              <div className="text-center max-w-xl mx-auto space-y-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  في انتظار مسح الكود من هاتفك
                </span>
                <h3 className="text-2xl font-bold text-text-primary">امسح رمز QR لربط رقم واتساب</h3>
                <p className="text-sm text-text-secondary">
                  افتح تطبيق واتساب على هاتفك، واذهب إلى <b>الأجهزة المرتبطة</b> ثم اضغط على <b>ربط جهاز</b> ووجّه الكاميرا نحو الرمز.
                </p>
              </div>

              {/* QR Code Container */}
              <div className="flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-zinc-900/50 rounded-2xl border border-dashed border-border max-w-md mx-auto">
                {waQr ? (
                  <div className="p-3 bg-white rounded-2xl shadow-md border border-border">
                    <img
                      src={waQr}
                      alt="WhatsApp QR Code"
                      className="w-64 h-64 sm:w-72 sm:h-72 object-contain rounded-xl"
                    />
                  </div>
                ) : (
                  <div className="w-64 h-64 flex flex-col items-center justify-center gap-3 text-text-muted">
                    <Loader2 size={36} className="animate-spin text-emerald-600" />
                    <span className="text-xs font-medium">جاري إنشاء رمز الاستجابة السريعة...</span>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2 text-xs text-text-muted text-center">
                  <RefreshCw size={13} className="animate-spin text-emerald-600" />
                  يتم تجديد الرمز تلقائياً كل 20 ثانية لضمان أمان الاتصال.
                </div>
              </div>

              {/* Step By Step Guide */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto text-xs text-text-secondary pt-2">
                <div className="bg-gray-50 dark:bg-zinc-800/50 p-3.5 rounded-xl border border-border flex flex-col gap-1">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs mb-1">
                    1
                  </span>
                  <span className="font-semibold text-text-primary">افتح تطبيق واتساب</span>
                  <span>على الهاتف الذي يحمل رقم المكتب أو شركة التأجير.</span>
                </div>

                <div className="bg-gray-50 dark:bg-zinc-800/50 p-3.5 rounded-xl border border-border flex flex-col gap-1">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs mb-1">
                    2
                  </span>
                  <span className="font-semibold text-text-primary">الأجهزة المرتبطة (Linked Devices)</span>
                  <span>اضغط على القائمة (أو الإعدادات) واختر "الأجهزة المرتبطة" ثم "ربط جهاز".</span>
                </div>

                <div className="bg-gray-50 dark:bg-zinc-800/50 p-3.5 rounded-xl border border-border flex flex-col gap-1">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs mb-1">
                    3
                  </span>
                  <span className="font-semibold text-text-primary">مسح الرمز والاتصال</span>
                  <span>وجّه كاميرا الهاتف نحو الرمز، وسيتم الاتصال تلقائياً فوراً!</span>
                </div>
              </div>
            </div>
          )}

          {/* ================= STATUS: CONNECTED ================= */}
          {waStatus === "CONNECTED" && (
            <div className="space-y-6">
              {/* Connected Banner */}
              <div className="bg-emerald-500/10 border-2 border-emerald-500/30 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-start sm:items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md">
                    <ShieldCheck size={32} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                        متصل وجاهز للعمل
                      </span>
                      {waConnectedAt && (
                        <span className="text-xs text-text-muted">
                          منذ {new Date(waConnectedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                    <h3 className="text-2xl font-bold text-text-primary mt-1">
                      +{waPhone || "رقمك الشخصي / المكتب"}
                    </h3>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-1">
                      ✓ يتم إرسال إشعارات الحجز وعقود الإيجار الموقعة (PDF) تلقائياً من خلال هذا الرقم مجاناً.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDisconnectWa}
                  disabled={isDisconnecting}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-red-200 hover:border-red-400 text-red-600 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 transition-all cursor-pointer shrink-0 shadow-sm"
                >
                  {isDisconnecting ? <Loader2 size={14} className="animate-spin" /> : <Unlink size={14} />}
                  قطع الاتصال / تغيير الرقم
                </button>
              </div>

              {/* Test Message Box */}
              <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-sm space-y-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-brand/10 text-brand rounded-xl">
                    <Send size={20} />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-text-primary">تجربة إرسال رسالة واتساب (Test Message)</h4>
                    <p className="text-xs text-text-secondary">
                      أدخل أي رقم هاتف ترغب في اختباره (رقمك الشخصي مثلاً) لتتأكد من وصول الرسالة في لحظتها.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1.5">
                      رقم الهاتف المستقبل (Recipient Phone)
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: 971501234567 أو 0501234567"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-white text-text-secondary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm font-mono"
                    />
                    <span className="text-[11px] text-text-muted mt-1 block">
                      يقبل الأرقام الدولية والمحلية (الإمارات، الجزائر، وأي دولة أخرى).
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1.5">
                      نص الرسالة التجريبية (Message)
                    </label>
                    <textarea
                      rows={2}
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      className="w-full border border-border rounded-xl px-4 py-2 text-sm bg-white text-text-secondary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
                    />
                  </div>
                </div>

                {/* Feedback Alert */}
                {testResult && (
                  <div
                    className={`p-3.5 rounded-xl text-xs flex items-center gap-2 border ${
                      testResult.success
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-red-50 text-red-800 border-red-200"
                    }`}
                  >
                    {testResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <span>{testResult.message}</span>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleSendTestMessage}
                    disabled={isSendingTest}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-6 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer shadow-sm transition-all disabled:opacity-60"
                  >
                    {isSendingTest ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    {isSendingTest ? "جاري الإرسال..." : "إرسال رسالة تجريبية الآن"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= STATUS: LOADING / STARTING ================= */}
          {(waStatus === "LOADING" || (waStatus === "STARTING" && !waQr)) && (
            <div className="bg-card rounded-2xl border border-border p-12 text-center space-y-3">
              <Loader2 size={36} className="animate-spin text-emerald-600 mx-auto" />
              <p className="text-sm font-medium text-text-primary">جاري الاتصال بخوادم واتساب وتجهيز رمز QR...</p>
              <p className="text-xs text-text-muted">يستغرق هذا من 3 إلى 5 ثوانٍ عند بدء التشغيل، يرجى الانتظار لحظات.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
