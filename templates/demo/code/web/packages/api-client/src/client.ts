/**
 * Typed client for the platform gateway. This is the ONLY place in the frontend
 * that knows endpoint URLs and shapes. Apps consume the hooks in `index.ts`,
 * which wrap these calls.
 *
 * Auth is the session cookie, sent automatically with `credentials: "include"`.
 */
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export interface Invoice {
  id: string;
  amountCents: number;
  status: "draft" | "open" | "paid" | "void";
  periodStart: string;
  periodEnd: string;
}

export interface Member {
  id: string;
  email: string;
  role: "owner" | "admin" | "member";
  isCurrentUser: boolean;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(BASE + path, { credentials: "include" });
  if (res.status === 401) throw new SessionExpiredError();
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export class SessionExpiredError extends Error {}

export const api = {
  listInvoices: () => get<Invoice[]>("/billing/invoices"),
  listMembers: () => get<Member[]>("/accounts/members"),
};
