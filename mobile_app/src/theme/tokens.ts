/** ShramSetu mobile design tokens — mirrors the web app's Tailwind palette exactly. */

export const C = {
  navy900: "#071B33",
  navy800: "#0B2747",
  navy700: "#12385E",
  orange600: "#D84315",
  orange500: "#E64A19",
  orange100: "#FFF0E8",
  cream50: "#FCFAF6",
  cream100: "#F7F3EA",
  green600: "#137B3E",
  green100: "#E8F6ED",
  blue600: "#2367C9",
  blue100: "#EAF2FF",
  purple600: "#7047C6",
  purple100: "#F1ECFF",
  red600: "#D92D20",
  red100: "#FDECEA",
  white: "#FFFFFF",
  gray900: "#111827",
  gray700: "#374151",
  gray600: "#4B5563",
  gray500: "#6B7280",
  gray300: "#D1D5DB",
  gray200: "#E5E7EB",
  gray100: "#F3F4F6",
  gray50: "#F9FAFB",
  amber500: "#F59E0B",
  amber100: "#FEF3C7",
} as const;

/** Trust tier → color (same thresholds as web TrustRing). */
export function trustColor(score: number): string {
  if (score >= 70) return C.green600;
  if (score >= 40) return C.orange600;
  return C.red600;
}

/** Trust tier → label. */
export function trustLabel(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "High Trust";
  if (score >= 40) return "Building Trust";
  return "Low Trust";
}

export const T = {
  /** Font sizes (mobile-tuned, slightly larger than web for low-literacy users). */
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  display: 36,
} as const;

export const S = {
  /** Spacing scale (4px grid). */
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

export const R = {
  /** Border radii. */
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;
