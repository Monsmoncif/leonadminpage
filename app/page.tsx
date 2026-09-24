"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  AlertTriangle,
  Users,
  CheckCircle,
  FileText,
  DollarSign,
  Plus,
  BarChart3,
  Clock,
  Trophy,
  Zap,
  ArrowRight,
  ArrowLeft,
  CalendarClock,
  Wrench,
  AlertCircle,
  Wallet,
  CircleDot,
  Bell,
  Loader2,
  TrendingUp,
} from "lucide-react";
import LineChartComponent from "@/components/charts/LineChart";
import BarChartComponent from "@/components/charts/BarChart";
import DonutChart from "@/components/charts/DonutChart";
import StatCard from "@/components/ui/StatCard";
import {
  sparklineData,
  notificationsData,
} from "@/data/mock";
import CreateContractModal from "@/components/modals/CreateContractModal";
import CreateUnitModal from "@/components/modals/CreateUnitModal";
import { ExecutiveCarIcon } from "@/components/icons/ExecutiveCarIcon";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getFormattedDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getActivityMeta(type: string) {
  switch (type) {
    case "booking":
      return { Icon: FileText, iconBg: "bg-blue-50", iconColor: "text-blue-600", badge: "Booking", badgeBg: "bg-blue-50 text-blue-700" };
    case "client":
      return { Icon: CheckCircle, iconBg: "bg-green-50", iconColor: "text-success", badge: "Client", badgeBg: "bg-green-50 text-green-700" };
    case "maintenance":
      return { Icon: ExecutiveCarIcon, iconBg: "bg-orange-50", iconColor: "text-orange-500", badge: "Vehicle", badgeBg: "bg-orange-50 text-orange-700" };
    case "payment":
      return { Icon: AlertTriangle, iconBg: "bg-red-50", iconColor: "text-brand", badge: "Alert", badgeBg: "bg-red-50 text-red-700" };
    default:
      return { Icon: FileText, iconBg: "bg-gray-50", iconColor: "text-gray-600", badge: "Other", badgeBg: "bg-gray-50 text-gray-700" };
  }
}

const rankColors = ["#F59E0B", "#9CA3AF", "#CD7F32"];
const progressGradients = [
  "linear-gradient(90deg, #F59E0B 0%, #FBBF24 100%)",
  "linear-gradient(90deg, #9CA3AF 0%, #D1D5DB 100%)",
  "linear-gradient(90deg, #CD7F32 0%, #DDA15E 100%)",
  "linear-gradient(90deg, #3B82F6 0%, #60A5FA 100%)",
];

// Default empty state
const emptyStats = {
  totalRevenue: "$0",
  activeRentals: "0",
  totalCustomers: "0",
  totalDrivers: "0",
  totalVehicles: "0",
  availableVehicles: "0",
  rentedVehicles: "0",
  vehiclesInMaintenance: "0",
  completedRentals: "0",
  overdueRentals: "0",
  changes: {
    revenue: 0,
    rentals: 0,
    customers: 0,
    vehicles: 0,
  }
};

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  
  const currentYear = new Date().getFullYear();
  const [rentalsYear, setRentalsYear] = useState(currentYear);
  const [isChartUpdating, setIsChartUpdating] = useState(false);

  const fetchDashboardData = async (year: number, isInitial = false, retryCount = 0) => {
    const MAX_RETRIES = 3;
    if (isInitial) setLoading(true);
    else setIsChartUpdating(true);

    try {
      const res = await fetch(`/api/dashboard?year=${year}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed to fetch dashboard data (${res.status})`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err: any) {
      console.error(`Dashboard fetch error (attempt ${retryCount + 1}):`, err);
      if (retryCount < MAX_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 4000);
        await new Promise(res => setTimeout(res, delay));
        return fetchDashboardData(year, isInitial, retryCount + 1);
      }
      setError(err.message);
    } finally {
      setLoading(false);
      setIsChartUpdating(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(rentalsYear, true);
  }, []);

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const year = parseInt(e.target.value);
    setRentalsYear(year);
    fetchDashboardData(year, false);
  };

  const stats = data?.stats || emptyStats;
  const rentalsPerMonthData = data?.rentalsPerMonthData || [];
  const revenueChartData = data?.revenueData || [];
  const vehicleAvailabilityData = data?.vehicleAvailabilityData || [
    { name: "Available", value: 0, color: "#22C55E" },
    { name: "Rented", value: 0, color: "#3B82F6" },
    { name: "Reserved", value: 0, color: "#F59E0B" },
    { name: "Maintenance", value: 0, color: "#E53935" },
  ];
  const mostRentedCarsData = data?.mostRentedCarsData || [];
  const recentActivity = data?.recentActivity || [];
  const upcomingReturns = data?.upcomingReturns || [];

  const secondaryStats = [
    { label: "Available Cars", value: stats.availableVehicles, color: "#22C55E", icon: ExecutiveCarIcon },
    { label: "Rented Cars", value: stats.rentedVehicles, color: "#3B82F6", icon: ExecutiveCarIcon },
    { label: "Cars in Maintenance", value: stats.vehiclesInMaintenance, color: "#F59E0B", icon: Wrench },
    { label: "Completed Contracts", value: stats.completedRentals, color: "#10B981", icon: CheckCircle },
    { label: "Overdue Contracts", value: stats.overdueRentals, color: "#E53935", icon: AlertCircle },
    { label: "Total Vehicles", value: stats.totalVehicles, color: "#8B5CF6", icon: ExecutiveCarIcon },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex justify-between items-end mb-6">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-gray-200 rounded-lg"></div>
            <div className="h-4 w-64 bg-gray-200 rounded-lg"></div>
          </div>
          <div className="h-10 w-32 bg-gray-200 rounded-xl"></div>
        </div>
        
        {/* Primary Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card border border-border rounded-2xl h-[130px] p-5">
              <div className="flex justify-between">
                <div className="w-11 h-11 bg-gray-200 rounded-xl mb-3"></div>
                <div className="w-16 h-8 bg-gray-100 rounded-md"></div>
              </div>
              <div className="w-24 h-4 bg-gray-200 rounded-md mb-2"></div>
              <div className="w-16 h-8 bg-gray-200 rounded-md"></div>
            </div>
          ))}
        </div>

        {/* Secondary Stats Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl h-[60px] p-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-200 rounded-lg shrink-0"></div>
              <div className="space-y-2 flex-1">
                <div className="h-2 w-full bg-gray-200 rounded-md"></div>
                <div className="h-3 w-1/2 bg-gray-200 rounded-md"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8 bg-card rounded-2xl border border-border h-[350px]"></div>
          <div className="col-span-12 lg:col-span-4 bg-card rounded-2xl border border-border h-[350px]"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-card rounded-2xl border border-red-200 p-8 text-center max-w-md">
          <AlertCircle size={40} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-text-primary mb-2">Connection Error</h2>
          <p className="text-sm text-text-secondary mb-4">
            Could not load dashboard data. Make sure your MongoDB is connected.
          </p>
          <p className="text-xs text-text-muted bg-red-50 p-3 rounded-lg font-mono">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-brand-dark transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ===== Welcome Header ===== */}
      <div className="animate-fade-in-up">
        <div className="bg-card rounded-2xl border border-border p-6 relative overflow-hidden">
          {/* Decorative gradient blob */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-brand/5 via-orange-500/3 to-transparent rounded-full -translate-y-32 translate-x-20 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-blue-500/5 to-transparent rounded-full translate-y-16 -translate-x-8 pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative">
            <div>
              <h2 className="text-2xl font-bold text-text-primary mb-1">
                {getGreeting()}, Admin 👋
              </h2>
              <p className="text-sm text-text-secondary">
                {getFormattedDate()} • Here's your fleet overview
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/bookings/new"
                className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm hover:shadow transition-all cursor-pointer"
              >
                <Plus size={18} />
                <span>New Contract</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Primary Stats ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stagger-1">
          <StatCard icon={DollarSign} label="Revenue (This Month)" value={stats.totalRevenue} change={stats.changes?.revenue} subtitle="vs last month" accentColor="#22C55E" sparkData={sparklineData.revenue} />
        </div>
        <div className="stagger-2">
          <StatCard icon={CalendarCheck} label="Active Contracts" value={stats.activeRentals} change={stats.changes?.rentals} subtitle="vs last month" accentColor="#3B82F6" sparkData={sparklineData.rentals} />
        </div>
        <div className="stagger-3">
          <StatCard icon={Users} label="Total Customers" value={stats.totalCustomers} change={stats.changes?.customers} subtitle="vs last month" accentColor="#8B5CF6" sparkData={sparklineData.customers} />
        </div>
        <div className="stagger-4">
          <StatCard icon={ExecutiveCarIcon} label="Total Fleet" value={stats.totalVehicles} change={stats.changes?.vehicles} subtitle="vs last month" accentColor="#F59E0B" sparkData={sparklineData.vehicles} />
        </div>
      </div>

      {/* ===== Secondary Stats ===== */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 animate-fade-in-up stagger-5">
        {secondaryStats.map((stat) => {
          const IconComp = stat.icon;
          return (
            <div key={stat.label} className="bg-card border border-border rounded-xl p-3.5 card-hover group">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${stat.color}12` }}
                >
                  <IconComp size={15} style={{ color: stat.color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-text-muted leading-tight truncate">{stat.label}</p>
                  <p className="text-base font-bold" style={{ color: stat.color }}>{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ===== Charts Row 1 ===== */}
      <div className="grid grid-cols-12 gap-6">
        {/* Rentals Per Month Chart */}
        <div className="col-span-12 lg:col-span-8 bg-card rounded-2xl border border-border p-6 card-hover animate-fade-in-up stagger-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-text-primary">Rentals per Month</h2>
              <p className="text-xs text-text-muted mt-0.5">Monthly rental volume overview</p>
            </div>
            <select 
              value={rentalsYear}
              onChange={handleYearChange}
              className="text-sm border border-border rounded-lg px-3 py-1.5 text-text-secondary bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all cursor-pointer"
            >
              <option value={currentYear}>{currentYear}</option>
              <option value={currentYear - 1}>{currentYear - 1}</option>
              <option value={currentYear - 2}>{currentYear - 2}</option>
            </select>
          </div>
          <div className={`transition-opacity duration-200 ${isChartUpdating ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            {rentalsPerMonthData.length > 0 ? (
              <BarChartComponent
                data={rentalsPerMonthData}
                bars={[{ dataKey: "rentals", color: "#1E293B", gradientTo: "#475569", name: "Rentals" }]}
                height={250}
              />
            ) : (
              <div className="flex items-center justify-center h-[250px] text-text-muted text-sm">No rental data yet</div>
            )}
          </div>
        </div>

        {/* Vehicle Availability */}
        <div className="col-span-12 lg:col-span-4 bg-card rounded-2xl border border-border p-6 card-hover animate-fade-in-up stagger-7">
          <h2 className="text-base font-bold text-text-primary mb-1">Vehicle Availability</h2>
          <p className="text-xs text-text-muted mb-4">Fleet distribution status</p>
          <div className="flex justify-center mb-6">
            <DonutChart
              data={vehicleAvailabilityData}
              centerLabel="Total"
              centerValue={stats.totalVehicles}
              size={220}
              innerRadius={70}
              outerRadius={95}
            />
          </div>
          <div className="space-y-3">
            {vehicleAvailabilityData.map((item: any) => (
              <div key={item.name} className="flex items-center justify-between text-sm group/item hover:bg-gray-50 rounded-lg px-2 py-1.5 -mx-2 transition-colors">
                <div className="flex items-center gap-2.5 text-text-secondary">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </div>
                <span className="font-semibold text-text-primary">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== Charts Row 2 ===== */}
      <div className="grid grid-cols-12 gap-6">
        {/* Revenue Chart */}
        <div className="col-span-12 lg:col-span-8 bg-card rounded-2xl border border-border p-6 card-hover animate-fade-in-up">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-text-primary">Revenue History</h2>
              <p className="text-xs text-text-muted mt-0.5">Monthly revenue trend</p>
            </div>
            <select className="text-sm border border-border rounded-lg px-3 py-1.5 text-text-secondary bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all cursor-pointer">
              <option>This Year</option>
              <option>Last Year</option>
            </select>
          </div>
          {revenueChartData.length > 0 ? (
            <LineChartComponent
              data={revenueChartData}
              lines={[{ dataKey: "revenue", color: "#22C55E", name: "Revenue ($)" }]}
              height={250}
              useArea
            />
          ) : (
            <div className="flex items-center justify-center h-[250px] text-text-muted text-sm">No revenue data yet</div>
          )}
        </div>

        {/* Most Rented Cars */}
        <div className="col-span-12 lg:col-span-4 bg-card rounded-2xl border border-border p-6 card-hover animate-fade-in-up">
          <div className="mb-6">
            <h2 className="text-base font-bold text-text-primary">Most Rented</h2>
          </div>
          {mostRentedCarsData.length > 0 ? (
            <div className="space-y-5">
              {mostRentedCarsData.map((car: any, i: number) => {
                const pct = mostRentedCarsData[0]?.value ? Math.round((car.value / mostRentedCarsData[0].value) * 100) : 0;
                return (
                  <div key={car.name} className="group/car">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                        style={{
                          background: i < 3 ? `${rankColors[i]}18` : "#F3F4F6",
                          color: i < 3 ? rankColors[i] : "#9CA3AF",
                        }}
                      >
                        {i + 1}
                      </div>
                      <span className="font-medium text-sm text-text-primary truncate flex-1">{car.name}</span>
                      <span className="text-xs text-text-muted font-medium whitespace-nowrap">{car.value} trips</span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-1.5 ml-8 relative overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${pct}%`,
                          background: progressGradients[i] || progressGradients[3],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-text-muted text-center py-8">No rental data yet</p>
          )}
        </div>
      </div>

      <CreateContractModal 
        isOpen={isContractModalOpen} 
        onClose={() => setIsContractModalOpen(false)} 
        onSuccess={() => {
          setIsContractModalOpen(false);
          window.location.reload();
        }}
      />

      <CreateUnitModal
        isOpen={isUnitModalOpen}
        onClose={() => setIsUnitModalOpen(false)}
        onSuccess={() => {
          setIsUnitModalOpen(false);
          window.location.reload();
        }}
      />
    </div>
  );
}
