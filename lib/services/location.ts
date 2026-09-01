"use client";

import { CITIES, getCity, type City } from "@/lib/utils/cities";
import { haversineKm } from "@/lib/utils";

/**
 * Real-location helpers.
 * The worker's persisted `users.location` (a supported city id) remains the
 * single source of truth. GPS is only used to *suggest* the nearest
 * supported city — no coordinates are stored (no schema change required).
 */

export interface GeoResult {
  /** Nearest supported city from the browser position */
  city: City;
  /** Distance in km from the reported position to that city centre */
  distanceKm: number;
  /** Raw browser coordinates (used only for the confirmation message) */
  lat: number;
  lng: number;
}

/** Request the browser position; rejects on denial/timeout/unavailable. */
export function requestGeolocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Location is not supported on this device"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, (err) => {
      reject(new Error(
        err.code === err.PERMISSION_DENIED
          ? "Location permission was denied"
          : "Could not detect your location"
      ));
    }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 });
  });
}

/** Detect location → nearest supported city. Never blocks; always resolves a city. */
export async function detectCity(fallbackCityId?: string): Promise<{ city: City; via: "gps" | "fallback"; error?: string }> {
  const fallback = fallbackCityId ? getCity(fallbackCityId) : CITIES[0];
  try {
    const pos = await requestGeolocation();
    const nearest = nearestCity(pos.coords.latitude, pos.coords.longitude);
    return { city: nearest.city, via: "gps" };
  } catch (e) {
    return {
      city: fallback,
      via: "fallback",
      error: e instanceof Error ? e.message : "Location unavailable",
    };
  }
}

export function nearestCity(lat: number, lng: number): { city: City; distanceKm: number } {
  let best = CITIES[0];
  let bestKm = Infinity;
  for (const c of CITIES) {
    const km = haversineKm(lat, lng, c.latitude, c.longitude);
    if (km < bestKm) {
      best = c;
      bestKm = km;
    }
  }
  return { city: best, distanceKm: bestKm };
}
