import { describe, it, expect } from "vitest";
import { lintFragment } from "../src/core/validate.js";
import { rewriteForDeploy, rewriteChangelogForDeploy } from "../src/core/publish.js";

describe("validate rules", () => {
  it("passes a clean fragment", () => {
    const html =
      '<p class="lead annotatable">Lead.</p>' +
      '<p class="annotatable">Body with <a class="gh-repo" data-repo="platform"></a>.</p>';
    expect(lintFragment("s.html", html)).toEqual([]);
  });

  it("flags body-only violations, inline styles, deep gh-repo, bad ident", () => {
    const html =
      '<section><h2>No</h2></section>' +
      '<p style="color:red">x</p>' +
      '<a class="gh-repo" data-repo="a/b"></a>' +
      '<a class="ident" data-type="widget">Z</a>';
    const rules = lintFragment("s.html", html).map((f) => f.rule);
    expect(rules).toContain("body-only");
    expect(rules).toContain("no-inline-style");
    expect(rules).toContain("gh-repo");
    expect(rules).toContain("ident");
  });

  it("warns on a missing lead and unannotated paragraphs", () => {
    const findings = lintFragment("s.html", "<p>no lead, no annotatable</p>");
    expect(findings.some((f) => f.rule === "lead")).toBe(true);
    expect(findings.some((f) => f.rule === "annotatable")).toBe(true);
  });
});

describe("deploy rewrite", () => {
  it("rewrites relative asset refs to the absolute base path", () => {
    const html =
      '<link rel="stylesheet" href="g.css" />' +
      '<a href="changelog.html">c</a>' +
      '<script src="vendor/mermaid.min.js"></script>' +
      '<script src="g.js"></script>';
    const out = rewriteForDeploy(html, "/eng/guide", "g.css", "g.js");
    expect(out).toContain('href="/eng/guide/g.css"');
    expect(out).toContain('src="/eng/guide/g.js"');
    expect(out).toContain('src="/eng/guide/vendor/mermaid.min.js"');
    expect(out).toContain('href="/eng/guide/changelog.html"');
  });

  it("rewrites the changelog back-link to the deployed index.html", () => {
    const out = rewriteChangelogForDeploy('<a href="g.html">back</a>', "/eng/guide", "g.html");
    expect(out).toContain('href="/eng/guide/index.html"');
  });

  it("is a no-op when basePath is empty", () => {
    const html = '<link href="g.css" />';
    expect(rewriteForDeploy(html, "", "g.css", "g.js")).toBe(html);
  });
});
