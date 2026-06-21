---
title: API keys
slug: api-keys
---

# API keys

Use an API key to call the Demo Co API from your own scripts and services. Keys
act on behalf of your organization.

## Creating a key

1. Go to **Settings → API keys** (owners and admins only).
2. Click **Create key**, give it a name you'll recognize, and create it.
3. **Copy the key now** — we show the full value only once. Store it in a secret
   manager, never in source control.

## Using a key

Send it as a bearer token to the API at `https://api.demo.co`:

```sh
curl https://api.demo.co/billing/invoices \
  -H "Authorization: Bearer demo_sk_..."
```

A key has the same permissions as an admin in your org. Treat it like a password.

## Rotating and revoking

- **Rotate** by creating a new key, updating your integrations, then deleting the
  old one.
- **Revoke** a key immediately from **Settings → API keys** if it may have leaked.
  Revocation takes effect at once and cannot be undone.

If you think a key has been exposed, revoke it right away and contact support.
