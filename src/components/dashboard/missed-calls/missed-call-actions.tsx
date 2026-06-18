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
import type { CallbackStatus } from "@/types/database";

export function MissedCallActions({
  id,
  status,
}: {
  id: string;
  status: CallbackStatus;
}) {
  const router = useRouter();
  const { toast } = useToast();

  async function triggerCallback() {
    const res = await fetch(`/api/missed-calls/${id}/callback`, { method: "POST" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast({ variant: "destructive", title: "Callback failed", description: body?.error?.message });
      return;
    }
    toast({ title: "Callback triggered" });
    router.refresh();
  }

  async function patch(updates: Record<string, unknown>) {
    const res = await fetch("/api/missed-calls", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    if (!res.ok) {
      toast({ variant: "destructive", title: "Update failed" });
      return;
    }
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
        <DropdownMenuLabel>Recovery</DropdownMenuLabel>
        <DropdownMenuItem
          disabled={status === "recovered"}
          onClick={triggerCallback}
        >
          Trigger callback now
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => patch({ callback_status: "recovered", final_outcome: "appointment_booked" })}>
          Mark recovered
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => patch({ callback_status: "failed", final_outcome: "no_answer" })}
        >
          Mark failed
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
