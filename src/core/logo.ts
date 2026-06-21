import fs from "node:fs";
import path from "node:path";

const EXT_BY_CONTENT_TYPE: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "image/avif": ".avif",
  "image/x-icon": ".ico",
  "image/vnd.microsoft.icon": ".ico",
};

export function isUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim());
}

export function isSvgMarkup(s: string): boolean {
  const t = s.trim();
  return t.startsWith("<svg") || (t.startsWith("<?xml") && t.includes("<svg"));
}

/**
 * Install a logo into the project's `assets/` folder and return the config-relative
 * path (for `brand.logo`). Accepts an image URL (downloaded), an absolute/relative
 * file path (copied), or raw SVG markup (written as assets/logo.svg). SVG is
 * inlined into the header at build time; raster images are copied into the bundle
 * and referenced with <img>.
 */
export async function installLogo(projectRoot: string, input: string): Promise<string> {
  const assetsDir = path.join(projectRoot, "assets");
  fs.mkdirSync(assetsDir, { recursive: true });

  if (isSvgMarkup(input)) {
    fs.writeFileSync(path.join(assetsDir, "logo.svg"), input.trim() + "\n");
    return "./assets/logo.svg";
  }

  if (isUrl(input)) {
    const res = await fetch(input);
    if (!res.ok) throw new Error(`failed to download logo (${res.status} ${res.statusText})`);
    const ct = res.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
    let ext = path.extname(new URL(input).pathname).toLowerCase();
    if (!ext && ct && EXT_BY_CONTENT_TYPE[ct]) ext = EXT_BY_CONTENT_TYPE[ct];
    if (!ext) ext = ".png";
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(path.join(assetsDir, `logo${ext}`), buf);
    return `./assets/logo${ext}`;
  }

  // Treat as a filesystem path.
  const srcAbs = path.resolve(input);
  if (!fs.existsSync(srcAbs)) throw new Error(`logo file not found: ${srcAbs}`);
  const ext = path.extname(srcAbs).toLowerCase() || ".png";
  fs.copyFileSync(srcAbs, path.join(assetsDir, `logo${ext}`));
  return `./assets/logo${ext}`;
}
