import fs from "node:fs";
import path from "node:path";
import * as clack from "@clack/prompts";
import { loadConfig, CONFIG_FILENAME, type PartDef, type SectionDef } from "../core/config.js";
import { splitPart } from "../core/assemble.js";
import { log, pc } from "../core/log.js";

function readRaw(root: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(root, CONFIG_FILENAME), "utf8"));
}
function writeRaw(root: string, raw: Record<string, unknown>): void {
  fs.writeFileSync(path.join(root, CONFIG_FILENAME), JSON.stringify(raw, null, 2) + "\n");
}
function fragmentPath(root: string, s: { num: number; slug: string }): string {
  return path.join(root, "sections", `${s.num}-${s.slug}.html`);
}

export async function runSection(action: string, slug: string | undefined, opts: Record<string, unknown>): Promise<void> {
  const cfg = loadConfig();
  switch (action) {
    case "add":
      return addSection(cfg.projectRoot, cfg.structure, slug, opts);
    case "list":
    case "ls":
      return listSections(cfg.projectRoot, cfg.structure);
    case "remove":
    case "rm":
      return removeSection(cfg.projectRoot, slug, opts);
    default:
      throw new Error(`Unknown section action "${action}". Use: add <slug> | list | remove <slug>`);
  }
}

function allSections(structure: PartDef[]): SectionDef[] {
  return structure.flatMap((p) => p.sections);
}

async function addSection(root: string, structure: PartDef[], slug: string | undefined, opts: Record<string, unknown>): Promise<void> {
  const yes = opts.yes === true;
  const interactive = !yes && Boolean(process.stdin.isTTY && process.stdout.isTTY);

  let title = typeof opts.title === "string" ? opts.title : undefined;
  let partLabel = typeof opts.part === "string" ? opts.part : undefined;

  if (interactive) {
    if (!slug) slug = await ask("Section slug (kebab-case)", "");
    if (!title) title = await ask("Section title", titleize(slug!));
    if (!partLabel) {
      const choices = structure.map((p) => ({ value: p.part, label: p.part }));
      partLabel = structure.length
        ? await selectOrNew("Place under part", choices)
        : await ask("Part label (e.g. 'I — Orientation')", "I — Overview");
    }
  } else {
    if (!slug) throw new Error("Usage: pal section add <slug> --title <title> [--part <part>]");
    if (!title) throw new Error("--title is required");
  }
  if (!/^[a-z0-9-]+$/.test(slug!)) throw new Error("slug must be kebab-case (a-z, 0-9, -)");

  const raw = readRaw(root);
  const parts = (raw.structure as PartDef[]) ?? [];
  const flat = parts.flatMap((p) => p.sections);
  if (flat.some((s) => s.slug === slug)) throw new Error(`a section with slug "${slug}" already exists`);

  const maxNum = flat.reduce((m, s) => Math.max(m, s.num), 0);
  const after = opts.after !== undefined ? Number(opts.after) : undefined;
  const explicit = opts.num !== undefined ? Number(opts.num) : undefined;
  const insertNum = after !== undefined ? after + 1 : explicit ?? maxNum + 1;

  // Resolve the target part BEFORE renumbering (so the --after anchor still exists):
  //  --part wins; else the part containing the --after section; else the last part.
  let target: PartDef | undefined;
  if (partLabel) {
    target = parts.find((p) => p.part === partLabel || splitPart(p.part).name === partLabel);
    if (!target) { target = { part: partLabel, sections: [] }; parts.push(target); }
  } else if (after !== undefined) {
    target = parts.find((p) => p.sections.some((s) => s.num === after));
  } else {
    // Append: into the part holding the current last section (not a trailing
    // empty skeleton part), falling back to the last non-empty part.
    target =
      parts.find((p) => p.sections.some((s) => s.num === maxNum)) ??
      [...parts].reverse().find((p) => p.sections.length > 0);
  }
  if (!target) { target = parts[parts.length - 1] ?? { part: "I — Orientation", sections: [] }; if (!parts.includes(target)) parts.push(target); }

  // Shift existing sections up to make room (rename fragment files high→low).
  if (insertNum <= maxNum) {
    const toShift = parts.flatMap((p) => p.sections).filter((s) => s.num >= insertNum).sort((a, b) => b.num - a.num);
    for (const s of toShift) {
      const oldF = fragmentPath(root, s);
      s.num += 1;
      if (fs.existsSync(oldF)) fs.renameSync(oldF, fragmentPath(root, s));
    }
  }

  target.sections.push({ num: insertNum, slug: slug!, title: title! });
  target.sections.sort((a, b) => a.num - b.num);

  raw.structure = parts;
  writeRaw(root, raw);

  // Create the starter fragment.
  const frag = fragmentPath(root, { num: insertNum, slug: slug! });
  fs.mkdirSync(path.dirname(frag), { recursive: true });
  if (!fs.existsSync(frag)) {
    fs.writeFileSync(frag, `<p class="lead annotatable">${title}.</p>\n`);
  }

  log.ok(`Added section ${pc.bold(`${insertNum}. ${title}`)} under "${target.part}"`);
  log.dim(`  sections/${insertNum}-${slug}.html — edit it, then \`pal build\``);
}

function listSections(root: string, structure: PartDef[]): void {
  if (!structure.length) {
    log.info("No sections yet. Add one with `pal section add <slug> --title \"…\"`.");
    return;
  }
  for (const p of structure) {
    log.info(pc.bold(p.part));
    for (const s of p.sections) {
      const exists = fs.existsSync(fragmentPath(root, s));
      const mark = exists ? pc.green("●") : pc.yellow("○");
      log.info(`  ${mark} ${String(s.num).padStart(2)}  ${s.title} ${pc.dim(`(${s.num}-${s.slug}.html${exists ? "" : " — missing"})`)}`);
    }
  }
}

function removeSection(root: string, slug: string | undefined, opts: Record<string, unknown>): void {
  if (!slug) throw new Error("Usage: pal section remove <slug>");
  const raw = readRaw(root);
  const parts = (raw.structure as PartDef[]) ?? [];
  let removed: SectionDef | undefined;
  for (const p of parts) {
    const idx = p.sections.findIndex((s) => s.slug === slug);
    if (idx !== -1) {
      removed = p.sections[idx];
      p.sections.splice(idx, 1);
      break;
    }
  }
  if (!removed) throw new Error(`no section with slug "${slug}"`);

  // Delete its fragment (unless asked to keep it).
  if (opts.keepFile !== true) {
    const f = fragmentPath(root, removed);
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }

  // Renumber sections above the removed one down by 1 (rename files low→high).
  const toShift = parts.flatMap((p) => p.sections).filter((s) => s.num > removed!.num).sort((a, b) => a.num - b.num);
  for (const s of toShift) {
    const oldF = fragmentPath(root, s);
    s.num -= 1;
    if (fs.existsSync(oldF)) fs.renameSync(oldF, fragmentPath(root, s));
  }

  // Keep parts even when they become empty — they're a durable skeleton.
  raw.structure = parts;
  writeRaw(root, raw);
  log.ok(`Removed section ${pc.bold(`${removed.num}. ${removed.title}`)}`);
}

function titleize(s: string): string {
  return s.split(/[-_\s]+/).filter(Boolean).map((w) => w[0]!.toUpperCase() + w.slice(1)).join(" ");
}
async function ask(message: string, initialValue: string): Promise<string> {
  const v = await clack.text({ message, initialValue });
  if (clack.isCancel(v)) { clack.cancel("Cancelled."); process.exit(0); }
  return String(v).trim();
}
async function selectOrNew(message: string, options: { value: string; label: string }[]): Promise<string> {
  const v = await clack.select({ message, options: [...options, { value: "__new__", label: "+ New part…" }] });
  if (clack.isCancel(v)) { clack.cancel("Cancelled."); process.exit(0); }
  if (v === "__new__") return ask("New part label (e.g. 'II — Building')", "");
  return String(v);
}
