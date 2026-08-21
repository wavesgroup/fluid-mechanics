import { defineConfig } from "astro/config";
import svelte from "@astrojs/svelte";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import { rehypeBook } from "./src/plugins/rehype-book.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const githubPages = process.env.GITHUB_PAGES === "true";
const base = githubPages ? "/fluid-mechanics-notes" : "/";

export default defineConfig({
  site: "https://wavesgroup.github.io",
  base,
  output: "static",
  integrations: [svelte()],
  markdown: {
    shikiConfig: {
      theme: "css-variables",
    },
    remarkPlugins: [remarkMath],
    rehypePlugins: [
      [
        rehypeKatex,
        {
          strict: "ignore",
          throwOnError: false,
          macros: {
            "\\boldsymbol": "\\mathbf",
          },
        },
      ],
      rehypeRaw,
      [
        rehypeBook,
        {
          chaptersDir: path.join(root, "src/chapters"),
          bibPath: path.join(root, "src/data/bib.json"),
          base,
        },
      ],
    ],
  },
});
