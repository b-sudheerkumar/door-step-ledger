import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, WifiOff, Calculator, CalendarRange, Truck, ShieldCheck, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gadapa — Doorstep dairy delivery, digitized" },
      { name: "description", content: "Offline-first delivery ledger for independent milkmen. Customers, schedules, daily production and reconciliation — built for the field." },
      { property: "og:title", content: "Gadapa — Doorstep dairy delivery, digitized" },
      { property: "og:description", content: "The offline-first ledger that replaces paper notes for independent milk delivery routes." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <main className="min-h-screen bg-gradient-cream">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2">
          <Logo />
          <span className="text-lg font-bold tracking-tight text-primary">Gadapa</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground">Features</a>
          <a href="#how" className="text-sm font-medium text-muted-foreground hover:text-foreground">How it works</a>
          <a href="#trust" className="text-sm font-medium text-muted-foreground hover:text-foreground">Trust</a>
        </nav>
        <Link to="/auth">
          <Button variant="outline" className="h-10 rounded-full px-5">Sign in</Button>
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-10 pb-20 md:pt-20 md:pb-32">
        <div className="grid items-center gap-12 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-card">
              <span className="size-1.5 rounded-full bg-success" /> Offline-first · Built for the route
            </span>
            <h1 className="mt-6 text-5xl font-extrabold leading-[1.05] tracking-tight text-primary md:text-7xl">
              Doorstep dairy,<br />
              <span className="text-foreground">digitized end to end.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              Gadapa replaces paper notes with an offline ledger that survives basements,
              rural lanes and dead zones. Log deliveries on the go, reconcile production
              at shift end, bill customers without a single dispute.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/auth">
                <Button size="lg" className="h-12 rounded-full px-7 text-base font-semibold shadow-elevated">
                  Get started
                  <ArrowRight className="ml-1 size-4" />
                </Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="ghost" className="h-12 rounded-full px-6 text-base">
                  See features
                </Button>
              </a>
            </div>
            <div className="mt-10 grid max-w-md grid-cols-3 gap-4 text-center">
              {[
                { k: "0.5%", v: "Volume error" },
                { k: "99.9%", v: "Session uptime" },
                { k: "<4s", v: "Sign-in time" },
              ].map((m) => (
                <div key={m.v}>
                  <div className="text-2xl font-bold text-primary">{m.k}</div>
                  <div className="text-xs text-muted-foreground">{m.v}</div>
                </div>
              ))}
            </div>
          </div>

          <HeroMock />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-primary md:text-4xl">
              Built for the way milk actually moves
            </h2>
            <p className="mt-3 text-muted-foreground">
              Three things every independent dairy operator fights with daily — and how Gadapa solves them.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <Feature
              icon={<WifiOff className="size-5" />}
              title="Works in the dead zones"
              desc="A local ledger captures every drop instantly. The moment a signal returns, mutations sync in a FIFO batch — no double entries, no lost rows."
            />
            <Feature
              icon={<Calculator className="size-5" />}
              title="Wastage in real time"
              desc="Production minus delivered minus remaining. Reconciliation runs continuously so leakage shows up the same shift it happens."
            />
            <Feature
              icon={<CalendarRange className="size-5" />}
              title="Schedules that bend"
              desc="Weekly bitmaps, vacation holds, mid-cycle price changes, single-day quantity flips — billing evaluates each day against the historical price log."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="text-3xl font-bold tracking-tight text-primary md:text-4xl">A shift, end to end</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-4">
          {[
            { i: <Truck className="size-5" />, t: "Dispatch", d: "Load the active route. Customer cards cached locally before you leave." },
            { i: <ShieldCheck className="size-5" />, t: "Deliver", d: "Swipe right to fulfil, left to skip. ± buttons adjust cow / buffalo to the quarter litre." },
            { i: <Calculator className="size-5" />, t: "Reconcile", d: "Closing the shift triggers a live wastage check against today's production batch." },
            { i: <BarChart3 className="size-5" />, t: "Bill", d: "Monthly invoices generated from the price history, holidays and per-day overrides." },
          ].map((s, i) => (
            <Card key={s.t} className="rounded-2xl border-border bg-background p-6 shadow-card">
              <div className="flex items-center gap-3 text-primary">
                <span className="grid size-9 place-items-center rounded-lg bg-primary/10">{s.i}</span>
                <span className="text-xs font-semibold tracking-widest text-muted-foreground">STEP {i + 1}</span>
              </div>
              <div className="mt-4 text-lg font-semibold text-foreground">{s.t}</div>
              <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Trust strip */}
      <section id="trust" className="border-t border-border bg-gradient-brand text-primary-foreground">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">
            Stop counting twice. Stop arguing once.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/80">
            From 100 to 5,000 customers a day — same ledger, same maths, no paper.
          </p>
          <div className="mt-8">
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="h-12 rounded-full px-7 text-base font-semibold">
                Open Gadapa
                <ArrowRight className="ml-1 size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-8 text-sm text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2">
            <Logo small />
            <span>Gadapa · ద్వారం</span>
          </div>
          <div>© {new Date().getFullYear()} Gadapa. Doorstep dairy.</div>
        </div>
      </footer>
    </main>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-6 shadow-card">
      <div className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">{icon}</div>
      <h3 className="mt-5 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}

function Logo({ small = false }: { small?: boolean }) {
  const s = small ? 20 : 28;
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect width="32" height="32" rx="9" fill="currentColor" className="text-primary" />
      <path d="M9 22V11h5.2c3.4 0 5.6 2.1 5.6 5.5S17.6 22 14.2 22H9zm3-2.4h2.1c1.8 0 3-1.2 3-3.1s-1.2-3.1-3-3.1H12v6.2zM22 22l1.6-4.5L22 13h2.2l.8 2.6.8-2.6H28l-1.6 4.5L28 22h-2.2l-.8-2.7L24.2 22H22z" fill="white"/>
    </svg>
  );
}

function HeroMock() {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-brand opacity-10 blur-2xl" />
      <div className="relative rounded-[2rem] border border-border bg-card p-5 shadow-elevated">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium">Morning shift · 06:12</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2 py-0.5 font-semibold text-success">
            <span className="size-1.5 rounded-full bg-success" /> Synced
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[
            { l: "Produced", v: "184 L", c: "text-primary" },
            { l: "Delivered", v: "171 L", c: "text-success" },
            { l: "Wastage", v: "0.4 L", c: "text-warning" },
          ].map((s) => (
            <div key={s.l} className="rounded-xl bg-muted px-2 py-3">
              <div className={`text-base font-bold ${s.c}`}>{s.v}</div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          {[
            { n: "Anjali R.", a: "H. No. 3-21, Lane 4", c: 1.0, b: 0.5, s: "ok" as const },
            { n: "Ravi Teja", a: "Plot 42, Sai Nilayam", c: 0.5, b: 1.0, s: "ok" as const },
            { n: "Lakshmi B.", a: "Flat 102, Sri Krupa", c: 0, b: 0, s: "skip" as const },
          ].map((r) => (
            <div key={r.n} className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-foreground">{r.n}</div>
                <div className="truncate text-xs text-muted-foreground">{r.a}</div>
              </div>
              {r.s === "ok" ? (
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className="rounded-md bg-primary/10 px-2 py-1 text-primary">C {r.c.toFixed(2)}</span>
                  <span className="rounded-md bg-accent px-2 py-1 text-accent-foreground">B {r.b.toFixed(2)}</span>
                </div>
              ) : (
                <span className="rounded-md bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive">Skipped</span>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">12 stops left</span>
          <span className="font-semibold text-primary">Tap to log next →</span>
        </div>
      </div>
    </div>
  );
}
