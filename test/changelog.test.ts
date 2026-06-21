import { describe, it, expect } from "vitest";
import {
  parseChangelog,
  deriveVersion,
  deriveUpdated,
  renderEntries,
} from "../src/core/changelog.js";

const SAMPLE = `# Guide — Changelog

Entry format docs with a fenced example that must be IGNORED:

\`\`\`
## 2099-01-01 — Not a real entry
- Status: applied
\`\`\`

## 2026-06-21T14:30:00.000Z — Section 1: About (reword)
- Source file: sections/1-about.html
- Change type: reword
- Suggestion: "Make it punchier"
- Status: applied

## 2026-06-20 — Baseline
- Initial version frozen.
- Status: baseline
`;

describe("changelog", () => {
  const entries = parseChangelog(SAMPLE);

  it("ignores fenced examples and parses real entries", () => {
    expect(entries).toHaveLength(2);
    expect(entries[0]!.title).toBe("Section 1: About (reword)");
  });

  it("derives version from entry count", () => {
    expect(deriveVersion(entries)).toBe("v2");
  });

  it("derives updated to the minute in UTC when the stamp has a clock", () => {
    expect(deriveUpdated(entries)).toBe("2026-06-21 14:30");
  });

  it("renders date-only when no entry has a clock component", () => {
    const dateOnly = parseChangelog("## 2026-06-20 — X\n- Status: applied\n");
    expect(deriveUpdated(dateOnly)).toBe("2026-06-20");
  });

  it("strips the Status bullet from the body and classes the badge", () => {
    const html = renderEntries(entries);
    expect(html).toContain("status-applied");
    expect(html).toContain("status-baseline");
    expect(html).not.toContain("<li>Status:");
  });

  it("bolds short lead-in labels", () => {
    const html = renderEntries(entries);
    expect(html).toContain("<strong>Source file:</strong>");
  });
});
