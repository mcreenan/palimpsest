import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import type { ResolvedConfig } from "./config.js";

/**
 * Rewrite a built guide's RELATIVE asset references to absolute deploy paths.
 * Relative refs break when a page is opened without a trailing slash (the asset
 * resolves against the parent dir → 404); absolute paths resolve identically for
 * `…/guide`, `…/guide/`, and `…/guide/index.html`. This generalizes the original
 * publish.sh Mermaid/cross-link rewrite for any base path.
 */
export function rewriteForDeploy(html: string, basePath: string, cssName: string, jsName: string): string {
  const base = basePath.replace(/\/+$/, "");
  if (!base) return html;
  const map: Record<string, string> = {
    [`href="${cssName}"`]: `href="${base}/${cssName}"`,
    [`src="${jsName}"`]: `src="${base}/${jsName}"`,
    ['src="vendor/mermaid.min.js"']: `src="${base}/vendor/mermaid.min.js"`,
    ['href="changelog.html"']: `href="${base}/changelog.html"`,
  };
  let out = html;
  for (const [from, to] of Object.entries(map)) out = out.split(from).join(to);
  // Bundled assets (e.g. a raster logo) referenced relatively.
  out = out.split('src="assets/').join(`src="${base}/assets/`);
  return out;
}

/** Rewrite the changelog's back-to-guide link to the deployed index.html. */
export function rewriteChangelogForDeploy(html: string, basePath: string, artifact: string): string {
  const base = basePath.replace(/\/+$/, "");
  if (!base) return html;
  return html.split(`href="${artifact}"`).join(`href="${base}/index.html"`);
}

export interface UploadStep {
  /** Local file. */
  from: string;
  /** Remote key (relative to the prefix). */
  to: string;
  contentType: string;
}

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
};

function contentType(file: string): string {
  return CONTENT_TYPES[path.extname(file)] ?? "application/octet-stream";
}

export interface S3Plan {
  bucket: string;
  prefix: string;
  profile?: string;
  region?: string;
  publicUrl?: string;
  steps: UploadStep[];
  /** Staged local copies (rewritten where needed). */
  stageDir: string;
}

/**
 * Stage the deploy bundle (with rewrites) and compute the S3 upload plan.
 * The guide artifact is published as `index.html`.
 */
export function planS3(cfg: ResolvedConfig, outDir: string): S3Plan {
  const s3 = cfg.publish?.s3;
  if (!s3) throw new Error("publish.s3 is not configured in palimpsest.config.json");
  const basePath = cfg.output.basePath || `/${s3.prefix}`.replace(/\/+$/, "");
  const cssName = `${cfg.name}.css`;
  const jsName = `${cfg.name}.js`;
  const inline = cfg.output.inline;

  const stageDir = fs.mkdtempSync(path.join(os.tmpdir(), "pal-publish-"));
  const steps: UploadStep[] = [];

  // Guide → index.html (rewritten).
  const guide = fs.readFileSync(path.join(outDir, cfg.artifactName), "utf8");
  const guideOut = path.join(stageDir, "index.html");
  fs.writeFileSync(guideOut, rewriteForDeploy(guide, basePath, cssName, jsName));
  steps.push({ from: guideOut, to: "index.html", contentType: "text/html" });

  // css/js (bundle mode only).
  if (!inline) {
    for (const name of [cssName, jsName]) {
      const f = path.join(outDir, name);
      if (fs.existsSync(f)) steps.push({ from: f, to: name, contentType: contentType(name) });
    }
  }

  // vendored mermaid.
  const vendor = path.join(outDir, "vendor", "mermaid.min.js");
  if (fs.existsSync(vendor)) steps.push({ from: vendor, to: "vendor/mermaid.min.js", contentType: "application/javascript" });

  // bundled assets (logo, etc.).
  const assetsDir = path.join(outDir, "assets");
  if (fs.existsSync(assetsDir)) {
    for (const f of fs.readdirSync(assetsDir)) {
      const full = path.join(assetsDir, f);
      if (fs.statSync(full).isFile()) steps.push({ from: full, to: `assets/${f}`, contentType: contentType(full) });
    }
  }

  // changelog (rewritten back-link).
  const cl = path.join(outDir, "changelog.html");
  if (fs.existsSync(cl)) {
    const clOut = path.join(stageDir, "changelog.html");
    fs.writeFileSync(clOut, rewriteChangelogForDeploy(fs.readFileSync(cl, "utf8"), basePath, cfg.artifactName));
    steps.push({ from: clOut, to: "changelog.html", contentType: "text/html" });
  }

  return { bucket: s3.bucket, prefix: s3.prefix, profile: s3.profile, region: s3.region, publicUrl: s3.publicUrl, steps, stageDir };
}

export function s3DestUri(plan: S3Plan, key: string): string {
  const prefix = plan.prefix.replace(/^\/+|\/+$/g, "");
  return `s3://${plan.bucket}/${prefix ? prefix + "/" : ""}${key}`;
}

export function uploadS3(plan: S3Plan): void {
  for (const step of plan.steps) {
    const args = ["s3", "cp", step.from, s3DestUri(plan, step.to), "--content-type", step.contentType];
    if (plan.profile) args.push("--profile", plan.profile);
    if (plan.region) args.push("--region", plan.region);
    execFileSync("aws", args, { stdio: "inherit" });
  }
}
