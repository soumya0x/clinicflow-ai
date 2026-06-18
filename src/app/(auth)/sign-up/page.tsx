"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpAction, type ActionState } from "../actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SignUpPage() {
  const [state, formAction] = useActionState<ActionState, FormData>(
    signUpAction,
    {}
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Create your clinic</CardTitle>
        <CardDescription>
          Start answering every call in minutes. You&apos;ll be the clinic admin.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          {state.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}
          {state.success && (
            <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
              {state.success}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="full_name">Your name</Label>
            <Input id="full_name" name="full_name" placeholder="Dr. Asha Rao" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clinic_name">Clinic name</Label>
            <Input id="clinic_name" name="clinic_name" placeholder="Smile Dental Clinic" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="you@clinic.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" placeholder="At least 8 characters" required />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <SubmitButton className="w-full" pendingText="Creating account…">
            Create account
          </SubmitButton>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/sign-in" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
