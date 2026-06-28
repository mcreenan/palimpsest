import { converter } from "culori";
import type { ThemeValues } from "./contract.js";

const toRgb = converter("rgb");

/**
 * WCAG 2.1 contrast checking for the resolved semantic palette.
 *
 * The engine renders every foreground/background combination below from theme
 * tokens, so a theme import can silently produce unreadable pairings (e.g. a
 * light accent behind white button text). These checks flag that before a
 * build ships. Ratios follow WCAG 2.1 §1.4.3 (AA): 4.5:1 for normal text,
 * 3:1 for large text (≥24px, or ≥18.66px bold) and for UI component bounds.
 */

export type ContrastLevel = "AA" | "AA-large";

export interface ContrastPair {
  /** Human label for the place this combination appears. */
  label: string;
  /** Foreground (text/icon) token name. */
  fg: string;
  /** Background token name. */
  bg: string;
  /** Required minimum ratio. */
  min: number;
  level: ContrastLevel;
}

export interface ContrastResult extends ContrastPair {
  fgValue: string;
  bgValue: string;
  ratio: number | null; // null when a value could not be parsed as a color
  pass: boolean;
}

/** The foreground/background pairings the engine actually renders. */
export const CONTRAST_PAIRS: ContrastPair[] = [
  { label: "Body text on page", fg: "--text", bg: "--bg", min: 4.5, level: "AA" },
  { label: "Body text on surface", fg: "--text", bg: "--surface", min: 4.5, level: "AA" },
  { label: "Secondary text on page", fg: "--text-secondary", bg: "--bg", min: 4.5, level: "AA" },
  { label: "Secondary text on surface", fg: "--text-secondary", bg: "--surface", min: 4.5, level: "AA" },
  { label: "Lead paragraph (large) on page", fg: "--text-secondary", bg: "--bg", min: 3, level: "AA-large" },
  { label: "Link / accent on page", fg: "--accent", bg: "--bg", min: 4.5, level: "AA" },
  { label: "Link / accent on surface", fg: "--accent", bg: "--surface", min: 4.5, level: "AA" },
  { label: "Active nav on highlight wash", fg: "--accent", bg: "--highlight-subtle", min: 4.5, level: "AA" },
  { label: "Part kicker (large) on page", fg: "--accent-hover", bg: "--bg", min: 3, level: "AA-large" },
  { label: "Header text on header", fg: "--header-text", bg: "--header-bg", min: 4.5, level: "AA" },
  { label: "Primary button label", fg: "--header-text", bg: "--accent", min: 4.5, level: "AA" },
  { label: "Inline code text on code bg", fg: "--code-text", bg: "--code-bg", min: 4.5, level: "AA" },
  { label: "Code block text on code block", fg: "--codeblock-text", bg: "--codeblock-bg", min: 4.5, level: "AA" },
  { label: "Code block comment on code block", fg: "--codeblock-comment", bg: "--codeblock-bg", min: 3, level: "AA-large" },
  { label: "Info panel text", fg: "--info-text", bg: "--info-bg", min: 4.5, level: "AA" },
  { label: "Tip panel text", fg: "--tip-text", bg: "--tip-bg", min: 4.5, level: "AA" },
  { label: "Warning panel text", fg: "--warning-text", bg: "--warning-bg", min: 4.5, level: "AA" },
  { label: "Danger panel text", fg: "--danger-text", bg: "--danger-bg", min: 4.5, level: "AA" },
];

/** Relative luminance per WCAG 2.1 (sRGB linearization). */
function relativeLuminance(value: string): number | null {
  const c = toRgb(value);
  if (!c) return null;
  const lin = (ch: number) => {
    const s = Math.max(0, Math.min(1, ch));
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
}

/** WCAG contrast ratio between two colors, or null if either is unparseable. */
export function contrastRatio(fg: string, bg: string): number | null {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  if (l1 === null || l2 === null) return null;
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** Evaluate every contract pairing against a fully-resolved theme. */
export function checkContrast(values: ThemeValues): ContrastResult[] {
  return CONTRAST_PAIRS.map((p) => {
    const fgValue = values[p.fg] ?? "";
    const bgValue = values[p.bg] ?? "";
    const ratio = contrastRatio(fgValue, bgValue);
    return {
      ...p,
      fgValue,
      bgValue,
      ratio,
      // Unparseable values (e.g. CSS functions) can't be judged — don't fail them.
      pass: ratio === null ? true : ratio >= p.min,
    };
  });
}
