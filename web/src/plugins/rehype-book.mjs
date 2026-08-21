import fs from "node:fs";
import path from "node:path";
import { visit } from "unist-util-visit";
import { collectLabels } from "./collect-labels.mjs";

function withBase(base, href) {
  if (!href || href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("#")) {
    return href;
  }
  const prefix = (base || "/").replace(/\/$/, "");
  if (!href.startsWith("/")) return href;
  return prefix + href;
}

function lookupCite(bib, key) {
  if (bib[key]) return bib[key];
  const lower = key.toLowerCase();
  if (bib[lower]) return bib[lower];
  const found = Object.keys(bib).find((k) => k.toLowerCase() === lower);
  return found ? bib[found] : null;
}

function formatCites(bib, keys, mode) {
  const parts = [];
  for (const key of keys) {
    const entry = lookupCite(bib, key.trim());
    if (!entry) {
      parts.push(key.trim());
      continue;
    }
    if (mode === "narrative") {
      parts.push(`${entry.narrative} (${entry.year})`);
    } else {
      parts.push(entry.cite);
    }
  }
  if (mode === "narrative") {
    return parts.join("; ");
  }
  return `(${parts.join("; ")})`;
}

export function rehypeBook({ chaptersDir, bibPath, base = "/" } = {}) {
  const bib = JSON.parse(fs.readFileSync(bibPath, "utf8"));

  return (tree, file) => {
    const labels = collectLabels(chaptersDir);
    const slug = path.basename(String(file.path || file.history?.[0] || ""), ".md");
    const raw = fs.existsSync(file.path)
      ? fs.readFileSync(file.path, "utf8")
      : "";
    const numberMatch = raw.match(/^number:\s*(?:null|"([^"]+)")/m);
    const prefix = numberMatch ? (numberMatch[1] ?? null) : null;

    let eqCounter = 0;
    const eqByIndex = [];

    visit(tree, "element", (node) => {
      const cls = node.properties?.className;
      const classes = Array.isArray(cls) ? cls : cls ? [cls] : [];

      if (classes.includes("display-math")) {
        eqCounter += 1;
        const display = prefix ? `${prefix}.${eqCounter}` : String(eqCounter);
        eqByIndex.push(display);
        const num = {
          type: "element",
          tagName: "span",
          properties: { className: ["eq-num"], "aria-hidden": "true" },
          children: [{ type: "text", value: `(${display})` }],
        };
        node.children = [...(node.children || []), num];
        const id = node.properties?.id;
        if (id && labels[id]) {
          node.properties["data-num"] = labels[id].display;
        } else {
          node.properties["data-num"] = display;
        }
      }

      if (node.tagName === "a" && node.properties?.dataKey) {
        const key = String(node.properties.dataKey);
        const info = labels[key];
        let text = key;
        let href = `#${key}`;
        if (info) {
          if (info.kind === "eq") text = info.display;
          else if (info.kind === "fig") text = info.display;
          else if (info.kind === "lst") text = info.display;
          else if (info.kind === "sec") text = info.display || key.replace(/^sec:/, "");
          if (info.slug !== slug) {
            href = withBase(base, `/${info.slug}`) + `#${key}`;
          }
        }
        node.properties.href = href;
        if (!node.children?.length) {
          node.children = [{ type: "text", value: text }];
        }
      }

      if (node.tagName === "cite" && node.properties?.dataKeys) {
        const keys = String(node.properties.dataKeys).split(",");
        const mode = String(node.properties.dataMode || "paren");
        const text = formatCites(bib, keys, mode);
        const first = keys[0].trim();
        node.children = [
          {
            type: "element",
            tagName: "a",
            properties: { href: withBase(base, "/references") + `#${first.toLowerCase()}` },
            children: [{ type: "text", value: text }],
          },
        ];
      }

      if (node.tagName === "img" && typeof node.properties?.src === "string") {
        node.properties.src = withBase(base, node.properties.src);
      }

      if (classes.includes("book-figure") && node.properties?.id) {
        const info = labels[node.properties.id];
        if (info) {
          const caption = (node.children || []).find(
            (c) => c.type === "element" && c.tagName === "figcaption",
          );
          if (caption) {
            caption.children = [
              {
                type: "element",
                tagName: "span",
                properties: { className: ["fig-label"] },
                children: [{ type: "text", value: `Figure ${info.display}. ` }],
              },
              ...(caption.children || []),
            ];
          }
        }
      }
    });
  };
}
