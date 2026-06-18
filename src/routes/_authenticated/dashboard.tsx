import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  LogOut,
  Users,
  CalendarRange,
  Droplets,
  BarChart3,
  TrendingUp,
  ArrowUpRight,
  CheckCircle2,
  CircleDot,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

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
    <SidebarProvider>
      <Toaster richColors position="top-center" />
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />

        <div className="flex flex-1 flex-col">
          {/* Top bar */}
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur md:px-8">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div className="hidden md:block">
                <div className="font-display text-sm font-semibold text-foreground">Overview</div>
                <div className="text-xs text-muted-foreground">Morning shift · {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {role && (
                <span className="hidden rounded-full bg-gold/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-foreground sm:inline-flex">
                  {role.replace("_", " ")}
                </span>
              )}
              <div className="hidden text-right md:block">
                <div className="text-sm font-semibold text-foreground">{name || email?.split("@")[0] || "Operator"}</div>
                <div className="text-xs text-muted-foreground">{email}</div>
              </div>
              <Button variant="outline" size="sm" onClick={signOut} className="rounded-full">
                <LogOut className="mr-1.5 size-4" /> Sign out
              </Button>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 md:px-8 md:py-10">
            {/* Hero strip */}
            <section className="rounded-3xl bg-gradient-brand p-6 text-primary-foreground shadow-elevated md:p-8">
              <div className="flex flex-wrap items-end justify-between gap-6">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Welcome back</div>
                  <h1 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
                    {name || email?.split("@")[0] || "Operator"}
                  </h1>
                  <p className="mt-2 max-w-md text-sm text-primary-foreground/80">
                    Your shift dashboard. Production, deliveries, reconciliation and billing — one page, offline-first.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { l: "Produced", v: "184 L" },
                    { l: "Delivered", v: "171 L" },
                    { l: "Wastage", v: "0.4 L" },
                  ].map((s) => (
                    <div key={s.l} className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur">
                      <div className="font-display text-xl font-bold">{s.v}</div>
                      <div className="text-[10px] uppercase tracking-widest text-primary-foreground/70">{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* KPIs */}
            <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { i: <Users className="size-5" />, l: "Customers", v: "—", d: "Active accounts", t: "+0" },
                { i: <CalendarRange className="size-5" />, l: "Schedules", v: "—", d: "Running today", t: "0 paused" },
                { i: <Droplets className="size-5" />, l: "Production", v: "— L", d: "Today's batch", t: "0% wastage" },
                { i: <BarChart3 className="size-5" />, l: "Outstanding", v: "₹ —", d: "Pending invoices", t: "0 overdue" },
              ].map((m) => (
                <Card key={m.l} className="group rounded-2xl border-border bg-card p-5 shadow-card transition hover:shadow-elevated">
                  <div className="flex items-center justify-between">
                    <div className="grid size-10 place-items-center rounded-xl bg-gradient-brand text-primary-foreground">{m.i}</div>
                    <ArrowUpRight className="size-4 text-muted-foreground transition group-hover:text-primary" />
                  </div>
                  <div className="mt-5 font-display text-3xl font-bold text-foreground">{m.v}</div>
                  <div className="mt-1 text-sm font-medium text-foreground/80">{m.l}</div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{m.d}</span>
                    <span className="inline-flex items-center gap-1 font-medium text-success">
                      <TrendingUp className="size-3" /> {m.t}
                    </span>
                  </div>
                </Card>
              ))}
            </section>

            {/* Two-column workspace */}
            <section className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <Card className="rounded-2xl border-border bg-card p-6 shadow-card">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-lg font-semibold text-foreground">Today's route</h2>
                    <p className="text-xs text-muted-foreground">Tap a stop to log delivery</p>
                  </div>
                  <span className="rounded-full bg-success/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-success">
                    <CircleDot className="mr-1 inline size-3" /> Synced
                  </span>
                </div>

                <div className="mt-5 space-y-2">
                  {[
                    { n: "Anjali R.", a: "H. No. 3-21, Lane 4", c: 1.0, b: 0.5, s: "done" as const },
                    { n: "Ravi Teja", a: "Plot 42, Sai Nilayam", c: 0.5, b: 1.0, s: "done" as const },
                    { n: "Lakshmi B.", a: "Flat 102, Sri Krupa", c: 0, b: 0, s: "skip" as const },
                    { n: "Pradeep K.", a: "Door 7-8-12, Vinayak", c: 1.0, b: 0, s: "pending" as const },
                    { n: "Suma D.", a: "Lane 2, Krishna Apts", c: 0.5, b: 0.5, s: "pending" as const },
                  ].map((r) => (
                    <div key={r.n} className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 transition hover:border-primary/30">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary">
                          {r.n.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-foreground">{r.n}</div>
                          <div className="truncate text-xs text-muted-foreground">{r.a}</div>
                        </div>
                      </div>
                      {r.s === "skip" ? (
                        <span className="rounded-md bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive">Skipped</span>
                      ) : r.s === "done" ? (
                        <div className="flex items-center gap-2 text-xs font-semibold">
                          <span className="rounded-md bg-primary/10 px-2 py-1 text-primary">C {r.c.toFixed(2)}</span>
                          <span className="rounded-md bg-gold/20 px-2 py-1 text-foreground">B {r.b.toFixed(2)}</span>
                          <CheckCircle2 className="size-4 text-success" />
                        </div>
                      ) : (
                        <Button size="sm" className="h-8 rounded-full px-4 text-xs">Log</Button>
                      )}
                    </div>
                  ))}
                </div>
              </Card>

              <div className="space-y-6">
                <Card className="overflow-hidden rounded-2xl border-border bg-gradient-gold p-6 shadow-card">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-foreground/70">Reconciliation</div>
                  <div className="mt-2 font-display text-2xl font-bold text-gold-foreground">99.6% accuracy</div>
                  <p className="mt-2 text-sm text-gold-foreground/80">
                    Production minus delivered minus remaining. 0.4 L wastage this shift — within tolerance.
                  </p>
                  <Button variant="secondary" size="sm" className="mt-4 rounded-full bg-gold-foreground text-gold hover:bg-gold-foreground/90">
                    Close shift
                  </Button>
                </Card>

                <Card className="rounded-2xl border-border bg-card p-6 shadow-card">
                  <h3 className="font-display text-sm font-semibold text-foreground">You're in.</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Authentication is wired and your profile + role are set. Next: customer directory, delivery matrix and billing.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-secondary px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-secondary-foreground">v1 · Auth</span>
                    <span className="rounded-full border border-border px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">v2 · Customers</span>
                  </div>
                </Card>
              </div>
            </section>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
