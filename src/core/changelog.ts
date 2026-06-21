/**
 * Changelog engine — a TypeScript port of the original changelog.py.
 *
 * Source of truth: changelog/CHANGELOG.md. One entry per accepted change,
 * newest first:
 *   ## <stamp> — <title>
 *   - <label>: <text>
 *   - Status: <applied | blocked … | baseline>
 * <stamp> is an ISO timestamp (…Z) or a bare date.
 *
 * Derived facts (also used for the guide header):
 *   version  "v<N>", N = number of `## ` entries.
 *   updated  most recent entry stamp, to the minute in UTC when the entry
 *            carried a clock component, else date-only.
 */

export interface Entry {
  stamp: string;
  date: Date | null;
  hasTime: boolean;
  title: string;
  items: string[];
  status: string | null;
}

const HEADING = /^##\s+(.*)$/;
const FENCE = /^```/;
const BULLET = /^\s*[-*]\s+(.*)$/;
const HEAD_SPLIT = /^(\S+)\s*—\s*(.*)$/;
const LEAD_LABEL = /^([A-Z][A-Za-z0-9 /+&-]{0,24}?):\s+([\s\S]*)$/;

function parseStamp(stamp: string): { date: Date | null; hasTime: boolean } {
  const s = stamp.trim();
  if (s.includes("T")) {
    const d = new Date(s.replace(/Z$/, "Z"));
    return isNaN(d.getTime()) ? { date: null, hasTime: false } : { date: d, hasTime: true };
  }
  const m = s.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return { date: null, hasTime: false };
  const d = new Date(Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!));
  return isNaN(d.getTime()) ? { date: null, hasTime: false } : { date: d, hasTime: false };
}

export function parseChangelog(md: string): Entry[] {
  const entries: Entry[] = [];
  let curHead: string | null = null;
  let body: string[] = [];
  let inFence = false;

  const flush = () => {
    if (curHead === null) return;
    const m = curHead.match(HEAD_SPLIT);
    const stamp = m ? m[1]! : "";
    const title = m ? m[2]!.trim() : curHead.trim();
    const { date, hasTime } = parseStamp(stamp);
    let items = collectItems(body);
    const status = findStatus(items);
    items = items.filter((it) => !/^\**Status:/i.test(it));
    entries.push({ stamp, date, hasTime, title, items, status });
  };

  for (const line of md.split("\n")) {
    if (FENCE.test(line)) {
      inFence = !inFence;
      if (curHead !== null) body.push(line);
      continue;
    }
    if (!inFence) {
      const h = line.match(HEADING);
      if (h) {
        flush();
        curHead = h[1]!.trim();
        body = [];
        continue;
      }
    }
    if (curHead !== null) body.push(line);
  }
  flush();
  return entries;
}

function collectItems(body: string[]): string[] {
  const items: string[] = [];
  for (const line of body) {
    const m = line.match(BULLET);
    if (m) items.push(m[1]!.replace(/\s+$/, ""));
    else if (line.trim() && items.length) items[items.length - 1] += " " + line.trim();
  }
  return items;
}

function findStatus(items: string[]): string | null {
  for (const raw of items) {
    const m = raw.match(/^\**Status:\**\s*(.*)$/i);
    if (m) return m[1]!.replace(/\*\*/g, "").trim();
  }
  return null;
}

function statusClass(status: string | null): string {
  const low = (status ?? "").toLowerCase();
  for (const key of ["applied", "blocked", "baseline"]) {
    if (low.startsWith(key)) return key;
  }
  return "other";
}

export function deriveVersion(entries: Entry[]): string {
  return `v${entries.length}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function deriveUpdated(entries: Entry[]): string {
  const dated = entries.filter((e) => e.date);
  if (!dated.length) return "—";
  const latest = dated.reduce((a, b) => (a.date!.getTime() >= b.date!.getTime() ? a : b));
  const d = latest.date!;
  const base = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  return latest.hasTime ? `${base} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}` : base;
}

// ── rendering ───────────────────────────────────────────────────────────────

function escape(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inline(text: string): string {
  let out = escape(text);
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return out;
}

function renderItem(raw: string): string {
  const m = raw.match(LEAD_LABEL);
  if (m && !m[1]!.includes("`") && !m[1]!.includes("**")) {
    return `<strong>${escape(m[1]!)}:</strong> ${inline(m[2]!)}`;
  }
  return inline(raw);
}

function renderStamp(e: Entry): string {
  if (!e.date) return escape(e.stamp);
  const d = e.date;
  const base = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  return e.hasTime ? `${base} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC` : base;
}

function renderEntry(e: Entry): string {
  const cls = statusClass(e.status);
  const label = (e.status ?? "").split(/\s*[—(]/)[0]!.trim() || cls;
  const items = e.items.map((it) => `        <li>${renderItem(it)}</li>`).join("\n");
  return `      <article class="entry entry-${cls}">
        <div class="entry-meta">
          <span class="stamp">${renderStamp(e)}</span>
          <span class="status status-${cls}">${escape(label)}</span>
        </div>
        <h2 class="entry-title">${inline(e.title)}</h2>
        <ul class="entry-body">
${items}
        </ul>
      </article>`;
}

export function renderEntries(entries: Entry[]): string {
  return entries.map(renderEntry).join("\n");
}
