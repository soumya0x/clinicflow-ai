"use client";

import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function TranscriptDialog({
  caller,
  transcript,
  recordingUrl,
}: {
  caller: string;
  transcript: string | null;
  recordingUrl: string | null;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" disabled={!transcript && !recordingUrl}>
          <FileText className="h-4 w-4" /> View
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Call transcript</DialogTitle>
          <DialogDescription>Caller: {caller}</DialogDescription>
        </DialogHeader>
        {recordingUrl && (
          <audio controls src={recordingUrl} className="w-full">
            Your browser does not support audio playback.
          </audio>
        )}
        <pre className="whitespace-pre-wrap rounded-md bg-muted p-4 text-sm">
          {transcript ?? "No transcript available."}
        </pre>
      </DialogContent>
    </Dialog>
  );
}
