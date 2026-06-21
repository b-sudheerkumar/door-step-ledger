import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  CheckCircle2,
  Circle,
  Droplets,
  IndianRupee,
  MapPin,
  Phone,
  Search,
  Undo2,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/today")({
  head: () => ({
    meta: [{ title: "Today's Route — Gadapa" }, { name: "robots", content: "noindex" }],
  }),
  component: TodayPage,
});

type Customer = {
  id: string;
  full_name: string;
  phone: string | null;
  address: string | null;
  cow_default_qty: number;
  buffalo_default_qty: number;
  cow_price: number;
  buffalo_price: number;
  is_active: boolean;
};

type Delivery = {
  id: string;
  customer_id: string;
  delivery_date: string;
  cow_qty: number;
  buffalo_qty: number;
  delivered_at: string | null;
  notes: string | null;
};

// YYYY-MM-DD in Asia/Kolkata
function todayIST(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatPrettyDate(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

function TodayPage() {
  const qc = useQueryClient();
  const date = todayIST();
  const [q, setQ] = useState("");
  const [active, setActive] = useState<Customer | null>(null);

  const customersQ = useQuery({
    queryKey: ["customers", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select(
          "id, full_name, phone, address, cow_default_qty, buffalo_default_qty, cow_price, buffalo_price, is_active",
        )
        .eq("is_active", true)
        .order("full_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Customer[];
    },
  });

  const deliveriesQ = useQuery({
    queryKey: ["deliveries", date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deliveries")
        .select("id, customer_id, delivery_date, cow_qty, buffalo_qty, delivered_at, notes")
        .eq("delivery_date", date);
      if (error) throw error;
      return (data ?? []) as Delivery[];
    },
  });

  const byCustomer = useMemo(() => {
    const m = new Map<string, Delivery>();
    (deliveriesQ.data ?? []).forEach((d) => m.set(d.customer_id, d));
    return m;
  }, [deliveriesQ.data]);

  const filtered = useMemo(() => {
    const list = customersQ.data ?? [];
    const n = q.trim().toLowerCase();
    if (!n) return list;
    return list.filter(
      (c) =>
        c.full_name.toLowerCase().includes(n) ||
        (c.phone ?? "").toLowerCase().includes(n) ||
        (c.address ?? "").toLowerCase().includes(n),
    );
  }, [customersQ.data, q]);

  const stats = useMemo(() => {
    const list = customersQ.data ?? [];
    let done = 0;
    let cowL = 0;
    let bufL = 0;
    let revenue = 0;
    list.forEach((c) => {
      const d = byCustomer.get(c.id);
      if (d) {
        done += 1;
        cowL += Number(d.cow_qty);
        bufL += Number(d.buffalo_qty);
        revenue += Number(d.cow_qty) * Number(c.cow_price) + Number(d.buffalo_qty) * Number(c.buffalo_price);
      }
    });
    return {
      total: list.length,
      done,
      pending: list.length - done,
      litres: cowL + bufL,
      revenue,
    };
  }, [customersQ.data, byCustomer]);

  const saveMutation = useMutation({
    mutationFn: async (payload: {
      customer_id: string;
      cow_qty: number;
      buffalo_qty: number;
      notes: string | null;
      existing_id?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not signed in");
      const row = {
        customer_id: payload.customer_id,
        owner_id: uid,
        delivery_date: date,
        cow_qty: payload.cow_qty,
        buffalo_qty: payload.buffalo_qty,
        delivered_at: new Date().toISOString(),
        notes: payload.notes,
      };
      const { error } = await supabase
        .from("deliveries")
        .upsert(row, { onConflict: "customer_id,delivery_date" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deliveries", date] });
      toast.success("Delivery saved");
      setActive(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const undoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("deliveries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deliveries", date] });
      toast.success("Delivery removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const quickDefault = (c: Customer) => {
    saveMutation.mutate({
      customer_id: c.id,
      cow_qty: Number(c.cow_default_qty),
      buffalo_qty: Number(c.buffalo_default_qty),
      notes: null,
    });
  };

  const isLoading = customersQ.isLoading || deliveriesQ.isLoading;
  const error = customersQ.error || deliveriesQ.error;
  const progress = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <SidebarProvider>
      <Toaster richColors position="top-center" />
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />

        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur md:px-8">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div>
                <div className="font-display text-sm font-semibold text-foreground">Today's Route</div>
                <div className="text-xs text-muted-foreground">{formatPrettyDate(date)}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-display text-sm font-bold text-foreground">
                {stats.done}/{stats.total}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">delivered</div>
            </div>
          </header>

          <main className="flex-1 px-4 py-5 md:px-8 md:py-8">
            {/* Hero progress */}
            <section className="rounded-3xl bg-gradient-brand p-5 text-primary-foreground shadow-elevated">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">
                    Morning shift
                  </div>
                  <div className="mt-1 font-display text-3xl font-bold">
                    {stats.litres.toFixed(2)} L
                  </div>
                  <div className="text-xs text-primary-foreground/80">
                    delivered · ₹ {stats.revenue.toFixed(0)} so far
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-2xl font-bold">{progress}%</div>
                  <div className="text-[10px] uppercase tracking-widest text-primary-foreground/70">
                    complete
                  </div>
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-gold transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </section>

            {/* Search */}
            <section className="mt-5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search customer…"
                  className="h-12 rounded-full pl-10"
                />
              </div>
            </section>

            {/* List */}
            <section className="mt-4">
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-2xl" />
                  ))}
                </div>
              ) : error ? (
                <Card className="rounded-2xl border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
                  Couldn't load route: {(error as Error).message}
                </Card>
              ) : filtered.length === 0 ? (
                <Card className="rounded-2xl border-dashed border-border bg-card p-10 text-center">
                  <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-gradient-brand text-primary-foreground">
                    <Droplets className="size-5" />
                  </div>
                  <h3 className="mt-3 font-display text-base font-semibold">
                    {(customersQ.data ?? []).length === 0
                      ? "No active customers"
                      : "No matches"}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {(customersQ.data ?? []).length === 0
                      ? "Add customers from the directory to start logging deliveries."
                      : "Try a different search term."}
                  </p>
                </Card>
              ) : (
                <ul className="space-y-2">
                  {filtered.map((c) => {
                    const d = byCustomer.get(c.id);
                    return (
                      <RouteRow
                        key={c.id}
                        customer={c}
                        delivery={d}
                        onOpen={() => setActive(c)}
                        onQuick={() => quickDefault(c)}
                        quickPending={saveMutation.isPending}
                      />
                    );
                  })}
                </ul>
              )}
            </section>
          </main>
        </div>
      </div>

      <DeliverySheet
        customer={active}
        delivery={active ? byCustomer.get(active.id) ?? null : null}
        date={date}
        onClose={() => setActive(null)}
        onSave={(values) =>
          active &&
          saveMutation.mutate({
            customer_id: active.id,
            cow_qty: values.cow_qty,
            buffalo_qty: values.buffalo_qty,
            notes: values.notes,
            existing_id: byCustomer.get(active.id)?.id,
          })
        }
        onUndo={(id) => undoMutation.mutate(id)}
        saving={saveMutation.isPending}
        undoing={undoMutation.isPending}
      />
    </SidebarProvider>
  );
}

function RouteRow({
  customer,
  delivery,
  onOpen,
  onQuick,
  quickPending,
}: {
  customer: Customer;
  delivery?: Delivery;
  onOpen: () => void;
  onQuick: () => void;
  quickPending: boolean;
}) {
  const done = !!delivery;
  const hasDefault =
    Number(customer.cow_default_qty) > 0 || Number(customer.buffalo_default_qty) > 0;

  return (
    <li>
      <Card
        className={`rounded-2xl border-border p-4 shadow-card transition ${
          done ? "bg-success/5" : "bg-card"
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpen}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <div
              className={`grid size-11 shrink-0 place-items-center rounded-full font-display text-base font-bold ${
                done
                  ? "bg-success/15 text-success"
                  : "bg-primary/10 text-primary"
              }`}
            >
              {done ? <CheckCircle2 className="size-5" /> : customer.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate font-display text-base font-semibold text-foreground">
                {customer.full_name}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                {customer.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="size-3" /> {customer.phone}
                  </span>
                )}
                {customer.address && (
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <MapPin className="size-3 shrink-0" />
                    <span className="truncate">{customer.address}</span>
                  </span>
                )}
              </div>
            </div>
          </button>

          {done ? (
            <div className="flex shrink-0 items-center gap-1.5">
              {Number(delivery!.cow_qty) > 0 && (
                <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                  C {Number(delivery!.cow_qty).toFixed(2)}
                </span>
              )}
              {Number(delivery!.buffalo_qty) > 0 && (
                <span className="rounded-md bg-gold/20 px-2 py-1 text-xs font-bold text-foreground">
                  B {Number(delivery!.buffalo_qty).toFixed(2)}
                </span>
              )}
            </div>
          ) : (
            <div className="flex shrink-0 items-center gap-1.5">
              {hasDefault && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 rounded-full px-3"
                  onClick={onQuick}
                  disabled={quickPending}
                  title={`Cow ${Number(customer.cow_default_qty).toFixed(2)} · Buffalo ${Number(customer.buffalo_default_qty).toFixed(2)}`}
                >
                  <Zap className="mr-1 size-3.5" /> Default
                </Button>
              )}
              <Button size="sm" className="h-9 rounded-full px-4" onClick={onOpen}>
                Log
              </Button>
            </div>
          )}
        </div>
      </Card>
    </li>
  );
}

function DeliverySheet({
  customer,
  delivery,
  date,
  onClose,
  onSave,
  onUndo,
  saving,
  undoing,
}: {
  customer: Customer | null;
  delivery: Delivery | null;
  date: string;
  onClose: () => void;
  onSave: (v: { cow_qty: number; buffalo_qty: number; notes: string | null }) => void;
  onUndo: (id: string) => void;
  saving: boolean;
  undoing: boolean;
}) {
  const open = !!customer;
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        {customer && (
          <DeliveryForm
            key={`${customer.id}-${delivery?.id ?? "new"}`}
            customer={customer}
            delivery={delivery}
            date={date}
            onSave={onSave}
            onUndo={onUndo}
            saving={saving}
            undoing={undoing}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function DeliveryForm({
  customer,
  delivery,
  date,
  onSave,
  onUndo,
  saving,
  undoing,
}: {
  customer: Customer;
  delivery: Delivery | null;
  date: string;
  onSave: (v: { cow_qty: number; buffalo_qty: number; notes: string | null }) => void;
  onUndo: (id: string) => void;
  saving: boolean;
  undoing: boolean;
}) {
  const [cow, setCow] = useState<string>(
    delivery ? String(delivery.cow_qty) : String(customer.cow_default_qty ?? 0),
  );
  const [buf, setBuf] = useState<string>(
    delivery ? String(delivery.buffalo_qty) : String(customer.buffalo_default_qty ?? 0),
  );
  const [notes, setNotes] = useState<string>(delivery?.notes ?? "");

  const cowN = Math.max(0, Number(cow) || 0);
  const bufN = Math.max(0, Number(buf) || 0);
  const total = cowN * Number(customer.cow_price) + bufN * Number(customer.buffalo_price);

  const adjust = (which: "cow" | "buf", delta: number) => {
    if (which === "cow") {
      setCow((v) => Math.max(0, Math.round((Number(v || 0) + delta) * 100) / 100).toString());
    } else {
      setBuf((v) => Math.max(0, Math.round((Number(v || 0) + delta) * 100) / 100).toString());
    }
  };

  return (
    <>
      <SheetHeader className="text-left">
        <SheetTitle className="font-display">{customer.full_name}</SheetTitle>
        <SheetDescription>
          {delivery ? (
            <span className="inline-flex items-center gap-1 text-success">
              <CheckCircle2 className="size-3.5" /> Delivered today · editing
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <Circle className="size-3.5" /> Not delivered yet · {formatPrettyDate(date)}
            </span>
          )}
        </SheetDescription>
      </SheetHeader>

      <div className="mt-5 space-y-4">
        <QtyStepper
          label="Cow milk"
          tone="primary"
          value={cow}
          onChange={setCow}
          onStep={(d) => adjust("cow", d)}
          price={Number(customer.cow_price)}
        />
        <QtyStepper
          label="Buffalo milk"
          tone="gold"
          value={buf}
          onChange={setBuf}
          onStep={(d) => adjust("buf", d)}
          price={Number(customer.buffalo_price)}
        />

        <div>
          <Label htmlFor="notes" className="text-xs text-muted-foreground">
            Notes (optional)
          </Label>
          <Input
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. left at gate, paid cash"
            className="mt-1 h-11 rounded-xl"
            maxLength={200}
          />
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-border bg-secondary/40 px-4 py-3">
          <div className="text-xs text-muted-foreground">Today's total</div>
          <div className="flex items-center gap-1 font-display text-xl font-bold text-foreground">
            <IndianRupee className="size-4" />
            {total.toFixed(0)}
          </div>
        </div>
      </div>

      <SheetFooter className="mt-5 flex-col gap-2 sm:flex-col">
        <Button
          size="lg"
          className="h-12 w-full rounded-full text-base"
          onClick={() => onSave({ cow_qty: cowN, buffalo_qty: bufN, notes: notes.trim() || null })}
          disabled={saving || (cowN === 0 && bufN === 0)}
        >
          {saving ? "Saving…" : delivery ? "Update delivery" : "Mark delivered"}
        </Button>
        {delivery && (
          <Button
            variant="ghost"
            className="h-11 w-full rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onUndo(delivery.id)}
            disabled={undoing}
          >
            <Undo2 className="mr-2 size-4" />
            {undoing ? "Removing…" : "Undo delivery"}
          </Button>
        )}
      </SheetFooter>
    </>
  );
}

function QtyStepper({
  label,
  tone,
  value,
  onChange,
  onStep,
  price,
}: {
  label: string;
  tone: "primary" | "gold";
  value: string;
  onChange: (v: string) => void;
  onStep: (delta: number) => void;
  price: number;
}) {
  const ring = tone === "primary" ? "bg-primary/10 text-primary" : "bg-gold/20 text-foreground";
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`grid size-9 place-items-center rounded-full ${ring}`}>
            <Droplets className="size-4" />
          </span>
          <div>
            <div className="text-sm font-semibold text-foreground">{label}</div>
            <div className="text-[11px] text-muted-foreground">₹{price.toFixed(0)}/L</div>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11 shrink-0 rounded-full text-lg"
          onClick={() => onStep(-0.25)}
        >
          −
        </Button>
        <Input
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 rounded-xl text-center font-display text-lg font-bold"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11 shrink-0 rounded-full text-lg"
          onClick={() => onStep(0.25)}
        >
          +
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {[0.25, 0.5, 1, 1.5, 2].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v.toString())}
            className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
          >
            {v} L
          </button>
        ))}
      </div>
    </div>
  );
}
