/** Usage service — metering. Ingests usage events; aggregates for billing. */

export interface UsageEvent {
  id: string;
  orgId: string;
  units: number;
  occurredAt: Date;
}

/**
 * Owned table: `usage_events` (append-only).
 *
 * Other services record usage by calling the gateway, which routes here. Billing
 * asks for a period total when it finalizes an invoice.
 */
export class UsageService {
  /** Record metered usage. Append-only — events are never updated or deleted. */
  async record(orgId: string, units: number): Promise<void> {
    // INSERT INTO usage_events (org_id, units, occurred_at) VALUES ($1, $2, now())
  }

  /** Total units for an org within a billing period. Read by billing. */
  async totalForPeriod(orgId: string, start: Date, end: Date): Promise<number> {
    // SELECT COALESCE(SUM(units), 0) FROM usage_events
    //   WHERE org_id = $1 AND occurred_at >= $2 AND occurred_at < $3
    return 0;
  }
}
