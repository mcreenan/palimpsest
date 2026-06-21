/**
 * The semantic-token contract.
 *
 * This is the fixed set of CSS custom properties the palimpsest engine CSS
 * consumes. A theme supplies (a subset of) these; `derive.ts` fills the rest and
 * computes the Mermaid theme from them. The engine CSS references ONLY these
 * names — never a brand-specific token like `--maroon` — which is what lets any
 * org restyle the whole guide by providing values here.
 *
 * Default values are palimpsest's own look so a fresh project renders
 * attractively before any theme import.
 */

export interface TokenSlot {
  /** The CSS variable name, including the leading `--`. */
  name: string;
  /** Default value for palimpsest's built-in theme. */
  default: string;
  /** Human group, for `theme check` output and the wizard. */
  group: TokenGroup;
  /** One-line role description. */
  role: string;
  /**
   * If set, when the slot is unspecified by a theme it is derived from another
   * slot rather than using `default`. See `derive.ts`.
   */
  derive?: DeriveRule;
  /** True for primary slots the import wizard should confirm with the user. */
  primary?: boolean;
}

export type TokenGroup =
  | "core"
  | "header"
  | "code"
  | "panel"
  | "viz"
  | "type"
  | "layout";

export type DeriveRule =
  | { kind: "from"; slot: string } // copy another slot verbatim
  | { kind: "darken"; slot: string; amount: number }
  | { kind: "lighten"; slot: string; amount: number }
  | { kind: "mix"; slot: string; with: string; amount: number }; // amount% of `with`

export const TOKENS: TokenSlot[] = [
  // Defaults are a deliberately minimal, neutral palette — near-monochrome with a
  // single calm blue accent, soft semantic panels, a dark header, and system-ui
  // typography. A design system is never required; orgs override via theme import.
  // ── core ────────────────────────────────────────────────────────────────
  { name: "--bg", default: "#ffffff", group: "core", role: "Page background", primary: true },
  { name: "--surface", default: "#fafafa", group: "core", role: "Card / panel surface", derive: { kind: "mix", slot: "--text", with: "--bg", amount: 97 } },
  { name: "--text", default: "#18181b", group: "core", role: "Body text", primary: true },
  { name: "--text-secondary", default: "#52525b", group: "core", role: "Secondary / muted text", derive: { kind: "mix", slot: "--text", with: "--bg", amount: 45 } },
  { name: "--border", default: "#e4e4e7", group: "core", role: "Hairline borders", derive: { kind: "mix", slot: "--text", with: "--bg", amount: 88 } },
  { name: "--accent", default: "#2563eb", group: "core", role: "Primary accent (links, headings, active nav)", primary: true },
  { name: "--accent-hover", default: "#1d4ed8", group: "core", role: "Accent hover / part kicker", derive: { kind: "darken", slot: "--accent", amount: 0.08 }, primary: true },
  { name: "--highlight", default: "#2563eb", group: "core", role: "Highlight (focus ring, badge, draft pill)", derive: { kind: "from", slot: "--accent" }, primary: true },
  { name: "--highlight-subtle", default: "#eff6ff", group: "core", role: "Subtle highlight wash (active nav bg)", derive: { kind: "mix", slot: "--highlight", with: "--bg", amount: 90 } },

  // ── header ──────────────────────────────────────────────────────────────
  { name: "--header-bg", default: "#111827", group: "header", role: "Fixed header background", primary: true },
  { name: "--header-text", default: "#f9fafb", group: "header", role: "Header text / brand", derive: { kind: "mix", slot: "--bg", with: "--header-bg", amount: 4 } },

  // ── code ────────────────────────────────────────────────────────────────
  { name: "--code-bg", default: "#f4f4f5", group: "code", role: "Inline code background", derive: { kind: "mix", slot: "--text", with: "--bg", amount: 92 } },
  { name: "--code-border", default: "#e4e4e7", group: "code", role: "Inline code border", derive: { kind: "mix", slot: "--text", with: "--bg", amount: 88 } },
  { name: "--code-text", default: "#18181b", group: "code", role: "Inline code text", derive: { kind: "from", slot: "--text" } },
  { name: "--codeblock-bg", default: "#18181b", group: "code", role: "Code block background", derive: { kind: "from", slot: "--header-bg" } },
  { name: "--codeblock-text", default: "#f4f4f5", group: "code", role: "Code block text", derive: { kind: "from", slot: "--header-text" } },
  { name: "--codeblock-comment", default: "#a1a1aa", group: "code", role: "Code block comment text", derive: { kind: "mix", slot: "--codeblock-text", with: "--codeblock-bg", amount: 40 } },
  { name: "--id-line", default: "#d4d4d8", group: "code", role: "Identifier dotted underline", derive: { kind: "mix", slot: "--text", with: "--bg", amount: 78 } },

  // ── panels (info / tip / warning / danger) — soft, low-saturation tints ────
  { name: "--info-bg", default: "#eff6ff", group: "panel", role: "Info panel background", derive: { kind: "mix", slot: "--info-border", with: "--bg", amount: 78 } },
  { name: "--info-border", default: "#bfdbfe", group: "panel", role: "Info panel border" },
  { name: "--info-text", default: "#1e40af", group: "panel", role: "Info panel icon/text", derive: { kind: "darken", slot: "--info-border", amount: 0.3 } },
  { name: "--tip-bg", default: "#f0fdf4", group: "panel", role: "Tip/success panel background", derive: { kind: "mix", slot: "--tip-border", with: "--bg", amount: 80 } },
  { name: "--tip-border", default: "#bbf7d0", group: "panel", role: "Tip/success panel border" },
  { name: "--tip-text", default: "#166534", group: "panel", role: "Tip/success panel icon/text", derive: { kind: "darken", slot: "--tip-border", amount: 0.32 } },
  { name: "--warning-bg", default: "#fffbeb", group: "panel", role: "Warning panel background", derive: { kind: "mix", slot: "--warning-border", with: "--bg", amount: 80 } },
  { name: "--warning-border", default: "#fde68a", group: "panel", role: "Warning panel border" },
  { name: "--warning-text", default: "#92400e", group: "panel", role: "Warning panel icon/text", derive: { kind: "darken", slot: "--warning-border", amount: 0.34 } },
  { name: "--danger-bg", default: "#fef2f2", group: "panel", role: "Danger panel background", derive: { kind: "mix", slot: "--danger-border", with: "--bg", amount: 80 } },
  { name: "--danger-border", default: "#fecaca", group: "panel", role: "Danger panel border" },
  { name: "--danger-text", default: "#991b1b", group: "panel", role: "Danger panel icon/text", derive: { kind: "darken", slot: "--danger-border", amount: 0.34 } },

  // ── data-viz ──────────────────────────────────────────────────────────────
  { name: "--viz-1", default: "#2563eb", group: "viz", role: "Data-viz series 1", derive: { kind: "from", slot: "--accent" } },
  { name: "--viz-2", default: "#16a34a", group: "viz", role: "Data-viz series 2", derive: { kind: "from", slot: "--tip-text" } },

  // ── type (system-ui — good typography with zero bundled fonts) ─────────────
  { name: "--font-heading", default: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", group: "type", role: "Heading font stack", primary: true },
  { name: "--font-body", default: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", group: "type", role: "Body font stack", primary: true },
  { name: "--font-mono", default: "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace", group: "type", role: "Monospace font stack" },

  // ── layout ────────────────────────────────────────────────────────────────
  { name: "--header-h", default: "64px", group: "layout", role: "Header height" },
  { name: "--toc-w", default: "300px", group: "layout", role: "Table-of-contents width" },
  { name: "--content-max", default: "900px", group: "layout", role: "Content column max width" },
];

export const TOKEN_NAMES: string[] = TOKENS.map((t) => t.name);

const BY_NAME = new Map(TOKENS.map((t) => [t.name, t]));
export function getToken(name: string): TokenSlot | undefined {
  return BY_NAME.get(name);
}

/** A resolved theme: every contract slot mapped to a concrete value. */
export type ThemeValues = Record<string, string>;

/** The built-in default theme (every slot → its `default`). */
export function defaultTheme(): ThemeValues {
  const out: ThemeValues = {};
  for (const t of TOKENS) out[t.name] = t.default;
  return out;
}
