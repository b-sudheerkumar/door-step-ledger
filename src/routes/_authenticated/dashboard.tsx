import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Users, CalendarRange, Droplets, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Gadapa" }, { name: "robots", content: "noindex" }] }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user;
      if (!u) return;
      setEmail(u.email ?? null);
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", u.id).maybeSingle();
      setName(profile?.full_name ?? null);
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.id);
      setRole(roles?.[0]?.role ?? "delivery_boy");
    });
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <main className="min-h-screen bg-gradient-cream">
      <Toaster richColors position="top-center" />
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground font-bold">G</div>
            <span className="text-base font-bold text-primary">Gadapa</span>
          </Link>
          <Button variant="outline" size="sm" onClick={signOut} className="rounded-full">
            <LogOut className="mr-2 size-4" /> Sign out
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Welcome back</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-primary md:text-4xl">
              {name || email || "Operator"}
            </h1>
          </div>
          {role && (
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              {role.replace("_", " ")}
            </span>
          )}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            { i: <Users className="size-5" />, l: "Customers", v: "—" },
            { i: <CalendarRange className="size-5" />, l: "Active schedules", v: "—" },
            { i: <Droplets className="size-5" />, l: "Today's production", v: "— L" },
            { i: <BarChart3 className="size-5" />, l: "Outstanding", v: "₹ —" },
          ].map((m) => (
            <Card key={m.l} className="rounded-2xl border-border bg-card p-5 shadow-card">
              <div className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">{m.i}</div>
              <div className="mt-4 text-2xl font-bold text-foreground">{m.v}</div>
              <div className="text-sm text-muted-foreground">{m.l}</div>
            </Card>
          ))}
        </div>

        <Card className="mt-8 rounded-2xl border-border bg-card p-8 shadow-card">
          <h2 className="text-xl font-semibold text-foreground">You're in.</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Authentication is wired and your profile + role are set up. The next milestones —
            customer directory, delivery matrix, daily production and reconciliation — plug
            straight into the same offline-first foundation.
          </p>
        </Card>
      </section>
    </main>
  );
}
