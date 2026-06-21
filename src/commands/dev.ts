import http from "node:http";
import path from "node:path";
import { execFile } from "node:child_process";
import sirv from "sirv";
import chokidar from "chokidar";
import { loadConfig, type ResolvedConfig } from "../core/config.js";
import { build } from "../core/build.js";
import { log, pc } from "../core/log.js";

const LIVERELOAD =
  '    <script>(function(){try{var es=new EventSource("/__pal_livereload");' +
  'es.onmessage=function(e){if(e.data==="reload")location.reload();};}catch(e){}})();</script>';

export async function runDev(opts: Record<string, unknown>): Promise<void> {
  let cfg = loadConfig();
  const projectRoot = cfg.projectRoot;
  const port = Number(opts.port ?? 4173);

  const rebuild = () => {
    // Re-read the config every build so edits the agent makes during `pal draft`
    // (new sections, a logo, title/theme changes) are reflected live — not just
    // section/theme file edits.
    try {
      cfg = loadConfig(projectRoot);
    } catch (e) {
      log.warn(`config reload failed (${(e as Error).message}); using last good config`);
    }
    try {
      const r = build(cfg, { injectHead: LIVERELOAD });
      for (const w of r.warnings) log.warn(w);
      return r.outDir;
    } catch (e) {
      log.error(`build failed: ${(e as Error).message}`);
      return path.resolve(cfg.projectRoot, cfg.output.dir);
    }
  };

  const outDir = rebuild();
  log.ok(`Built ${pc.bold(cfg.artifactName)}`);

  // ── live-reload clients ──────────────────────────────────────────────────
  const clients = new Set<http.ServerResponse>();
  const notify = () => {
    for (const res of clients) res.write("data: reload\n\n");
  };

  const serveStatic = sirv(outDir, { dev: true, etag: true });
  const server = http.createServer((req, res) => {
    if (req.url === "/__pal_livereload") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      res.write("retry: 1000\n\n");
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }
    serveStatic(req, res, () => {
      res.statusCode = 404;
      res.end("Not found");
    });
  });

  server.listen(port, () => {
    const url = `http://localhost:${port}/${cfg.artifactName}`;
    log.info(`${pc.green("➜")} ${pc.bold(url)}`);
    log.dim("  watching sections/, theme/, changelog/, palimpsest.config.json — Ctrl-C to stop");
    if (opts.open === true) openBrowser(url);
  });

  // ── watch → debounce → rebuild → reload ──────────────────────────────────
  const watchPaths = watchTargets(cfg);
  const watcher = chokidar.watch(watchPaths, { ignoreInitial: true });
  let timer: NodeJS.Timeout | null = null;
  const onChange = (file: string) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      log.dim(`  changed: ${path.relative(cfg.projectRoot, file)} — rebuilding`);
      rebuild();
      notify();
    }, 120);
  };
  watcher.on("add", onChange).on("change", onChange).on("unlink", onChange);

  process.on("SIGINT", () => {
    watcher.close();
    server.close();
    process.exit(0);
  });
}

function watchTargets(cfg: ResolvedConfig): string[] {
  const root = cfg.projectRoot;
  const targets = [
    path.join(root, "sections"),
    path.join(root, "theme"),
    path.join(root, "assets"),
    path.join(root, "changelog"),
    path.join(root, "palimpsest.config.json"),
  ];
  if (cfg.engine) targets.push(path.resolve(root, cfg.engine));
  return targets;
}

function openBrowser(url: string): void {
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  execFile(cmd, [url], () => {});
}
