import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number as Indian Rupees (no decimals). */
export function formatCurrency(value: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

/** Format seconds as "m:ss". */
export function formatDuration(seconds: number): string {
  const m = Math.floor((seconds || 0) / 60);
  const s = Math.floor((seconds || 0) % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatDate(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** Normalise a phone number to a comparable form (digits + leading +). */
export function normalizePhone(phone: string): string {
  const trimmed = phone.trim().replace(/[^\d+]/g, "");
  return trimmed.startsWith("+") ? trimmed : trimmed;
}

export function titleCase(input: string): string {
  return input
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function percent(part: number, whole: number, digits = 1): number {
  if (!whole) return 0;
  return Number(((part / whole) * 100).toFixed(digits));
}
