"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { BusinessHours, Clinic } from "@/types/database";

const DAYS: { key: keyof BusinessHours; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

export function SettingsForm({
  clinic,
  canEdit,
}: {
  clinic: Clinic;
  canEdit: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [hours, setHours] = useState<BusinessHours>(clinic.business_hours);
  const [method, setMethod] = useState(clinic.revenue_calculation_method);
  const [afterHours, setAfterHours] = useState(clinic.after_hours_action);

  function setDay(key: keyof BusinessHours, idx: 0 | 1, value: string) {
    setHours((h) => {
      const current = h[key] ?? ["09:00", "19:00"];
      const next: [string, string] = [...current] as [string, string];
      next[idx] = value;
      return { ...h, [key]: next };
    });
  }

  function toggleClosed(key: keyof BusinessHours, closed: boolean) {
    setHours((h) => ({ ...h, [key]: closed ? null : ["09:00", "19:00"] }));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    const f = new FormData(e.currentTarget);
    const body = {
      name: f.get("name"),
      phone: f.get("phone"),
      email: f.get("email") || "",
      address: f.get("address") || undefined,
      logo_url: f.get("logo_url") || "",
      greeting_message: f.get("greeting_message") || undefined,
      emergency_number: f.get("emergency_number") || undefined,
      timezone: f.get("timezone") || undefined,
      business_hours: hours,
      consultation_fee: Number(f.get("consultation_fee")),
      average_appointment_value: Number(f.get("average_appointment_value")),
      average_treatment_value: Number(f.get("average_treatment_value")),
      revenue_calculation_method: method,
      callback_delay_seconds: Number(f.get("callback_delay_seconds")),
      callback_retry_count: Number(f.get("callback_retry_count")),
      after_hours_action: afterHours,
    };

    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast({ variant: "destructive", title: "Save failed", description: err?.error?.message });
      return;
    }
    toast({ title: "Settings saved" });
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <fieldset disabled={!canEdit} className="space-y-6">
        {/* Clinic profile / branding */}
        <Card>
          <CardHeader>
            <CardTitle>Clinic profile & branding</CardTitle>
            <CardDescription>
              These power your AI greeting and patient-facing details.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Clinic name" name="name" defaultValue={clinic.name} required />
            <Field label="Phone (Vapi number)" name="phone" defaultValue={clinic.phone} />
            <Field label="Email" name="email" type="email" defaultValue={clinic.email ?? ""} />
            <Field label="Timezone" name="timezone" defaultValue={clinic.timezone} />
            <Field label="Logo URL" name="logo_url" defaultValue={clinic.logo_url ?? ""} />
            <Field label="Emergency number" name="emergency_number" defaultValue={clinic.emergency_number ?? ""} />
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" defaultValue={clinic.address ?? ""} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="greeting_message">AI greeting message</Label>
              <Textarea
                id="greeting_message"
                name="greeting_message"
                rows={2}
                defaultValue={clinic.greeting_message}
              />
            </div>
          </CardContent>
        </Card>

        {/* Business hours */}
        <Card>
          <CardHeader>
            <CardTitle>Business hours</CardTitle>
            <CardDescription>Used by the AI to offer valid appointment times.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {DAYS.map(({ key, label }) => {
              const slot = hours[key];
              const closed = !slot;
              return (
                <div key={key} className="flex flex-wrap items-center gap-3">
                  <span className="w-24 text-sm font-medium">{label}</span>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={closed}
                      onChange={(e) => toggleClosed(key, e.target.checked)}
                    />
                    Closed
                  </label>
                  {!closed && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={slot![0]}
                        onChange={(e) => setDay(key, 0, e.target.value)}
                        className="w-32"
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="time"
                        value={slot![1]}
                        onChange={(e) => setDay(key, 1, e.target.value)}
                        className="w-32"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Revenue settings */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue settings</CardTitle>
            <CardDescription>
              Drives the <strong>Estimated Revenue</strong> figures. These are projections, not collected payments.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Consultation fee (₹)" name="consultation_fee" type="number" defaultValue={String(clinic.consultation_fee)} />
            <Field label="Average appointment value (₹)" name="average_appointment_value" type="number" defaultValue={String(clinic.average_appointment_value)} />
            <Field label="Average treatment value (₹)" name="average_treatment_value" type="number" defaultValue={String(clinic.average_treatment_value)} />
            <div className="space-y-2">
              <Label>Revenue calculation method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consultation_fee">Consultation fee</SelectItem>
                  <SelectItem value="average_appointment_value">Average appointment value</SelectItem>
                  <SelectItem value="average_treatment_value">Average treatment value</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Missed-call recovery settings */}
        <Card>
          <CardHeader>
            <CardTitle>Missed-call recovery</CardTitle>
            <CardDescription>Control automatic callbacks and after-hours behaviour.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Callback delay (seconds)" name="callback_delay_seconds" type="number" defaultValue={String(clinic.callback_delay_seconds)} />
            <Field label="Retry count" name="callback_retry_count" type="number" defaultValue={String(clinic.callback_retry_count)} />
            <div className="space-y-2">
              <Label>After-hours behaviour</Label>
              <Select value={afterHours} onValueChange={(v) => setAfterHours(v as typeof afterHours)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="callback">Schedule callback</SelectItem>
                  <SelectItem value="voicemail">Take voicemail</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {canEdit && (
          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        )}
      </fieldset>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} required={required} />
    </div>
  );
}
