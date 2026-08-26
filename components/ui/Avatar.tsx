"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";

interface AvatarProps {
  src?: string;
  name?: string;
  size?: number;
  className?: string;
}

export function Avatar({ src, name = "?", size = 40, className }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        className={cn("rounded-full object-cover bg-gray-100", className)}
        unoptimized
      />
    );
  }
  return (
    <div
      className={cn(
        "rounded-full bg-orange-100 text-orange-600 font-semibold flex items-center justify-center",
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </div>
  );
}
