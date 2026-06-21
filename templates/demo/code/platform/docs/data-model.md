# Data model

Every table lives in its owning service's schema. IDs are UUIDs. Money is stored
as integer **cents** (never floats). Timestamps are `timestamptz` in UTC.

## accounts schema

### `orgs`
The top-level tenant. Everything else hangs off an org.

| Column       | Type          | Notes                          |
|--------------|---------------|--------------------------------|
| `id`         | uuid (PK)     |                                |
| `name`      | text          | Display name.                  |
| `created_at` | timestamptz   | Defaults to `now()`.           |

### `users`
| Column     | Type        | Notes                                        |
|------------|-------------|----------------------------------------------|
| `id`       | uuid (PK)   |                                              |
| `org_id`   | uuid (FK)   | → `orgs.id`. A user belongs to one org.      |
| `email`    | citext      | Unique within an org.                        |
| `role`     | text        | `owner` \| `admin` \| `member`.              |

The first user of an org is its `owner`. There is exactly one owner per org;
transferring ownership reassigns the role.

## billing schema

### `plans`
| Column               | Type      | Notes                              |
|----------------------|-----------|------------------------------------|
| `id`                 | uuid (PK) |                                    |
| `name`               | text      | `free` \| `team` \| `enterprise`.  |
| `monthly_price_cents`| integer   | The recurring base price.          |
| `included_units`     | integer   | Usage included before metering.    |

### `invoices`
| Column        | Type      | Notes                                       |
|---------------|-----------|---------------------------------------------|
| `id`          | uuid (PK) |                                             |
| `org_id`      | uuid      | The org being billed.                       |
| `amount_cents`| integer   | Base price + metered overage.               |
| `status`      | text      | `draft` → `open` → `paid`, or `void`.       |
| `period_start`| timestamptz | Billing cycle start.                      |
| `period_end`  | timestamptz | Billing cycle end.                        |

State machine: an invoice opens as `draft` while the cycle is in progress, becomes
`open` when finalized and sent, `paid` on successful charge, or `void` if cancelled.

## usage schema

### `usage_events`
Append-only metering events. Aggregated per org per billing period when billing
finalizes an invoice.

| Column       | Type        | Notes                                  |
|--------------|-------------|----------------------------------------|
| `id`         | uuid (PK)   |                                        |
| `org_id`     | uuid        | Org that incurred the usage.           |
| `units`      | integer     | Quantity for this event.               |
| `occurred_at`| timestamptz | When the usage happened.               |

## notifications schema

### `notifications`
Delivery log for transactional email and webhooks.

| Column        | Type        | Notes                                      |
|---------------|-------------|--------------------------------------------|
| `id`          | uuid (PK)   |                                            |
| `org_id`      | uuid        | Recipient org.                             |
| `channel`     | text        | `email` \| `webhook`.                      |
| `template`    | text        | e.g. `invoice_receipt`, `member_invite`.   |
| `status`      | text        | `pending` \| `sent` \| `failed`.           |
| `created_at`  | timestamptz | Defaults to `now()`.                       |
