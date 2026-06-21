import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import * as clack from "@clack/prompts";
import { parseConfig, CONFIG_FILENAME } from "../core/config.js";
import { build } from "../core/build.js";
import { installLogo } from "../core/logo.js";
import {
  scaffold,
  slugify,
  deriveOrgName,
  type ScaffoldAnswers,
} from "../core/scaffold.js";
import { importTheme } from "../core/theme/import-css.js";
import { renderTokensCss } from "../core/theme/render.js";
import { log, pc } from "../core/log.js";

function opt(opts: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = opts[k];
    if (typeof v === "string" && v.length) return v;
  }
  return undefined;
}

export async function runInit(opts: Record<string, unknown>): Promise<void> {
  const flagName = opt(opts, "name") || (typeof opts.name === "string" ? opts.name : undefined);
  const yes = opts.yes === true;
  const interactive = !yes && Boolean(process.stdin.isTTY && process.stdout.isTTY);

  let answers: ScaffoldAnswers;
  let logoInput: string | undefined;

  if (interactive) {
    clack.intro(pc.bold(" palimpsest "));
    const orgName = await text("Organization name", opt(opts, "org") || (flagName ? deriveOrgName(flagName) : ""), "Acme");
    const githubOrg = await text("GitHub org / user (for repo links)", opt(opts, "githubOrg", "github-org") || slugify(orgName), slugify(orgName));
    const name = await text("Project name", flagName || `${githubOrg}-engineering-guide`, `${githubOrg}-engineering-guide`);
    const dirIn = await text("Target directory (absolute)", opt(opts, "dir") || path.resolve(process.cwd(), name), path.resolve(process.cwd(), name));
    const title = await text("Guide title", opt(opts, "title") || `${orgName} Engineering Guide`, `${orgName} Engineering Guide`);
    const themeFile = opt(opts, "theme") || (await maybeText("Import a theme from a CSS/tokens file now? (path, or blank to skip)"));
    logoInput = opt(opts, "logo") ?? (await promptLogo());
    answers = {
      orgName,
      githubOrg,
      name,
      title,
      dir: path.resolve(dirIn),
      themeFile: themeFile ? path.resolve(themeFile) : undefined,
    };
  } else {
    const orgName = opt(opts, "org") || (flagName ? deriveOrgName(flagName) : "My Org");
    const githubOrg = opt(opts, "githubOrg", "github-org") || slugify(orgName);
    const name = flagName || `${githubOrg}-engineering-guide`;
    answers = {
      orgName,
      githubOrg,
      name,
      title: opt(opts, "title") || `${orgName} Engineering Guide`,
      dir: opts.dir ? path.resolve(String(opts.dir)) : path.resolve(process.cwd(), name),
      themeFile: opts.theme ? path.resolve(String(opts.theme)) : undefined,
    };
    logoInput = opt(opts, "logo");
  }

  // Guard against scaffolding into a non-empty directory.
  if (fs.existsSync(answers.dir) && fs.readdirSync(answers.dir).length > 0) {
    throw new Error(`Target directory is not empty: ${answers.dir}`);
  }

  const today = new Date().toISOString().slice(0, 10);
  scaffold(answers, today);
  log.ok(`Scaffolded ${pc.bold(answers.name)} in ${answers.dir}`);

  // Optional logo → install into assets/ and point brand.logo at it.
  if (logoInput) {
    try {
      const rel = await installLogo(answers.dir, logoInput);
      const cfgPath = path.join(answers.dir, CONFIG_FILENAME);
      const raw = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
      raw.brand = { ...(raw.brand ?? {}), logo: rel };
      fs.writeFileSync(cfgPath, JSON.stringify(raw, null, 2) + "\n");
      log.ok(`Added logo → ${rel}`);
    } catch (e) {
      log.warn(`logo skipped: ${(e as Error).message}`);
    }
  }

  // Optional theme import → overwrite the default tokens.
  if (answers.themeFile) {
    if (!fs.existsSync(answers.themeFile)) {
      log.warn(`theme file not found, kept defaults: ${answers.themeFile}`);
    } else {
      const r = importTheme(answers.themeFile);
      fs.writeFileSync(path.join(answers.dir, "theme", "tokens.css"), renderTokensCss(r.values));
      log.ok(`Imported theme: mapped ${r.mapped.length} slot(s), derived ${r.derived.length}`);
    }
  }

  // Install palimpsest as a devDependency (skippable for offline/test runs).
  const doInstall = opts.install !== false;
  if (doInstall) {
    try {
      log.step("Installing dependencies (npm install)…");
      execSync("npm install", { cwd: answers.dir, stdio: "inherit" });
    } catch {
      log.warn("npm install failed — run it yourself in the project directory.");
    }
  }

  // First build so the project has a viewable artifact immediately.
  if (opts.build !== false) {
    const cfg = parseConfig(
      JSON.parse(fs.readFileSync(path.join(answers.dir, "palimpsest.config.json"), "utf8")),
      answers.dir,
    );
    const result = build(cfg);
    log.ok(`Built ${pc.bold(result.artifact)} (${result.version})`);
  }

  if (interactive) clack.outro(pc.green("Done."));
  printNextSteps(answers.dir);
}

function printNextSteps(dir: string): void {
  log.info("");
  log.info(pc.bold("Next steps — build out your guide:"));
  log.dim(`  cd ${dir}`);
  log.info("");
  log.info(`  ${pc.cyan("1.")} ${pc.bold("Add your sources of truth")} (first — everything else is grounded in these)`);
  log.dim("       pal source add <name> --type repo|wiki|help|confluence --description \"…\"");
  log.dim("       e.g. your code repos, engineering wiki, and help center");
  log.info(`  ${pc.cyan("2.")} ${pc.bold("Create the initial outline")} — generates a prompt to paste into an agent here`);
  log.dim("       pal outline");
  log.info(`  ${pc.cyan("3.")} ${pc.bold("Create the content")} from your sources + outline — another agent prompt`);
  log.dim("       pal draft");
  log.info(`  ${pc.cyan("4.")} ${pc.bold("Preview & publish")}`);
  log.dim("       pal dev   ·   pal validate   ·   pal publish");
  log.info("");
  log.dim("  Prefer to write by hand? Use `pal section add` + edit sections/*.html.");
  log.dim("  Docs: README.md · house style: AGENTS.md");
}

async function text(message: string, initial: string, placeholder: string): Promise<string> {
  const v = await clack.text({ message, initialValue: initial, placeholder });
  if (clack.isCancel(v)) {
    clack.cancel("Cancelled.");
    process.exit(0);
  }
  return String(v).trim();
}

async function promptLogo(): Promise<string | undefined> {
  const choice = await clack.select({
    message: "Organization logo?",
    options: [
      { value: "skip", label: "Skip — use the default mark" },
      { value: "url", label: "Download from an image URL" },
      { value: "path", label: "Copy from a file path" },
      { value: "svg", label: "Paste SVG markup" },
    ],
    initialValue: "skip",
  });
  if (clack.isCancel(choice) || choice === "skip") return undefined;
  const prompts: Record<string, string> = {
    url: "Image URL (png, jpg, svg, …)",
    path: "Absolute path to the image",
    svg: "Paste SVG markup (a single line)",
  };
  const v = await clack.text({ message: prompts[choice as string]! });
  if (clack.isCancel(v)) return undefined;
  const s = String(v).trim();
  return s || undefined;
}

async function maybeText(message: string): Promise<string | undefined> {
  const v = await clack.text({ message, placeholder: "" });
  if (clack.isCancel(v)) return undefined;
  const s = String(v).trim();
  return s || undefined;
}
