import Link from "next/link";
import { PhoneCall } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary/40 px-4 py-12">
      <Link
        href="/"
        className="mb-8 flex items-center gap-2 text-lg font-semibold text-primary"
      >
        <PhoneCall className="h-6 w-6" />
        ClinicFlow AI
      </Link>
      <div className="w-full max-w-md">{children}</div>
      <p className="mt-8 max-w-md text-center text-xs text-muted-foreground">
        Never Miss a Patient Again.
      </p>
    </div>
  );
}
