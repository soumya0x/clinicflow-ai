"use client";

import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import type { AppointmentStatus } from "@/types/database";

const STATUSES: AppointmentStatus[] = [
  "scheduled",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
];

export function AppointmentActions({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();

  async function setStatus(status: AppointmentStatus) {
    const res = await fetch("/api/appointments", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) {
      toast({ variant: "destructive", title: "Update failed" });
      return;
    }
    toast({ title: `Marked as ${status.replace("_", " ")}` });
    router.refresh();
  }

  async function remove() {
    const res = await fetch(`/api/appointments?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast({ variant: "destructive", title: "Delete failed" });
      return;
    }
    toast({ title: "Appointment deleted" });
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Set status</DropdownMenuLabel>
        {STATUSES.map((s) => (
          <DropdownMenuItem key={s} className="capitalize" onClick={() => setStatus(s)}>
            {s.replace("_", " ")}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={remove}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
