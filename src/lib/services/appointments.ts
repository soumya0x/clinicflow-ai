import type { Appointment, BookingSource, Clinic } from "@/types/database";
import { appointmentValue } from "@/lib/revenue";
import { upsertPatientByPhone, type DBClient } from "@/lib/services/patients";
import type { CreateAppointmentInput } from "@/lib/validations";
import { createCalendarEvent } from "@/lib/google-calendar";

export class DoubleBookingError extends Error {
  constructor() {
    super("That time slot is already booked");
    this.name = "DoubleBookingError";
  }
}

/** Is a slot free for this clinic? Ignores cancelled / no-show appointments. */
export async function isSlotAvailable(
  db: DBClient,
  clinicId: string,
  date: string,
  time: string
): Promise<boolean> {
  const { data } = await db
    .from("appointments")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("appointment_date", date)
    .eq("appointment_time", time)
    .not("status", "in", "(cancelled,no_show)")
    .limit(1);
  return !data || data.length === 0;
}

/**
 * Create an appointment with validation already applied. Resolves/creates the
 * patient, prevents double-booking, and defaults estimated_value from the
 * clinic's revenue settings. Shared by the REST API and the Vapi webhook.
 */
export async function createAppointment(
  db: DBClient,
  clinic: Pick<
    Clinic,
    | "id"
    | "consultation_fee"
    | "average_appointment_value"
    | "average_treatment_value"
    | "revenue_calculation_method"
    | "timezone"
    | "google_connected"
    | "google_refresh_token"
    | "google_calendar_id"
  >,
  input: CreateAppointmentInput
): Promise<Appointment> {
  // Resolve patient
  let patientId = input.patient_id ?? null;
  if (!patientId && input.patient_name && input.patient_phone) {
    const patient = await upsertPatientByPhone(db, clinic.id, {
      name: input.patient_name,
      phone: input.patient_phone,
    });
    patientId = patient.id;
  }

  // Double-booking guard (the DB also enforces this via a unique index).
  const available = await isSlotAvailable(
    db,
    clinic.id,
    input.appointment_date,
    input.appointment_time
  );
  if (!available) throw new DoubleBookingError();

  const estimatedValue =
    input.estimated_value && input.estimated_value > 0
      ? input.estimated_value
      : appointmentValue(clinic);

  const { data, error } = await db
    .from("appointments")
    .insert({
      clinic_id: clinic.id,
      patient_id: patientId,
      appointment_date: input.appointment_date,
      appointment_time: input.appointment_time,
      reason: input.reason ?? null,
      status: input.status,
      booking_source: input.booking_source as BookingSource,
      estimated_value: estimatedValue,
      notes: input.notes ?? null,
    })
    .select("*")
    .single();

  if (error) {
    // Unique-violation from the partial index => slot taken.
    if ((error as { code?: string }).code === "23505") throw new DoubleBookingError();
    throw error;
  }

  // Touch patient's last_appointment.
  if (patientId) {
    await db
      .from("patients")
      .update({ last_appointment: new Date().toISOString() })
      .eq("id", patientId);
  }

  // Best-effort Google Calendar sync. Failures never block the booking.
  if (clinic.google_connected) {
    try {
      const eventId = await createCalendarEvent(
        {
          google_connected: clinic.google_connected,
          google_refresh_token: clinic.google_refresh_token ?? null,
          google_calendar_id: clinic.google_calendar_id ?? "primary",
        },
        {
          patientName: input.patient_name ?? "Patient",
          phone: input.patient_phone ?? "",
          appointmentType: input.reason ?? "Appointment",
          notes: input.notes ?? undefined,
          date: data.appointment_date,
          time: String(data.appointment_time).slice(0, 5),
          timezone: clinic.timezone ?? "Asia/Kolkata",
        }
      );
      if (eventId) {
        await db.from("appointments").update({ google_event_id: eventId }).eq("id", data.id);
        data.google_event_id = eventId;
      }
    } catch (err) {
      console.error("[appointments] calendar sync failed", err);
    }
  }

  return data;
}
