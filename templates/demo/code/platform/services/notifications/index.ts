/** Notifications service — transactional email and webhooks. */

export type Channel = "email" | "webhook";

export type Template =
  | "invoice_receipt"
  | "member_invite"
  | "usage_alert"
  | "payment_failed";

export interface Notification {
  id: string;
  orgId: string;
  channel: Channel;
  template: Template;
  status: "pending" | "sent" | "failed";
  createdAt: Date;
}

/**
 * Owned table: `notifications`.
 *
 * Other services enqueue a notification (through the gateway); a background
 * worker delivers it and records the outcome. Delivery is retried with backoff.
 */
export class NotificationsService {
  /** Queue a notification for delivery. Returns immediately. */
  async enqueue(orgId: string, template: Template, channel: Channel = "email"): Promise<Notification> {
    // INSERT INTO notifications (org_id, channel, template, status)
    //   VALUES ($1, $3, $2, 'pending')
    throw new Error("not implemented in the sample");
  }

  /** Delivery worker tick — sends pending notifications, marks sent/failed. */
  async deliverPending(): Promise<void> {
    // SELECT … WHERE status = 'pending' FOR UPDATE SKIP LOCKED
  }
}
