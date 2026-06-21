/** Accounts service — identity, organizations, and membership. */

export type Role = "owner" | "admin" | "member";

export interface Org {
  id: string;
  name: string;
  createdAt: Date;
}

export interface User {
  id: string;
  orgId: string; // an Org owns its Users
  email: string;
  role: Role;
}

/**
 * Owned tables: `orgs`, `users`.
 *
 * Every method is scoped to an org — the caller is the gateway, which passes the
 * verified `orgId` from the session. Never trust an `orgId` from a request body.
 */
export class AccountsService {
  async listMembers(orgId: string): Promise<User[]> {
    // SELECT * FROM users WHERE org_id = $1 ORDER BY email
    return [];
  }

  async createOrg(name: string, ownerEmail: string): Promise<Org> {
    // 1. INSERT INTO orgs (name) …
    // 2. INSERT INTO users (org_id, email, role) VALUES (…, 'owner')
    // The first user of an org is always its owner.
    throw new Error("not implemented in the sample");
  }

  /** Invite a teammate. Only owners/admins may invite. */
  async inviteMember(orgId: string, email: string, role: Role): Promise<User> {
    // INSERT INTO users (org_id, email, role) … then enqueue a member_invite
    // notification via the gateway.
    throw new Error("not implemented in the sample");
  }

  /** Change a member's role. There is exactly one owner per org. */
  async setRole(orgId: string, userId: string, role: Role): Promise<void> {
    // Transferring ownership demotes the previous owner to admin.
    // UPDATE users SET role = $3 WHERE id = $2 AND org_id = $1
  }
}
