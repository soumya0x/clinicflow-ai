import type { DBClient } from "@/lib/services/patients";
import type { NotificationType } from "@/types/database";

/**
 * Create an in-app notification and (optionally) send an email via Resend.
 * Email is best-effort: failures are logged, never thrown.
 */
export async function notify(
  db: DBClient,
  params: {
    clinicId: string;
    type: NotificationType;
    title: string;
    message?: string;
    relatedId?: string;
    email?: { to: string; subject: string; html: string } | null;
  }
): Promise<void> {
  await db.from("notifications").insert({
    clinic_id: params.clinicId,
    type: params.type,
    title: params.title,
    message: params.message ?? null,
    related_id: params.relatedId ?? null,
  });

  if (params.email && process.env.RESEND_API_KEY) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.NOTIFICATIONS_FROM_EMAIL ?? "alerts@clinicflow.ai",
          to: params.email.to,
          subject: params.email.subject,
          html: params.email.html,
        }),
      });
    } catch (err) {
      console.error("[notify] email failed", err);
    }
  }
}
