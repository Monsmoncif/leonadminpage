"use client";

import { useState, useEffect } from "react";
import { Bell, CheckCircle, Loader2 } from "lucide-react";

import { useSession } from "next-auth/react";

export default function DriverNotificationsPage() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDriverNotifications = async () => {
    const driverId = (session?.user as any)?.id;
    if (!driverId) return;
    try {
      const res = await fetch(`/api/contracts?driverId=${driverId}`, { cache: 'no-store' });
      const data = await res.json();
      const myContracts = (data.contracts || []).filter((c: any) => 
        c.driverId?._id === driverId || c.driverId === driverId
      );

      const dynamicNotifs: any[] = [];
      const today = new Date();
      today.setHours(0,0,0,0);

      myContracts.forEach((contract: any) => {
        if (contract.status === "Active") {
          const endDate = new Date(contract.endDate);
          endDate.setHours(0,0,0,0);
          
          const carName = contract.unitId ? `${contract.unitId.make} ${contract.unitId.model}` : "Vehicle";
          if (endDate.getTime() === today.getTime()) {
            dynamicNotifs.push({
              _id: `due-${contract._id}`,
              title: "Vehicle Return Due Today",
              message: `${carName} is scheduled to be returned today.`,
              type: "warning",
              createdAt: new Date().toISOString(),
              read: false
            });
          } else if (endDate.getTime() < today.getTime()) {
            dynamicNotifs.push({
              _id: `overdue-${contract._id}`,
              title: "Vehicle Return Overdue!",
              message: `${carName} is overdue for return! Please process the vehicle return immediately.`,
              type: "alert",
              createdAt: contract.endDate, // shows it's been overdue since end date
              read: false
            });
          }
        }
      });

      // Sort so overdue/alert comes first
      dynamicNotifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setNotifications(dynamicNotifs);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchDriverNotifications();
    }
  }, [session]);

  const handleMarkAllRead = () => {
    // For dynamic client-side notifications, we just clear them locally or visually mark them
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="h-8 w-48 bg-gray-200 rounded-lg"></div>
            <div className="h-4 w-64 bg-gray-200 rounded-lg mt-3"></div>
          </div>
          <div className="h-10 w-32 bg-gray-200 rounded-xl"></div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 min-h-[400px]">
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-4 p-4 rounded-xl border border-gray-100">
                <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0"></div>
                <div className="space-y-2 w-full pt-1">
                  <div className="h-4 w-48 bg-gray-200 rounded"></div>
                  <div className="h-3 w-3/4 bg-gray-200 rounded"></div>
                  <div className="h-2 w-24 bg-gray-200 rounded mt-2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Notifications</h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">Stay updated on your contracts and schedules.</p>
        </div>
        <button 
          onClick={handleMarkAllRead}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white border border-border text-text-secondary px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer"
        >
          <CheckCircle size={15} />
          <span>Mark all as read</span>
        </button>
      </div>

      <div className="bg-card rounded-xl sm:rounded-2xl border border-border shadow-xs sm:shadow-sm p-3.5 sm:p-6 animate-fade-in-up stagger-1">
        <div className="space-y-3 sm:space-y-4">
          {notifications.length === 0 ? (
            <div className="text-center py-10 sm:py-12 text-text-muted text-xs sm:text-sm font-medium">
              You're all caught up!
            </div>
          ) : (
            notifications.map((notif) => (
              <div key={notif._id} className={`flex gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border transition-colors ${notif.read ? 'border-border/50 bg-gray-50/50 opacity-70' : 'border-brand/20 bg-brand-light/20 hover:bg-brand-light/30'}`}>
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 ${
                  notif.type === 'contract' ? 'bg-emerald-50 text-emerald-500' : 
                  notif.type === 'alert' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'
                }`}>
                  <Bell size={16} className="sm:w-[18px] sm:h-[18px]" />
                </div>
                <div className="pt-0.5 min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-bold text-text-primary mb-0.5">{notif.title}</p>
                  <p className="text-xs sm:text-[13.5px] text-text-secondary font-medium leading-relaxed">{notif.message}</p>
                  <p className="text-[11px] sm:text-xs text-text-muted mt-1.5 font-medium">{formatTime(notif.createdAt)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
