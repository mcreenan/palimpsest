import { describe, it, expect } from "vitest";
import { fromCss, renderRootStyle } from "../src/core/theme/render.js";
import {
  completeWithDefaults,
  deriveTheme,
  mermaidVars,
} from "../src/core/theme/derive.js";
import { TOKEN_NAMES, defaultTheme } from "../src/core/theme/contract.js";

describe("theme", () => {
  it("reads only contract tokens from a CSS file, ignoring brand extras", () => {
    const v = fromCss(":root { --accent: #abc; --maroon: #f00; --bg: #fff; }");
    expect(v["--accent"]).toBe("#abc");
    expect(v["--bg"]).toBe("#fff");
    expect(v["--maroon"]).toBeUndefined();
  });

  it("completeWithDefaults fills every contract slot", () => {
    const v = completeWithDefaults({ "--accent": "#123456" });
    expect(v["--accent"]).toBe("#123456");
    for (const name of TOKEN_NAMES) expect(v[name]).toBeDefined();
  });

  it("derives the Mermaid theme from semantic tokens", () => {
    const v = defaultTheme();
    const m = mermaidVars(v);
    expect(m.primaryBorderColor).toBe(v["--accent"]);
    expect(m.primaryColor).toBe(v["--highlight-subtle"]);
    expect(m.fontFamily).toBe(v["--font-body"]);
  });

  it("deriveTheme fills gaps from related slots (accent-hover from accent)", () => {
    const v = deriveTheme({ "--accent": "#7a0800" });
    expect(v["--accent-hover"]).toMatch(/^#[0-9a-f]{6}$/i);
    expect(v["--accent-hover"]).not.toBe(v["--accent"]);
    // every slot is resolved
    for (const name of TOKEN_NAMES) expect(v[name]).toBeTruthy();
  });

  it("renderRootStyle emits a :root block with the values", () => {
    const css = renderRootStyle({ "--accent": "#7a0800", "--bg": "#fff8f4" });
    expect(css).toContain(":root {");
    expect(css).toContain("--accent: #7a0800;");
  });
});
