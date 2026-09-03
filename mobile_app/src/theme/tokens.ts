/**
 * ShramSetu V3 design tokens — Light Minimal system.
 *
 * White surfaces, deep-navy text, orange reserved for primary actions only.
 * No borders anywhere: separation comes from background tint, spacing, and a
 * single soft shadow on cards. Every screen imports from here only.
 *
 * LEGACY ALIASES: old (V2) screens still reference V2 token names (navy900,
 * orange600, gray500…). They are merged in at the bottom; each phase-rewrite
 * of a screen removes its usages, and the legacy block is deleted in P5 when
 * zero references remain (grep-verified before removal).
 */

const V3 = {
  // Base surfaces
  bg: "#F6F7F9",          // app background
  surface: "#FFFFFF",     // cards, bars, sheets
  muted: "#F1F3F5",       // input fills, tonal icon squares, secondary buttons

  // Text
  text: "#0E1C2E",        // primary navy
  text2: "#55677D",       // secondary
  text3: "#93A3B3",       // captions / meta

  // Brand
  primary: "#E8551D",     // orange — primary CTA, active tab, focus ONLY
  primarySoft: "#FDEEE7", // tonal fills, selected chips
  onPrimary: "#FFFFFF",

  // Semantic (+ soft fills)
  green: "#0E8A4C",   greenSoft: "#E9F7EF",
  amber: "#B7791F",   amberSoft: "#FDF3E3",
  red:   "#D64545",   redSoft:   "#FDEBEB",
  blue:  "#2E6BCC",   blueSoft:  "#EAF1FC",
  purple:"#7A5AF0",   purpleSoft:"#F4F0FC",

  hairline: "#EBEEF2",    // list dividers only — never card borders
  white: "#FFFFFF",
  overlay: "rgba(14,28,46,0.45)",
} as const;

/** V2 names kept alive until every screen is rewritten (removed in P5). */
const LEGACY = {
  navy900: V3.text, navy800: V3.text, navy700: V3.text,
  orange600: V3.primary, orange500: V3.primary, orange100: V3.primarySoft,
  cream50: V3.bg, cream100: V3.muted,
  green600: V3.green, green100: V3.greenSoft,
  blue600: V3.blue, blue100: V3.blueSoft,
  purple600: V3.purple, purple100: V3.purpleSoft,
  red600: V3.red, red100: V3.redSoft,
  gray900: V3.text, gray700: V3.text2, gray600: V3.text2, gray500: V3.text3,
  gray300: V3.hairline, gray200: V3.muted, gray100: V3.muted, gray50: V3.bg,
  amber500: V3.amber, amber100: V3.amberSoft,
} as const;

export const C: typeof V3 & typeof LEGACY = { ...V3, ...LEGACY };

export const R = {
  sm: 10,
  md: 14,
  lg: 18,
  pill: 999,
} as const;

export const S = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

const T_v3 = {
  display: 30,   // intro titles
  title: 20,     // screen titles
  body: 15,      // default text
  caption: 12.5, // meta lines
  tiny: 11,      // labels, badges
} as const;

const T_legacy = {
  xs: T_v3.tiny, sm: T_v3.caption, base: T_v3.body,
  md: 16, lg: 18, xl: 22, xxl: 28,
} as const;

export const T: typeof T_v3 & typeof T_legacy = { ...T_v3, ...T_legacy };

/** Single card shadow — soft, consistent, never heavier. */
export const shadow = {
  shadowColor: "#0E1C2E",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.07,
  shadowRadius: 10,
  elevation: 2,
} as const;

/** Trust tier → color (same thresholds as web). */
export function trustColor(score: number): string {
  if (score >= 70) return C.green;
  if (score >= 40) return C.primary;
  return C.red;
}

/** Trust tier → label. */
export function trustLabel(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "High Trust";
  if (score >= 40) return "Building Trust";
  return "Low Trust";
}
