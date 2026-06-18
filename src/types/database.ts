// ============================================================================
// Supabase database types — hand-maintained to match supabase/migrations.
// In a live project, regenerate with:  npm run db:types
//
// NOTE: Entity shapes are declared as `type` aliases (not `interface`) on
// purpose: Supabase's GenericTable requires `Row extends Record<string,
// unknown>`, and TypeScript only treats object `type` aliases (not
// `interface`s) as assignable to an index signature. Using `interface` here
// makes the client type every row as `never`.
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

export type BusinessHours = {
  mon: [string, string] | null;
  tue: [string, string] | null;
  wed: [string, string] | null;
  thu: [string, string] | null;
  fri: [string, string] | null;
  sat: [string, string] | null;
  sun: [string, string] | null;
};

export type Clinic = {
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
};

export type AppUser = {
  id: string;
  clinic_id: string;
  role: UserRole;
  full_name: string | null;
  email: string | null;
  created_at: string;
};

export type Patient = {
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
};

export type Appointment = {
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
};

export type Call = {
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
};

export type MissedCall = {
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
};

export type CallbackLog = {
  id: string;
  missed_call_id: string;
  callback_time: string;
  duration: number;
  result: CallbackResult | null;
  transcript: string | null;
  created_at: string;
};

export type Notification = {
  id: string;
  clinic_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  related_id: string | null;
  read: boolean;
  created_at: string;
};

// ── Supabase generic Database shape ──────────────────────────
// Row is the exact shape; Insert/Update are permissive (the database enforces
// NOT NULL + defaults at runtime). This keeps hand-written types ergonomic and
// avoids fighting Supabase's generic table constraints.
type Row<T> = T;
type Insert<T> = Partial<T>;
type Update<T> = Partial<T>;

export type Database = {
  public: {
    Tables: {
      clinics: {
        Row: Row<Clinic>;
        Insert: Insert<Clinic>;
        Update: Update<Clinic>;
        Relationships: [];
      };
      users: {
        Row: Row<AppUser>;
        Insert: Insert<AppUser>;
        Update: Update<AppUser>;
        Relationships: [];
      };
      patients: {
        Row: Row<Patient>;
        Insert: Insert<Patient>;
        Update: Update<Patient>;
        Relationships: [];
      };
      appointments: {
        Row: Row<Appointment>;
        Insert: Insert<Appointment>;
        Update: Update<Appointment>;
        Relationships: [];
      };
      calls: {
        Row: Row<Call>;
        Insert: Insert<Call>;
        Update: Update<Call>;
        Relationships: [];
      };
      missed_calls: {
        Row: Row<MissedCall>;
        Insert: Insert<MissedCall>;
        Update: Update<MissedCall>;
        Relationships: [];
      };
      callback_logs: {
        Row: Row<CallbackLog>;
        Insert: Insert<CallbackLog>;
        Update: Update<CallbackLog>;
        Relationships: [];
      };
      notifications: {
        Row: Row<Notification>;
        Insert: Insert<Notification>;
        Update: Update<Notification>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      auth_clinic_id: { Args: Record<string, never>; Returns: string };
      auth_is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
