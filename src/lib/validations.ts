import { z } from "zod";

// ── Primitives ───────────────────────────────────────────────
// E.164-ish phone: optional +, 7-15 digits.
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{7,15}$/, "Enter a valid phone number");

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
  .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date");

export const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be HH:MM (24h)");

export const appointmentStatusSchema = z.enum([
  "scheduled",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
]);

export const bookingSourceSchema = z.enum([
  "ai_voice",
  "missed_call_recovery",
  "human_callback",
  "manual",
]);

export const callOutcomeSchema = z.enum([
  "appointment_booked",
  "information_requested",
  "human_transfer",
  "missed_call",
  "callback_completed",
]);

export const callbackResultSchema = z.enum([
  "appointment_booked",
  "human_callback_requested",
  "information_requested",
  "no_answer",
  "invalid_number",
]);

// ── Patients ─────────────────────────────────────────────────
export const createPatientSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  phone: phoneSchema,
  email: z.string().email().optional().or(z.literal("")).transform((v) => v || undefined),
  notes: z.string().max(2000).optional(),
});
export type CreatePatientInput = z.infer<typeof createPatientSchema>;

// ── Appointments ─────────────────────────────────────────────
export const createAppointmentSchema = z.object({
  patient_id: z.string().uuid().optional(),
  // When booking by voice we may only have name+phone, not a patient_id yet.
  patient_name: z.string().trim().min(1).max(120).optional(),
  patient_phone: phoneSchema.optional(),
  appointment_date: dateSchema,
  appointment_time: timeSchema,
  reason: z.string().max(500).optional(),
  status: appointmentStatusSchema.default("scheduled"),
  booking_source: bookingSourceSchema.default("manual"),
  estimated_value: z.number().nonnegative().optional(),
  notes: z.string().max(2000).optional(),
}).refine(
  (d) => d.patient_id || (d.patient_name && d.patient_phone),
  { message: "Provide patient_id, or patient_name + patient_phone", path: ["patient_id"] }
);
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const updateAppointmentSchema = z.object({
  id: z.string().uuid(),
  appointment_date: dateSchema.optional(),
  appointment_time: timeSchema.optional(),
  reason: z.string().max(500).optional(),
  status: appointmentStatusSchema.optional(),
  estimated_value: z.number().nonnegative().optional(),
  notes: z.string().max(2000).optional(),
});
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;

// ── Calls ────────────────────────────────────────────────────
export const createCallSchema = z.object({
  caller_phone: phoneSchema,
  transcript: z.string().optional(),
  duration: z.number().int().nonnegative().default(0),
  outcome: callOutcomeSchema.optional(),
  vapi_call_id: z.string().optional(),
  recording_url: z.string().url().optional(),
});
export type CreateCallInput = z.infer<typeof createCallSchema>;

// ── Missed calls ─────────────────────────────────────────────
export const createMissedCallSchema = z.object({
  caller_phone: phoneSchema,
  missed_at: z.string().datetime().optional(),
});
export type CreateMissedCallInput = z.infer<typeof createMissedCallSchema>;

export const updateMissedCallSchema = z.object({
  id: z.string().uuid(),
  callback_status: z
    .enum(["pending", "in_progress", "recovered", "failed"])
    .optional(),
  final_outcome: callbackResultSchema.optional(),
  appointment_id: z.string().uuid().optional(),
  estimated_revenue: z.number().nonnegative().optional(),
});
export type UpdateMissedCallInput = z.infer<typeof updateMissedCallSchema>;

// ── Clinic settings ──────────────────────────────────────────
const businessDay = z.tuple([timeSchema, timeSchema]).nullable();
export const updateClinicSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  phone: phoneSchema.optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().max(400).optional(),
  logo_url: z.string().url().optional().or(z.literal("")),
  greeting_message: z.string().max(500).optional(),
  emergency_number: z.string().max(40).optional(),
  timezone: z.string().max(60).optional(),
  business_hours: z
    .object({
      mon: businessDay, tue: businessDay, wed: businessDay,
      thu: businessDay, fri: businessDay, sat: businessDay, sun: businessDay,
    })
    .optional(),
  consultation_fee: z.number().nonnegative().optional(),
  average_appointment_value: z.number().nonnegative().optional(),
  average_treatment_value: z.number().nonnegative().optional(),
  revenue_calculation_method: z
    .enum(["consultation_fee", "average_appointment_value", "average_treatment_value"])
    .optional(),
  callback_delay_seconds: z.number().int().min(0).max(3600).optional(),
  callback_retry_count: z.number().int().min(0).max(10).optional(),
  after_hours_action: z.enum(["callback", "voicemail", "transfer"]).optional(),
});
export type UpdateClinicInput = z.infer<typeof updateClinicSchema>;

// ── Auth ─────────────────────────────────────────────────────
export const signUpSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(120),
  clinic_name: z.string().trim().min(1, "Clinic name is required").max(160),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email"),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
