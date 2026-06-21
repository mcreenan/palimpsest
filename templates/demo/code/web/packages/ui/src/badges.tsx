/** Small token-driven presentational badges shared across apps. */

/** Render integer cents as a localized currency string. */
export function Money({ cents }: { cents: number }) {
  return <span className="money">${(cents / 100).toFixed(2)}</span>;
}

/** Invoice status pill — colors come from tokens, labels match the backend. */
export function StatusBadge({ status }: { status: "draft" | "open" | "paid" | "void" }) {
  return <span className={`badge badge--${status}`}>{status}</span>;
}

/** Member role pill: owner / admin / member. */
export function RoleBadge({ role }: { role: "owner" | "admin" | "member" }) {
  return <span className={`badge badge--role-${role}`}>{role}</span>;
}
