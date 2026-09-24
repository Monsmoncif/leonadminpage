"use client";

import { useState } from "react";
import { Search, Plus, MapPin, Calendar, Clock, Navigation } from "lucide-react";
import { ExecutiveCarIcon } from "@/components/icons/ExecutiveCarIcon";
import StatusBadge from "@/components/ui/StatusBadge";
import { trackingDrivers, trackingRentInfo } from "@/data/mock";

export default function TrackingPage() {
  const [selectedId, setSelectedId] = useState(3);

  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-130px)]">
      {/* Driver List */}
      <div className="col-span-12 lg:col-span-3 space-y-4">
        <div className="bg-card rounded-2xl border border-border p-4 h-full flex flex-col">
          <div className="relative mb-4">
            <input type="text" placeholder="Search client or car..." className="w-full text-sm border border-border rounded-lg pl-9 pr-4 py-2 bg-white text-text-secondary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/20" />
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin">
            {trackingDrivers.map((driver) => (
              <button
                key={driver.id}
                onClick={() => setSelectedId(driver.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                  selectedId === driver.id
                    ? "bg-info/5 border border-info/20"
                    : "hover:bg-gray-50 border border-transparent"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-xs font-bold text-text-secondary flex-shrink-0">
                  {driver.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{driver.name}</p>
                  <p className="text-xs text-text-muted truncate">🚗 {driver.car}</p>
                </div>
                <StatusBadge variant={driver.status} />
              </button>
            ))}
          </div>

          <button className="mt-4 w-full bg-brand hover:bg-brand-dark text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors">
            <Plus size={16} /> Add Car
          </button>
        </div>
      </div>

      {/* Map Area */}
      <div className="col-span-12 lg:col-span-6">
        <div className="bg-card rounded-2xl border border-border h-full overflow-hidden relative">
          {/* Simulated Map */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-green-50 to-yellow-50">
            {/* Grid lines to simulate map */}
            <div className="absolute inset-0" style={{
              backgroundImage: `
                linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px'
            }} />
            
            {/* Roads */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 600" fill="none">
              <path d="M100 300 Q200 200 400 250 Q500 280 600 200 Q700 150 750 300" stroke="#94A3B8" strokeWidth="3" strokeDasharray="8 4" fill="none" />
              <path d="M200 100 Q300 250 350 400 Q380 500 300 550" stroke="#CBD5E1" strokeWidth="2" fill="none" />
              <path d="M500 50 Q480 200 520 350 Q550 450 600 500" stroke="#CBD5E1" strokeWidth="2" fill="none" />
              
              {/* Route line */}
              <path d="M200 350 Q280 300 380 280 Q480 260 550 220" stroke="#E53935" strokeWidth="3" fill="none" />
              
              {/* Location markers */}
              <circle cx="200" cy="350" r="8" fill="#E53935" stroke="white" strokeWidth="3" />
              <circle cx="550" cy="220" r="8" fill="#1E293B" stroke="white" strokeWidth="3" />
              
              {/* Car icon area */}
              <circle cx="380" cy="280" r="12" fill="#E53935" stroke="white" strokeWidth="3" />
              <text x="380" y="284" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">🚗</text>
            </svg>

            {/* Map labels */}
            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-border">
              <p className="text-xs font-medium text-text-primary flex items-center gap-1">
                <Navigation size={12} className="text-brand" /> Live Tracking
              </p>
            </div>

            {/* Driver position tooltip */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 bg-dark-badge text-white rounded-xl px-4 py-2 shadow-lg">
              <p className="text-xs font-medium">{trackingRentInfo.driver}</p>
              <p className="text-[10px] opacity-70">{trackingRentInfo.car} · In Transit</p>
            </div>

            {/* Distance label */}
            <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur-sm rounded-xl px-4 py-3 shadow-sm border border-border">
              <p className="text-[10px] text-text-muted">Distance Traveled</p>
              <p className="text-lg font-bold text-text-primary">{trackingRentInfo.totalDistance}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rent Info */}
      <div className="col-span-12 lg:col-span-3">
        <div className="bg-card rounded-2xl border border-border p-5 h-full">
          <h3 className="text-base font-bold text-text-primary mb-4">Rent Info</h3>

          {/* Driver */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-sm font-bold text-text-secondary">
              DW
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">Driver</p>
              <p className="text-sm text-text-primary font-bold">{trackingRentInfo.driver}</p>
            </div>
          </div>

          {/* Car Image */}
          <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-center text-5xl mb-4">
            🚗
          </div>

          {/* Car Info */}
          <div className="space-y-3 mb-5">
            <h4 className="text-lg font-bold text-text-primary">{trackingRentInfo.car}</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 text-text-secondary">
                <ExecutiveCarIcon size={14} className="text-text-muted" />
                <span>Car Type: <span className="font-medium text-text-primary">{trackingRentInfo.carType}</span></span>
              </div>
              <div className="flex items-center gap-2 text-text-secondary">
                <span className="text-text-muted">#</span>
                <span>Car Number: <span className="font-medium text-text-primary">{trackingRentInfo.carNumber}</span></span>
              </div>
            </div>
          </div>

          {/* Trip Details */}
          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex items-center gap-2 text-sm">
              <Calendar size={14} className="text-text-muted flex-shrink-0" />
              <span className="text-text-muted">Start Date:</span>
              <span className="font-medium text-text-primary text-xs">{trackingRentInfo.startDate}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar size={14} className="text-text-muted flex-shrink-0" />
              <span className="text-text-muted">End Date:</span>
              <span className="font-medium text-text-primary text-xs">{trackingRentInfo.endDate}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock size={14} className="text-text-muted flex-shrink-0" />
              <span className="text-text-muted">Trip Time:</span>
              <span className="font-medium text-text-primary text-xs">{trackingRentInfo.tripTime}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin size={14} className="text-text-muted flex-shrink-0" />
              <span className="text-text-muted">Total Distance:</span>
              <span className="font-medium text-text-primary text-xs">{trackingRentInfo.totalDistance}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
