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
      className={`p-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-secondary bg-white ${className}`}
    >
      {/* Left side: Showing X to Y of Z results + Rows selector */}
      <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto gap-3">
        <p className="truncate">
          Showing{" "}
          <span className="font-medium text-text-primary">{startItem}</span> to{" "}
          <span className="font-medium text-text-primary">{endItem}</span> of{" "}
          <span className="font-medium text-text-primary">{totalItems}</span> {itemLabel}
        </p>

        {onItemsPerPageChange && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-border shrink-0">
            <span className="text-text-secondary">Rows:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                onItemsPerPageChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="px-2 py-0.5 border border-border rounded-md bg-white text-text-primary text-xs focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer shadow-2xs"
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
      <div className="flex items-center justify-center w-full sm:w-auto gap-1.5">
        <button
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          className="px-3 py-1.5 border border-border rounded-lg bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed text-xs font-semibold"
        >
          Prev
        </button>
        <span className="px-3 py-1.5 bg-brand text-white rounded-lg font-bold text-xs shadow-2xs">
          {currentPage} / {Math.max(1, totalPages)}
        </span>
        <button
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages || totalPages === 0}
          className="px-3 py-1.5 border border-border rounded-lg bg-white hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold"
        >
          Next
        </button>
      </div>
    </div>
  );
}
