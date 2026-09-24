"use client";

import { useState, useRef } from "react";
import { X, Upload, Loader2, File, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

interface CreateDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateDocumentModal({ isOpen, onClose, onSuccess }: CreateDocumentModalProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    type: "Contract",
    relatedTo: "",
  });

  const categories = [
    "Contract",
    "Inspection Report",
    "Vehicle Photo",
    "Damage Photo",
    "Driver License",
    "Passport",
    "Other",
  ];

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 15 * 1024 * 1024) {
        toast.error("File is too large. Max size is 15MB.");
        return;
      }
      setFile(selected);
      // Automatically set the name if it's empty
      if (!formData.name) {
        setFormData(prev => ({ ...prev, name: selected.name }));
      }
    }
  };

  const toBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please select a file to upload");
      return;
    }
    if (!formData.name) {
      toast.error("Please enter a document name");
      return;
    }

    setIsSubmitting(true);

    try {
      const base64File = await toBase64(file);
      
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64File }), // Re-using image upload endpoint (assuming it handles data URIs)
      });
      
      if (!uploadRes.ok) throw new Error("Failed to upload file to storage");
      const uploadData = await uploadRes.json();

      const payload = {
        ...formData,
        url: uploadData.url,
        size: formatBytes(file.size),
      };

      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save document record");

      toast.success("Document uploaded successfully!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload document");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-border bg-white transform transition-all flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-8 py-5 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Upload Document</h2>
            <p className="text-xs text-text-muted mt-1">Upload a new file to your system</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-primary hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* File Drop / Select Area */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              file ? "border-brand bg-brand/5" : "border-border/80 hover:border-brand/40 hover:bg-gray-50"
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept="image/*,.pdf,.doc,.docx"
            />
            {file ? (
              <>
                <div className="w-12 h-12 bg-brand/10 text-brand rounded-full flex items-center justify-center mb-3">
                  {file.type.includes("image") ? <ImageIcon size={24} /> : <File size={24} />}
                </div>
                <p className="font-semibold text-text-primary">{file.name}</p>
                <p className="text-xs text-text-muted mt-1">{formatBytes(file.size)}</p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mb-3">
                  <Upload size={24} />
                </div>
                <p className="font-medium text-text-secondary">Click to browse or drag and drop</p>
                <p className="text-xs text-text-muted mt-1">PDF, JPG, PNG up to 15MB</p>
              </>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                Document Name *
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder="e.g. Contract_Alice.pdf"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full text-sm border border-border rounded-xl px-4 py-2.5 bg-gray-50/50 text-text-secondary focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all shadow-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                  Category *
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full text-sm border border-border rounded-xl px-4 py-2.5 bg-gray-50/50 text-text-secondary focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all shadow-sm"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                  Related To
                </label>
                <input
                  type="text"
                  name="relatedTo"
                  placeholder="e.g. Alice Johnson or TX1234"
                  value={formData.relatedTo}
                  onChange={handleInputChange}
                  className="w-full text-sm border border-border rounded-xl px-4 py-2.5 bg-gray-50/50 text-text-secondary focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all shadow-sm"
                />
              </div>
            </div>
          </div>
        </form>

        <div className="px-8 py-5 border-t border-border flex justify-end gap-3 bg-gray-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-white transition-colors bg-white shadow-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !file}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-brand rounded-xl hover:bg-brand-dark transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <><Loader2 size={16} className="animate-spin" /> Uploading...</>
            ) : (
              "Upload File"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
