/**
 * App-route mapper — web backend/CTA links ("/worker/trust", "/contractor/jobs")
 * are remapped to this app's expo-router paths ("(worker)/trust"). Shared so
 * checklists, AI assistant CTAs and notification links all navigate correctly.
 */
export function toAppRoute(link?: string | null): string {
  if (!link) return "";
  let p = link.split("?")[0];
  if (p.startsWith("/")) p = p.slice(1);
  const segments = p.split("/").filter(Boolean);
  if (segments.length === 0) return "";
  const role = segments[0] === "worker" || segments[0] === "contractor" ? segments[0] : null;

  // Map known web-only pages to the nearest app route.
  const map: Record<string, string> = {
    dashboard: "home",
    income: "money",
    expenses: "money",
    savings: "money",
    reports: "report",
    "find-workers": "workers",
  };
  const page = segments[1] ? map[segments[1]] ?? segments[1] : "home";

  if (role === "worker") return `/(worker)/${page}`;
  if (role === "contractor") return `/(contractor)/${page}`;
  return "/" + segments.join("/");
}
