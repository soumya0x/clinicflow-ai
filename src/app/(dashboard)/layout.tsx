import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { SidebarNav } from "@/components/dashboard/sidebar";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { UserMenu } from "@/components/dashboard/user-menu";
import { NotificationBell } from "@/components/dashboard/notification-bell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/sign-in");

  const name = ctx.profile.full_name ?? ctx.email ?? "User";

  return (
    <div className="flex min-h-screen bg-secondary/30">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r bg-background lg:flex lg:flex-col">
        <SidebarNav clinicName={ctx.clinic.name} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b bg-background/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-2">
            <MobileNav clinicName={ctx.clinic.name} />
            <span className="text-sm font-medium text-muted-foreground">
              {ctx.clinic.name}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <UserMenu name={name} email={ctx.email ?? ""} role={ctx.profile.role} />
          </div>
        </header>

        <main className="flex-1 space-y-6 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
