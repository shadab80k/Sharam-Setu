"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useEffect } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export function Modal({ open, onClose, title, children, size = "md" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  const sizes = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-2xl" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-navy-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className={cn("relative bg-white rounded-panel shadow-elevated w-full my-auto max-h-[90vh] flex flex-col animate-fade-in z-10", sizes[size])}>
        {title && (
          <div className="flex items-center justify-between p-5 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-base font-bold text-navy-900">{title}</h2>
            <button onClick={onClose} aria-label="Close dialog" className="text-gray-500 hover:text-navy-900 p-1 rounded-lg hover:bg-cream-100 transition">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
