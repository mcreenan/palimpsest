import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";
import { TOKENS, type ThemeValues } from "./contract.js";
import { deriveTheme } from "./derive.js";

/**
 * Candidate source names (without the leading `--`) for each contract slot, in
 * priority order. The slot's own bare name is always tried first. This is the
 * heuristic that lets `pal theme import` map an arbitrary org design system onto
 * palimpsest's semantic slots without hand-editing.
 */
const SYNONYMS: Record<string, string[]> = {
  "--accent": ["primary", "brand", "brand-primary", "brand-color", "color-primary", "primary-color"],
  "--accent-hover": ["primary-hover", "primary-dark", "brand-dark", "link-hover"],
  "--highlight": ["secondary", "brand-secondary", "color-secondary", "accent-2"],
  "--bg": ["background", "background-color", "page-bg", "body-bg"],
  "--surface": ["card", "card-bg", "panel-bg", "elevated", "surface-1"],
  "--text": ["foreground", "fg", "ink", "text-primary", "color-text", "body-color"],
  "--text-secondary": ["muted", "text-muted", "secondary-text", "subtle"],
  "--border": ["border-color", "divider", "rule"],
  "--header-bg": ["navbar-bg", "topbar-bg", "header", "appbar-bg"],
  "--header-text": ["navbar-text", "on-primary", "header-fg"],
  "--code-bg": ["pre-bg"],
  "--info-border": ["info", "blue", "color-info"],
  "--tip-border": ["success", "tip", "green", "color-success", "positive"],
  "--warning-border": ["warning", "amber", "color-warning"],
  "--danger-border": ["danger", "error", "red", "color-danger", "negative", "destructive"],
  "--font-heading": ["font-display", "heading-font", "font-title"],
  "--font-body": ["font-sans", "font-base", "body-font", "font-family", "font"],
  "--font-mono": ["mono", "code-font", "font-code"],
};

/** Parse every `--var: value` declaration from a CSS or JSON token file. */
export function parseVars(file: string): Map<string, string> {
  const ext = path.extname(file).toLowerCase();
  const src = fs.readFileSync(file, "utf8");
  const vars = new Map<string, string>();
  if (ext === ".json") {
    const raw = JSON.parse(src) as Record<string, unknown>;
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v === "string") vars.set(k.startsWith("--") ? k : `--${k}`, v.trim());
    }
  } else {
    postcss.parse(src).walkDecls((d) => {
      if (d.prop.startsWith("--")) vars.set(d.prop, d.value.trim());
    });
  }
  return vars;
}

/** Resolve a single level of `var(--x)` indirection against the parsed map. */
function deref(value: string, vars: Map<string, string>): string {
  const m = value.match(/^var\((--[a-z0-9-]+)\)$/i);
  if (m && vars.has(m[1]!)) return vars.get(m[1]!)!;
  return value;
}

export interface ImportResult {
  /** Complete contract token set (mapped primaries + derived rest). */
  values: ThemeValues;
  /** Contract slots that were matched directly from the source. */
  mapped: string[];
  /** Contract slots that were derived/defaulted. */
  derived: string[];
}

/** Map an org token file onto the contract, then derive the remaining slots. */
export function importTheme(file: string): ImportResult {
  const vars = parseVars(file);
  const partial: ThemeValues = {};
  const mapped: string[] = [];

  for (const slot of TOKENS) {
    const bare = slot.name.slice(2);
    const candidates = [bare, ...(SYNONYMS[slot.name] ?? [])];
    for (const c of candidates) {
      const key = `--${c}`;
      if (vars.has(key)) {
        partial[slot.name] = deref(vars.get(key)!, vars);
        mapped.push(slot.name);
        break;
      }
    }
  }

  const values = deriveTheme(partial);
  const mappedSet = new Set(mapped);
  const derived = TOKENS.map((t) => t.name).filter((n) => !mappedSet.has(n));
  return { values, mapped, derived };
}
