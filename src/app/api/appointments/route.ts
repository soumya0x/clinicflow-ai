import { requireAuth } from "@/lib/auth";
import { created, fail, getPagination, ok, withErrorHandling } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  createAppointmentSchema,
  updateAppointmentSchema,
} from "@/lib/validations";
import { createClient } from "@/lib/supabase/server";
import {
  createAppointment,
  DoubleBookingError,
} from "@/lib/services/appointments";
import { deleteCalendarEvent, updateCalendarEvent } from "@/lib/google-calendar";

export const dynamic = "force-dynamic";

// GET /api/appointments?status=&date=&search=&page=&pageSize=
export const GET = withErrorHandling(async (req) => {
  const ctx = await requireAuth();
  const supabase = await createClient();
  const url = new URL(req.url);
  const { page, pageSize, from, to } = getPagination(url);

  let query = supabase
    .from("appointments")
    .select("*, patient:patients(id, name, phone)", { count: "exact" })
    .eq("clinic_id", ctx.clinic.id);

  const status = url.searchParams.get("status");
  if (status) query = query.eq("status", status);

  const date = url.searchParams.get("date");
  if (date) query = query.eq("appointment_date", date);

  const fromDate = url.searchParams.get("from");
  const toDate = url.searchParams.get("to");
  if (fromDate) query = query.gte("appointment_date", fromDate);
  if (toDate) query = query.lte("appointment_date", toDate);

  query = query
    .order("appointment_date", { ascending: false })
    .order("appointment_time", { ascending: false })
    .range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  return ok({
    items: data ?? [],
    page,
    pageSize,
    total: count ?? 0,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  });
});

// POST /api/appointments
export const POST = withErrorHandling(async (req) => {
  const limited = enforceRateLimit(req, { prefix: "appt", limit: 30 });
  if (limited) return limited;

  const ctx = await requireAuth();
  const supabase = await createClient();
  const body = await req.json();
  const input = createAppointmentSchema.parse(body);

  try {
    const appointment = await createAppointment(supabase, ctx.clinic, input);
    return created(appointment);
  } catch (err) {
    if (err instanceof DoubleBookingError) return fail(err.message, 409);
    throw err;
  }
});

// PATCH /api/appointments
export const PATCH = withErrorHandling(async (req) => {
  const ctx = await requireAuth();
  const supabase = await createClient();
  const body = await req.json();
  const { id, ...updates } = updateAppointmentSchema.parse(body);

  // Prevent moving onto a taken slot.
  if (updates.appointment_date && updates.appointment_time) {
    const { data: clash } = await supabase
      .from("appointments")
      .select("id")
      .eq("clinic_id", ctx.clinic.id)
      .eq("appointment_date", updates.appointment_date)
      .eq("appointment_time", updates.appointment_time)
      .not("status", "in", "(cancelled,no_show)")
      .neq("id", id)
      .limit(1);
    if (clash && clash.length > 0) return fail("That time slot is already booked", 409);
  }

  const { data, error } = await supabase
    .from("appointments")
    .update(updates)
    .eq("id", id)
    .eq("clinic_id", ctx.clinic.id)
    .select("*, patient:patients(name, phone)")
    .single();
  if (error) throw error;
  if (!data) return fail("Appointment not found", 404);

  // Keep Google Calendar in sync if the event exists and time/date changed.
  if (data.google_event_id && ctx.clinic.google_connected && (updates.appointment_date || updates.appointment_time)) {
    try {
      const apptWithPatient = data as typeof data & { patient?: { name?: string; phone?: string } };
      await updateCalendarEvent(ctx.clinic, data.google_event_id, {
        patientName: apptWithPatient.patient?.name ?? "Patient",
        phone: apptWithPatient.patient?.phone ?? "",
        appointmentType: data.reason ?? "Appointment",
        notes: data.notes ?? undefined,
        date: data.appointment_date,
        time: String(data.appointment_time).slice(0, 5),
        timezone: ctx.clinic.timezone,
      });
    } catch (err) {
      console.error("[appointments] calendar update failed", err);
    }
  }

  return ok(data);
});

// DELETE /api/appointments?id=
export const DELETE = withErrorHandling(async (req) => {
  const ctx = await requireAuth();
  const supabase = await createClient();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return fail("id is required", 400);

  // Remove the linked calendar event first (best-effort).
  const { data: existing } = await supabase
    .from("appointments")
    .select("google_event_id")
    .eq("id", id)
    .eq("clinic_id", ctx.clinic.id)
    .maybeSingle();
  if (existing?.google_event_id && ctx.clinic.google_connected) {
    await deleteCalendarEvent(ctx.clinic, existing.google_event_id);
  }

  const { error } = await supabase
    .from("appointments")
    .delete()
    .eq("id", id)
    .eq("clinic_id", ctx.clinic.id);
  if (error) throw error;

  return ok({ id, deleted: true });
});
