import type { ResolvedConfig } from "./config.js";

export interface PalRuntime {
  projectName: string;
  title: string;
  repoLinkBase: string;
  repoBranch: string;
  artifact: string;
  conventionsDoc: string;
  buildCommand: string;
  sourcesOfTruth?: string;
  mermaid: Record<string, string>;
}

export function buildPalRuntime(
  cfg: ResolvedConfig,
  mermaid: Record<string, string>,
  sourcesOfTruth?: string,
): PalRuntime {
  return {
    projectName: cfg.name,
    title: cfg.title,
    repoLinkBase: cfg.repoLinkBase,
    repoBranch: cfg.links.repoBranch,
    artifact: cfg.artifactName,
    conventionsDoc: cfg.suggest.conventionsDoc,
    buildCommand: "pal build",
    ...(sourcesOfTruth ? { sourcesOfTruth } : {}),
    mermaid,
  };
}

/**
 * The `<script>window.__PAL__ = {…}</script>` that carries the per-project org
 * seams the engine JS reads (repo link base, project name, Suggest-prompt
 * fields, and the derived Mermaid theme).
 */
export function renderPalScript(runtime: PalRuntime, indent = "    "): string {
  const json = JSON.stringify(runtime, null, 2)
    // Never let a value close the surrounding <script> element.
    .replace(/<\//g, "<\\/")
    .split("\n")
    .join(`\n${indent}`);
  return `${indent}<script>window.__PAL__ = ${json};</script>`;
}
