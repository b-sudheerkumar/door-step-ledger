import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  Receipt,
  IndianRupee,
  Hammer,
  Send,
  CheckCircle2,
  Copy,
  Loader2,
  Wallet,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({
    meta: [{ title: "Billing — Gadapa" }, { name: "robots", content: "noindex" }],
  }),
  component: BillingPage,
});

type BillStatus = "draft" | "issued" | "paid" | "void";

type Bill = {
  id: string;
  customer_id: string;
  period_start: string;
  period_end: string;
  cow_litres: number;
  buffalo_litres: number;
  cow_amount: number;
  buffalo_amount: number;
  total_amount: number;
  status: BillStatus;
  issued_at: string | null;
  paid_at: string | null;
  share_token: string | null;
  notes: string | null;
};

type Customer = {
  id: string;
  full_name: string;
  phone: string | null;
  cow_price: number;
  buffalo_price: number;
};

type Delivery = {
  customer_id: string;
  delivery_date: string;
  cow_qty: number;
  buffalo_qty: number;
};

type Rate = {
  customer_id: string;
  cow_price: number;
  buffalo_price: number;
  effective_from: string;
};

type Payment = {
  id: string;
  bill_id: string;
  amount: number;
  method: "cash" | "upi" | "bank" | "other";
  reference: string | null;
  paid_at: string;
  notes: string | null;
};

function monthRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}

function inr(n: number) {
  return `₹${n.toFixed(2)}`;
}

function BillingPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1..12
  const { start, end } = useMemo(() => monthRange(year, month), [year, month]);
  const qc = useQueryClient();

  const customersQ = useQuery({
    queryKey: ["customers", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, full_name, phone, cow_price, buffalo_price, is_active")
        .order("full_name");
      if (error) throw error;
      return data as (Customer & { is_active: boolean })[];
    },
  });

  const billsQ = useQuery({
    queryKey: ["bills", start, end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bills")
        .select("*")
        .eq("period_start", start)
        .eq("period_end", end)
        .order("created_at");
      if (error) throw error;
      return data as Bill[];
    },
  });

  const paymentsQ = useQuery({
    queryKey: ["payments", start, end],
    queryFn: async () => {
      const billIds = (billsQ.data ?? []).map((b) => b.id);
      if (billIds.length === 0) return [] as Payment[];
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .in("bill_id", billIds);
      if (error) throw error;
      return data as Payment[];
    },
    enabled: !!billsQ.data && billsQ.data.length > 0,
  });

  const paidByBill = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of paymentsQ.data ?? []) {
      m.set(p.bill_id, (m.get(p.bill_id) ?? 0) + Number(p.amount));
    }
    return m;
  }, [paymentsQ.data]);

  const generate = useMutation({
    mutationFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("Not signed in");

      const [{ data: deliveries, error: dErr }, { data: rates, error: rErr }, { data: custs, error: cErr }] =
        await Promise.all([
          supabase
            .from("deliveries")
            .select("customer_id, delivery_date, cow_qty, buffalo_qty")
            .gte("delivery_date", start)
            .lte("delivery_date", end),
          supabase
            .from("customer_rate_history")
            .select("customer_id, cow_price, buffalo_price, effective_from")
            .lte("effective_from", end)
            .order("effective_from", { ascending: true }),
          supabase.from("customers").select("id, cow_price, buffalo_price"),
        ]);
      if (dErr) throw dErr;
      if (rErr) throw rErr;
      if (cErr) throw cErr;

      const ratesByCust = new Map<string, Rate[]>();
      for (const r of (rates ?? []) as Rate[]) {
        const arr = ratesByCust.get(r.customer_id) ?? [];
        arr.push(r);
        ratesByCust.set(r.customer_id, arr);
      }
      const currentByCust = new Map<string, { cow_price: number; buffalo_price: number }>();
      for (const c of (custs ?? []) as Pick<Customer, "id" | "cow_price" | "buffalo_price">[]) {
        currentByCust.set(c.id, { cow_price: Number(c.cow_price), buffalo_price: Number(c.buffalo_price) });
      }

      function rateOn(customerId: string, date: string) {
        const arr = ratesByCust.get(customerId);
        if (!arr || arr.length === 0) {
          return currentByCust.get(customerId) ?? { cow_price: 0, buffalo_price: 0 };
        }
        let chosen = arr[0];
        for (const r of arr) {
          if (r.effective_from <= date) chosen = r;
          else break;
        }
        return { cow_price: Number(chosen.cow_price), buffalo_price: Number(chosen.buffalo_price) };
      }

      const agg = new Map<
        string,
        { cow_litres: number; buffalo_litres: number; cow_amount: number; buffalo_amount: number }
      >();
      for (const d of (deliveries ?? []) as Delivery[]) {
        const r = rateOn(d.customer_id, d.delivery_date);
        const row = agg.get(d.customer_id) ?? {
          cow_litres: 0,
          buffalo_litres: 0,
          cow_amount: 0,
          buffalo_amount: 0,
        };
        row.cow_litres += Number(d.cow_qty);
        row.buffalo_litres += Number(d.buffalo_qty);
        row.cow_amount += Number(d.cow_qty) * r.cow_price;
        row.buffalo_amount += Number(d.buffalo_qty) * r.buffalo_price;
        agg.set(d.customer_id, row);
      }

      if (agg.size === 0) return { created: 0, skipped: 0 };

      // Fetch existing bills to respect issued/paid statuses
      const { data: existing, error: eErr } = await supabase
        .from("bills")
        .select("id, customer_id, status")
        .eq("period_start", start)
        .eq("period_end", end);
      if (eErr) throw eErr;
      const lockedCust = new Set(
        (existing ?? []).filter((b) => b.status === "issued" || b.status === "paid").map((b) => b.customer_id),
      );

      const rows = Array.from(agg.entries())
        .filter(([cid]) => !lockedCust.has(cid))
        .map(([cid, v]) => ({
          owner_id: uid,
          customer_id: cid,
          period_start: start,
          period_end: end,
          cow_litres: Number(v.cow_litres.toFixed(2)),
          buffalo_litres: Number(v.buffalo_litres.toFixed(2)),
          cow_amount: Number(v.cow_amount.toFixed(2)),
          buffalo_amount: Number(v.buffalo_amount.toFixed(2)),
          total_amount: Number((v.cow_amount + v.buffalo_amount).toFixed(2)),
          status: "draft" as BillStatus,
        }));

      if (rows.length > 0) {
        const { error: upErr } = await supabase
          .from("bills")
          .upsert(rows, { onConflict: "customer_id,period_start,period_end" });
        if (upErr) throw upErr;
      }
      return { created: rows.length, skipped: lockedCust.size };
    },
    onSuccess: (r) => {
      toast.success(`Generated ${r.created} bill(s)${r.skipped ? `, skipped ${r.skipped} locked` : ""}`);
      qc.invalidateQueries({ queryKey: ["bills", start, end] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const issueAll = useMutation({
    mutationFn: async () => {
      const ids = (billsQ.data ?? []).filter((b) => b.status === "draft").map((b) => b.id);
      if (ids.length === 0) return 0;
      const { error } = await supabase
        .from("bills")
        .update({ status: "issued", issued_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (n) => {
      if (n > 0) toast.success(`${n} bill(s) issued`);
      else toast("No draft bills to issue");
      qc.invalidateQueries({ queryKey: ["bills", start, end] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const customersById = useMemo(() => {
    const m = new Map<string, Customer & { is_active: boolean }>();
    for (const c of customersQ.data ?? []) m.set(c.id, c);
    return m;
  }, [customersQ.data]);

  const totals = useMemo(() => {
    const bills = billsQ.data ?? [];
    let amount = 0, cowL = 0, buffL = 0, paid = 0;
    for (const b of bills) {
      amount += Number(b.total_amount);
      cowL += Number(b.cow_litres);
      buffL += Number(b.buffalo_litres);
      paid += paidByBill.get(b.id) ?? 0;
    }
    return { amount, cowL, buffL, paid, outstanding: amount - paid, count: bills.length };
  }, [billsQ.data, paidByBill]);

  const [payOpen, setPayOpen] = useState(false);
  const [payBill, setPayBill] = useState<Bill | null>(null);

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-svh w-full">
        <AppSidebar />
        <main className="flex-1 overflow-x-hidden bg-background">
          <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/90 px-4 py-3 backdrop-blur md:px-6">
            <SidebarTrigger />
            <div className="flex-1">
              <h1 className="font-display text-lg font-semibold leading-tight">Billing</h1>
              <p className="text-xs text-muted-foreground">Generate, issue and collect monthly bills.</p>
            </div>
          </header>

          <div className="space-y-5 p-4 md:p-6">
            {/* Period picker + actions */}
            <Card className="p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Month</Label>
                    <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {months.map((m, i) => (
                          <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Year</Label>
                    <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                      <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {years.map((y) => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Period: <span className="font-mono">{start}</span> → <span className="font-mono">{end}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => generate.mutate()} disabled={generate.isPending}>
                    {generate.isPending ? <Loader2 className="size-4 animate-spin" /> : <Hammer className="size-4" />}
                    Generate / refresh drafts
                  </Button>
                  <Button onClick={() => issueAll.mutate()} disabled={issueAll.isPending}>
                    <Send className="size-4" />
                    Issue all drafts
                  </Button>
                </div>
              </div>
            </Card>

            {/* Stats */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={<Receipt className="size-4" />} label="Bills" value={String(totals.count)} />
              <StatCard icon={<IndianRupee className="size-4" />} label="Billed" value={inr(totals.amount)} />
              <StatCard icon={<Wallet className="size-4" />} label="Collected" value={inr(totals.paid)} />
              <StatCard icon={<IndianRupee className="size-4" />} label="Outstanding" value={inr(totals.outstanding)} accent />
            </div>

            {/* Bills table */}
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Cow L</TableHead>
                      <TableHead className="text-right">Buff L</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Due</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billsQ.isLoading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell>
                        </TableRow>
                      ))
                    ) : (billsQ.data ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                          No bills for this period. Click <span className="font-medium">Generate</span> to build drafts from logged deliveries.
                        </TableCell>
                      </TableRow>
                    ) : (
                      (billsQ.data ?? []).map((b) => {
                        const c = customersById.get(b.customer_id);
                        const paid = paidByBill.get(b.id) ?? 0;
                        const due = Math.max(0, Number(b.total_amount) - paid);
                        return (
                          <TableRow key={b.id}>
                            <TableCell>
                              <div className="font-medium">{c?.full_name ?? "—"}</div>
                              {c?.phone && <div className="text-xs text-muted-foreground">{c.phone}</div>}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{Number(b.cow_litres).toFixed(2)}</TableCell>
                            <TableCell className="text-right tabular-nums">{Number(b.buffalo_litres).toFixed(2)}</TableCell>
                            <TableCell className="text-right tabular-nums">{inr(Number(b.total_amount))}</TableCell>
                            <TableCell className="text-right tabular-nums">{inr(paid)}</TableCell>
                            <TableCell className="text-right tabular-nums">{inr(due)}</TableCell>
                            <TableCell><StatusBadge status={b.status} /></TableCell>
                            <TableCell className="text-right">
                              <BillActions
                                bill={b}
                                onRecord={() => { setPayBill(b); setPayOpen(true); }}
                                onChanged={() => {
                                  qc.invalidateQueries({ queryKey: ["bills", start, end] });
                                  qc.invalidateQueries({ queryKey: ["payments", start, end] });
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        </main>
      </div>
      <Toaster />
      <RecordPaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        bill={payBill}
        currentPaid={payBill ? paidByBill.get(payBill.id) ?? 0 : 0}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["bills", start, end] });
          qc.invalidateQueries({ queryKey: ["payments", start, end] });
        }}
      />
    </SidebarProvider>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <Card className={`p-4 ${accent ? "border-primary/40" : ""}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-1 font-display text-2xl font-semibold tabular-nums">{value}</div>
    </Card>
  );
}

function StatusBadge({ status }: { status: BillStatus }) {
  const map: Record<BillStatus, { label: string; cls: string }> = {
    draft: { label: "Draft", cls: "bg-muted text-muted-foreground" },
    issued: { label: "Issued", cls: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
    paid: { label: "Paid", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
    void: { label: "Void", cls: "bg-destructive/15 text-destructive" },
  };
  const s = map[status];
  return <Badge variant="secondary" className={s.cls}>{s.label}</Badge>;
}

function BillActions({ bill, onRecord, onChanged }: { bill: Bill; onRecord: () => void; onChanged: () => void }) {
  const markPaid = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("bills")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", bill.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Marked paid"); onChanged(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const copyLink = async () => {
    if (!bill.share_token) return toast.error("No share token");
    const url = `${window.location.origin}/b/${bill.share_token}`;
    await navigator.clipboard.writeText(url);
    toast.success("Bill link copied");
  };

  return (
    <div className="flex justify-end gap-1">
      <Button size="sm" variant="ghost" onClick={copyLink} title="Copy share link">
        <Copy className="size-4" />
      </Button>
      <Button size="sm" variant="outline" onClick={onRecord} disabled={bill.status === "void"}>
        <Wallet className="size-4" /> Record
      </Button>
      {bill.status !== "paid" && (
        <Button size="sm" onClick={() => markPaid.mutate()} disabled={markPaid.isPending}>
          <CheckCircle2 className="size-4" /> Mark paid
        </Button>
      )}
    </div>
  );
}

function RecordPaymentDialog({
  open,
  onOpenChange,
  bill,
  currentPaid,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bill: Bill | null;
  currentPaid: number;
  onSaved: () => void;
}) {
  const due = bill ? Math.max(0, Number(bill.total_amount) - currentPaid) : 0;
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "upi" | "bank" | "other">("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  // reset when opened
  useMemo(() => {
    if (open && bill) {
      setAmount(due.toFixed(2));
      setMethod("cash");
      setReference("");
      setNotes("");
    }
  }, [open, bill, due]);

  const save = useMutation({
    mutationFn: async () => {
      if (!bill) throw new Error("No bill");
      const amt = Number(amount);
      if (!Number.isFinite(amt) || amt <= 0) throw new Error("Enter a valid amount");
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("Not signed in");
      const { error } = await supabase.from("payments").insert({
        owner_id: uid,
        bill_id: bill.id,
        amount: amt,
        method,
        reference: reference || null,
        notes: notes || null,
      });
      if (error) throw error;

      // Auto-mark paid if fully covered
      const newPaid = currentPaid + amt;
      if (newPaid + 0.005 >= Number(bill.total_amount)) {
        await supabase
          .from("bills")
          .update({ status: "paid", paid_at: new Date().toISOString() })
          .eq("id", bill.id);
      } else if (bill.status === "draft") {
        await supabase
          .from("bills")
          .update({ status: "issued", issued_at: new Date().toISOString() })
          .eq("id", bill.id);
      }
    },
    onSuccess: () => {
      toast.success("Payment recorded");
      onSaved();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            Bill total {bill ? inr(Number(bill.total_amount)) : "—"} · Due {inr(due)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Amount (₹)</Label>
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="bank">Bank transfer</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Reference (optional)</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UPI ref / txn id" />
          </div>
          <div className="space-y-1">
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Save payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
