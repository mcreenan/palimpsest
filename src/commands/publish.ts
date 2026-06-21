import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { loadConfig } from "../core/config.js";
import { build } from "../core/build.js";
import { planS3, s3DestUri, uploadS3 } from "../core/publish.js";
import { log, pc } from "../core/log.js";

export async function runPublish(opts: Record<string, unknown>): Promise<void> {
  const cfg = loadConfig();
  const provider = cfg.publish?.provider;
  if (!provider) throw new Error("No publish target configured. Set `publish.provider` in palimpsest.config.json.");

  const check = opts.check === true;
  log.step("Rebuilding before publish…");
  const result = build(cfg);
  const outDir = result.outDir;

  if (provider === "s3") {
    const plan = planS3(cfg, outDir);
    log.info(`${check ? pc.dim("(dry run) ") : ""}publish → s3://${plan.bucket}/${plan.prefix}`);
    for (const step of plan.steps) {
      log.dim(`  ${step.to.padEnd(24)} → ${s3DestUri(plan, step.to)}  [${step.contentType}]`);
    }
    if (!check) {
      uploadS3(plan);
      log.ok("Published to S3");
      if (plan.publicUrl) log.info(`  ${plan.publicUrl}`);
    }
    return;
  }

  if (provider === "gh-pages") {
    publishGhPages(cfg.projectRoot, outDir, cfg.artifactName, cfg.publish?.ghPages?.branch ?? "gh-pages", check);
    return;
  }

  throw new Error(`Unknown publish provider: ${provider}`);
}

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function publishGhPages(projectRoot: string, outDir: string, artifact: string, branch: string, check: boolean): void {
  let remote: string;
  try {
    remote = git(projectRoot, ["remote", "get-url", "origin"]);
  } catch {
    throw new Error("gh-pages publish needs a git `origin` remote in the project.");
  }

  // Stage the bundle with the guide as index.html.
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), "pal-ghp-"));
  fs.cpSync(outDir, stage, { recursive: true });
  fs.copyFileSync(path.join(outDir, artifact), path.join(stage, "index.html"));
  fs.writeFileSync(path.join(stage, ".nojekyll"), "");

  const files = fs.readdirSync(stage);
  log.info(`${check ? pc.dim("(dry run) ") : ""}publish → ${remote} (${branch})`);
  for (const f of files) log.dim(`  ${f}`);
  if (check) return;

  git(stage, ["init", "-q"]);
  git(stage, ["checkout", "-q", "-b", branch]);
  git(stage, ["add", "-A"]);
  git(stage, ["-c", "user.email=pal@palimpsest", "-c", "user.name=palimpsest", "commit", "-q", "-m", "Publish guide"]);
  git(stage, ["push", "-q", "--force", remote, `${branch}:${branch}`]);
  log.ok(`Published to ${branch}`);
}
