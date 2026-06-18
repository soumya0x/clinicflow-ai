import type { DBClient } from "@/lib/services/patients";
import type { Clinic, MissedCall, CallbackResult } from "@/types/database";
import { placeOutboundCall } from "@/lib/vapi";
import { notify } from "@/lib/notifications";
import { appointmentValue } from "@/lib/revenue";

/** The callback script the AI uses when calling a patient back. */
export function buildCallbackScript(clinic: Clinic): string {
  return `Hi! This is ${clinic.name}'s AI assistant calling you back. We noticed we missed your call earlier. Would you like to book an appointment, or speak with someone from our team?`;
}

/**
 * Process a single callback attempt for a missed call.
 *
 * Workflow (per spec):
 *  1. Trigger callback (within the clinic's configured delay).
 *  2. Retry up to `callback_retry_count` times.
 *  3. Log every attempt in callback_logs.
 *  4. Escalate (notify staff) when all retries fail.
 *
 * Idempotency: caller should only pass missed calls whose next_attempt_at is due
 * and whose status is pending/in_progress.
 */
export async function processCallback(
  db: DBClient,
  clinic: Clinic,
  missedCall: MissedCall
): Promise<{ status: MissedCall["callback_status"]; attempt: number }> {
  const attempt = missedCall.callback_attempts + 1;
  const maxAttempts = clinic.callback_retry_count;

  // Mark in progress + increment attempt counter immediately (prevents double-processing).
  await db
    .from("missed_calls")
    .update({ callback_status: "in_progress", callback_attempts: attempt })
    .eq("id", missedCall.id);

  // Attempt the outbound call via Vapi (if telephony is configured).
  let placed = false;
  const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;
  const assistantId = process.env.VAPI_ASSISTANT_ID;
  if (process.env.VAPI_API_KEY && phoneNumberId) {
    const call = await placeOutboundCall({
      assistantId,
      phoneNumberId,
      customerNumber: missedCall.caller_phone,
      assistantOverrides: { firstMessage: buildCallbackScript(clinic) },
      metadata: { missed_call_id: missedCall.id, clinic_id: clinic.id },
    });
    placed = !!call;
  }

  // Log the attempt. If we couldn't place a call, treat as a no-answer attempt.
  await db.from("callback_logs").insert({
    missed_call_id: missedCall.id,
    callback_time: new Date().toISOString(),
    duration: 0,
    result: placed ? null : ("no_answer" as CallbackResult),
    transcript: placed
      ? "Outbound callback placed; awaiting outcome."
      : "Callback could not be placed (telephony not configured or unreachable).",
  });

  // If a call was successfully placed, the outcome is decided later by the
  // Vapi end-of-call webhook (recordCallbackOutcome). Just reschedule a safety retry.
  if (placed) {
    await scheduleNext(db, clinic, missedCall.id);
    return { status: "in_progress", attempt };
  }

  // No call placed → count toward retries; escalate when exhausted.
  if (attempt >= maxAttempts) {
    await db
      .from("missed_calls")
      .update({ callback_status: "failed", final_outcome: "no_answer", next_attempt_at: null })
      .eq("id", missedCall.id);

    await notify(db, {
      clinicId: clinic.id,
      type: "callback_failed",
      title: "Callback failed after max attempts",
      message: `We couldn't reach ${missedCall.caller_phone} after ${attempt} attempts.`,
      relatedId: missedCall.id,
    });
    return { status: "failed", attempt };
  }

  await scheduleNext(db, clinic, missedCall.id);
  return { status: "in_progress", attempt };
}

async function scheduleNext(db: DBClient, clinic: Clinic, missedCallId: string) {
  const next = new Date(Date.now() + clinic.callback_delay_seconds * 1000).toISOString();
  await db.from("missed_calls").update({ next_attempt_at: next }).eq("id", missedCallId);
}

/**
 * Record the outcome of a callback (called by the Vapi webhook for outbound
 * calls carrying metadata.missed_call_id). Marks the missed call recovered when
 * an appointment was booked, and escalates a human-callback request.
 */
export async function recordCallbackOutcome(
  db: DBClient,
  clinic: Clinic,
  missedCallId: string,
  outcome: CallbackResult,
  appointmentId?: string,
  transcript?: string,
  duration = 0
): Promise<void> {
  await db.from("callback_logs").insert({
    missed_call_id: missedCallId,
    callback_time: new Date().toISOString(),
    duration,
    result: outcome,
    transcript: transcript ?? null,
  });

  if (outcome === "appointment_booked") {
    const estimated = appointmentValue(clinic);
    await db
      .from("missed_calls")
      .update({
        callback_status: "recovered",
        final_outcome: "appointment_booked",
        appointment_id: appointmentId ?? null,
        estimated_revenue: estimated,
        revenue_source: "missed_call_recovery",
        next_attempt_at: null,
      })
      .eq("id", missedCallId);
    return;
  }

  if (outcome === "human_callback_requested") {
    await db
      .from("missed_calls")
      .update({ callback_status: "in_progress", final_outcome: "human_callback_requested" })
      .eq("id", missedCallId);

    await notify(db, {
      clinicId: clinic.id,
      type: "human_callback_requested",
      title: "Patient requested a human callback",
      message: "A recovered caller asked to speak with your team.",
      relatedId: missedCallId,
    });
    return;
  }

  // information_requested / no_answer / invalid_number — just record outcome.
  await db
    .from("missed_calls")
    .update({ final_outcome: outcome })
    .eq("id", missedCallId);
}
