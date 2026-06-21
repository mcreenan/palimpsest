import { describe, it, expect } from "vitest";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import {
  defaultInstructions,
  renderSourcesBlock,
  sourcesSummary,
  applySourcesToAgents,
  SOURCES_START,
  SOURCES_END,
} from "../src/core/sources.js";
import type { SourceDef } from "../src/core/config.js";

const sources: SourceDef[] = [
  { name: "wiki", type: "confluence", title: "Wiki", description: "The wiki", instructions: "search + get" },
  { name: "platform", type: "repo", title: "platform", description: "Core repo", path: "sources/code/platform", linkBase: "https://github.com/x/platform", instructions: "grep it" },
];

describe("sources", () => {
  it("seeds per-type agent instructions", () => {
    expect(defaultInstructions("confluence", { name: "wiki" })).toMatch(/search/i);
    expect(defaultInstructions("repo", { name: "platform", path: "sources/code/platform" })).toContain("sources/code/platform");
    expect(defaultInstructions("help", { name: "hc" })).toMatch(/help/i);
  });

  it("seeds wiki instructions, adapting to a local checkout vs a remote source", () => {
    const remote = defaultInstructions("wiki", { name: "wiki" });
    expect(remote).toMatch(/search/i);
    expect(remote).toMatch(/ADR|architecture decision/i);
    const local = defaultInstructions("wiki", { name: "wiki", path: "sources/docs/wiki" });
    expect(local).toContain("sources/docs/wiki");
  });

  it("renders a managed block and a one-line summary", () => {
    const block = renderSourcesBlock(sources);
    expect(block).toContain("#### Wiki (confluence)");
    expect(block).toContain("Local path: `sources/code/platform`");
    expect(sourcesSummary(sources)).toBe(
      'Wiki (confluence) and platform (repo) — see AGENTS.md "Sources of truth" for how to query and cite each.',
    );
    expect(sourcesSummary([])).toBeUndefined();
  });

  it("replaces the managed block in AGENTS.md, leaving surrounding prose intact", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pal-src-"));
    const file = path.join(dir, "AGENTS.md");
    fs.writeFileSync(file, `# Doc\n\nBefore.\n\n${SOURCES_START}\nold\n${SOURCES_END}\n\nAfter.\n`);
    applySourcesToAgents(dir, sources);
    const out = fs.readFileSync(file, "utf8");
    expect(out).toContain("Before.");
    expect(out).toContain("After.");
    expect(out).toContain("#### platform (repo)");
    expect(out).not.toContain("old");
    // idempotent
    applySourcesToAgents(dir, sources);
    expect((fs.readFileSync(file, "utf8").match(/#### platform/g) || []).length).toBe(1);
  });

  it("appends a Sources section when markers are missing", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pal-src2-"));
    const file = path.join(dir, "AGENTS.md");
    fs.writeFileSync(file, "# Doc\n\nNo markers here.\n");
    applySourcesToAgents(dir, sources);
    const out = fs.readFileSync(file, "utf8");
    expect(out).toContain("## Sources of truth");
    expect(out).toContain(SOURCES_START);
  });
});
