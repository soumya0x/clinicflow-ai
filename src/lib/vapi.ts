import { createHmac, timingSafeEqual } from "crypto";
import type { Clinic } from "@/types/database";
import { buildSystemPrompt } from "@/lib/knowledge-base";
import { VOICE_TOOLS, todayContext } from "@/lib/voice/tools";
import { OPENAI_MODEL } from "@/lib/openai";

const VAPI_BASE = "https://api.vapi.ai";

/**
 * Build a Vapi assistant configuration for a clinic. Wires the per-clinic
 * system prompt, greeting, and the function tools the LLM may call. Vapi will
 * POST tool calls to our webhook (serverUrl).
 */
export function buildAssistantConfig(clinic: Clinic) {
  return {
    name: `${clinic.name} Receptionist`,
    firstMessage: clinic.greeting_message,
    model: {
      provider: "openai",
      model: OPENAI_MODEL,
      temperature: 0.5,
      messages: [
        {
          role: "system",
          content: `${buildSystemPrompt(clinic)}\n\n${todayContext(clinic.timezone)}`,
        },
      ],
      tools: VOICE_TOOLS,
    },
    voice: { provider: "vapi", voiceId: "Elliot" },
    serverUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/vapi/webhook`,
    serverUrlSecret: process.env.VAPI_WEBHOOK_SECRET,
    endCallFunctionEnabled: true,
    recordingEnabled: true,
  };
}

/**
 * Verify the inbound webhook signature. Vapi sends the shared secret in the
 * `x-vapi-secret` header; we also support an HMAC-SHA256 signature scheme.
 */
export function verifyVapiSignature(req: Request, rawBody: string): boolean {
  const secret = process.env.VAPI_WEBHOOK_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production"; // allow in dev only

  const headerSecret = req.headers.get("x-vapi-secret");
  if (headerSecret && safeEqual(headerSecret, secret)) return true;

  const signature = req.headers.get("x-vapi-signature");
  if (signature) {
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    return safeEqual(signature, expected);
  }
  return false;
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Place an outbound call via Vapi (used by missed-call recovery). */
export async function placeOutboundCall(params: {
  assistantId?: string;
  phoneNumberId: string;
  customerNumber: string;
  assistantOverrides?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}): Promise<{ id: string } | null> {
  const apiKey = process.env.VAPI_API_KEY;
  if (!apiKey) throw new Error("VAPI_API_KEY is not set");

  const res = await fetch(`${VAPI_BASE}/call`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      phoneNumberId: params.phoneNumberId,
      customer: { number: params.customerNumber },
      assistantId: params.assistantId,
      assistantOverrides: params.assistantOverrides,
      metadata: params.metadata,
    }),
  });

  if (!res.ok) {
    console.error("[Vapi] outbound call failed", res.status, await res.text());
    return null;
  }
  return res.json();
}
