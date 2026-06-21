import { describe, it, expect } from "vitest";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { installLogo, isUrl, isSvgMarkup } from "../src/core/logo.js";
import { parseConfig } from "../src/core/config.js";
import { build } from "../src/core/build.js";

function tmp(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "pal-logo-"));
}

describe("logo input detection", () => {
  it("recognizes URLs and SVG markup", () => {
    expect(isUrl("https://x.com/logo.png")).toBe(true);
    expect(isUrl("/path/logo.png")).toBe(false);
    expect(isSvgMarkup("<svg viewBox='0 0 1 1'></svg>")).toBe(true);
    expect(isSvgMarkup("not svg")).toBe(false);
  });
});

describe("installLogo", () => {
  it("writes pasted SVG markup to assets/logo.svg", async () => {
    const dir = tmp();
    const rel = await installLogo(dir, '<svg width="10" height="10"></svg>');
    expect(rel).toBe("./assets/logo.svg");
    expect(fs.readFileSync(path.join(dir, "assets", "logo.svg"), "utf8")).toContain("<svg");
  });

  it("copies a logo from a file path, preserving the extension", async () => {
    const dir = tmp();
    const src = path.join(dir, "brand.png");
    fs.writeFileSync(src, Buffer.from([1, 2, 3]));
    const rel = await installLogo(dir, src);
    expect(rel).toBe("./assets/logo.png");
    expect(fs.existsSync(path.join(dir, "assets", "logo.png"))).toBe(true);
  });
});

describe("build with logos", () => {
  const raw = {
    name: "g",
    title: "G Guide",
    org: { name: "G Co", githubOrg: "g" },
    output: { dir: "dist" },
    structure: [{ part: "I — Orientation", sections: [{ num: 1, slug: "about", title: "About" }] }],
  };

  function project(): string {
    const root = tmp();
    fs.mkdirSync(path.join(root, "sections"));
    fs.writeFileSync(path.join(root, "sections", "1-about.html"), '<p class="lead annotatable">Hi.</p>');
    return root;
  }

  it("inlines an SVG logo into the header", () => {
    const root = project();
    fs.mkdirSync(path.join(root, "assets"));
    fs.writeFileSync(path.join(root, "assets", "logo.svg"), '<svg id="brandmark"></svg>');
    const cfg = parseConfig({ ...raw, brand: { logo: "./assets/logo.svg" } }, root);
    build(cfg);
    const html = fs.readFileSync(path.join(root, "dist", "g.html"), "utf8");
    expect(html).toContain('<svg id="brandmark">');
    expect(html).not.toContain("brand-logo");
  });

  it("copies a raster logo into the bundle and references it with <img>", () => {
    const root = project();
    fs.mkdirSync(path.join(root, "assets"));
    fs.writeFileSync(path.join(root, "assets", "logo.png"), Buffer.from([1, 2, 3]));
    const cfg = parseConfig({ ...raw, brand: { logo: "./assets/logo.png" } }, root);
    build(cfg);
    const html = fs.readFileSync(path.join(root, "dist", "g.html"), "utf8");
    expect(html).toContain('<img class="brand-logo" src="assets/logo.png"');
    expect(fs.existsSync(path.join(root, "dist", "assets", "logo.png"))).toBe(true);
  });
});
