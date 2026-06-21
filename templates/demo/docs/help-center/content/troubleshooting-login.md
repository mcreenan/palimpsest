---
title: Troubleshooting login
slug: troubleshooting-login
---

# Troubleshooting login

Can't get in? Work through these in order.

## "Session expired" or you keep getting logged out

Your session timed out or your browser is blocking cookies. Sign in again, and
make sure cookies are enabled for `demo.co`. If you use private/incognito windows,
each one starts a fresh session.

## Forgot your password

Use **Forgot password** on the sign-in page. We email a reset link that's valid for
one hour. If it doesn't arrive, check spam and confirm you're using the address
your org invited.

## You sign in with SSO

If your organization uses [single sign-on](sso-saml), use the **Sign in with SSO**
button, not a password — your password may not exist at all. Enter your work email
and you'll be sent to your company's identity provider.

If SSO fails:

- Confirm your IT admin has assigned you the Demo Co app in your provider.
- Ask an org admin to re-run **Test connection** on **Settings → Security**.

## You were removed from the org

If an admin removed you, access ends immediately and you'll see "no access". Ask an
owner or admin to re-invite you — see [Members & roles](members-and-roles).

## Still stuck

Contact support with the email you're using and a screenshot of the error. We can
see whether the sign-in reached us and why it was rejected.
