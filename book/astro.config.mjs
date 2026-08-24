import { defineConfig } from "astro/config";
import svelte from "@astrojs/svelte";
import { unified } from "@astrojs/markdown-remark";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import { rehypeBook } from "./src/plugins/rehype-book.mjs";
import { rehypeMathInHtml } from "./src/plugins/rehype-math-in-html.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const githubPages = process.env.GITHUB_PAGES === "true";
const base = githubPages ? "/fluid-mechanics" : "/";

export default defineConfig({
  site: "https://wavesgroup.github.io",
  base,
  output: "static",
  compressHTML: true,
  integrations: [svelte()],
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [
        rehypeRaw,
        rehypeMathInHtml,
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
        [
          rehypeBook,
          {
            chaptersDir: path.join(root, "src/chapters"),
            bibPath: path.join(root, "src/data/bib.json"),
            base,
          },
        ],
      ],
    }),
    shikiConfig: {
      theme: "css-variables",
    },
  },
});
