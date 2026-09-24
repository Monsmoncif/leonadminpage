"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Save, User, Lock, Upload, Loader2, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  const { data: session } = useSession();

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

  useEffect(() => {
    if (session?.user?.id) {
      fetchUserProfile(session.user.id);
    }
  }, [session?.user?.id]);

  const fetchUserProfile = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${id}`, { cache: 'no-store' });
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
        setPassword(""); // Clear password field after save
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

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      {/* ===== Summary Header ===== */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-text-primary">My Profile</h1>
        <p className="text-sm text-text-secondary">Manage your personal information and security settings.</p>
      </div>

      {/* Settings Content */}
      <div className="col-span-12 flex flex-col gap-6 animate-fade-in-up stagger-1">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
                    <div className="h-10 w-full bg-gray-200 rounded-lg"></div>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <div className="h-4 w-24 bg-gray-200 rounded mb-4"></div>
                  <div>
                    <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
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
      </div>
    </div>
  );
}
