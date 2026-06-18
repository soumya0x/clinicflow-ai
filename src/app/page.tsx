import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PhoneCall, CalendarCheck, TrendingUp, Clock } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-2 font-semibold text-primary">
          <PhoneCall className="h-5 w-5" />
          ClinicFlow AI
        </div>
        <nav className="flex items-center gap-3">
          <Link href="/sign-in">
            <Button variant="ghost">Sign in</Button>
          </Link>
          <Link href="/sign-up">
            <Button>Get started</Button>
          </Link>
        </nav>
      </header>

      <section className="mx-auto flex max-w-4xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <span className="mb-4 rounded-full bg-secondary px-4 py-1 text-sm text-secondary-foreground">
          24/7 AI Voice Receptionist for Clinics
        </span>
        <h1 className="text-balance text-5xl font-bold tracking-tight sm:text-6xl">
          Never Miss a Patient Again.
        </h1>
        <p className="mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
          ClinicFlow AI answers every call, books appointments automatically,
          and recovers missed calls — so your front desk never sleeps.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/sign-up">
            <Button size="lg">Start free</Button>
          </Link>
          <Link href="/sign-in">
            <Button size="lg" variant="outline">
              View dashboard
            </Button>
          </Link>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Feature icon={<Clock />} title="Answer 24/7" desc="Every call picked up, day or night." />
          <Feature icon={<CalendarCheck />} title="Auto-booking" desc="Appointments scheduled in real time." />
          <Feature icon={<PhoneCall />} title="Missed-call recovery" desc="Automatic callbacks within minutes." />
          <Feature icon={<TrendingUp />} title="Revenue impact" desc="Track estimated revenue recovered." />
        </div>
      </section>

      <footer className="border-t px-6 py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} ClinicFlow AI. Estimated revenue figures are projections, not collected payments.
      </footer>
    </main>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border p-6 text-left">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
