/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { resolveClinicByPhone } from "@/lib/services/clinics";
import { executeVoiceTool } from "@/lib/voice/tools";
import { verifyVapiSignature } from "@/lib/vapi";
import { recordCallbackOutcome } from "@/lib/services/missed-calls";
import type { CallOutcome, Clinic } from "@/types/database";
import { normalizePhone } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Vapi end reasons that mean the caller never connected to a human/AI session.
const NO_ANSWER_REASONS = new Set([
  "customer-did-not-answer",
  "no-answer",
  "voicemail",
  "silence-timed-out",
  "customer-busy",
]);

interface VapiToolCall {
  id?: string;
  function?: { name?: string; arguments?: unknown };
}

function parseArgs(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "object") return raw as Record<string, unknown>;
  try {
    return JSON.parse(String(raw));
  } catch {
    return {};
  }
}

export async function POST(req: Request) {
  const rawBody = await req.text();

  if (!verifyVapiSignature(req, rawBody)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: { message?: Record<string, any> };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message: Record<string, any> = payload.message ?? {};
  const type = message.type as string | undefined;
  const db = createServiceClient();

  // Resolve clinic from the number that was called.
  const calledNumber =
    message.call?.phoneNumber?.number ??
    message.phoneNumber?.number ??
    message.call?.phoneNumberId ??
    null;
  const clinic = await resolveClinicByPhone(db, calledNumber);

  if (!clinic) {
    // Without a tenant we can't safely act. Tell Vapi to proceed gracefully.
    return NextResponse.json({
      results: [],
      error: "clinic_not_found",
    });
  }

  switch (type) {
    case "tool-calls":
    case "function-call":
      return handleToolCalls(db, clinic, message);

    case "status-update":
      await handleStatusUpdate(db, clinic, message);
      return NextResponse.json({ received: true });

    case "end-of-call-report":
      await handleEndOfCall(db, clinic, message);
      return NextResponse.json({ received: true });

    default:
      return NextResponse.json({ received: true });
  }
}

async function handleToolCalls(
  db: ReturnType<typeof createServiceClient>,
  clinic: Clinic,
  message: Record<string, any>
) {
  // Newer shape: message.toolCalls / message.toolCallList
  const toolCalls: VapiToolCall[] =
    message.toolCalls ?? message.toolCallList ?? [];

  if (toolCalls.length > 0) {
    const results = await Promise.all(
      toolCalls.map(async (tc) => {
        const name = tc.function?.name ?? "";
        const args = parseArgs(tc.function?.arguments);
        const { result } = await executeVoiceTool(db, clinic, name, args);
        return { toolCallId: tc.id, result };
      })
    );
    return NextResponse.json({ results });
  }

  // Legacy shape: message.functionCall { name, parameters }
  const fc = message.functionCall;
  if (fc?.name) {
    const { result } = await executeVoiceTool(
      db,
      clinic,
      fc.name,
      parseArgs(fc.parameters)
    );
    return NextResponse.json({ result });
  }

  return NextResponse.json({ results: [] });
}

async function handleStatusUpdate(
  db: ReturnType<typeof createServiceClient>,
  clinic: Clinic,
  message: Record<string, any>
) {
  const status = message.status as string | undefined;
  const endedReason = message.endedReason as string | undefined;
  const callerNumber =
    message.call?.customer?.number ?? message.customer?.number;

  if (status === "ended" && endedReason && NO_ANSWER_REASONS.has(endedReason) && callerNumber) {
    await createMissedCall(db, clinic, normalizePhone(callerNumber));
  }
}

async function handleEndOfCall(
  db: ReturnType<typeof createServiceClient>,
  clinic: Clinic,
  message: Record<string, any>
) {
  const call = message.call ?? {};
  const callerNumber =
    call.customer?.number ?? message.customer?.number ?? "unknown";
  const transcript = message.transcript ?? message.artifact?.transcript ?? null;
  const durationSeconds = Math.round(
    Number(message.durationSeconds ?? message.duration ?? 0)
  );
  const recordingUrl =
    message.recordingUrl ?? message.artifact?.recordingUrl ?? null;

  const outcome = inferOutcome(message);

  // If this was an outbound recovery callback, update the missed call.
  const missedCallId =
    call.metadata?.missed_call_id ?? message.metadata?.missed_call_id;
  if (missedCallId) {
    const callbackResult =
      outcome === "appointment_booked"
        ? "appointment_booked"
        : outcome === "human_transfer"
          ? "human_callback_requested"
          : "information_requested";
    await recordCallbackOutcome(
      db,
      clinic,
      missedCallId,
      callbackResult,
      undefined,
      transcript,
      durationSeconds
    );
  }

  await db.from("calls").insert({
    clinic_id: clinic.id,
    caller_phone: normalizePhone(callerNumber),
    transcript,
    duration: durationSeconds,
    outcome,
    vapi_call_id: call.id ?? message.callId ?? null,
    recording_url: recordingUrl,
  });

  // Notify staff when a transfer was requested or an appointment was booked.
  if (outcome === "appointment_booked") {
    await db.from("notifications").insert({
      clinic_id: clinic.id,
      type: "appointment_booked",
      title: "New appointment booked by AI",
      message: `Booked via voice call from ${callerNumber}.`,
    });
  }
}

function inferOutcome(message: Record<string, any>): CallOutcome {
  const summary = String(
    message.analysis?.summary ?? message.summary ?? ""
  ).toLowerCase();
  const transcript = String(
    message.transcript ?? message.artifact?.transcript ?? ""
  ).toLowerCase();
  const blob = `${summary} ${transcript}`;

  if (blob.includes("booked") || blob.includes("appointment is")) return "appointment_booked";
  if (blob.includes("transfer") || blob.includes("human")) return "human_transfer";
  return "information_requested";
}

async function createMissedCall(
  db: ReturnType<typeof createServiceClient>,
  clinic: Clinic,
  callerPhone: string
) {
  const nextAttempt = new Date(
    Date.now() + clinic.callback_delay_seconds * 1000
  ).toISOString();

  await db.from("missed_calls").insert({
    clinic_id: clinic.id,
    caller_phone: callerPhone,
    missed_at: new Date().toISOString(),
    callback_status: "pending",
    next_attempt_at: nextAttempt,
  });

  await db.from("notifications").insert({
    clinic_id: clinic.id,
    type: "missed_call",
    title: "Missed call detected",
    message: `Missed call from ${callerPhone}. Auto-callback scheduled.`,
  });
}
