import path from "node:path";
import { loadConfig } from "../core/config.js";
import { exportPdf, type PdfOptions } from "../core/pdf.js";
import { log, pc } from "../core/log.js";

export async function runExport(opts: Record<string, unknown>): Promise<void> {
  const cfg = loadConfig();

  const pdfOpts: PdfOptions = {
    out: typeof opts.out === "string" ? opts.out : undefined,
    chrome: typeof opts.chrome === "string" ? opts.chrome : undefined,
    renderWaitMs: Number(opts.wait) > 0 ? Number(opts.wait) : undefined,
  };

  log.step("Rendering the guide to PDF…");
  try {
    const { out, chrome } = await exportPdf(cfg, pdfOpts);
    log.ok(`Wrote ${pc.bold(path.relative(cfg.projectRoot, out))}`);
    log.dim(`  rendered with ${path.basename(chrome)}`);
  } catch (e) {
    log.error((e as Error).message);
    process.exit(1);
  }
}
