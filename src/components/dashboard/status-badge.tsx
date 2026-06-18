import { Badge, type BadgeProps } from "@/components/ui/badge";
import { titleCase } from "@/lib/utils";
import type {
  AppointmentStatus,
  CallOutcome,
  CallbackStatus,
  CallbackResult,
} from "@/types/database";

type Variant = NonNullable<BadgeProps["variant"]>;

const APPOINTMENT: Record<AppointmentStatus, Variant> = {
  scheduled: "default",
  confirmed: "success",
  completed: "secondary",
  cancelled: "destructive",
  no_show: "warning",
};

const CALL_OUTCOME: Record<CallOutcome, Variant> = {
  appointment_booked: "success",
  information_requested: "default",
  human_transfer: "warning",
  missed_call: "destructive",
  callback_completed: "secondary",
};

const CALLBACK_STATUS: Record<CallbackStatus, Variant> = {
  pending: "warning",
  in_progress: "default",
  recovered: "success",
  failed: "destructive",
};

const CALLBACK_RESULT: Record<CallbackResult, Variant> = {
  appointment_booked: "success",
  human_callback_requested: "warning",
  information_requested: "default",
  no_answer: "secondary",
  invalid_number: "destructive",
};

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  return <Badge variant={APPOINTMENT[status]}>{titleCase(status)}</Badge>;
}

export function CallOutcomeBadge({ outcome }: { outcome: CallOutcome | null }) {
  if (!outcome) return <Badge variant="secondary">—</Badge>;
  return <Badge variant={CALL_OUTCOME[outcome]}>{titleCase(outcome)}</Badge>;
}

export function CallbackStatusBadge({ status }: { status: CallbackStatus }) {
  return <Badge variant={CALLBACK_STATUS[status]}>{titleCase(status)}</Badge>;
}

export function CallbackResultBadge({ result }: { result: CallbackResult | null }) {
  if (!result) return <Badge variant="secondary">Pending</Badge>;
  return <Badge variant={CALLBACK_RESULT[result]}>{titleCase(result)}</Badge>;
}
