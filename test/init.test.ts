import { describe, it, expect } from "vitest";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { runInit } from "../src/commands/init.js";
import { scaffold, deriveOrgName, slugify } from "../src/core/scaffold.js";
import { importTheme } from "../src/core/theme/import-css.js";

describe("scaffold helpers", () => {
  it("derives an org name from a project name", () => {
    expect(deriveOrgName("acme-engineering-guide")).toBe("Acme");
    expect(slugify("Widgets Inc")).toBe("widgets-inc");
  });

  it("writes a complete project tree", () => {
    const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "pal-scaf-")), "g");
    scaffold(
      { name: "g", dir, orgName: "Acme", githubOrg: "acme", title: "Acme Guide" },
      "2026-06-21",
    );
    for (const f of [
      "palimpsest.config.json",
      "package.json",
      "theme/tokens.css",
      "sections/1-about.html",
      "AGENTS.md",
      "changelog/CHANGELOG.md",
      ".gitignore",
    ]) {
      expect(fs.existsSync(path.join(dir, f)), f).toBe(true);
    }
    const tokens = fs.readFileSync(path.join(dir, "theme", "tokens.css"), "utf8");
    expect(tokens).toContain("--accent:");
  });
});

describe("init (end to end)", () => {
  it("scaffolds and builds a viewable artifact", async () => {
    const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "pal-init-")), "acme-guide");
    await runInit({
      yes: true,
      name: "acme-guide",
      org: "Acme",
      "github-org": "acme-inc",
      dir,
      install: false,
    });
    const html = fs.readFileSync(path.join(dir, "acme-guide.html"), "utf8");
    expect(html).toContain("Acme Engineering Guide");
    expect(html).toContain('"repoLinkBase": "https://github.com/acme-inc"');
    expect(fs.existsSync(path.join(dir, "changelog.html"))).toBe(true);
  });
});

describe("theme import", () => {
  it("maps brand synonyms onto contract slots and derives the rest", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pal-theme-"));
    const file = path.join(dir, "brand.css");
    fs.writeFileSync(
      file,
      ":root { --primary: #2e1065; --background: #faf9ff; --foreground: #1a1523; --font-sans: 'Inter', sans-serif; }",
    );
    const r = importTheme(file);
    expect(r.values["--accent"]).toBe("#2e1065"); // --primary → --accent
    expect(r.values["--bg"]).toBe("#faf9ff"); // --background → --bg
    expect(r.values["--text"]).toBe("#1a1523"); // --foreground → --text
    expect(r.values["--font-body"]).toContain("Inter"); // --font-sans → --font-body
    expect(r.mapped).toContain("--accent");
    // unmapped slots are still filled
    expect(r.values["--accent-hover"]).toBeTruthy();
  });
});
