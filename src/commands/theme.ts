import fs from "node:fs";
import path from "node:path";
import { loadConfig } from "../core/config.js";
import { importTheme } from "../core/theme/import-css.js";
import { renderTokensCss, loadThemeValues } from "../core/theme/render.js";
import { completeWithDefaults } from "../core/theme/derive.js";
import { checkContrast } from "../core/theme/contrast.js";
import { TOKENS } from "../core/theme/contract.js";
import { log, pc } from "../core/log.js";

const SOURCE_RE = /palimpsest:source\s+(.+?)\s*\*\//;

export async function runTheme(
  action: string,
  source: string | undefined,
  opts: Record<string, unknown>,
): Promise<void> {
  const cfg = loadConfig();
  const tokensPath = path.resolve(cfg.projectRoot, cfg.theme);

  switch (action) {
    case "import":
      return doImport(cfg.projectRoot, tokensPath, source, opts);
    case "sync":
      return doSync(cfg.projectRoot, tokensPath, opts);
    case "check":
      return doCheck(tokensPath);
    default:
      throw new Error(`Unknown theme action "${action}". Use: import <file> | sync | check`);
  }
}

function writeTokens(tokensPath: string, values: Record<string, string>, sourceAbs: string): void {
  const header = `/* palimpsest:source ${sourceAbs} */\n`;
  fs.mkdirSync(path.dirname(tokensPath), { recursive: true });
  fs.writeFileSync(tokensPath, header + renderTokensCss(values));
}

function doImport(root: string, tokensPath: string, source: string | undefined, opts: Record<string, unknown>): void {
  if (!source) throw new Error("Usage: pal theme import <file.css|tokens.json>");
  const src = path.resolve(source);
  if (!fs.existsSync(src)) throw new Error(`theme source not found: ${src}`);

  const r = importTheme(src);
  writeTokens(tokensPath, r.values, src);
  log.ok(`Imported theme → ${pc.bold(path.relative(root, tokensPath))}`);
  log.dim(`  mapped ${r.mapped.length} slot(s) from source: ${r.mapped.map((s) => s.slice(2)).join(", ") || "(none)"}`);
  log.dim(`  derived/defaulted ${r.derived.length} slot(s)`);

  if (typeof opts.logo === "string") {
    const logoSrc = path.resolve(opts.logo);
    if (fs.existsSync(logoSrc)) {
      const dest = path.join(root, "theme", "logo.svg");
      fs.copyFileSync(logoSrc, dest);
      log.dim(`  copied logo → theme/logo.svg (set brand.logo in config to use it)`);
    } else log.warn(`logo not found: ${logoSrc}`);
  }
  log.info("Run `pal build` to apply.");
}

function doSync(root: string, tokensPath: string, opts: Record<string, unknown>): void {
  if (!fs.existsSync(tokensPath)) throw new Error(`no theme tokens at ${tokensPath}`);
  const first = fs.readFileSync(tokensPath, "utf8").split("\n")[0] ?? "";
  const m = first.match(SOURCE_RE);
  if (!m) throw new Error("This theme has no recorded source. Re-run `pal theme import <file>`.");
  const src = m[1]!;
  if (!fs.existsSync(src)) throw new Error(`recorded theme source no longer exists: ${src}`);
  const r = importTheme(src);
  writeTokens(tokensPath, r.values, src);
  log.ok(`Synced theme from ${pc.dim(src)} (mapped ${r.mapped.length}, derived ${r.derived.length})`);
}

function doCheck(tokensPath: string): void {
  if (!fs.existsSync(tokensPath)) throw new Error(`no theme tokens at ${tokensPath}`);
  const present = loadThemeValues(tokensPath);
  let group = "";
  let setCount = 0;
  for (const t of TOKENS) {
    if (t.group !== group) {
      group = t.group;
      log.info(pc.bold(`\n${group}`));
    }
    const v = present[t.name];
    if (v !== undefined) {
      setCount++;
      log.info(`  ${pc.green("●")} ${t.name.padEnd(22)} ${pc.dim(v)}`);
    } else {
      log.info(`  ${pc.dim("○")} ${pc.dim(t.name.padEnd(22))} ${pc.dim("(default — " + t.role + ")")}`);
    }
  }
  log.info("");
  log.ok(`${setCount}/${TOKENS.length} slots set explicitly; the rest fall back to built-in defaults.`);

  reportContrast(present);
}

/** Check WCAG AA contrast for every foreground/background pair the engine renders. */
function reportContrast(present: Record<string, string>): void {
  const results = checkContrast(completeWithDefaults(present));
  const fails = results.filter((r) => !r.pass);

  log.info(pc.bold("\ncontrast (WCAG AA)"));
  for (const r of results) {
    const ratio = r.ratio === null ? "  n/a" : r.ratio.toFixed(2).padStart(5) + ":1";
    if (r.ratio === null) {
      log.info(`  ${pc.dim("○")} ${r.label.padEnd(34)} ${pc.dim(ratio + " (not a plain color — skipped)")}`);
    } else if (r.pass) {
      log.info(`  ${pc.green("●")} ${r.label.padEnd(34)} ${pc.dim(ratio + "  ≥ " + r.min)}`);
    } else {
      log.info(`  ${pc.red("✕")} ${r.label.padEnd(34)} ${pc.red(ratio)} ${pc.dim("needs ≥ " + r.min + " (" + r.level + "); " + r.fg.slice(2) + " on " + r.bg.slice(2))}`);
    }
  }
  log.info("");
  if (fails.length === 0) {
    log.ok("All rendered text pairs meet WCAG AA contrast.");
  } else {
    log.warn(`${fails.length} pair(s) below WCAG AA — adjust the listed tokens for readability.`);
  }
}
