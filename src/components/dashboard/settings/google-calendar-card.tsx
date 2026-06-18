import { CalendarCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function GoogleCalendarCard({
  connected,
  canEdit,
}: {
  connected: boolean;
  canEdit: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarCheck className="h-5 w-5 text-primary" />
          Google Calendar
        </CardTitle>
        <CardDescription>
          Automatically create, update, and delete calendar events for every appointment.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        {connected ? (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Connected
          </Badge>
        ) : (
          <Badge variant="secondary">Not connected</Badge>
        )}
        {canEdit && (
          <Button asChild variant={connected ? "outline" : "default"}>
            <a href="/api/google/connect">
              {connected ? "Reconnect" : "Connect Google Calendar"}
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
