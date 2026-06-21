import { describe, it, expect } from "vitest";
import { parseConfig } from "../src/core/config.js";
import { buildOutlinePrompt, buildDraftPrompt } from "../src/core/prompts.js";

const base = {
  name: "acme-guide",
  title: "Acme Engineering Guide",
  org: { name: "Acme", githubOrg: "acme" },
  structure: [
    { part: "I — Orientation", sections: [{ num: 1, slug: "about", title: "About" }] },
    { part: "II — Building", sections: [{ num: 2, slug: "backend", title: "Backend" }] },
  ],
  sources: [
    { name: "platform", type: "repo", title: "platform", description: "Core monorepo", path: "sources/code/platform", linkBase: "https://github.com/acme/platform", instructions: "grep the checkout" },
  ],
};

describe("outline prompt", () => {
  const cfg = parseConfig(base, "/tmp/x");
  const p = buildOutlinePrompt(cfg);

  it("names the project and tells the agent to apply structure", () => {
    expect(p).toContain("Acme Engineering Guide");
    expect(p).toContain('palimpsest.config.json "structure"');
  });
  it("includes the sources to ground the outline", () => {
    expect(p).toContain("platform (repo)");
    expect(p).toContain("grep the checkout");
  });
  it("recommends adding sources when none exist", () => {
    const empty = parseConfig({ ...base, sources: [] }, "/tmp/x");
    expect(buildOutlinePrompt(empty)).toMatch(/pal source add/);
  });
});

describe("draft prompt", () => {
  const cfg = parseConfig(base, "/tmp/x");
  const p = buildDraftPrompt(cfg);

  it("instructs Claude Code Workflow phases at max effort", () => {
    expect(p).toContain("USE WORKFLOWS AND SUBAGENTS");
    expect(p).toContain("Claude Code");
    for (const phase of ["RESEARCH", "GENERATE", "SYNTHESIZE", "AUDIT"]) expect(p).toContain(phase);
    expect(p).toMatch(/highest reasoning effort|MAXIMUM effort/);
  });
  it("enumerates the sections to write with their fragment paths", () => {
    expect(p).toContain("sections/1-about.html");
    expect(p).toContain("sections/2-backend.html");
    expect(p).toContain("SECTIONS TO WRITE (2)");
  });
  it("points at the house-style doc and validate/build", () => {
    expect(p).toContain("AGENTS.md");
    expect(p).toContain("pal validate");
    expect(p).toContain("pal build");
  });
});
