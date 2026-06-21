import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { CONFIG_FILENAME, findProjectRoot } from "./paths.js";

export { CONFIG_FILENAME } from "./paths.js";

/** A single section entry in the guide's structure. */
export const SectionSchema = z.object({
  num: z.number().int().positive(),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, "slug must be kebab-case (a-z, 0-9, -)"),
  title: z.string().min(1),
});
export type SectionDef = z.infer<typeof SectionSchema>;

/** A "Part" groups sections under a kicker/name in the ToC and content. */
export const PartSchema = z.object({
  part: z.string().min(1),
  // Empty parts are allowed — they form a skeleton (e.g. the default 5-part
  // structure) and are simply not rendered until they have sections.
  sections: z.array(SectionSchema).default([]),
});
export type PartDef = z.infer<typeof PartSchema>;

export const SOURCE_TYPES = ["repo", "wiki", "confluence", "help", "custom"] as const;

/** An authoritative source of truth the guide summarises (and the Suggest flow checks against). */
export const SourceSchema = z.object({
  name: z.string().regex(/^[a-z0-9-]+$/, "source name must be kebab-case"),
  type: z.enum(SOURCE_TYPES),
  title: z.string().optional(),
  description: z.string().min(1),
  /** Local path agents grep/read (repo/help). */
  path: z.string().optional(),
  /** Web/VCS link base for citing this source (repo/help). */
  linkBase: z.string().optional(),
  /** Agent instructions: how to interface with this source. */
  instructions: z.string().min(1),
});
export type SourceDef = z.infer<typeof SourceSchema>;

export const PublishSchema = z
  .object({
    provider: z.enum(["s3", "gh-pages"]).optional(),
    s3: z
      .object({
        bucket: z.string(),
        prefix: z.string().default(""),
        profile: z.string().optional(),
        region: z.string().optional(),
        publicUrl: z.string().optional(),
      })
      .optional(),
    ghPages: z
      .object({
        branch: z.string().default("gh-pages"),
        repo: z.string().optional(),
      })
      .optional(),
  })
  .optional();

export const ConfigSchema = z.object({
  /** Project/repo name, e.g. "acme-engineering-guide". */
  name: z.string().min(1),
  /** Human title shown in the header, e.g. "Acme Engineering Guide". */
  title: z.string().min(1),
  org: z.object({
    name: z.string().min(1),
    /** GitHub org/user that repo references resolve against. */
    githubOrg: z.string().min(1),
  }),
  links: z
    .object({
      /** Base for repo links; defaults to https://github.com/<githubOrg>. */
      repoLinkBase: z.string().optional(),
      repoBranch: z.string().default("HEAD"),
    })
    .default({ repoBranch: "HEAD" }),
  /** Path to the theme tokens file (CSS or design-tokens JSON). */
  theme: z.string().default("./theme/tokens.css"),
  brand: z
    .object({
      /** Path to an SVG logo rendered in the header brand slot. */
      logo: z.string().optional(),
    })
    .default({}),
  /** Optional path to an ejected engine dir; when set, build uses it. */
  engine: z.string().optional(),
  output: z
    .object({
      dir: z.string().default("."),
      artifact: z.string().optional(),
      /** Emit a single self-contained HTML instead of a css/js bundle. */
      inline: z.boolean().default(false),
      /** Absolute base path for deploy-time asset rewrites, e.g. /eng/guide. */
      basePath: z.string().default(""),
    })
    .default({ dir: ".", inline: false, basePath: "" }),
  structure: z.array(PartSchema).default([]),
  sources: z.array(SourceSchema).default([]),
  publish: PublishSchema,
  suggest: z
    .object({
      /** Doc the Suggest-a-change prompt points authors/agents at. */
      conventionsDoc: z.string().default("AGENTS.md"),
    })
    .default({ conventionsDoc: "AGENTS.md" }),
});

export type Config = z.infer<typeof ConfigSchema>;

/** A config with all derived defaults resolved, plus the project root. */
export interface ResolvedConfig extends Config {
  projectRoot: string;
  /** Effective repo link base (filled from githubOrg when not set). */
  repoLinkBase: string;
  /** Effective output artifact filename (filled from name when not set). */
  artifactName: string;
}

export class ConfigError extends Error {}

export function parseConfig(raw: unknown, projectRoot: string): ResolvedConfig {
  const result = ConfigSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new ConfigError(`Invalid ${CONFIG_FILENAME}:\n${issues}`);
  }
  const cfg = result.data;
  const repoLinkBase =
    cfg.links.repoLinkBase ?? `https://github.com/${cfg.org.githubOrg}`;
  const artifactName = cfg.output.artifact ?? `${cfg.name}.html`;
  return { ...cfg, projectRoot, repoLinkBase, artifactName };
}

/** Load and validate the project's config, searching upward from `cwd`. */
export function loadConfig(cwd: string = process.cwd()): ResolvedConfig {
  const root = findProjectRoot(cwd);
  if (!root) {
    throw new ConfigError(
      `No ${CONFIG_FILENAME} found in ${cwd} or any parent directory. Run \`pal init\` to create a guide.`,
    );
  }
  const file = path.join(root, CONFIG_FILENAME);
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    throw new ConfigError(`Could not parse ${file}: ${(e as Error).message}`);
  }
  return parseConfig(raw, root);
}
