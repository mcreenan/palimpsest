---
title: Single sign-on (SAML)
slug: sso-saml
---

# Single sign-on (SAML)

Enterprise organizations can let members sign in with your company's identity
provider (Okta, Entra ID, Google Workspace, and other SAML 2.0 providers) instead
of a Demo Co password.

> SSO is available on the **Enterprise** plan. See [Billing & plans](billing).

## Setting it up

1. As an owner or admin, open **Settings → Security → Single sign-on**.
2. Copy the **ACS URL** and **Entity ID** shown there into a new SAML app in your
   identity provider.
3. Paste your provider's **metadata URL** (or upload the XML) back into Demo Co.
4. Save, then use **Test connection** to confirm a round-trip works before turning
   it on for everyone.

## Just-in-time provisioning

When SSO is on, a member who signs in through your provider for the first time is
added to your org automatically as a **member**. Promote them later if needed —
see [Members & roles](members-and-roles).

## Requiring SSO

Once SSO is verified, you can **require** it so members can no longer sign in with
a password. Keep at least one owner able to sign in by password as a break-glass
account, in case the identity provider is unavailable.

Trouble signing in with SSO? See [Troubleshooting login](troubleshooting-login).
