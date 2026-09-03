/**
 * App configuration — API base URL.
 * Local dev: your machine's LAN IP so a phone/emulator can reach the Next.js dev server.
 * Production: the deployed ShramSetu web URL (same backend the web app uses).
 */
import Constants from "expo-constants";

const DEBUG_LAN = "192.168.1.5"; // ← change to your machine's LAN IP for device testing

export const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE ??
  (process.env.NODE_ENV === "production"
    ? "https://shramsetu.vercel.app" // ← set after deploying the web app
    : `http://${DEBUG_LAN}:3000`);

export const STORAGE_COOKIE = "shramsetu.cookies";
export const STORE_PERSIST_KEY = "shramsetu-mobile-v1";

export { Constants };
