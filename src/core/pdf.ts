import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import type { ResolvedConfig } from "./config.js";
import { build } from "./build.js";

/**
 * Export the guide to PDF.
 *
 * The guide is already a self-contained, print-aware page (engine.css ships an
 * `@media print` block that drops the header, ToC, and edit affordances), so a
 * PDF is just the page rendered by a headless browser. Rather than bundle a
 * ~150MB Puppeteer/Chromium dependency, we drive an already-installed Chrome via
 * its `--print-to-pdf` flag — mirroring how `--run` reuses a local agent CLI.
 */

export interface PdfOptions {
  /** Output .pdf path (default: <output dir>/<name>.pdf). */
  out?: string;
  /** Chrome/Chromium binary to use (default: $PAL_CHROME / autodetected). */
  chrome?: string;
  /** Milliseconds to let in-page JS (Mermaid) render before printing. */
  renderWaitMs?: number;
}

const MAC_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
];
const PATH_CANDIDATES = [
  "google-chrome",
  "google-chrome-stable",
  "chromium",
  "chromium-browser",
  "microsoft-edge",
];

/** Locate a Chrome-family binary, or return null if none is found. */
export function findChrome(explicit?: string): string | null {
  const env = explicit || process.env.PAL_CHROME || process.env.CHROME_PATH;
  if (env) return fs.existsSync(env) ? env : null;

  for (const p of MAC_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  for (const name of PATH_CANDIDATES) {
    const which = spawnSync(process.platform === "win32" ? "where" : "which", [name], {
      encoding: "utf8",
    });
    if (which.status === 0 && which.stdout.trim()) return name;
  }
  return null;
}

export interface PdfResult {
  out: string;
  chrome: string;
}

/**
 * Build a self-contained copy of the guide and print it to PDF. Throws with an
 * actionable message if no browser is found or the print fails.
 */
export async function exportPdf(cfg: ResolvedConfig, opts: PdfOptions = {}): Promise<PdfResult> {
  const chrome = findChrome(opts.chrome);
  if (!chrome) {
    throw new Error(
      "No Chrome/Chromium/Edge found. Install one, set PAL_CHROME=/path/to/chrome, or pass --chrome <path>.",
    );
  }

  // Stage an inline build (HTML + vendored Mermaid) in an isolated dir so the
  // file:// render is fully self-contained and never touches the real output.
  const stageDir = path.join(cfg.projectRoot, ".palimpsest", "pdf-build");
  fs.rmSync(stageDir, { recursive: true, force: true });
  fs.mkdirSync(stageDir, { recursive: true });
  const built = build(cfg, { inline: true, outDir: stageDir, changelog: false });
  const htmlPath = path.join(stageDir, built.artifact);

  const out = path.resolve(
    cfg.projectRoot,
    opts.out ?? path.join(cfg.output.dir, cfg.artifactName.replace(/\.html?$/i, "") + ".pdf"),
  );
  fs.mkdirSync(path.dirname(out), { recursive: true });

  const waitMs = opts.renderWaitMs ?? 8000;
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--no-pdf-header-footer",
    `--virtual-time-budget=${waitMs}`, // let Mermaid render before capture
    `--print-to-pdf=${out}`,
    pathToFileURL(htmlPath).href,
  ];

  await new Promise<void>((resolve, reject) => {
    const child = spawn(chrome, args, { stdio: "ignore" });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0 && fs.existsSync(out)) resolve();
      else reject(new Error(`${path.basename(chrome)} failed to produce a PDF (exit ${code}).`));
    });
  });

  return { out, chrome };
}
