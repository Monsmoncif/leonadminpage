"use client";

import { useState, useEffect } from "react";
import { Bell, Check, Trash2, Calendar, FileText, AlertTriangle, Clock, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

interface NotificationResponse {
  _id: string;
  title: string;
  message: string;
  read: boolean;
  type: string;
  createdAt: string;
}

const formatTime = (dateString: string) => {
  const d = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - d.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays} days ago`;
  
  return d.toLocaleDateString();
};

export default function NotificationsPage() {
  const toast = useToast();
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<NotificationResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async (retryCount = 0) => {
    const MAX_RETRIES = 3;
    try {
      setLoading(true);
      const res = await fetch("/api/notifications", { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setNotifications(Array.isArray(data) ? data : []);
      } else {
        throw new Error(`Failed to fetch notifications (${res.status})`);
      }
    } catch (err) {
      console.error(`Notifications fetch error (attempt ${retryCount + 1}):`, err);
      if (retryCount < MAX_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 4000);
        await new Promise(res => setTimeout(res, delay));
        return fetchNotifications(retryCount + 1);
      }
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      // Optimistic update
      setNotifications(prev => 
        prev.map(n => n._id === id ? { ...n, read: true } : n)
      );
      
      const res = await fetch(`/api/notifications/${id}`, { method: "PATCH" });
      if (!res.ok) {
        // Revert on error
        fetchNotifications();
        toast.error("Failed to mark as read");
      }
    } catch (err) {
      fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      
      const res = await fetch("/api/notifications", { method: "PATCH" });
      if (res.ok) {
        toast.success("All notifications marked as read");
      } else {
        fetchNotifications();
        toast.error("Failed to mark all as read");
      }
    } catch (err) {
      fetchNotifications();
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/notifications/${deleteTarget._id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Notification deleted");
        setNotifications(prev => prev.filter(n => n._id !== deleteTarget._id));
      } else {
        toast.error("Failed to delete notification");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const getIconData = (type: string) => {
    switch (type) {
      case "contract":
        return { icon: FileText, bg: "bg-blue-50", color: "text-blue-500" };
      case "alert":
        return { icon: AlertTriangle, bg: "bg-red-50", color: "text-brand" };
      case "reminder":
        return { icon: Calendar, bg: "bg-orange-50", color: "text-orange-500" };
      case "general":
      default:
        return { icon: Bell, bg: "bg-gray-100", color: "text-gray-600" };
    }
  };

  return (
    <>
    <div className="space-y-6 animate-fade-in-up">
      {/* ===== Summary Header ===== */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Notifications</h1>
          <p className="text-sm text-text-secondary mt-1">Stay updated with the latest system alerts and reminders.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={markAllAsRead}
            disabled={notifications.every(n => n.read) || loading}
            className="text-sm font-semibold text-brand bg-brand/10 hover:bg-brand/20 px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Check size={16} /> Mark all as read
          </button>
        </div>
      </div>

      {/* Notifications List Area */}
      <div className="col-span-12 flex flex-col gap-6 animate-fade-in-up stagger-1">
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden card-hover">
        {loading ? (
          <div className="p-12 text-center text-text-muted flex flex-col items-center">
            <Loader2 size={32} className="animate-spin mb-4 text-brand" />
            <p>Loading notifications...</p>
          </div>
        ) : notifications.length > 0 ? (
          <div className="flex flex-col divide-y divide-border/50">
            {notifications.map((notification, idx) => {
              const { icon: Icon, bg, color } = getIconData(notification.type);

              return (
                <div 
                  key={notification._id} 
                  className={`flex items-start gap-4 p-5 transition-colors group animate-fade-in-up ${notification.read ? "bg-white hover:bg-gray-50/50" : "bg-brand/5 hover:bg-brand/10"}`}
                  style={{ animationDelay: `${idx * 0.05 + 0.3}s` }}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${bg}`}>
                    <Icon size={18} className={color} />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className={`text-sm ${notification.read ? "font-medium text-text-primary" : "font-bold text-text-primary"}`}>
                          {notification.title}
                        </h3>
                        <p className={`text-sm mt-1 ${notification.read ? "text-text-secondary" : "text-gray-700"}`}>
                          {notification.message}
                        </p>
                      </div>
                      <span className="text-xs text-text-muted flex items-center gap-1 font-medium whitespace-nowrap">
                        <Clock size={12} /> {formatTime(notification.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4  transition-opacity">
                    {!notification.read && (
                      <button 
                        onClick={() => markAsRead(notification._id)}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-brand hover:bg-brand/10 transition-colors cursor-pointer" 
                        title="Mark as read"
                      >
                        <Check size={16} />
                      </button>
                    )}
                    <button 
                      onClick={() => setDeleteTarget(notification)}
                      className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-brand hover:bg-red-50 transition-colors cursor-pointer" 
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell size={24} className="text-text-muted" />
            </div>
            <h3 className="text-lg font-medium text-text-primary mb-1">No new notifications</h3>
            <p className="text-sm text-text-secondary">You're all caught up!</p>
          </div>
        )}
      </div>
      </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-border p-8 text-center bg-white transform transition-all scale-100">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-red-100">
              <AlertCircle size={28} className="text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Delete Notification
            </h3>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              Are you sure you want to delete notification{" "}
              <strong className="text-gray-900 font-bold">"{deleteTarget.title || deleteTarget.message}"</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-5 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-gray-900 cursor-pointer transition-colors w-full bg-white shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2 w-full disabled:opacity-50 shadow-sm shadow-red-500/20"
              >
                {deleting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}{" "}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
