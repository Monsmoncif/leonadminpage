"use client";

import React from "react";

interface GmailIconProps {
  size?: number;
  className?: string;
}

export function GmailIcon({ size = 15, className = "" }: GmailIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        fill="#4285F4"
        d="M2.5 6.45v11.05A1.5 1.5 0 0 0 4 19h2.25V9.85L2.5 6.45Z"
      />
      <path
        fill="#34A853"
        d="M17.75 9.85V19H20a1.5 1.5 0 0 0 1.5-1.5V6.45l-3.75 3.4Z"
      />
      <path
        fill="#FBBC05"
        d="M17.75 5.15V9.85L21.5 6.45V5.7a2.2 2.2 0 0 0-3.75-1.55Z"
      />
      <path
        fill="#EA4335"
        d="M6.25 9.85V5.15L12 9.45l5.75-4.3v4.7L12 14.15 6.25 9.85Z"
      />
      <path
        fill="#C5221F"
        d="M2.5 5.7v.75l3.75 3.4V5.15A2.2 2.2 0 0 0 2.5 5.7Z"
      />
    </svg>
  );
}
