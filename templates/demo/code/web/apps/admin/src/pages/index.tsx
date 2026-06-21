import { useOrgSearch } from "@demo/api-client";
import { Table, Button } from "@demo/ui";

/**
 * Admin console home — Demo Co staff look up a customer org to help with support
 * tickets. Internal only; access is gated behind staff SSO at the gateway.
 *
 * This app reads the same API as the customer dashboard but with a staff session
 * that can act across orgs. It never touches the database directly.
 */
export default function AdminHome() {
  const { results, search } = useOrgSearch();

  return (
    <section>
      <h1>Org lookup</h1>
      <input
        type="search"
        placeholder="Search by org name or owner email"
        onChange={(e) => search(e.target.value)}
      />
      <Table
        columns={["Org", "Plan", "Members", ""]}
        rows={results.map((o) => [
          o.name,
          o.plan,
          String(o.memberCount),
          <Button key="open" href={`/orgs/${o.id}`}>Open</Button>,
        ])}
        empty="Search for an org to begin."
      />
    </section>
  );
}
