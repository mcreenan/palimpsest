// Public surface: React hooks that wrap the typed gateway client. Apps import
// these and never call `fetch` themselves.
export { api, SessionExpiredError } from "./client";
export type { Invoice, Member } from "./client";

// The hooks below are thin wrappers over `api.*` with loading/error state. Real
// implementations use the app's data-fetching library; elided in the sample.
export { useInvoices } from "./hooks/useInvoices";
export { useMembers, useInviteMember } from "./hooks/useMembers";
export { useOrgSearch } from "./hooks/useOrgSearch";
