/** Billing service — plans, invoices, and payment. */

export interface Plan {
  id: string;
  name: "free" | "team" | "enterprise";
  monthlyPriceCents: number;
  /** Usage included before metered overage kicks in. */
  includedUnits: number;
}

export interface Invoice {
  id: string;
  orgId: string; // an Invoice belongs to an Org
  amountCents: number;
  status: "draft" | "open" | "paid" | "void";
  periodStart: Date;
  periodEnd: Date;
}

/**
 * Owned tables: `plans`, `invoices`.
 *
 * Billing reads usage counters from the `usage` service (via the gateway) when
 * finalizing an invoice — it never queries the usage schema directly.
 */
export class BillingService {
  async invoicesForOrg(orgId: string): Promise<Invoice[]> {
    // SELECT * FROM invoices WHERE org_id = $1 ORDER BY period_start DESC
    return [];
  }

  /**
   * Finalize the current draft invoice for an org: base plan price plus metered
   * overage above the plan's included units. Moves draft → open and enqueues an
   * invoice_receipt notification.
   */
  async finalizeInvoice(orgId: string): Promise<Invoice> {
    // 1. plan = SELECT … FROM plans JOIN orgs …
    // 2. units = GET /usage/total?period=current  (through the gateway)
    // 3. overage = max(0, units - plan.includedUnits) * UNIT_PRICE_CENTS
    // 4. amount = plan.monthlyPriceCents + overage
    // 5. UPDATE invoices SET amount_cents = $, status = 'open' WHERE …
    throw new Error("not implemented in the sample");
  }

  /** Attempt payment. On success: open → paid. Failed charges retry for 7 days. */
  async chargeInvoice(invoiceId: string): Promise<Invoice> {
    // Calls the payment processor; on success UPDATE invoices SET status='paid'.
    throw new Error("not implemented in the sample");
  }
}
