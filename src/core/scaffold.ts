import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { templatesDir, packageRoot } from "./paths.js";
import { renderTokensCss } from "./theme/render.js";
import { defaultTheme } from "./theme/contract.js";
import type { PartDef } from "./config.js";

export interface ScaffoldAnswers {
  name: string;
  dir: string;
  orgName: string;
  githubOrg: string;
  title: string;
  /** Optional org theme file to import in place of the default tokens. */
  themeFile?: string;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function titleize(s: string): string {
  return slugify(s)
    .split("-")
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(" ");
}

/** Best-effort org display name from a project name like "acme-engineering-guide". */
export function deriveOrgName(name: string): string {
  return titleize(name.replace(/-?engineering-guide$|-?guide$/i, "")) || titleize(name);
}

function subst(str: string, vars: Record<string, string>): string {
  let out = str;
  for (const [k, v] of Object.entries(vars)) out = out.split(`{{${k}}}`).join(v);
  return out;
}

function copyTemplate(rel: string, dest: string, vars: Record<string, string>): void {
  const src = fs.readFileSync(path.join(templatesDir(), rel), "utf8");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, subst(src, vars));
}

export function runningVersion(): string {
  try {
    const require = createRequire(import.meta.url);
    const pkg = require(path.join(packageRoot(), "package.json")) as { version: string };
    return pkg.version;
  } catch {
    return "0.1.0";
  }
}

// Sane default skeleton: the five standard parts of an engineering guide. Only
// Orientation ships with starter sections; the rest are empty placeholders ready
// to fill (via `pal outline`, `pal section add`, or by hand). Empty parts are not
// rendered until they have sections.
const DEFAULT_STRUCTURE: PartDef[] = [
  {
    part: "I — Orientation",
    sections: [
      { num: 1, slug: "about", title: "About This Guide" },
      { num: 2, slug: "getting-started", title: "Getting Started" },
    ],
  },
  { part: "II — Building", sections: [] },
  { part: "III — Shipping", sections: [] },
  { part: "IV — Supporting and Maintaining", sections: [] },
  { part: "V — References", sections: [] },
];

/** Write the full project tree. Returns the list of created top-level entries. */
export function scaffold(a: ScaffoldAnswers, today: string): string[] {
  const vars: Record<string, string> = {
    TITLE: a.title,
    PROJECT_NAME: a.name,
    ORG_NAME: a.orgName,
    GITHUB_ORG: a.githubOrg,
    ARTIFACT: `${a.name}.html`,
    BUILD: "pal build",
    REPO_LINK_BASE: `https://github.com/${a.githubOrg}`,
    DATE: today,
  };

  fs.mkdirSync(a.dir, { recursive: true });

  // palimpsest.config.json — minimal; derived fields are omitted on purpose.
  const config = {
    name: a.name,
    title: a.title,
    org: { name: a.orgName, githubOrg: a.githubOrg },
    theme: "./theme/tokens.css",
    output: { inline: false },
    structure: DEFAULT_STRUCTURE,
    suggest: { conventionsDoc: "AGENTS.md" },
  };
  fs.writeFileSync(
    path.join(a.dir, "palimpsest.config.json"),
    JSON.stringify(config, null, 2) + "\n",
  );

  // theme tokens — full default contract, ready to edit (or replaced by import).
  fs.mkdirSync(path.join(a.dir, "theme"), { recursive: true });
  fs.writeFileSync(path.join(a.dir, "theme", "tokens.css"), renderTokensCss(defaultTheme()));

  // content + history + docs
  copyTemplate("sections/1-about.html", path.join(a.dir, "sections", "1-about.html"), vars);
  copyTemplate(
    "sections/2-getting-started.html",
    path.join(a.dir, "sections", "2-getting-started.html"),
    vars,
  );
  copyTemplate("changelog/CHANGELOG.md", path.join(a.dir, "changelog", "CHANGELOG.md"), vars);
  copyTemplate("AGENTS.md", path.join(a.dir, "AGENTS.md"), vars);
  copyTemplate("CLAUDE.md", path.join(a.dir, "CLAUDE.md"), vars);
  copyTemplate("README.md", path.join(a.dir, "README.md"), vars);
  copyTemplate("gitignore", path.join(a.dir, ".gitignore"), vars);
  copyTemplate("claude/launch.json", path.join(a.dir, ".claude", "launch.json"), vars);

  // package.json — palimpsest as a devDependency, with convenience scripts.
  const spec = process.env.PALIMPSEST_INSTALL_SPEC || `^${runningVersion()}`;
  const pkg = {
    name: a.name,
    version: "0.1.0",
    private: true,
    type: "module",
    scripts: {
      build: "pal build",
      dev: "pal dev",
      preview: "pal dev",
      validate: "pal validate",
      publish: "pal publish",
    },
    devDependencies: { "@mcreenan/palimpsest": spec },
  };
  fs.writeFileSync(path.join(a.dir, "package.json"), JSON.stringify(pkg, null, 2) + "\n");

  return [
    "palimpsest.config.json",
    "package.json",
    "theme/",
    "sections/",
    "changelog/",
    "AGENTS.md",
    "CLAUDE.md",
    "README.md",
    ".gitignore",
    ".claude/",
  ];
}
