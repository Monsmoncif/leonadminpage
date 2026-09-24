import React from "react";

export interface SportsCarIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
}

export function ExecutiveCarIcon({
  size = 24,
  color = "currentColor",
  className = "",
  style,
  ...props
}: SportsCarIconProps) {
  // Cropped viewBox (69x28) aspect ratio is ~2.46. 
  // By using this tight viewBox, the car renders much larger!
  const scaledWidth = typeof size === "number" ? size * 1.7 : size;
  
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={scaledWidth}
      height={size}
      viewBox="18 6 69 28"
      className={className}
      style={style}
      {...props}
    >
      <defs>
        <mask id="porsche-turbo-mask">
          {/* Base: keep everything */}
          <rect width="100" height="40" fill="white" />
          
          {/* Windshield gap cutout */}
          <polygon points="34.3,16 41.8,8 43.3,8 35.8,16" fill="black" />
          
          {/* Front Side Window (Door glass) */}
          <polygon points="44.8,9.5 54.5,9.5 54.5,15.5 38.8,15.5" fill="black" />
          
          {/* Rear Side Window (Quarter glass) */}
          <path d="M 56.0 9.5 C 62.0 9.5, 67.3 12, 71.8 15.5 L 56.0 15.5 Z" fill="black" />
          
          {/* Taillight notch cutout */}
          <rect x="79.3" y="23" width="4" height="2.5" fill="black" />
          
          {/* Front Wheel Arch Cutout */}
          <circle cx="32" cy="28" r="6.5" fill="black" />
          
          {/* Rear Wheel Arch Cutout */}
          <circle cx="69.5" cy="28" r="6.5" fill="black" />
        </mask>
      </defs>

      <g fill={color}>
        {/* Main Body Silhouette - Compressed width (25% shorter wheelbase) */}
        <path 
          mask="url(#porsche-turbo-mask)"
          d="
            M 23.0 28 
            L 19.3 28 
            L 19.3 25 
            L 20.8 24.5 
            C 21.5 20, 23.0 17, 26.8 17 
            L 35.8 16 
            L 43.3 8 
            L 53.8 8 
            C 63.5 8, 71.0 12, 76.3 16 
            L 84.5 16 
            C 86.0 16, 86.0 18, 83.8 18 
            L 78.5 18 
            C 79.3 21, 81.5 24, 81.5 28 
            Z
          "
        />

        {/* Front Wheel (Donut shape with transparent center) */}
        <path 
          fillRule="evenodd" 
          clipRule="evenodd" 
          d="M 32 23.5 A 4.5 4.5 0 1 0 32 32.5 A 4.5 4.5 0 1 0 32 23.5 Z M 32 25.5 A 2.5 2.5 0 1 1 32 30.5 A 2.5 2.5 0 1 1 32 25.5 Z" 
        />
        
        {/* Rear Wheel (Donut shape with transparent center) */}
        <path 
          fillRule="evenodd" 
          clipRule="evenodd" 
          d="M 69.5 23.5 A 4.5 4.5 0 1 0 69.5 32.5 A 4.5 4.5 0 1 0 69.5 23.5 Z M 69.5 25.5 A 2.5 2.5 0 1 1 69.5 30.5 A 2.5 2.5 0 1 1 69.5 25.5 Z" 
        />
      </g>
    </svg>
  );
}