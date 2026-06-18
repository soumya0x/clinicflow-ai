// ============================================================================
// Supabase database types — hand-maintained to match supabase/migrations.
// In a live project, regenerate with:  npm run db:types
// ============================================================================

export type UserRole = "admin" | "receptionist";

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export type BookingSource =
  | "ai_voice"
  | "missed_call_recovery"
  | "human_callback"
  | "manual";

export type CallOutcome =
  | "appointment_booked"
  | "information_requested"
  | "human_transfer"
  | "missed_call"
  | "callback_completed";

export type CallbackStatus = "pending" | "in_progress" | "recovered" | "failed";

export type CallbackResult =
  | "appointment_booked"
  | "human_callback_requested"
  | "information_requested"
  | "no_answer"
  | "invalid_number";

export type RevenueSource =
  | "direct_call"
  | "missed_call_recovery"
  | "human_callback"
  | "manual";

export type AfterHoursBehavior = "callback" | "voicemail" | "transfer";

export type NotificationType =
  | "callback_failed"
  | "human_callback_requested"
  | "appointment_booked"
  | "missed_call";

export interface BusinessHours {
  mon: [string, string] | null;
  tue: [string, string] | null;
  wed: [string, string] | null;
  thu: [string, string] | null;
  fri: [string, string] | null;
  sat: [string, string] | null;
  sun: [string, string] | null;
}

export interface Clinic {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  logo_url: string | null;
  timezone: string;
  greeting_message: string;
  emergency_number: string | null;
  business_hours: BusinessHours;
  consultation_fee: number;
  average_appointment_value: number;
  average_treatment_value: number;
  revenue_calculation_method: string;
  callback_delay_seconds: number;
  callback_retry_count: number;
  after_hours_action: AfterHoursBehavior;
  google_refresh_token: string | null;
  google_calendar_id: string | null;
  google_connected: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppUser {
  id: string;
  clinic_id: string;
  role: UserRole;
  full_name: string | null;
  email: string | null;
  created_at: string;
}

export interface Patient {
  id: string;
  clinic_id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  last_appointment: string | null;
  total_calls: number;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  clinic_id: string;
  patient_id: string | null;
  appointment_date: string;
  appointment_time: string;
  reason: string | null;
  status: AppointmentStatus;
  booking_source: BookingSource;
  estimated_value: number;
  google_event_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Call {
  id: string;
  clinic_id: string;
  patient_id: string | null;
  caller_phone: string;
  transcript: string | null;
  duration: number;
  outcome: CallOutcome | null;
  vapi_call_id: string | null;
  recording_url: string | null;
  created_at: string;
}

export interface MissedCall {
  id: string;
  clinic_id: string;
  caller_phone: string;
  missed_at: string;
  callback_attempts: number;
  callback_status: CallbackStatus;
  final_outcome: CallbackResult | null;
  appointment_id: string | null;
  estimated_revenue: number;
  revenue_source: RevenueSource | null;
  next_attempt_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CallbackLog {
  id: string;
  missed_call_id: string;
  callback_time: string;
  duration: number;
  result: CallbackResult | null;
  transcript: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  clinic_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  related_id: string | null;
  read: boolean;
  created_at: string;
}

// ── Supabase generic Database shape ──────────────────────────
type Row<T> = T;
type Insert<T, Optional extends keyof T> = Omit<T, Optional> &
  Partial<Pick<T, Optional>>;
type Update<T> = Partial<T>;

type GeneratedCols = "id" | "created_at" | "updated_at";

export interface Database {
  public: {
    Tables: {
      clinics: {
        Row: Row<Clinic>;
        Insert: Insert<Clinic, GeneratedCols>;
        Update: Update<Clinic>;
      };
      users: {
        Row: Row<AppUser>;
        Insert: Insert<AppUser, "created_at">;
        Update: Update<AppUser>;
      };
      patients: {
        Row: Row<Patient>;
        Insert: Insert<Patient, GeneratedCols | "total_calls" | "last_appointment">;
        Update: Update<Patient>;
      };
      appointments: {
        Row: Row<Appointment>;
        Insert: Insert<Appointment, GeneratedCols | "google_event_id">;
        Update: Update<Appointment>;
      };
      calls: {
        Row: Row<Call>;
        Insert: Insert<Call, "id" | "created_at">;
        Update: Update<Call>;
      };
      missed_calls: {
        Row: Row<MissedCall>;
        Insert: Insert<MissedCall, GeneratedCols>;
        Update: Update<MissedCall>;
      };
      callback_logs: {
        Row: Row<CallbackLog>;
        Insert: Insert<CallbackLog, "id" | "created_at">;
        Update: Update<CallbackLog>;
      };
      notifications: {
        Row: Row<Notification>;
        Insert: Insert<Notification, "id" | "created_at" | "read">;
        Update: Update<Notification>;
      };
    };
    Functions: {
      auth_clinic_id: { Args: Record<string, never>; Returns: string };
      auth_is_admin: { Args: Record<string, never>; Returns: boolean };
    };
  };
}
