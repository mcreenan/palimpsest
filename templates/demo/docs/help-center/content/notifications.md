---
title: Email & webhook notifications
slug: notifications
---

# Email & webhook notifications

Demo Co keeps you informed two ways: **email** for people and **webhooks** for
your systems.

## Email

Some emails are always sent (you can't turn these off):

- **Invoice receipts** when an invoice is paid.
- **Member invites** when you're added to an org.
- **Payment failed** if a charge doesn't go through.

Optional emails you can toggle on **Settings → Notifications**:

- **Usage alerts** when you cross a usage threshold — see [Usage & limits](usage-and-limits).

## Webhooks

Get the same events delivered to your own endpoint as JSON.

1. On **Settings → Notifications → Webhooks**, add an endpoint URL.
2. Choose which events to send (invoices, usage alerts, member changes).
3. Verify each delivery with the signature in the `Demo-Signature` header.

We retry a failed webhook with backoff for up to 24 hours. Check **recent
deliveries** on the same page to see what we sent and the response we got.

## Troubleshooting

- Not getting email? Check spam, and confirm your address on **Settings → Profile**.
- Webhook not firing? Confirm the endpoint returns a `2xx` quickly — slow or
  error responses are treated as failures and retried.
