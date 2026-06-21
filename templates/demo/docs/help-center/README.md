# help-center

Customer-facing help articles for Demo Co, published with Astro. Article source is
Markdown under `content/`; the published site is at https://help.demo.co.

This is authoritative for **product-facing behavior** — what a customer can do in
the app and what to expect. Where it describes a rule enforced by the backend
(plans, roles, invoice states), it must agree with the `platform` repo.

## Articles

| Slug                  | Title                          |
|-----------------------|--------------------------------|
| `getting-started`     | Getting started                |
| `members-and-roles`   | Members & roles                |
| `billing`             | Billing & plans                |
| `usage-and-limits`    | Usage & limits                 |
| `api-keys`            | API keys                       |
| `sso-saml`            | Single sign-on (SAML)          |
| `notifications`       | Email & webhook notifications  |
| `troubleshooting-login` | Troubleshooting login        |

Each file has frontmatter (`title`, `slug`); the slug becomes the URL at
`https://help.demo.co/<slug>`.
