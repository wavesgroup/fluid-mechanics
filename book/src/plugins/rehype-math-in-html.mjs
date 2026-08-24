import { visit } from "unist-util-visit";

const SKIP_TAGS = new Set(["code", "pre", "script", "style", "textarea"]);

function classList(node) {
  const cls = node.properties?.className;
  return Array.isArray(cls) ? cls : cls ? [cls] : [];
}

function skipSubtree(node) {
  if (node.type !== "element") return false;
  if (SKIP_TAGS.has(node.tagName)) return true;
  const classes = classList(node);
  return (
    classes.includes("math-inline") ||
    classes.includes("math-display") ||
    classes.includes("katex")
  );
}

/**
 * remark-math only sees Markdown phrasing. Convert leftover `$...$` in
 * already-parsed HTML (tables, captions, …) into the same nodes
 * rehype-katex expects.
 */
export function rehypeMathInHtml() {
  return (tree) => {
    visit(tree, "text", (node, index, parent) => {
      if (index == null || !parent || parent.type !== "element") return;
      if (skipSubtree(parent)) return;
      const value = node.value;
      if (!value.includes("$")) return;

      const pieces = [];
      const re = /\$\$([\s\S]+?)\$\$|\$((?:\\.|[^$])+)\$/g;
      let last = 0;
      let match;
      while ((match = re.exec(value))) {
        if (match.index > last) {
          pieces.push({ type: "text", value: value.slice(last, match.index) });
        }
        const display = match[1] != null;
        const tex = display ? match[1] : match[2];
        pieces.push({
          type: "element",
          tagName: "span",
          properties: {
            className: ["math", display ? "math-display" : "math-inline"],
          },
          children: [{ type: "text", value: tex }],
        });
        last = match.index + match[0].length;
      }
      if (!pieces.length) return;
      if (last < value.length) {
        pieces.push({ type: "text", value: value.slice(last) });
      }
      parent.children.splice(index, 1, ...pieces);
      return index + pieces.length;
    });
  };
}
