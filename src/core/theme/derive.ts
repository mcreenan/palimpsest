import { converter, formatHex, interpolate } from "culori";
import {
  TOKENS,
  type ThemeValues,
  type TokenSlot,
  defaultTheme,
} from "./contract.js";

const toOklch = converter("oklch");

function adjustLightness(color: string, delta: number): string {
  const c = toOklch(color);
  if (!c) return color;
  const l = Math.max(0, Math.min(1, (c.l ?? 0) + delta));
  return formatHex({ ...c, l }) ?? color;
}

/** Mix `amount`% of `b` into `a` (perceptual srgb interpolation). */
function mix(a: string, b: string, amount: number): string {
  const t = Math.max(0, Math.min(1, amount / 100));
  const f = interpolate([a, b], "rgb");
  return formatHex(f(t)) ?? a;
}

/** Is this slot a color (vs. a font stack or layout size)? */
function isColorSlot(slot: TokenSlot): boolean {
  return slot.group !== "type" && slot.group !== "layout";
}

/**
 * Fill any contract slot missing from `partial` using its `derive` rule,
 * resolving dependencies recursively. Cycles and unresolved deps fall back to
 * the slot's static default. Used by `theme import` to produce a complete,
 * explicit token set from a handful of primaries.
 */
export function deriveTheme(partial: ThemeValues): ThemeValues {
  const out: ThemeValues = {};
  const resolving = new Set<string>();

  const resolve = (name: string): string => {
    if (out[name] !== undefined) return out[name]!;
    const slot = TOKENS.find((t) => t.name === name);
    if (!slot) return partial[name] ?? "";
    if (partial[name] !== undefined) return (out[name] = partial[name]!);
    if (!slot.derive || resolving.has(name)) return (out[name] = slot.default);

    resolving.add(name);
    const d = slot.derive;
    let value: string;
    switch (d.kind) {
      case "from":
        value = resolve(d.slot);
        break;
      case "lighten":
        value = adjustLightness(resolve(d.slot), d.amount);
        break;
      case "darken":
        value = adjustLightness(resolve(d.slot), -d.amount);
        break;
      case "mix":
        value = mix(resolve(d.slot), resolve(d.with), d.amount);
        break;
    }
    resolving.delete(name);
    return (out[name] = value || slot.default);
  };

  for (const t of TOKENS) resolve(t.name);
  return out;
}

/** Fill gaps from `partial` with each slot's static default (no derivation). */
export function completeWithDefaults(partial: ThemeValues): ThemeValues {
  return { ...defaultTheme(), ...stripUnknown(partial) };
}

/** Keep only keys that are real contract tokens. */
export function stripUnknown(values: ThemeValues): ThemeValues {
  const out: ThemeValues = {};
  for (const t of TOKENS) {
    if (values[t.name] !== undefined) out[t.name] = values[t.name]!;
  }
  return out;
}

/**
 * Compute Mermaid `themeVariables` from a complete token set. Mirrors the
 * original hand-tuned mapping, but sourced entirely from the semantic tokens so
 * every project's diagrams match its palette automatically.
 */
export function mermaidVars(v: ThemeValues): Record<string, string> {
  const g = (name: string) => v[name] ?? "";
  return {
    fontFamily: g("--font-body"),
    fontSize: "14px",
    primaryColor: g("--highlight-subtle"),
    primaryBorderColor: g("--accent"),
    primaryTextColor: g("--text"),
    lineColor: g("--text-secondary"),
    secondaryColor: g("--info-bg"),
    secondaryBorderColor: g("--header-bg"),
    secondaryTextColor: g("--text"),
    tertiaryColor: g("--tip-bg"),
    tertiaryBorderColor: g("--tip-text"),
    tertiaryTextColor: g("--text"),
    clusterBkg: g("--surface"),
    clusterBorder: g("--border"),
    titleColor: g("--accent"),
    edgeLabelBackground: g("--bg"),
    nodeBorder: g("--accent"),
  };
}

export { isColorSlot };
