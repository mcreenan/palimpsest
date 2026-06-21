import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";
import { TOKENS, TOKEN_NAMES, type ThemeValues } from "./contract.js";

const TOKEN_SET = new Set(TOKEN_NAMES);

/**
 * Read contract token values from a theme file. Supports:
 *   - .css  — any `--token: value` declarations (typically inside `:root`)
 *   - .json — a flat map keyed by token name, with or without the leading `--`
 * Unknown keys are ignored, so an org CSS file with extra brand vars is fine.
 */
export function loadThemeValues(file: string): ThemeValues {
  const ext = path.extname(file).toLowerCase();
  const src = fs.readFileSync(file, "utf8");
  return ext === ".json" ? fromJson(src) : fromCss(src);
}

export function fromCss(src: string): ThemeValues {
  const out: ThemeValues = {};
  const root = postcss.parse(src);
  root.walkDecls((decl) => {
    if (decl.prop.startsWith("--") && TOKEN_SET.has(decl.prop)) {
      out[decl.prop] = decl.value.trim();
    }
  });
  return out;
}

function fromJson(src: string): ThemeValues {
  const raw = JSON.parse(src) as Record<string, unknown>;
  const out: ThemeValues = {};
  for (const [k, val] of Object.entries(raw)) {
    if (typeof val !== "string") continue;
    const name = k.startsWith("--") ? k : `--${k}`;
    if (TOKEN_SET.has(name)) out[name] = val.trim();
  }
  return out;
}

/** Render the themed `:root {}` block as an indented <style> element. */
export function renderRootStyle(values: ThemeValues, indent = "    "): string {
  const lines: string[] = [];
  let group = "";
  for (const t of TOKENS) {
    const v = values[t.name];
    if (v === undefined) continue;
    if (t.group !== group) {
      group = t.group;
      lines.push(`${indent}    /* ${group} */`);
    }
    lines.push(`${indent}    ${t.name}: ${v};`);
  }
  return `${indent}<style>\n${indent}  :root {\n${lines.join("\n")}\n${indent}  }\n${indent}</style>`;
}

/** Serialize a complete token set as a contract-form tokens.css (for import). */
export function renderTokensCss(values: ThemeValues): string {
  const lines: string[] = [
    "/* palimpsest theme tokens — the semantic contract palimpsest renders from.",
    "   Edit values here (or re-run `pal theme import`) and `pal build`. */",
    ":root {",
  ];
  let group = "";
  for (const t of TOKENS) {
    const v = values[t.name];
    if (v === undefined) continue;
    if (t.group !== group) {
      group = t.group;
      lines.push(`\n  /* ${group} */`);
    }
    lines.push(`  ${t.name}: ${v};`);
  }
  lines.push("}");
  return lines.join("\n") + "\n";
}
