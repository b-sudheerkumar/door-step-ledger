import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Phone,
  MapPin,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  Users,
  Droplets,
  IndianRupee,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/customers")({
  head: () => ({ meta: [{ title: "Customers — Gadapa" }, { name: "robots", content: "noindex" }] }),
  component: CustomersPage,
});

type Customer = {
  id: string;
  owner_id: string;
  full_name: string;
  phone: string | null;
  address: string | null;
  cow_default_qty: number;
  buffalo_default_qty: number;
  cow_price: number;
  buffalo_price: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type CustomerInput = {
  full_name: string;
  phone: string;
  address: string;
  cow_default_qty: number;
  buffalo_default_qty: number;
  cow_price: number;
  buffalo_price: number;
  notes: string;
  is_active: boolean;
};

const emptyInput: CustomerInput = {
  full_name: "",
  phone: "",
  address: "",
  cow_default_qty: 0,
  buffalo_default_qty: 0,
  cow_price: 0,
  buffalo_price: 0,
  notes: "",
  is_active: true,
};

async function fetchCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("is_active", { ascending: false })
    .order("full_name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Customer[];
}

function CustomersPage() {
  const qc = useQueryClient();
  const { data: customers, isLoading, error } = useQuery({
    queryKey: ["customers"],
    queryFn: fetchCustomers,
  });

  const [q, setQ] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);

  const filtered = useMemo(() => {
    const list = customers ?? [];
    const needle = q.trim().toLowerCase();
    return list.filter((c) => {
      if (!showInactive && !c.is_active) return false;
      if (!needle) return true;
      return (
        c.full_name.toLowerCase().includes(needle) ||
        (c.phone ?? "").toLowerCase().includes(needle) ||
        (c.address ?? "").toLowerCase().includes(needle)
      );
    });
  }, [customers, q, showInactive]);

  const stats = useMemo(() => {
    const list = customers ?? [];
    const active = list.filter((c) => c.is_active);
    const dailyLitres = active.reduce((s, c) => s + Number(c.cow_default_qty) + Number(c.buffalo_default_qty), 0);
    const dailyRevenue = active.reduce(
      (s, c) =>
        s +
        Number(c.cow_default_qty) * Number(c.cow_price) +
        Number(c.buffalo_default_qty) * Number(c.buffalo_price),
      0,
    );
    return { total: list.length, active: active.length, dailyLitres, dailyRevenue };
  }, [customers]);

  const saveMutation = useMutation({
    mutationFn: async ({ input, id }: { input: CustomerInput; id?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not signed in");
      const payload = {
        owner_id: uid,
        full_name: input.full_name.trim(),
        phone: input.phone.trim() || null,
        address: input.address.trim() || null,
        cow_default_qty: input.cow_default_qty,
        buffalo_default_qty: input.buffalo_default_qty,
        cow_price: input.cow_price,
        buffalo_price: input.buffalo_price,
        notes: input.notes.trim() || null,
        is_active: input.is_active,
      };
      if (id) {
        const { error } = await supabase.from("customers").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("customers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success(vars.id ? "Customer updated" : "Customer added");
      setDialogOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async (c: Customer) => {
      const { error } = await supabase
        .from("customers")
        .update({ is_active: !c.is_active })
        .eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: (_d, c) => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success(c.is_active ? "Customer archived" : "Customer restored");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(c: Customer) {
    setEditing(c);
    setDialogOpen(true);
  }

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
                <div className="font-display text-sm font-semibold text-foreground">Customers</div>
                <div className="text-xs text-muted-foreground">Directory of every doorstep you serve</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/dashboard">
                <Button variant="outline" size="sm" className="rounded-full">Dashboard</Button>
              </Link>
              <Button size="sm" onClick={openAdd} className="rounded-full">
                <Plus className="mr-1.5 size-4" /> Add customer
              </Button>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 md:px-8 md:py-10">
            {/* Stats */}
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={<Users className="size-5" />} label="Customers" value={String(stats.total)} sub={`${stats.active} active`} />
              <StatCard icon={<Droplets className="size-5" />} label="Daily litres" value={stats.dailyLitres.toFixed(2)} sub="Sum of defaults" tone="primary" />
              <StatCard icon={<IndianRupee className="size-5" />} label="Daily revenue" value={`₹ ${stats.dailyRevenue.toFixed(0)}`} sub="At current prices" tone="gold" />
              <StatCard icon={<Archive className="size-5" />} label="Archived" value={String(stats.total - stats.active)} sub="Hidden by default" />
            </section>

            {/* Filter bar */}
            <section className="mt-6 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[260px]">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search name, phone or address…"
                  className="h-11 rounded-full pl-10"
                />
              </div>
              <label className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm">
                <Switch checked={showInactive} onCheckedChange={setShowInactive} />
                <span className="text-muted-foreground">Show archived</span>
              </label>
            </section>

            {/* List */}
            <section className="mt-6">
              {isLoading ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-44 rounded-2xl" />
                  ))}
                </div>
              ) : error ? (
                <Card className="rounded-2xl border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
                  Couldn't load customers: {(error as Error).message}
                </Card>
              ) : filtered.length === 0 ? (
                <EmptyState onAdd={openAdd} hasAny={(customers ?? []).length > 0} />
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {filtered.map((c) => (
                    <CustomerCard
                      key={c.id}
                      customer={c}
                      onEdit={() => openEdit(c)}
                      onToggle={() => toggleActive.mutate(c)}
                      onDelete={() => deleteMutation.mutate(c.id)}
                    />
                  ))}
                </div>
              )}
            </section>
          </main>
        </div>
      </div>

      <CustomerDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditing(null);
        }}
        editing={editing}
        onSubmit={(input) => saveMutation.mutate({ input, id: editing?.id })}
        submitting={saveMutation.isPending}
      />
    </SidebarProvider>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone?: "default" | "primary" | "gold";
}) {
  const iconBg =
    tone === "primary"
      ? "bg-gradient-brand text-primary-foreground"
      : tone === "gold"
        ? "bg-gradient-gold text-gold-foreground"
        : "bg-secondary text-secondary-foreground";
  return (
    <Card className="rounded-2xl border-border bg-card p-5 shadow-card">
      <div className={`grid size-10 place-items-center rounded-xl ${iconBg}`}>{icon}</div>
      <div className="mt-4 font-display text-2xl font-bold text-foreground">{value}</div>
      <div className="text-sm font-medium text-foreground/80">{label}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </Card>
  );
}

function CustomerCard({
  customer,
  onEdit,
  onToggle,
  onDelete,
}: {
  customer: Customer;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const daily = Number(customer.cow_default_qty) + Number(customer.buffalo_default_qty);
  const dailyRev =
    Number(customer.cow_default_qty) * Number(customer.cow_price) +
    Number(customer.buffalo_default_qty) * Number(customer.buffalo_price);

  return (
    <Card
      className={`rounded-2xl border-border bg-card p-5 shadow-card transition hover:shadow-elevated ${customer.is_active ? "" : "opacity-70"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary">
            {customer.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate font-display text-base font-semibold text-foreground">
              {customer.full_name}
            </div>
            {customer.phone && (
              <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="size-3" /> {customer.phone}
              </div>
            )}
          </div>
        </div>
        {!customer.is_active && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Archived
          </span>
        )}
      </div>

      {customer.address && (
        <div className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
          <MapPin className="mt-0.5 size-3 shrink-0" />
          <span className="line-clamp-2">{customer.address}</span>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-secondary/60 px-3 py-2">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Cow</div>
          <div className="mt-0.5 text-sm font-bold text-foreground">
            {Number(customer.cow_default_qty).toFixed(2)} L
          </div>
          <div className="text-[11px] text-muted-foreground">₹{Number(customer.cow_price).toFixed(0)}/L</div>
        </div>
        <div className="rounded-xl bg-gold/15 px-3 py-2">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-foreground/60">Buffalo</div>
          <div className="mt-0.5 text-sm font-bold text-foreground">
            {Number(customer.buffalo_default_qty).toFixed(2)} L
          </div>
          <div className="text-[11px] text-muted-foreground">₹{Number(customer.buffalo_price).toFixed(0)}/L</div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
        <div className="text-muted-foreground">
          <span className="font-semibold text-foreground">{daily.toFixed(2)} L</span> · ₹{dailyRev.toFixed(0)}/day
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-8" onClick={onEdit}>
            <Pencil className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={onToggle}>
            {customer.is_active ? <Archive className="size-4" /> : <ArchiveRestore className="size-4" />}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="size-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {customer.full_name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes the customer record. Past delivery and billing data will keep their snapshot of the name, but you won't be able to log new deliveries against this account. Consider archiving instead.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </Card>
  );
}

function EmptyState({ onAdd, hasAny }: { onAdd: () => void; hasAny: boolean }) {
  return (
    <Card className="flex flex-col items-center justify-center rounded-2xl border-dashed border-border bg-card py-16 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-gradient-brand text-primary-foreground">
        <Users className="size-6" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
        {hasAny ? "No matches" : "Your directory is empty"}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {hasAny
          ? "Try a different search, or toggle archived customers to find what you're looking for."
          : "Add your first doorstep to start building delivery schedules, daily logs and billing."}
      </p>
      {!hasAny && (
        <Button onClick={onAdd} className="mt-5 rounded-full">
          <Plus className="mr-1.5 size-4" /> Add your first customer
        </Button>
      )}
    </Card>
  );
}

function CustomerDialog({
  open,
  onOpenChange,
  editing,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Customer | null;
  onSubmit: (input: CustomerInput) => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState<CustomerInput>(emptyInput);

  // reset whenever the dialog opens
  useMemo(() => {
    if (open) {
      setForm(
        editing
          ? {
              full_name: editing.full_name,
              phone: editing.phone ?? "",
              address: editing.address ?? "",
              cow_default_qty: Number(editing.cow_default_qty),
              buffalo_default_qty: Number(editing.buffalo_default_qty),
              cow_price: Number(editing.cow_price),
              buffalo_price: Number(editing.buffalo_price),
              notes: editing.notes ?? "",
              is_active: editing.is_active,
            }
          : emptyInput,
      );
    }
  }, [open, editing]);

  function update<K extends keyof CustomerInput>(k: K, v: CustomerInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim()) {
      toast.error("Name is required");
      return;
    }
    onSubmit(form);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">
            {editing ? "Edit customer" : "New customer"}
          </DialogTitle>
          <DialogDescription>
            {editing ? "Update the doorstep details and defaults." : "Add a doorstep to your delivery route."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4 pt-2">
          <Field label="Full name" required>
            <Input value={form.full_name} onChange={(e) => update("full_name", e.target.value)} placeholder="Anjali Reddy" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+91 9xxxx xxxxx" inputMode="tel" />
            </Field>
            <Field label="Status">
              <label className="flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 text-sm">
                <span className="text-muted-foreground">{form.is_active ? "Active" : "Archived"}</span>
                <Switch checked={form.is_active} onCheckedChange={(v) => update("is_active", v)} />
              </label>
            </Field>
          </div>

          <Field label="Address">
            <Textarea
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              placeholder="H. No. 3-21, Lane 4, ..."
              rows={2}
            />
          </Field>

          <div className="rounded-xl border border-border bg-secondary/40 p-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cow milk</div>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <Field label="Default qty (L)">
                <Input type="number" step="0.25" min="0" value={form.cow_default_qty} onChange={(e) => update("cow_default_qty", Number(e.target.value))} />
              </Field>
              <Field label="Price /L (₹)">
                <Input type="number" step="0.5" min="0" value={form.cow_price} onChange={(e) => update("cow_price", Number(e.target.value))} />
              </Field>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-gold/10 p-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">Buffalo milk</div>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <Field label="Default qty (L)">
                <Input type="number" step="0.25" min="0" value={form.buffalo_default_qty} onChange={(e) => update("buffalo_default_qty", Number(e.target.value))} />
              </Field>
              <Field label="Price /L (₹)">
                <Input type="number" step="0.5" min="0" value={form.buffalo_price} onChange={(e) => update("buffalo_price", Number(e.target.value))} />
              </Field>
            </div>
          </div>

          <Field label="Notes">
            <Textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Gate code, dog at door, preferences…"
              rows={2}
            />
          </Field>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : editing ? "Save changes" : "Add customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

// surface DialogTrigger for any future inline triggers
export { DialogTrigger };
