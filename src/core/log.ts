import pc from "picocolors";

export const log = {
  info: (msg: string) => console.log(msg),
  step: (msg: string) => console.log(`${pc.cyan("›")} ${msg}`),
  ok: (msg: string) => console.log(`${pc.green("✓")} ${msg}`),
  warn: (msg: string) => console.warn(`${pc.yellow("!")} ${msg}`),
  error: (msg: string) => console.error(`${pc.red("✗")} ${msg}`),
  dim: (msg: string) => console.log(pc.dim(msg)),
};

export { pc };

/** Print an error nicely and exit non-zero. */
export function die(err: unknown): never {
  const msg = err instanceof Error ? err.message : String(err);
  log.error(msg);
  process.exit(1);
}
