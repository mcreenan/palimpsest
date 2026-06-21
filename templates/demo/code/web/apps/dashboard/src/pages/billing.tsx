import { useInvoices } from "@demo/api-client";
import { Table, Money, StatusBadge } from "@demo/ui";

/**
 * Billing page — lists the org's invoices. Read-only; plan changes and card
 * updates live on the Settings → Billing route.
 *
 * Mirrors the billing service's invoice model (platform/services/billing). The
 * status values shown here are exactly the backend's: draft, open, paid, void.
 */
export default function BillingPage() {
  const { data: invoices, isLoading } = useInvoices();

  if (isLoading) return <p>Loading invoices…</p>;

  return (
    <section>
      <h1>Billing</h1>
      <Table
        columns={["Period", "Amount", "Status"]}
        rows={(invoices ?? []).map((inv) => [
          formatPeriod(inv.periodStart, inv.periodEnd),
          <Money cents={inv.amountCents} key="amt" />,
          <StatusBadge status={inv.status} key="status" />,
        ])}
        empty="No invoices yet — your first one is generated at the end of the cycle."
      />
    </section>
  );
}

function formatPeriod(start: string, end: string): string {
  const fmt = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}
