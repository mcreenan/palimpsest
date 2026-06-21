import { describe, it, expect } from "vitest";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseConfig } from "../src/core/config.js";
import { build } from "../src/core/build.js";
import { TOKEN_NAMES } from "../src/core/theme/contract.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const engineCss = fs.readFileSync(path.join(here, "..", "engine", "engine.css"), "utf8");

function makeProject(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pal-build-"));
  fs.mkdirSync(path.join(root, "sections"));
  fs.mkdirSync(path.join(root, "theme"));
  fs.mkdirSync(path.join(root, "changelog"));
  fs.writeFileSync(path.join(root, "theme", "tokens.css"), ":root { --accent: #112233; --header-bg: #003744; }");
  fs.writeFileSync(path.join(root, "sections", "1-about.html"), '<p class="lead annotatable">Hi.</p>');
  fs.writeFileSync(
    path.join(root, "changelog", "CHANGELOG.md"),
    "## 2026-06-21T10:00:00.000Z — First\n- Status: applied\n",
  );
  return root;
}

const raw = {
  name: "acme-engineering-guide",
  title: "Acme Engineering Guide",
  org: { name: "Acme", githubOrg: "acme-inc" },
  output: { dir: "dist" },
  structure: [{ part: "I — Orientation", sections: [{ num: 1, slug: "about", title: "About" }] }],
};

describe("build (integration)", () => {
  it("emits a themed, org-wired bundle", () => {
    const root = makeProject();
    const cfg = parseConfig(raw, root);
    const result = build(cfg);

    const html = fs.readFileSync(path.join(root, "dist", "acme-engineering-guide.html"), "utf8");
    expect(html).toContain("--accent: #112233;"); // theme override applied
    expect(html).toContain('"repoLinkBase": "https://github.com/acme-inc"'); // org seam
    expect(html).toContain('"primaryBorderColor": "#112233"'); // mermaid derived from accent
    expect(html).toContain("<!-- BEGIN SECTION 1: about -->");
    expect(result.version).toBe("v1");
    expect(fs.existsSync(path.join(root, "dist", "changelog.html"))).toBe(true);
    expect(fs.existsSync(path.join(root, "dist", "vendor", "mermaid.min.js"))).toBe(true);
  });

  it("inline mode emits a single HTML file with no css/js siblings", () => {
    const root = makeProject();
    const cfg = parseConfig({ ...raw, output: { dir: "dist", inline: true } }, root);
    build(cfg);
    expect(fs.existsSync(path.join(root, "dist", "acme-engineering-guide.css"))).toBe(false);
    const html = fs.readFileSync(path.join(root, "dist", "acme-engineering-guide.html"), "utf8");
    expect(html).toContain("<style>");
    expect(html).toContain("window.__PAL__");
  });

  it("--check writes nothing", () => {
    const root = makeProject();
    const cfg = parseConfig(raw, root);
    build(cfg, { check: true });
    expect(fs.existsSync(path.join(root, "dist"))).toBe(false);
  });
});

describe("engine invariants", () => {
  it("engine.css references only semantic contract tokens", () => {
    const refs = new Set(
      [...engineCss.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]!),
    );
    const known = new Set(TOKEN_NAMES);
    const unknown = [...refs].filter((r) => !known.has(r));
    expect(unknown).toEqual([]);
  });
});
