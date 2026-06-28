import { describe, it, expect } from "vitest";
import { contrastRatio, checkContrast } from "../src/core/theme/contrast.js";
import { completeWithDefaults } from "../src/core/theme/derive.js";
import { defaultTheme } from "../src/core/theme/contract.js";

describe("contrast", () => {
  it("computes known WCAG ratios", () => {
    // Black on white is the maximum, 21:1.
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    // Identical colors are 1:1.
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
  });

  it("is order-independent", () => {
    const a = contrastRatio("#2563eb", "#ffffff");
    const b = contrastRatio("#ffffff", "#2563eb");
    expect(a).toEqual(b);
  });

  it("returns null for values that are not plain colors", () => {
    expect(contrastRatio("ui-sans-serif, system-ui", "#fff")).toBeNull();
  });

  it("passes the built-in default theme at WCAG AA", () => {
    const results = checkContrast(defaultTheme());
    const fails = results.filter((r) => !r.pass);
    expect(fails, fails.map((f) => `${f.label} ${f.ratio?.toFixed(2)}:1`).join("; ")).toEqual([]);
  });

  it("flags an unreadable accent behind white button text", () => {
    // A pale-yellow accent fails the primary-button pairing (header-text on accent).
    const theme = completeWithDefaults({ "--accent": "#ffe14d", "--header-text": "#ffffff" });
    const results = checkContrast(theme);
    const btn = results.find((r) => r.label === "Primary button label");
    expect(btn?.pass).toBe(false);
  });
});
