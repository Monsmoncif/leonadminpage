import React from "react";

export interface ChauffeurIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
}

/**
 * Clean, high-clarity Chauffeur / Steering Wheel icon matching Lucide aesthetic (24x24, 2px stroke).
 * Instantly recognizable as Driver / Chauffeur dispatch without blurring at small sizes.
 */
export function ChauffeurIcon({
  size = 20,
  color = "currentColor",
  className = "",
  strokeWidth = 2,
  ...props
}: ChauffeurIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Outer steering wheel rim */}
      <circle cx="12" cy="12" r="9" />
      {/* Center hub */}
      <circle cx="12" cy="12" r="3" />
      {/* Left spoke */}
      <path d="M3 12h6" />
      {/* Right spoke */}
      <path d="M15 12h6" />
      {/* Bottom vertical spoke */}
      <path d="M12 15v6" />
      {/* Top grip notches */}
      <path d="M7 6.5l1.5 1.5" />
      <path d="M17 6.5l-1.5 1.5" />
    </svg>
  );
}

export default ChauffeurIcon;
