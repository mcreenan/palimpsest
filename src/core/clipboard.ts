import { spawnSync } from "node:child_process";

/** Copy text to the OS clipboard (best-effort, cross-platform). */
export function copyToClipboard(text: string): boolean {
  const candidates: Array<[string, string[]]> =
    process.platform === "darwin"
      ? [["pbcopy", []]]
      : process.platform === "win32"
        ? [["clip", []]]
        : [
            ["wl-copy", []],
            ["xclip", ["-selection", "clipboard"]],
            ["xsel", ["--clipboard", "--input"]],
          ];
  for (const [cmd, args] of candidates) {
    try {
      const r = spawnSync(cmd, args, { input: text });
      if (r.status === 0) return true;
    } catch {
      /* try the next candidate */
    }
  }
  return false;
}
