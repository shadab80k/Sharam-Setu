"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    let finishTimeout: NodeJS.Timeout | undefined;

    const startProgress = () => {
      setVisible(true);
      setProgress(20);

      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev < 70) return prev + 12;
          if (prev < 90) return prev + 4;
          return prev;
        });
      }, 120);
    };

    const handleLinkClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (
        href &&
        href.startsWith("/") &&
        !href.startsWith("//") &&
        !target.getAttribute("target") &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey &&
        href !== window.location.pathname
      ) {
        startProgress();
      }
    };

    document.addEventListener("click", handleLinkClick, { capture: true });

    return () => {
      if (interval) clearInterval(interval);
      if (finishTimeout) clearTimeout(finishTimeout);
      document.removeEventListener("click", handleLinkClick, { capture: true });
    };
  }, []);

  useEffect(() => {
    if (visible) {
      setProgress(100);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(() => setProgress(0), 200);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams]);

  if (!visible && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none transition-opacity duration-200"
      style={{ opacity: visible ? 1 : 0 }}
      aria-hidden="true"
    >
      <div
        className="h-[2.5px] bg-orange-600 relative transition-all duration-200 ease-out shadow-[0_0_8px_#F4511E,0_0_4px_#F4511E]"
        style={{ width: `${progress}%` }}
      >
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-white/50 blur-xs shadow-[0_0_6px_#fff]" />
      </div>
    </div>
  );
}
