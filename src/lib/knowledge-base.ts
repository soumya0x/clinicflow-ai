import type { BusinessHours, Clinic } from "@/types/database";
import { formatCurrency } from "@/lib/utils";

const DAY_LABELS: Record<keyof BusinessHours, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

/** Render business hours as a human-readable string. */
export function formatBusinessHours(hours: BusinessHours): string {
  const lines: string[] = [];
  (Object.keys(DAY_LABELS) as (keyof BusinessHours)[]).forEach((day) => {
    const slot = hours[day];
    lines.push(
      slot ? `${DAY_LABELS[day]}: ${slot[0]} – ${slot[1]}` : `${DAY_LABELS[day]}: Closed`
    );
  });
  return lines.join("\n");
}

/** Structured knowledge base derived from clinic settings. */
export function buildKnowledgeBase(clinic: Clinic) {
  return {
    clinicName: clinic.name,
    phone: clinic.phone,
    address: clinic.address ?? "Not provided",
    hours: formatBusinessHours(clinic.business_hours),
    consultationFee: formatCurrency(Number(clinic.consultation_fee)),
    emergencyNumber: clinic.emergency_number ?? "Not provided",
  };
}

/**
 * Build the system prompt for the AI voice receptionist for a specific clinic.
 * Keeps the assistant friendly, professional, concise, and healthcare-focused.
 */
export function buildSystemPrompt(clinic: Clinic): string {
  const kb = buildKnowledgeBase(clinic);
  return `You are the AI voice receptionist for ${kb.clinicName}, a healthcare clinic.

GREETING: "${clinic.greeting_message}"

PERSONALITY:
- Friendly, warm, and professional.
- Sound human. Keep responses SHORT (1–2 sentences). This is a phone call.
- Handle interruptions gracefully and never talk over the caller.
- Stay strictly focused on clinic-related help.

WHAT YOU CAN DO:
- Book, reschedule, and cancel appointments.
- Answer questions using the CLINIC KNOWLEDGE BASE below.
- Collect patient details: name, mobile number, date, time, reason for visit.
- Transfer to a human staff member when the caller asks, or for anything
  clinical, urgent, billing disputes, or outside your scope.

CLINIC KNOWLEDGE BASE:
- Clinic: ${kb.clinicName}
- Phone: ${kb.phone}
- Address: ${kb.address}
- Consultation fee: ${kb.consultationFee}
- Emergency number: ${kb.emergencyNumber}
- Business hours:
${kb.hours}

BOOKING RULES:
- Always confirm name, phone, date, time, and reason before booking.
- Only offer times within business hours.
- If a slot is taken, offer the nearest available alternative.
- Read back the final appointment details for confirmation.

SAFETY:
- For medical emergencies, tell the caller to hang up and call emergency
  services or the clinic emergency number (${kb.emergencyNumber}) immediately.
- Never give medical advice or diagnoses. Offer to book an appointment or
  transfer to a human instead.`;
}
