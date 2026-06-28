import { describe, it, expect } from "vitest";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { parseConfig } from "../src/core/config.js";
import { collectLinks } from "../src/core/links.js";

function makeProject(fragment: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pal-links-"));
  fs.mkdirSync(path.join(root, "sections"));
  fs.writeFileSync(path.join(root, "sections", "1-about.html"), fragment);
  return root;
}

const raw = {
  name: "acme-engineering-guide",
  title: "Acme Engineering Guide",
  org: { name: "Acme", githubOrg: "acme-inc" },
  structure: [{ part: "I", sections: [{ num: 1, slug: "about", title: "About" }] }],
  sources: [
    {
      name: "wiki",
      type: "wiki",
      description: "Eng wiki",
      instructions: "search it",
      linkBase: "https://wiki.example.com",
    },
  ],
};

describe("collectLinks", () => {
  it("reconstructs repo, code, source, and external URLs like the engine does", () => {
    const root = makeProject(
      '<p class="lead annotatable">Lead.</p>' +
        '<p class="annotatable">See <a class="gh-repo" data-repo="platform"></a> and ' +
        '<a class="ident" data-type="class" data-repo="platform" data-path="app/models/user.rb">User</a> and ' +
        '<a class="ident" data-type="module" data-repo="infra">Infra</a> and ' +
        '<a href="https://example.com/docs">docs</a>.' +
        '<span class="sources-data"><a href="https://src.example.com/page" data-kind="wiki">Src</a></span></p>',
    );
    const cfg = parseConfig(raw, root);
    const links = collectLinks(cfg);
    const byUrl = new Map(links.map((l) => [l.url, l]));

    expect(byUrl.get("https://github.com/acme-inc/platform")?.kind).toBe("repo");
    expect(byUrl.get("https://github.com/acme-inc/platform/blob/HEAD/app/models/user.rb")?.kind).toBe("code");
    expect(byUrl.get("https://github.com/acme-inc/infra")?.kind).toBe("code"); // ident without path → repo root
    expect(byUrl.get("https://example.com/docs")?.kind).toBe("external");
    expect(byUrl.get("https://src.example.com/page")?.kind).toBe("source");
    expect(byUrl.get("https://wiki.example.com")?.kind).toBe("source"); // from config source linkBase
  });

  it("dedupes repeated URLs", () => {
    const root = makeProject(
      '<p class="annotatable"><a class="gh-repo" data-repo="platform"></a>' +
        '<a class="gh-repo" data-repo="platform"></a></p>',
    );
    const cfg = parseConfig(raw, root);
    const repoLinks = collectLinks(cfg).filter((l) => l.url.endsWith("/platform"));
    expect(repoLinks).toHaveLength(1);
  });

  it("ignores anchor and relative links", () => {
    const root = makeProject(
      '<p class="annotatable"><a href="#section-2">jump</a> <a href="./local.html">rel</a></p>',
    );
    const cfg = parseConfig(raw, root);
    const urls = collectLinks(cfg).map((l) => l.url);
    expect(urls).not.toContain("#section-2");
    expect(urls).not.toContain("./local.html");
  });
});
