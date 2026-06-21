import { cac, type Command } from "cac";
import { createRequire } from "node:module";
import { die } from "./core/log.js";

const require = createRequire(import.meta.url);
const pkg = require("../package.json") as { version: string };

const cli = cac("pal");

type InitOpts = Record<string, unknown>;
async function dispatchInit(name: string | undefined, opts: InitOpts) {
  const { runInit } = await import("./commands/init.js");
  await runInit({ name: name ?? (opts.name as string | undefined), ...opts });
}

function withInitOptions(cmd: Command): Command {
  return cmd
    .option("--name <name>", "Project name")
    .option("--dir <path>", "Target directory (absolute)")
    .option("--org <name>", "Organization display name")
    .option("--github-org <slug>", "GitHub org/user for repo links")
    .option("--title <title>", "Guide title")
    .option("--theme <file>", "Import a theme from a CSS/tokens file at init")
    .option("--logo <url|path|svg>", "Org logo: an image URL, a file path, or SVG markup")
    .option("--no-install", "Skip installing npm dependencies")
    .option("--no-build", "Skip the initial build")
    .option("--yes", "Accept defaults; run non-interactively");
}

// Explicit `pal init [name]` …
withInitOptions(cli.command("init [name]", "Scaffold a new engineering guide")).action(dispatchInit);
// … and the bare default so `npx palimpsest [name]` scaffolds too.
withInitOptions(cli.command("[name]", "Scaffold a new engineering guide (default)")).action(dispatchInit);

cli
  .command("build", "Build the guide artifact bundle")
  .option("--out <dir>", "Output directory (overrides config)")
  .option("--inline", "Emit a single self-contained HTML file")
  .option("--no-changelog", "Skip rendering changelog.html")
  .option("--check", "Dry run: report what would be written, write nothing")
  .action(async (opts: Record<string, unknown>) => {
    const { runBuild } = await import("./commands/build.js");
    await runBuild(opts);
  });

cli
  .command("dev", "Build, serve, and live-reload on change")
  .option("--port <port>", "Port to serve on", { default: 4173 })
  .option("--open", "Open the guide in a browser")
  .action(async (opts: Record<string, unknown>) => {
    const { runDev } = await import("./commands/dev.js");
    await runDev(opts);
  });

cli
  .command("theme <action> [source]", "Manage the theme (import | sync | check)")
  .option("--logo <file>", "Set the brand logo SVG")
  .option("--yes", "Accept all derived slots non-interactively")
  .action(async (action: string, source: string | undefined, opts: Record<string, unknown>) => {
    const { runTheme } = await import("./commands/theme.js");
    await runTheme(action, source, opts);
  });

cli
  .command("source <action> [name]", "Manage sources of truth (add | list | remove)")
  .option("--type <type>", "Source type: repo | wiki | confluence | help | custom")
  .option("--description <text>", "What the source is")
  .option("--title <title>", "Human label")
  .option("--path <path>", "Local path to grep/search (repo/help)")
  .option("--link-base <url>", "Web/VCS link base (repo/help)")
  .option("--instructions <text>", "Agent instructions for interfacing with it")
  .option("--yes", "Non-interactive; use flags/defaults")
  .action(async (action: string, name: string | undefined, opts: Record<string, unknown>) => {
    const { runSource } = await import("./commands/source.js");
    await runSource(action, name, opts);
  });

cli
  .command("section <action> [slug]", "Manage sections (add | list | remove)")
  .option("--title <title>", "Section title")
  .option("--part <part>", "Part label to place the section under (e.g. 'I — Orientation')")
  .option("--num <n>", "Section number (default: next available)")
  .option("--after <num>", "Insert after this section number")
  .option("--keep-file", "On remove, keep the section fragment file")
  .option("--yes", "Non-interactive; use flags/defaults")
  .action(async (action: string, slug: string | undefined, opts: Record<string, unknown>) => {
    const { runSection } = await import("./commands/section.js");
    await runSection(action, slug, opts);
  });

cli
  .command("demo", "Scaffold a fully-featured demo project (theme + sources + content)")
  .option("--dir <path>", "Target directory (absolute)")
  .option("--yes", "Non-interactive; use defaults")
  .action(async (opts: Record<string, unknown>) => {
    const { runDemo } = await import("./commands/demo.js");
    await runDemo(opts);
  });

cli
  .command("outline", "Generate an agent prompt to propose a section outline from your sources")
  .option("--print", "Also print the full prompt to stdout")
  .action(async (opts: Record<string, unknown>) => {
    const { runOutline } = await import("./commands/outline.js");
    await runOutline(opts);
  });

cli
  .command("draft", "Generate an agent prompt to write baseline content (Workflow: research→generate→synthesize→audit)")
  .option("--print", "Also print the full prompt to stdout")
  .action(async (opts: Record<string, unknown>) => {
    const { runDraft } = await import("./commands/draft.js");
    await runDraft(opts);
  });

cli
  .command("validate", "Lint section sources against house-style rules")
  .alias("lint")
  .option("--quiet", "Only print errors")
  .action(async (opts: Record<string, unknown>) => {
    const { runValidate } = await import("./commands/validate.js");
    await runValidate(opts);
  });

cli
  .command("publish", "Build and deploy the bundle to the configured target")
  .alias("deploy")
  .option("--check", "Dry run: show what would be uploaded")
  .action(async (opts: Record<string, unknown>) => {
    const { runPublish } = await import("./commands/publish.js");
    await runPublish(opts);
  });

cli
  .command("eject", "Copy the engine into the project for full customization")
  .option("--force", "Overwrite an existing local engine dir")
  .action(async (opts: Record<string, unknown>) => {
    const { runEject } = await import("./commands/eject.js");
    await runEject(opts);
  });

cli.help();
cli.version(pkg.version);

async function main() {
  try {
    cli.parse(process.argv, { run: false });
    await cli.runMatchedCommand();
  } catch (err) {
    die(err);
  }
}

void main();
