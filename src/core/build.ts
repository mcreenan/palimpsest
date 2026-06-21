import fs from "node:fs";
import path from "node:path";
import type { ResolvedConfig } from "./config.js";
import { engineDir } from "./paths.js";
import { loadThemeValues, renderRootStyle } from "./theme/render.js";
import { completeWithDefaults, mermaidVars } from "./theme/derive.js";
import { defaultTheme } from "./theme/contract.js";
import { renderToc, renderContent, escapeHtml, type AssembleResult } from "./assemble.js";
import {
  parseChangelog,
  deriveVersion,
  deriveUpdated,
  renderEntries,
} from "./changelog.js";
import { buildPalRuntime, renderPalScript } from "./inject.js";
import { sourcesSummary } from "./sources.js";

export interface BuildOptions {
  outDir?: string;
  inline?: boolean;
  changelog?: boolean; // default true
  check?: boolean; // dry run
  /** Extra <script> injected before engine.js (used by `dev` for livereload). */
  injectHead?: string;
}

export interface BuildResult {
  outDir: string;
  artifact: string;
  files: string[];
  version: string;
  updated: string;
  used: AssembleResult["used"];
  missing: AssembleResult["missing"];
  warnings: string[];
}

/** Replace `{{KEY}}` placeholders without regex `$` pitfalls. */
function fill(tpl: string, map: Record<string, string>): string {
  let out = tpl;
  for (const [k, v] of Object.entries(map)) out = out.split(`{{${k}}}`).join(v);
  return out;
}

const DEFAULT_LOGO =
  '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
  '<rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor" opacity="0.18"/>' +
  '<path d="M7 17V7h4.2a3 3 0 0 1 0 6H7" stroke="currentColor" stroke-width="1.8" ' +
  'stroke-linecap="round" stroke-linejoin="round"/></svg>';

function resolveEngineDir(cfg: ResolvedConfig): string {
  return cfg.engine ? path.resolve(cfg.projectRoot, cfg.engine) : engineDir();
}

export function build(cfg: ResolvedConfig, opts: BuildOptions = {}): BuildResult {
  const warnings: string[] = [];
  const inline = opts.inline ?? cfg.output.inline;
  const wantChangelog = opts.changelog ?? true;
  const eng = resolveEngineDir(cfg);
  const outDir = opts.outDir ?? path.resolve(cfg.projectRoot, cfg.output.dir);

  // ── theme ──────────────────────────────────────────────────────────────
  const themePath = path.resolve(cfg.projectRoot, cfg.theme);
  let themeValues;
  if (fs.existsSync(themePath)) {
    themeValues = completeWithDefaults(loadThemeValues(themePath));
  } else {
    warnings.push(`theme not found (${cfg.theme}); using built-in defaults`);
    themeValues = defaultTheme();
  }
  const themeStyle = renderRootStyle(themeValues);
  const mermaid = mermaidVars(themeValues);

  // ── changelog parse → version / updated ──────────────────────────────────
  const changelogPath = path.join(cfg.projectRoot, "changelog", "CHANGELOG.md");
  const entries = fs.existsSync(changelogPath)
    ? parseChangelog(fs.readFileSync(changelogPath, "utf8"))
    : [];
  const version = deriveVersion(entries);
  const updated = deriveUpdated(entries);

  // ── brand ────────────────────────────────────────────────────────────────
  // SVG logos are inlined into the header; raster logos are copied into the
  // bundle's assets/ and referenced with <img>.
  let brandSvg = DEFAULT_LOGO;
  let logoAsset: { rel: string; abs: string } | null = null;
  if (cfg.brand.logo) {
    const logoPath = path.resolve(cfg.projectRoot, cfg.brand.logo);
    if (!fs.existsSync(logoPath)) {
      warnings.push(`brand logo not found (${cfg.brand.logo})`);
    } else if (path.extname(logoPath).toLowerCase() === ".svg") {
      brandSvg = fs.readFileSync(logoPath, "utf8").trim();
    } else {
      const rel = `assets/${path.basename(logoPath)}`;
      logoAsset = { rel, abs: logoPath };
      brandSvg = `<img class="brand-logo" src="${rel}" alt="${escapeHtml(cfg.org.name)} logo" />`;
    }
  }

  // ── assemble ──────────────────────────────────────────────────────────────
  if (cfg.structure.length === 0) warnings.push("structure is empty; the guide has no sections");
  const sectionsDir = path.join(cfg.projectRoot, "sections");
  const toc = renderToc(cfg.structure);
  const content = renderContent(cfg.structure, sectionsDir);
  for (const m of content.missing) {
    warnings.push(`no fragment for section ${m.num}-${m.slug} (sections/${m.num}-${m.slug}.html)`);
  }

  // ── engine assets ─────────────────────────────────────────────────────────
  const template = fs.readFileSync(path.join(eng, "template.html"), "utf8");
  const engineCss = fs.readFileSync(path.join(eng, "engine.css"), "utf8");
  const engineJs = fs.readFileSync(path.join(eng, "engine.js"), "utf8");
  const vendorSrc = path.join(eng, "vendor", "mermaid.min.js");

  const cssName = `${cfg.name}.css`;
  const jsName = `${cfg.name}.js`;
  const palScript = renderPalScript(buildPalRuntime(cfg, mermaid, sourcesSummary(cfg.sources)));
  const head = opts.injectHead ? `${opts.injectHead}\n` : "";

  const engineStyle = inline
    ? `    <style>\n${engineCss}\n    </style>`
    : `    <link rel="stylesheet" href="${cssName}" />`;
  const engineScript = inline
    ? `${head}    <script>\n${engineJs}\n    </script>`
    : `${head}    <script src="${jsName}"></script>`;

  // The header pill: version, optionally followed by a Changelog link.
  const versionPill = wantChangelog
    ? `<span class="badge-version">${version}</span>` +
      `<span class="badge-sep" aria-hidden="true">·</span>` +
      `<a class="badge-link" href="changelog.html" target="_blank" rel="noopener" title="Open the changelog in a new tab">Changelog</a>`
    : version;

  const html = fill(template, {
    TITLE: escapeHtml(cfg.title),
    THEME_STYLE: themeStyle,
    ENGINE_STYLE: engineStyle,
    BRAND_SVG: brandSvg,
    VERSION_PILL: versionPill,
    HEADER_META: `Updated ${updated} UTC`,
    TOC: toc,
    CONTENT: content.html,
    PROJECT_NAME: cfg.name,
    MERMAID_SRC: "vendor/mermaid.min.js",
    PAL_CONFIG: palScript,
    ENGINE_SCRIPT: engineScript,
  });

  // ── changelog page ────────────────────────────────────────────────────────
  let changelogHtml: string | null = null;
  if (wantChangelog) {
    const clTpl = fs.readFileSync(path.join(eng, "changelog.template.html"), "utf8");
    changelogHtml = fill(clTpl, {
      TITLE: escapeHtml(cfg.title),
      TITLE_SHORT: escapeHtml(cfg.org.name || cfg.title),
      THEME_STYLE: themeStyle,
      BRAND_SVG: brandSvg,
      VERSION: version,
      UPDATED: updated,
      COUNT: String(entries.length),
      ENTRIES: renderEntries(entries),
      GUIDE_HREF: cfg.artifactName,
    });
  }

  // Safety net: every template placeholder must be filled. If one ever leaks
  // through (engine/build drift), surface it loudly rather than shipping `{{…}}`.
  const leftover = [...html.matchAll(/\{\{[A-Z_]+\}\}/g), ...(changelogHtml ?? "").matchAll(/\{\{[A-Z_]+\}\}/g)].map((m) => m[0]);
  if (leftover.length) warnings.push(`unreplaced template placeholder(s): ${[...new Set(leftover)].join(", ")}`);

  // ── write ─────────────────────────────────────────────────────────────────
  const files: string[] = [];
  if (!opts.check) {
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, cfg.artifactName), html);
    files.push(cfg.artifactName);
    if (!inline) {
      fs.writeFileSync(path.join(outDir, cssName), engineCss);
      fs.writeFileSync(path.join(outDir, jsName), engineJs);
      files.push(cssName, jsName);
    }
    fs.mkdirSync(path.join(outDir, "vendor"), { recursive: true });
    fs.copyFileSync(vendorSrc, path.join(outDir, "vendor", "mermaid.min.js"));
    files.push("vendor/mermaid.min.js");
    if (logoAsset) {
      const dest = path.join(outDir, logoAsset.rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      if (path.resolve(dest) !== path.resolve(logoAsset.abs)) fs.copyFileSync(logoAsset.abs, dest);
      files.push(logoAsset.rel);
    }
    if (changelogHtml !== null) {
      fs.writeFileSync(path.join(outDir, "changelog.html"), changelogHtml);
      files.push("changelog.html");
    }
  } else {
    files.push(cfg.artifactName, ...(inline ? [] : [cssName, jsName]), "vendor/mermaid.min.js");
    if (logoAsset) files.push(logoAsset.rel);
    if (changelogHtml !== null) files.push("changelog.html");
  }

  return {
    outDir,
    artifact: cfg.artifactName,
    files,
    version,
    updated,
    used: content.used,
    missing: content.missing,
    warnings,
  };
}
