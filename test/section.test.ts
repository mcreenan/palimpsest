import { describe, it, expect, afterEach } from "vitest";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { scaffold } from "../src/core/scaffold.js";
import { runSection } from "../src/commands/section.js";

const cwd0 = process.cwd();
afterEach(() => process.chdir(cwd0));

function project(): string {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "pal-sec-")), "g");
  scaffold({ name: "g", dir, orgName: "Acme", githubOrg: "acme", title: "Acme Guide" }, "2026-06-21");
  // ensure the two starter fragments exist with predictable names
  fs.writeFileSync(path.join(dir, "sections", "1-about.html"), "<p>1</p>");
  fs.writeFileSync(path.join(dir, "sections", "2-getting-started.html"), "<p>2</p>");
  return dir;
}

function structure(dir: string) {
  return JSON.parse(fs.readFileSync(path.join(dir, "palimpsest.config.json"), "utf8")).structure;
}

describe("section command", () => {
  it("appends a section to a named part and creates its fragment", async () => {
    const dir = project();
    process.chdir(dir);
    await runSection("add", "testing", { title: "Testing", part: "II — Building", yes: true });
    const s = structure(dir);
    expect(s.find((p: any) => p.part === "II — Building").sections[0]).toMatchObject({ num: 3, slug: "testing" });
    expect(fs.existsSync(path.join(dir, "sections", "3-testing.html"))).toBe(true);
  });

  it("inserts with --after and renumbers later sections + their files", async () => {
    const dir = project();
    process.chdir(dir);
    await runSection("add", "overview", { title: "Overview", after: 1, yes: true });
    // about=1, overview=2, getting-started shifted to 3
    expect(fs.existsSync(path.join(dir, "sections", "2-overview.html"))).toBe(true);
    expect(fs.existsSync(path.join(dir, "sections", "3-getting-started.html"))).toBe(true);
    expect(fs.existsSync(path.join(dir, "sections", "2-getting-started.html"))).toBe(false);
    const orientation = structure(dir).find((p: any) => p.part.includes("Orientation"));
    expect(orientation.sections.map((x: any) => `${x.num}-${x.slug}`)).toEqual([
      "1-about",
      "2-overview",
      "3-getting-started",
    ]);
  });

  it("removes a section and renumbers the rest down", async () => {
    const dir = project();
    process.chdir(dir);
    await runSection("remove", "about", {});
    expect(fs.existsSync(path.join(dir, "sections", "1-about.html"))).toBe(false);
    expect(fs.existsSync(path.join(dir, "sections", "1-getting-started.html"))).toBe(true);
  });
});
