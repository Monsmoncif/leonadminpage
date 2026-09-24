import { ChevronDown } from "lucide-react";

type Variant =
  | "completed"
  | "pending"
  | "ongoing"
  | "cancelled"
  | "returned"
  | "paid"
  | "overdue"
  | "available"
  | "maintenance"
  | "unavailable"
  | "on-duty"
  | "sick-leave"
  | "half-day"
  | "on-trip"
  | "active"
  | "draft";

const variantConfig: Record<Variant, { bg: string, text: string, dot: string }> = {
  completed: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  returned: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  paid: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  available: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  "on-duty": { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  
  "on-trip": { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  active: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  ongoing: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  
  pending: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  "half-day": { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  
  overdue: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
  cancelled: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
  "sick-leave": { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
  
  maintenance: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
  
  unavailable: { bg: "bg-slate-50", text: "text-slate-700", dot: "bg-slate-400" },
  draft: { bg: "bg-slate-50", text: "text-slate-700", dot: "bg-slate-400" },
};

interface StatusBadgeProps {
  variant: Variant;
  text?: string;
  showIcon?: boolean;
  showDropdownArrow?: boolean;
}

export default function StatusBadge({
  variant,
  text,
  showIcon = true,
  showDropdownArrow = false,
}: StatusBadgeProps) {
  const label = text || variant.charAt(0).toUpperCase() + variant.slice(1).replace("-", " ");
  
  const config = variantConfig[variant] || { 
    bg: "bg-gray-50", 
    text: "text-gray-700", 
    dot: "bg-gray-400" 
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium capitalize ${config.bg} ${config.text} ${showDropdownArrow ? 'pr-1.5' : ''}`}
    >
      {showIcon && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />}
      <span className="truncate">{label}</span>
      {showDropdownArrow && <ChevronDown size={14} className="opacity-70 -ml-0.5" />}
    </span>
  );
}
