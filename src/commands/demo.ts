import fs from "node:fs";
import path from "node:path";
import * as clack from "@clack/prompts";
import { parseConfig, type SourceDef } from "../core/config.js";
import { build } from "../core/build.js";
import { scaffold } from "../core/scaffold.js";
import { templatesDir } from "../core/paths.js";
import { defaultTheme, type ThemeValues } from "../core/theme/contract.js";
import { renderTokensCss } from "../core/theme/render.js";
import { applySourcesToAgents, defaultInstructions } from "../core/sources.js";
import { log, pc } from "../core/log.js";

const ORG = "Demo Co";
const GH = "demo-co";

export async function runDemo(opts: Record<string, unknown>): Promise<void> {
  const yes = opts.yes === true;
  const interactive = !yes && Boolean(process.stdin.isTTY && process.stdout.isTTY);

  let dir: string;
  if (opts.dir) {
    dir = path.resolve(String(opts.dir));
  } else if (interactive) {
    const v = await clack.text({
      message: "Target directory for the demo (absolute)",
      initialValue: path.resolve(process.cwd(), "palimpsest-demo"),
    });
    if (clack.isCancel(v)) { clack.cancel("Cancelled."); process.exit(0); }
    dir = path.resolve(String(v).trim());
  } else {
    dir = path.resolve(process.cwd(), "palimpsest-demo");
  }

  if (fs.existsSync(dir) && fs.readdirSync(dir).length > 0) {
    throw new Error(`Target directory is not empty: ${dir}`);
  }

  // 1. Scaffold (the `init` part) — default structure + starter sections.
  const today = new Date().toISOString().slice(0, 10);
  scaffold({ name: "demo-engineering-guide", dir, orgName: ORG, githubOrg: GH, title: "Demo Engineering Guide" }, today);

  // A defined (branded) theme so the demo also showcases theming.
  const theme: ThemeValues = {
    ...defaultTheme(),
    "--accent": "#4f46e5",
    "--accent-hover": "#4338ca",
    "--highlight": "#4f46e5",
    "--highlight-subtle": "#eef2ff",
    "--header-bg": "#1e1b4b",
    "--header-text": "#eef2ff",
    "--info-border": "#c7d2fe",
    "--info-bg": "#eef2ff",
    "--info-text": "#3730a3",
  };
  fs.writeFileSync(path.join(dir, "theme", "tokens.css"), renderTokensCss(theme));

  // A starter section that explains the demo + the workflow to run.
  fs.writeFileSync(path.join(dir, "sections", "1-about.html"), DEMO_ABOUT);

  // 2. Add sources for you — pre-wired AND populated with real sample material so
  //    `pal outline` / `pal draft` have something to actually read. The demo ships
  //    three code repos, an engineering wiki, and a help center — all mutually
  //    consistent, so a generated guide reads coherently.
  const repo = (name: string, title: string, description: string): SourceDef => ({
    name, type: "repo", title,
    description,
    path: `sources/code/${name}`, linkBase: `https://github.com/${GH}/${name}`,
    instructions: defaultInstructions("repo", { name, path: `sources/code/${name}`, linkBase: `https://github.com/${GH}/${name}` }),
  });
  const sources: SourceDef[] = [
    {
      name: "wiki", type: "wiki", title: "Engineering Wiki",
      description: "Canonical home for architecture decisions (ADRs), runbooks, and process.",
      instructions: [
        "Capabilities: search, get-content — via helper scripts in ./source-scripts",
        "(an example of wrapping an external system as small CLI tools).",
        '- Search: `./source-scripts/wiki-search "<query>"` → prints matching "<id>\\t<title>" lines.',
        "- Get content: `./source-scripts/wiki-get-article <id>` → prints the article content.",
        "- Cite articles by title + id. The guide summarises these; never contradict them.",
        "- (Demo: the scripts grep local sample files under sources/docs/wiki; in a real",
        "  project they'd call the wiki's API with the same input/output contract.)",
      ].join("\n"),
    },
    repo("platform", "platform", "The backend API monorepo (Node + TypeScript, Postgres) — authoritative for how the system behaves."),
    repo("web", "web", "The frontend monorepo (Next.js apps + shared packages) — authoritative for what the product looks like."),
    repo("infra", "infra", "Core infrastructure (Terraform, Kubernetes, CI/CD) — authoritative for how the system is run."),
    {
      name: "help-center", type: "help", title: "Help Center",
      description: "Customer-facing help articles (an Astro content repo).",
      path: "sources/docs/help-center", linkBase: "https://help.demo.co",
      instructions: defaultInstructions("help", { name: "help-center", path: "sources/docs/help-center", linkBase: "https://help.demo.co" }),
    },
  ];

  // Copy the sample source material into the gitignored source dirs. Each demo
  // subdir under templates/demo maps to a source's local path.
  for (const name of ["platform", "web", "infra"]) {
    fs.cpSync(path.join(templatesDir(), "demo", "code", name), path.join(dir, "sources", "code", name), { recursive: true });
  }
  fs.cpSync(path.join(templatesDir(), "demo", "docs", "help-center"), path.join(dir, "sources", "docs", "help-center"), { recursive: true });
  fs.cpSync(path.join(templatesDir(), "demo", "wiki"), path.join(dir, "sources", "docs", "wiki"), { recursive: true });
  // Example helper scripts that wrap the "wiki" source as CLI tools (committed).
  fs.cpSync(path.join(templatesDir(), "demo", "source-scripts"), path.join(dir, "source-scripts"), { recursive: true });
  for (const s of ["wiki-search", "wiki-get-article"]) fs.chmodSync(path.join(dir, "source-scripts", s), 0o755);
  fs.writeFileSync(
    path.join(dir, "sources", "README.md"),
    "# Local source material\n\nThe demo ships three sample code repos (`code/platform`, `code/web`, `code/infra`),\nan engineering wiki (`docs/wiki`), and a help center (`docs/help-center`) so\n`pal outline` and `pal draft` have real, mutually-consistent material to read. In\nyour own project, clone your repos into `code/<name>` and docs into `docs/<name>`.\nThese directories are gitignored (tracked via `.gitkeep`).\n",
  );

  const config = JSON.parse(fs.readFileSync(path.join(dir, "palimpsest.config.json"), "utf8"));
  config.sources = sources;
  fs.writeFileSync(path.join(dir, "palimpsest.config.json"), JSON.stringify(config, null, 2) + "\n");
  applySourcesToAgents(dir, sources);

  // Build so there's something to preview immediately.
  const cfg = parseConfig(JSON.parse(fs.readFileSync(path.join(dir, "palimpsest.config.json"), "utf8")), dir);
  build(cfg);

  log.ok(`Demo scaffolded → ${pc.bold(dir)}`);
  log.dim("  branded theme · 5 sources of truth (3 code repos + wiki + help center) · ready for the workflow");
  log.info("");
  log.info(pc.bold("The demo set up init + sources for you. Now run the workflow:"));
  log.dim(`  cd ${dir}`);
  log.info(`  ${pc.cyan("1.")} ${pc.bold("pal outline")}   → generates a prompt; paste it into an agent here.`);
  log.dim("       The agent reads the sample sources and proposes your section outline.");
  log.info(`  ${pc.cyan("2.")} ${pc.bold("pal draft")}     → generates a prompt; paste it into an agent here.`);
  log.dim("       The agent writes the content from the sources (research→generate→synthesize→audit).");
  log.info(`  ${pc.cyan("3.")} ${pc.bold("pal dev")}       → preview the result and iterate.`);
  log.info("");
  log.dim("  Peek under the hood: `pal source list` · `pal theme check` · sources/code/{platform,web,infra}/");
  log.dim("  The wiki source is wrapped as CLI scripts: ./source-scripts/wiki-search \"gateway\"");
}

const DEMO_ABOUT = `<p class="lead annotatable">This is a palimpsest demo. It comes set up like a real project: a branded theme and five sources of truth (three code repos — a <a class="gh-repo" data-repo="platform"></a> backend, a <a class="gh-repo" data-repo="web"></a> frontend, and <a class="gh-repo" data-repo="infra"></a> — plus an engineering wiki and a help center) are already wired up.</p>
<div class="panel info">
  <span class="panel-icon" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8.25" stroke="currentColor" stroke-width="1.5"/><path d="M10 9v4.5M10 6.5v.01" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></span>
  <div class="panel-body annotatable"><span class="panel-title">Try the workflow</span>Run <code>pal outline</code> to have an agent propose a section outline from the sample sources, then <code>pal draft</code> to write the content, then <code>pal dev</code> to preview. Each prompt is copied to your clipboard — paste it into an agent running in this directory.</div>
</div>
<p class="annotatable">The sample material lives under <code>sources/code/</code> (three repos) and <code>sources/docs/</code> (the wiki and help center). In a real project you'd register your own with <code>pal source add</code> and clone your repos there.</p>`;
