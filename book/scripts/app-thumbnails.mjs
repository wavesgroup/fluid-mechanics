/**
 * Screenshot each interactive app on its own page for its card in the gallery
 * (src/pages/gallery/index.astro), in a light and a dark theme, into
 * src/assets/thumbnails/<slug>-light.webp and <slug>-dark.webp.
 *
 * Run it on a fresh build, with Playwright and its Chromium installed (they are
 * not dependencies of the book; sharp, which it also uses, comes with Astro):
 *
 *   npm i --no-save playwright && npx playwright install chromium
 *   npm run build
 *   npm run thumbnails            # every app
 *   npm run thumbnails -- curl-field shallow-water
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { preview } from "astro";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "src/assets/thumbnails");
const WIDTH = 640;
const HEIGHT = 400;
const SCALE = 2;
const THEMES = { light: "paper", dark: "ink" };

/**
 * What to capture on each page: the first element matching `selector`, scaled
 * to fill the thumbnail (`cover`, cropped toward `position`) or to fit inside it
 * (`contain`, on the plot background), after pressing the button labelled
 * `click`, if any, and letting the app run for `wait` ms.
 */
const DEFAULT = {
  selector: ".field-plot, .vector-stage, .eos-canvas, .interactive > svg",
  fit: "contain",
  position: "centre",
  wait: 500,
};
const SHOTS = {
  "dot-product": { fit: "cover", position: "top" },
  "gradient-field": { fit: "cover" },
  "divergence-field": { fit: "cover" },
  "curl-field": { fit: "cover", click: "Gaussian vortex" },
  "continuity-volume": { fit: "cover" },
  "python-playground": { selector: ".python-editor", fit: "cover", position: "left top" },
  "geostrophic-flow": { fit: "cover", wait: 4000 },
  "shallow-water": { fit: "cover", wait: 20000 },
};

async function capture(context, base, slug, theme) {
  const shot = { ...DEFAULT, ...SHOTS[slug] };
  const page = await context.newPage();
  await page.addInitScript((t) => localStorage.setItem("fm-theme", t), theme);
  await page.goto(new URL(`gallery/${slug}/`, base).href, { waitUntil: "networkidle" });
  await page.waitForSelector('.interactive-slot[data-hydrated="true"]');
  if (shot.click) await page.getByRole("button", { name: shot.click, exact: true }).click();
  const target = page.locator(`.app-stage :is(${shot.selector})`).first();
  await target.scrollIntoViewIfNeeded();
  await page.waitForTimeout(shot.wait);
  const background = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--plot-bg").trim(),
  );
  const png = await target.screenshot();
  await page.close();

  // Trim the plot's 1px border before scaling.
  const { width, height } = await sharp(png).metadata();
  return sharp(png)
    .extract({ left: SCALE, top: SCALE, width: width - 2 * SCALE, height: height - 2 * SCALE })
    .resize(WIDTH, HEIGHT, { fit: shot.fit, position: shot.position, background })
    .webp({ quality: 80 });
}

const server = await preview({ root, logLevel: "warn", server: { host: "127.0.0.1", port: 4329 } });
const base = `http://127.0.0.1:${server.port}/`;
const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: SCALE,
  });
  const gallery = await context.newPage();
  await gallery.goto(new URL("gallery/", base).href);
  const all = await gallery.$$eval(".app-card h2 a", (links) =>
    links.map((a) => a.pathname.replace(/\/$/, "").split("/").pop()),
  );
  await gallery.close();

  const wanted = process.argv.slice(2);
  const unknown = wanted.filter((slug) => !all.includes(slug));
  if (unknown.length) throw new Error(`No such app: ${unknown.join(", ")}`);

  fs.mkdirSync(outDir, { recursive: true });
  for (const slug of wanted.length ? wanted : all) {
    for (const [variant, theme] of Object.entries(THEMES)) {
      const file = path.join(outDir, `${slug}-${variant}.webp`);
      await (await capture(context, base, slug, theme)).toFile(file);
      console.log(path.relative(root, file));
    }
  }
} finally {
  await browser.close();
  await server.stop();
}
