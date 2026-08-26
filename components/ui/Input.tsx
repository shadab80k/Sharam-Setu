"use client";

import { cn } from "@/lib/utils";
import { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helper?: string;
  error?: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, helper, error, iconLeft, iconRight, className, id, ...rest },
  ref
) {
  const inputId = id ?? `inp_${Math.random().toString(36).slice(2, 8)}`;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-navy-900">
          {label}
        </label>
      )}
      <div className="relative">
        {iconLeft && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{iconLeft}</span>}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-10 w-full rounded-lg border bg-white px-3 text-sm text-navy-900 placeholder:text-gray-500",
            "focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500",
            error ? "border-red-600" : "border-gray-300",
            iconLeft && "pl-10",
            iconRight && "pr-10",
            className
          )}
          {...rest}
        />
        {iconRight && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">{iconRight}</span>}
      </div>
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : helper ? (
        <p className="text-xs text-gray-600">{helper}</p>
      ) : null}
    </div>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helper?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, helper, error, className, id, ...rest },
  ref
) {
  const inputId = id ?? `txt_${Math.random().toString(36).slice(2, 8)}`;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-navy-900">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        className={cn(
          "min-h-[88px] w-full rounded-lg border bg-white px-3 py-2 text-sm text-navy-900 placeholder:text-gray-500",
          "focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500",
          error ? "border-red-600" : "border-gray-300",
          className
        )}
        {...rest}
      />
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : helper ? (
        <p className="text-xs text-gray-600">{helper}</p>
      ) : null}
    </div>
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helper?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, helper, error, options, className, id, ...rest },
  ref
) {
  const inputId = id ?? `sel_${Math.random().toString(36).slice(2, 8)}`;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-navy-900">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={inputId}
        className={cn(
          "h-10 w-full rounded-lg border bg-white px-3 text-sm text-navy-900",
          "focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500",
          error ? "border-red-600" : "border-gray-300",
          className
        )}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : helper ? (
        <p className="text-xs text-gray-600">{helper}</p>
      ) : null}
    </div>
  );
});

export function PasswordInput(props: InputProps) {
  const [show, setShow] = useState(false);
  return (
    <Input
      {...props}
      type={show ? "text" : "password"}
      iconRight={
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="text-gray-500 hover:text-navy-900"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      }
    />
  );
}
