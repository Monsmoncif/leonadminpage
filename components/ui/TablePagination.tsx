"use client";

import React from "react";

export interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (size: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
  className?: string;
}

export default function TablePagination({
  currentPage,
  totalPages,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange,
  onItemsPerPageChange,
  pageSizeOptions = [10, 20, 50, 100],
  itemLabel = "results",
  className = "",
}: TablePaginationProps) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div
      className={`px-3 py-2 sm:px-4 sm:py-2.5 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3 text-[11px] sm:text-xs text-text-secondary bg-white ${className}`}
    >
      {/* Left side: Showing X to Y of Z results + Rows selector */}
      <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto gap-2.5">
        <p className="truncate text-[11px] sm:text-xs">
          Showing{" "}
          <span className="font-semibold text-text-primary">{startItem}</span> to{" "}
          <span className="font-semibold text-text-primary">{endItem}</span> of{" "}
          <span className="font-semibold text-text-primary">{totalItems}</span> {itemLabel}
        </p>

        {onItemsPerPageChange && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-border/70 shrink-0">
            <span className="text-text-secondary text-[11px]">Rows:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                onItemsPerPageChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="px-1.5 py-0.5 border border-border/80 rounded-md bg-white text-text-primary text-[11px] focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer shadow-2xs font-medium"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right side: Prev [currentPage] Next */}
      <div className="flex items-center justify-center w-full sm:w-auto gap-1">
        <button
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          className="px-2.5 py-1 border border-border rounded-md bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed text-[11px] font-semibold shadow-2xs"
        >
          Prev
        </button>
        <span className="px-2.5 py-1 bg-brand text-white rounded-md font-bold text-[11px] shadow-2xs">
          {currentPage} / {Math.max(1, totalPages)}
        </span>
        <button
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages || totalPages === 0}
          className="px-2.5 py-1 border border-border rounded-md bg-white hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-[11px] font-semibold shadow-2xs"
        >
          Next
        </button>
      </div>
    </div>
  );
}
