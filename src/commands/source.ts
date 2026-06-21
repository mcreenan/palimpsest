import fs from "node:fs";
import path from "node:path";
import * as clack from "@clack/prompts";
import { loadConfig, CONFIG_FILENAME, SOURCE_TYPES, type SourceDef } from "../core/config.js";
import { applySourcesToAgents, defaultInstructions } from "../core/sources.js";
import { log, pc } from "../core/log.js";

function readRaw(projectRoot: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(projectRoot, CONFIG_FILENAME), "utf8"));
}
function writeRaw(projectRoot: string, raw: Record<string, unknown>): void {
  fs.writeFileSync(path.join(projectRoot, CONFIG_FILENAME), JSON.stringify(raw, null, 2) + "\n");
}

export async function runSource(action: string, name: string | undefined, opts: Record<string, unknown>): Promise<void> {
  const cfg = loadConfig();
  switch (action) {
    case "add":
      return addSource(cfg.projectRoot, cfg.suggest.conventionsDoc, name, opts);
    case "list":
    case "ls":
      return listSources(cfg.sources);
    case "remove":
    case "rm":
      return removeSource(cfg.projectRoot, cfg.suggest.conventionsDoc, name, cfg.sources);
    default:
      throw new Error(`Unknown source action "${action}". Use: add <name> | list | remove <name>`);
  }
}

function str(opts: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) if (typeof opts[k] === "string" && (opts[k] as string).length) return opts[k] as string;
  return undefined;
}

async function addSource(root: string, conventionsDoc: string, name: string | undefined, opts: Record<string, unknown>): Promise<void> {
  const yes = opts.yes === true;
  const interactive = !yes && Boolean(process.stdin.isTTY && process.stdout.isTTY);

  let type = str(opts, "type") as SourceDef["type"] | undefined;
  let description = str(opts, "description", "desc");
  let title = str(opts, "title");
  let srcPath = str(opts, "path");
  let linkBase = str(opts, "linkBase", "link-base");
  let instructions = str(opts, "instructions");

  if (interactive) {
    if (!name) name = await ask("Source name (kebab-case)", "");
    if (!type) type = (await select("Source type", SOURCE_TYPES.map((t) => ({ value: t, label: t })))) as SourceDef["type"];
    if (!title) title = (await ask("Title (human label)", titleize(name!))) || undefined;
    if (!description) description = await ask("Description (what is it?)", "");
    if ((type === "repo" || type === "help") && !srcPath) {
      srcPath = await ask("Local path (for grep/search)", `sources/${type === "help" ? "docs" : "code"}/${name}`);
    }
    if ((type === "repo" || type === "help") && !linkBase) {
      linkBase = (await ask("Link base (web/VCS URL)", "")) || undefined;
    }
    if (!instructions) {
      const seed = defaultInstructions(type!, { name: name!, title, path: srcPath, linkBase });
      instructions = await askMultiline("Agent instructions (edit as needed)", seed);
    }
  } else {
    if (!name) throw new Error("Usage: pal source add <name> --type <type> --description <text>");
    if (!type) throw new Error("--type is required (one of: " + SOURCE_TYPES.join(", ") + ")");
    if (!description) throw new Error("--description is required");
    if ((type === "repo" || type === "help") && !srcPath) {
      srcPath = `sources/${type === "help" ? "docs" : "code"}/${name}`;
    }
    if (!instructions) instructions = defaultInstructions(type, { name, title, path: srcPath, linkBase });
  }

  if (!SOURCE_TYPES.includes(type as never)) throw new Error(`invalid type "${type}"`);

  const raw = readRaw(root);
  const sources = (Array.isArray(raw.sources) ? raw.sources : []) as SourceDef[];
  if (sources.some((s) => s.name === name)) throw new Error(`a source named "${name}" already exists`);

  const def: SourceDef = { name: name!, type: type!, description: description!, instructions: instructions! };
  if (title) def.title = title;
  if (srcPath) def.path = srcPath;
  if (linkBase) def.linkBase = linkBase;
  sources.push(def);
  raw.sources = sources;
  writeRaw(root, raw);
  applySourcesToAgents(root, sources, conventionsDoc);
  ensureLocalDir(root, def);

  log.ok(`Added source ${pc.bold(name!)} (${type})`);
  log.dim(`  recorded in ${CONFIG_FILENAME} and codified into ${conventionsDoc}`);
  if (def.path && def.path.startsWith("sources/")) log.dim(`  clone/place material at ${def.path} (gitignored)`);
}

function listSources(sources: SourceDef[]): void {
  if (!sources.length) {
    log.info("No sources defined. Add one with `pal source add <name> --type repo …`.");
    return;
  }
  for (const s of sources) {
    log.info(`${pc.bold(s.name)} ${pc.dim(`(${s.type})`)}  ${s.description}`);
    if (s.path) log.dim(`    path: ${s.path}`);
    if (s.linkBase) log.dim(`    link: ${s.linkBase}`);
  }
}

function removeSource(root: string, conventionsDoc: string, name: string | undefined, current: SourceDef[]): void {
  if (!name) throw new Error("Usage: pal source remove <name>");
  if (!current.some((s) => s.name === name)) throw new Error(`no source named "${name}"`);
  const raw = readRaw(root);
  const sources = ((raw.sources as SourceDef[]) || []).filter((s) => s.name !== name);
  raw.sources = sources;
  writeRaw(root, raw);
  applySourcesToAgents(root, sources, conventionsDoc);
  log.ok(`Removed source ${pc.bold(name)}`);
}

function ensureLocalDir(root: string, s: SourceDef): void {
  if (!s.path || !s.path.startsWith("sources/")) return;
  const baseDir = path.join(root, path.dirname(s.path)); // e.g. sources/code
  fs.mkdirSync(baseDir, { recursive: true });
  const keep = path.join(baseDir, ".gitkeep");
  if (!fs.existsSync(keep)) fs.writeFileSync(keep, "");
}

function titleize(s: string): string {
  return s.split(/[-_\s]+/).filter(Boolean).map((w) => w[0]!.toUpperCase() + w.slice(1)).join(" ");
}

async function ask(message: string, initialValue: string): Promise<string> {
  const v = await clack.text({ message, initialValue });
  if (clack.isCancel(v)) { clack.cancel("Cancelled."); process.exit(0); }
  return String(v).trim();
}
async function askMultiline(message: string, initialValue: string): Promise<string> {
  const v = await clack.text({ message: `${message} (one line; edit later in AGENTS.md/config)`, initialValue });
  if (clack.isCancel(v)) { clack.cancel("Cancelled."); process.exit(0); }
  return String(v);
}
async function select(message: string, options: { value: string; label: string }[]): Promise<string> {
  const v = await clack.select({ message, options });
  if (clack.isCancel(v)) { clack.cancel("Cancelled."); process.exit(0); }
  return String(v);
}
