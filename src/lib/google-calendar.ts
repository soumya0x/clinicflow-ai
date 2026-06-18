import { google } from "googleapis";
import type { Clinic } from "@/types/database";

const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

function oauthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

/** Build the consent URL. `state` carries the clinic id through the flow. */
export function getGoogleAuthUrl(state: string): string {
  return oauthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // force refresh_token issuance
    scope: SCOPES,
    state,
  });
}

/** Exchange an auth code for tokens (we persist the refresh token). */
export async function exchangeGoogleCode(code: string) {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  return tokens; // { refresh_token, access_token, ... }
}

function calendarFor(refreshToken: string) {
  const client = oauthClient();
  client.setCredentials({ refresh_token: refreshToken });
  return google.calendar({ version: "v3", auth: client });
}

export interface CalendarEventInput {
  patientName: string;
  phone: string;
  appointmentType: string;
  notes?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  durationMinutes?: number;
  timezone: string;
}

function toRFC3339(date: string, time: string): string {
  return `${date}T${time.length === 5 ? `${time}:00` : time}`;
}

function buildEventBody(input: CalendarEventInput) {
  const start = toRFC3339(input.date, input.time);
  const [h, m] = input.time.split(":").map(Number);
  const endMins = h * 60 + m + (input.durationMinutes ?? 30);
  const endTime = `${String(Math.floor(endMins / 60)).padStart(2, "0")}:${String(endMins % 60).padStart(2, "0")}`;
  return {
    summary: `${input.appointmentType} — ${input.patientName}`,
    description: [
      `Patient: ${input.patientName}`,
      `Phone: ${input.phone}`,
      `Type: ${input.appointmentType}`,
      input.notes ? `Notes: ${input.notes}` : null,
      "",
      "Booked by ClinicFlow AI.",
    ]
      .filter(Boolean)
      .join("\n"),
    start: { dateTime: start, timeZone: input.timezone },
    end: { dateTime: toRFC3339(input.date, endTime), timeZone: input.timezone },
  };
}

/** Returns the created event id, or null if calendar isn't connected. */
export async function createCalendarEvent(
  clinic: Pick<Clinic, "google_refresh_token" | "google_calendar_id" | "google_connected">,
  input: CalendarEventInput
): Promise<string | null> {
  if (!clinic.google_connected || !clinic.google_refresh_token) return null;
  const calendar = calendarFor(clinic.google_refresh_token);
  const res = await calendar.events.insert({
    calendarId: clinic.google_calendar_id ?? "primary",
    requestBody: buildEventBody(input),
  });
  return res.data.id ?? null;
}

export async function updateCalendarEvent(
  clinic: Pick<Clinic, "google_refresh_token" | "google_calendar_id" | "google_connected">,
  eventId: string,
  input: CalendarEventInput
): Promise<void> {
  if (!clinic.google_connected || !clinic.google_refresh_token) return;
  const calendar = calendarFor(clinic.google_refresh_token);
  await calendar.events.update({
    calendarId: clinic.google_calendar_id ?? "primary",
    eventId,
    requestBody: buildEventBody(input),
  });
}

export async function deleteCalendarEvent(
  clinic: Pick<Clinic, "google_refresh_token" | "google_calendar_id" | "google_connected">,
  eventId: string
): Promise<void> {
  if (!clinic.google_connected || !clinic.google_refresh_token) return;
  const calendar = calendarFor(clinic.google_refresh_token);
  try {
    await calendar.events.delete({
      calendarId: clinic.google_calendar_id ?? "primary",
      eventId,
    });
  } catch (err) {
    console.error("[google] delete event failed", err);
  }
}
