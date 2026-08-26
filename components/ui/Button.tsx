"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "tertiary" | "destructive" | "ai" | "success" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const variantClass: Record<Variant, string> = {
  primary: "bg-orange-600 text-white hover:bg-orange-500 active:bg-orange-600 shadow-soft",
  secondary: "bg-white text-navy-900 border border-gray-300 hover:bg-gray-100 active:bg-white",
  tertiary: "bg-transparent text-navy-900 hover:bg-gray-100",
  destructive: "bg-red-600 text-white hover:bg-red-600/90",
  ai: "bg-purple-600 text-white hover:bg-purple-600/90",
  success: "bg-green-600 text-white hover:bg-green-600/90",
  ghost: "bg-transparent text-navy-900 hover:bg-cream-100",
};

const sizeClass: Record<Size, string> = {
  sm: "h-8 px-3 text-sm rounded-lg gap-1.5",
  md: "h-10 px-4 text-sm rounded-lg gap-2",
  lg: "h-12 px-5 text-base rounded-xl gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading,
    fullWidth,
    iconLeft,
    iconRight,
    children,
    className,
    disabled,
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium transition focus-ring disabled:opacity-50 disabled:cursor-not-allowed",
        variantClass[variant],
        sizeClass[size],
        fullWidth && "w-full",
        className
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          {iconLeft}
          {children}
          {iconRight}
        </>
      )}
    </button>
  );
});
