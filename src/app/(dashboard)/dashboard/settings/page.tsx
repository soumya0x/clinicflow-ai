import { getAuthContext } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/page-header";
import { SettingsForm } from "@/components/dashboard/settings/settings-form";
import { GoogleCalendarCard } from "@/components/dashboard/settings/google-calendar-card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const ctx = await getAuthContext();
  const canEdit = ctx!.profile.role === "admin";

  return (
    <>
      <PageHeader title="Settings" description="Configure your clinic, branding, revenue, and recovery rules.">
        <Badge variant={canEdit ? "success" : "secondary"} className="capitalize">
          {ctx!.profile.role}
        </Badge>
      </PageHeader>

      {!canEdit && (
        <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You have read-only access. Only clinic admins can change settings.
        </p>
      )}

      <GoogleCalendarCard connected={ctx!.clinic.google_connected} canEdit={canEdit} />

      <SettingsForm clinic={ctx!.clinic} canEdit={canEdit} />
    </>
  );
}
