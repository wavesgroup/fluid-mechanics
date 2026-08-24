import fs from "node:fs";
import path from "node:path";

/**
 * Scan converted Markdown chapters and assign equation / figure / listing numbers.
 */
export function collectLabels(chaptersDir) {
  if (!fs.existsSync(chaptersDir)) return {};

  const files = fs.readdirSync(chaptersDir).filter((f) => f.endsWith(".md"));
  const metas = files.map((f) => {
    const raw = fs.readFileSync(path.join(chaptersDir, f), "utf8");
    const order = Number((raw.match(/^order:\s*(\d+)/m) || [])[1] || 0);
    const numberMatch = raw.match(/^number:\s*(?:null|"([^"]+)")/m);
    const number = numberMatch ? (numberMatch[1] ?? null) : null;
    return {
      slug: f.replace(/\.md$/, ""),
      raw,
      order,
      number,
    };
  });
  metas.sort((a, b) => a.order - b.order);

  const map = {};
  for (const ch of metas) {
    const prefix = ch.number;
    let eq = 0;
    let fig = 0;
    let lst = 0;

    const eqRe = /<div class="display-math"([^>]*)>/g;
    let m;
    while ((m = eqRe.exec(ch.raw))) {
      eq += 1;
      const display = prefix ? `${prefix}.${eq}` : String(eq);
      const idm = m[1].match(/\bid="([^"]+)"/);
      if (idm) {
        map[idm[1]] = { slug: ch.slug, kind: "eq", display };
      }
    }

    const figRe = /<figure class="book-figure"([^>]*)>/g;
    while ((m = figRe.exec(ch.raw))) {
      fig += 1;
      const display = prefix ? `${prefix}.${fig}` : String(fig);
      const idm = m[1].match(/\bid="([^"]+)"/);
      if (idm) {
        map[idm[1]] = { slug: ch.slug, kind: "fig", display };
      }
    }

    const lstRe = /<figure class="book-listing"([^>]*)>/g;
    while ((m = lstRe.exec(ch.raw))) {
      lst += 1;
      const display = prefix ? `${prefix}.${lst}` : String(lst);
      const idm = m[1].match(/\bid="([^"]+)"/);
      if (idm) {
        map[idm[1]] = { slug: ch.slug, kind: "lst", display };
      }
    }

    const title = (ch.raw.match(/^title:\s*"([^"]*)"/m) || [])[1] || ch.slug;
    const fmLabel = (ch.raw.match(/^label:\s*"([^"]+)"/m) || [])[1];
    if (fmLabel) {
      map[fmLabel] = { slug: ch.slug, kind: "sec", display: title };
    }

    const headingRe = /<h[2-4] id="(sec:[^"]+)"[^>]*>([\s\S]*?)<\/h[2-4]>/g;
    while ((m = headingRe.exec(ch.raw))) {
      map[m[1]] = {
        slug: ch.slug,
        kind: "sec",
        display: m[2].replace(/<[^>]+>/g, "").trim() || title,
      };
    }

    const secRe =
      /<(?:a|span) id="(sec:[^"]+)"[^>]*>\s*<\/(?:a|span)>\s*\n+(?:#{2,4} )(.+)/g;
    while ((m = secRe.exec(ch.raw))) {
      if (!map[m[1]]) {
        map[m[1]] = { slug: ch.slug, kind: "sec", display: m[2].trim() };
      }
    }
  }

  return map;
}

export function chapterEqNumbers(raw, prefix) {
  const nums = [];
  const eqRe = /<div class="display-math"([^>]*)>/g;
  let eq = 0;
  let m;
  while ((m = eqRe.exec(raw))) {
    eq += 1;
    const display = prefix ? `${prefix}.${eq}` : String(eq);
    const idm = m[1].match(/\bid="([^"]+)"/);
    nums.push({ id: idm ? idm[1] : null, display, index: eq });
  }
  return nums;
}
