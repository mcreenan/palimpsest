import { describe, it, expect } from "vitest";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { splitPart, renderToc, renderContent, escapeHtml } from "../src/core/assemble.js";
import type { PartDef } from "../src/core/config.js";

const structure: PartDef[] = [
  { part: "I — Orientation", sections: [{ num: 1, slug: "about", title: "About & Intro" }] },
  { part: "II — Building", sections: [{ num: 2, slug: "backend", title: "Backend" }] },
];

describe("assemble", () => {
  it("splits a part label into kicker + name", () => {
    expect(splitPart("I — Orientation")).toEqual({ label: "I", name: "Orientation" });
    expect(splitPart("Just A Name")).toEqual({ label: "", name: "Just A Name" });
  });

  it("escapes HTML in titles", () => {
    expect(escapeHtml("A & B <c>")).toBe("A &amp; B &lt;c&gt;");
  });

  it("renders ToC groups and escaped section links", () => {
    const toc = renderToc(structure);
    expect(toc).toContain('toc-group-label">I · Orientation');
    expect(toc).toContain('href="#about"');
    expect(toc).toContain("About &amp; Intro");
  });

  it("injects fragments between markers and reports missing", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pal-sections-"));
    fs.writeFileSync(path.join(dir, "1-about.html"), "<p>hello</p>");
    // section 2 intentionally missing
    const r = renderContent(structure, dir);
    expect(r.used.map((s) => s.slug)).toEqual(["about"]);
    expect(r.missing.map((s) => s.slug)).toEqual(["backend"]);
    expect(r.html).toContain("<!-- BEGIN SECTION 1: about -->");
    expect(r.html).toContain("<p>hello</p>");
    expect(r.html).toContain("<!-- END SECTION 1: about -->");
  });

  it("is idempotent (same structure + fragments → same html)", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pal-sections-"));
    fs.writeFileSync(path.join(dir, "1-about.html"), "<p>hello</p>");
    fs.writeFileSync(path.join(dir, "2-backend.html"), "<p>be</p>");
    expect(renderContent(structure, dir).html).toBe(renderContent(structure, dir).html);
  });
});
