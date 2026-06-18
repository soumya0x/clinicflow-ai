import { format, parse } from "date-fns";
import type { BusinessHours, Clinic } from "@/types/database";
import type { DBClient } from "@/lib/services/patients";
import {
  createAppointment,
  DoubleBookingError,
} from "@/lib/services/appointments";
import { buildKnowledgeBase } from "@/lib/knowledge-base";
import { createAppointmentSchema } from "@/lib/validations";
import { normalizePhone } from "@/lib/utils";

/**
 * OpenAI-style function/tool definitions. These configure the Vapi assistant
 * so the LLM emits structured tool calls that our webhook executes.
 */
export const VOICE_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "get_clinic_info",
      description:
        "Answer questions about the clinic: hours, address, consultation fee, emergency number, phone.",
      parameters: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            enum: ["hours", "address", "fee", "emergency", "phone", "general"],
            description: "Which piece of clinic information the caller asked about.",
          },
        },
        required: ["topic"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "check_availability",
      description:
        "Check available appointment time slots for a specific date (YYYY-MM-DD).",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Date in YYYY-MM-DD format." },
        },
        required: ["date"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "book_appointment",
      description:
        "Book an appointment after confirming all details with the caller.",
      parameters: {
        type: "object",
        properties: {
          patient_name: { type: "string" },
          patient_phone: { type: "string", description: "Caller mobile number." },
          date: { type: "string", description: "YYYY-MM-DD" },
          time: { type: "string", description: "HH:MM in 24-hour format" },
          reason: { type: "string", description: "Reason for visit." },
        },
        required: ["patient_name", "patient_phone", "date", "time"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "reschedule_appointment",
      description: "Reschedule the caller's upcoming appointment to a new date/time.",
      parameters: {
        type: "object",
        properties: {
          patient_phone: { type: "string" },
          new_date: { type: "string", description: "YYYY-MM-DD" },
          new_time: { type: "string", description: "HH:MM" },
        },
        required: ["patient_phone", "new_date", "new_time"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "cancel_appointment",
      description: "Cancel the caller's upcoming appointment.",
      parameters: {
        type: "object",
        properties: { patient_phone: { type: "string" } },
        required: ["patient_phone"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "transfer_to_human",
      description:
        "Transfer the call to a human staff member, or flag that one is needed.",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string", description: "Why a human is needed." },
        },
        required: ["reason"],
      },
    },
  },
] as const;

export type ToolName = (typeof VOICE_TOOLS)[number]["function"]["name"];

const DAY_KEYS: (keyof BusinessHours)[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** Generate 30-minute slots within a clinic's business hours for a date. */
function slotsForDate(hours: BusinessHours, date: string): string[] {
  const d = parse(date, "yyyy-MM-dd", new Date());
  const dayKey = DAY_KEYS[d.getDay()];
  const window = hours[dayKey];
  if (!window) return [];
  const [open, close] = window;
  const [oh, om] = open.split(":").map(Number);
  const [ch, cm] = close.split(":").map(Number);

  const slots: string[] = [];
  let mins = oh * 60 + om;
  const end = ch * 60 + cm;
  while (mins < end) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    mins += 30;
  }
  return slots;
}

export interface ToolResult {
  result: string;
  /** Hint to the webhook about how the call is trending. */
  outcomeHint?:
    | "appointment_booked"
    | "information_requested"
    | "human_transfer";
  data?: Record<string, unknown>;
}

/**
 * Execute a voice tool against the database for a specific clinic.
 * Returns a concise, speakable `result` string for the assistant.
 */
export async function executeVoiceTool(
  db: DBClient,
  clinic: Clinic,
  name: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  switch (name as ToolName) {
    case "get_clinic_info": {
      const kb = buildKnowledgeBase(clinic);
      const topic = String(args.topic ?? "general");
      const map: Record<string, string> = {
        hours: `Our hours are:\n${kb.hours}`,
        address: `We're located at ${kb.address}.`,
        fee: `The consultation fee is ${kb.consultationFee}.`,
        emergency: `For emergencies, call ${kb.emergencyNumber}.`,
        phone: `You can reach us at ${kb.phone}.`,
        general: `${kb.clinicName}. Hours:\n${kb.hours}\nConsultation fee: ${kb.consultationFee}.`,
      };
      return { result: map[topic] ?? map.general, outcomeHint: "information_requested" };
    }

    case "check_availability": {
      const date = String(args.date);
      const all = slotsForDate(clinic.business_hours, date);
      if (all.length === 0) {
        return { result: `We're closed on ${date}. Could you pick another day?` };
      }
      const { data: booked } = await db
        .from("appointments")
        .select("appointment_time")
        .eq("clinic_id", clinic.id)
        .eq("appointment_date", date)
        .not("status", "in", "(cancelled,no_show)");
      const taken = new Set((booked ?? []).map((b) => String(b.appointment_time).slice(0, 5)));
      const free = all.filter((s) => !taken.has(s));
      if (free.length === 0) {
        return { result: `Sorry, ${date} is fully booked. Want me to check another day?` };
      }
      return {
        result: `Available times on ${date}: ${free.slice(0, 8).join(", ")}.`,
        data: { date, slots: free },
      };
    }

    case "book_appointment": {
      const parsed = createAppointmentSchema.safeParse({
        patient_name: args.patient_name,
        patient_phone: args.patient_phone ? normalizePhone(String(args.patient_phone)) : undefined,
        appointment_date: args.date,
        appointment_time: String(args.time).slice(0, 5),
        reason: args.reason,
        booking_source: "ai_voice",
        status: "scheduled",
      });
      if (!parsed.success) {
        return { result: `I couldn't book that: ${parsed.error.errors[0]?.message}. Could you repeat the details?` };
      }
      try {
        const appt = await createAppointment(db, clinic, parsed.data);
        return {
          result: `Booked! ${parsed.data.patient_name} on ${appt.appointment_date} at ${String(appt.appointment_time).slice(0, 5)}. We'll see you then.`,
          outcomeHint: "appointment_booked",
          data: { appointment_id: appt.id },
        };
      } catch (err) {
        if (err instanceof DoubleBookingError) {
          return { result: "That slot was just taken. Would you like a different time?" };
        }
        throw err;
      }
    }

    case "reschedule_appointment": {
      const phone = normalizePhone(String(args.patient_phone));
      const newDate = String(args.new_date);
      const newTime = String(args.new_time).slice(0, 5);
      const { data: patient } = await db
        .from("patients")
        .select("id")
        .eq("clinic_id", clinic.id)
        .eq("phone", phone)
        .maybeSingle();
      if (!patient) return { result: "I couldn't find an appointment under that number." };

      const { data: appt } = await db
        .from("appointments")
        .select("id")
        .eq("clinic_id", clinic.id)
        .eq("patient_id", patient.id)
        .in("status", ["scheduled", "confirmed"])
        .order("appointment_date", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!appt) return { result: "I couldn't find an upcoming appointment to reschedule." };

      const { error } = await db
        .from("appointments")
        .update({ appointment_date: newDate, appointment_time: newTime })
        .eq("id", appt.id);
      if (error) {
        if ((error as { code?: string }).code === "23505") {
          return { result: "That new time is already booked. Want another slot?" };
        }
        throw error;
      }
      return { result: `Done — your appointment is now ${newDate} at ${newTime}.`, outcomeHint: "appointment_booked" };
    }

    case "cancel_appointment": {
      const phone = normalizePhone(String(args.patient_phone));
      const { data: patient } = await db
        .from("patients")
        .select("id")
        .eq("clinic_id", clinic.id)
        .eq("phone", phone)
        .maybeSingle();
      if (!patient) return { result: "I couldn't find an appointment under that number." };

      const { data: appt } = await db
        .from("appointments")
        .select("id")
        .eq("clinic_id", clinic.id)
        .eq("patient_id", patient.id)
        .in("status", ["scheduled", "confirmed"])
        .order("appointment_date", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!appt) return { result: "There's no upcoming appointment to cancel." };

      await db.from("appointments").update({ status: "cancelled" }).eq("id", appt.id);
      return { result: "Your appointment has been cancelled. Anything else?" };
    }

    case "transfer_to_human": {
      await db.from("notifications").insert({
        clinic_id: clinic.id,
        type: "human_callback_requested",
        title: "Human assistance requested",
        message: `Caller asked for a human: ${String(args.reason ?? "")}`.slice(0, 400),
      });
      return {
        result: "Sure, let me connect you with a member of our team. One moment.",
        outcomeHint: "human_transfer",
      };
    }

    default:
      return { result: "Sorry, I can't do that. Would you like me to book an appointment or connect you to our team?" };
  }
}

/** Map today's date for prompt grounding. */
export function todayContext(timezone: string): string {
  return `Today is ${format(new Date(), "EEEE, yyyy-MM-dd")} (${timezone}).`;
}
