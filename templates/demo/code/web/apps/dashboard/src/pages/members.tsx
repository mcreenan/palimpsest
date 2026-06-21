import { useMembers, useInviteMember } from "@demo/api-client";
import { Table, Button, RoleBadge } from "@demo/ui";

/**
 * Members page — view teammates and (for owners/admins) invite new ones.
 *
 * Roles match the accounts service: owner, admin, member. The UI hides the
 * invite control from plain members; the backend enforces the same rule, so the
 * hidden button is convenience, not security.
 */
export default function MembersPage() {
  const { data: members } = useMembers();
  const invite = useInviteMember();
  const me = members?.find((m) => m.isCurrentUser);
  const canInvite = me?.role === "owner" || me?.role === "admin";

  return (
    <section>
      <h1>Members</h1>
      <Table
        columns={["Email", "Role"]}
        rows={(members ?? []).map((m) => [m.email, <RoleBadge role={m.role} key="r" />])}
      />
      {canInvite && (
        <Button onClick={() => invite.prompt()}>Invite member</Button>
      )}
    </section>
  );
}
