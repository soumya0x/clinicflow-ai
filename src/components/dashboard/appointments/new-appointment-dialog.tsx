"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export function NewAppointmentDialog() {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const body = {
      patient_name: form.get("patient_name"),
      patient_phone: form.get("patient_phone"),
      appointment_date: form.get("appointment_date"),
      appointment_time: form.get("appointment_time"),
      reason: form.get("reason") || undefined,
      booking_source: "manual",
      status: "scheduled",
    };

    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast({
        variant: "destructive",
        title: "Could not book",
        description: err?.error?.message ?? "Please check the details and try again.",
      });
      return;
    }

    toast({ title: "Appointment booked" });
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> New appointment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New appointment</DialogTitle>
          <DialogDescription>
            Book an appointment manually. The slot is checked for conflicts.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="patient_name">Patient name</Label>
            <Input id="patient_name" name="patient_name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="patient_phone">Mobile number</Label>
            <Input id="patient_phone" name="patient_phone" placeholder="+919999999999" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="appointment_date">Date</Label>
              <Input id="appointment_date" name="appointment_date" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="appointment_time">Time</Label>
              <Input id="appointment_time" name="appointment_time" type="time" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for visit</Label>
            <Textarea id="reason" name="reason" rows={2} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Booking…" : "Book appointment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
