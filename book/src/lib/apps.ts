import { allChapters, type Chapter } from "./nav";
import { withBase } from "./paths";

/**
 * The interactive apps, each of which also has a page of its own at
 * /gallery/<slug> and a card in the gallery at /gallery. The slug is the name the
 * chapters use for it, as in `<div class="interactive-slot" data-interactive="slug">`,
 * and every interactive used in a chapter must be listed here.
 *
 * Gallery thumbnails live in src/assets/thumbnails/<slug>-light.webp and
 * <slug>-dark.webp; make them with `npm run thumbnails` (see
 * scripts/app-thumbnails.mjs).
 */
export interface AppInfo {
  slug: string;
  title: string;
  /** A sentence or two for the gallery card and the top of the app's page. */
  description: string;
  /** Lay the app out across the page, as it is when expanded in the book. */
  wide?: boolean;
  /** Starter code for the app's own page, where the book's would be out of context. */
  starter?: string;
}

const APPS: AppInfo[] = [
  {
    slug: "dot-product",
    title: "Dot product",
    description:
      "Drag two vectors and see their dot product as the projection of one onto the other.",
  },
  {
    slug: "cross-product",
    title: "Cross product",
    description:
      "Drag two vectors to see their cross product, perpendicular to both and as large as the parallelogram they span.",
  },
  {
    slug: "gradient-field",
    title: "Gradient",
    description:
      "Probe a scalar field and see its gradient point uphill, perpendicular to the isolines.",
  },
  {
    slug: "divergence-field",
    title: "Divergence",
    description:
      "Find where a vector field is a source or a sink, from the net flux out of a small box.",
  },
  {
    slug: "curl-field",
    title: "Curl",
    description:
      "A paddle wheel spins with the local rotation of a vector field, even in a shear flow that does not circle.",
  },
  {
    slug: "python-playground",
    title: "Python playground",
    description: "Write and run Python with NumPy and Matplotlib, right in the browser.",
    starter: `import numpy as np
import matplotlib.pyplot as plt
#
# NumPy and Matplotlib are already available.
# Edit this code and press Run (or Ctrl/Cmd+Enter).
#
x, y = np.meshgrid(np.linspace(-2, 2, 15), np.linspace(-2, 2, 15))
u, v = -y, x  # solid-body rotation

fig, ax = plt.subplots(figsize=(5, 5))
ax.quiver(x, y, u, v)
ax.set_aspect("equal")
ax.set_title("u = (-y, x)")
plt.show()
`,
  },
  {
    slug: "continuity-volume",
    title: "Eulerian continuity",
    description:
      "Set the mass fluxes through the faces of a fixed cube and see how fast the density inside it changes.",
  },
  {
    slug: "seawater-density",
    title: "Equation of state for seawater",
    description:
      "Seawater density as a function of temperature and salinity, from the sea surface down to about 10 km.",
  },
  {
    slug: "rotating-vector",
    title: "Rotating vector",
    description:
      "A vector fixed in a rotating frame turns in the inertial one, at the rate Ω × C.",
  },
  {
    slug: "centrifugal-force",
    title: "Centrifugal force and effective gravity",
    description:
      "Change latitude and rotation rate to see the centrifugal force tilt effective gravity away from the radial direction.",
  },
  {
    slug: "rotation-components",
    title: "Rotation components",
    description:
      "Split Earth’s rotation vector into its local vertical and northward parts at any latitude, and compare with a rotating disk.",
  },
  {
    slug: "geostrophic-flow",
    title: "Geostrophic flow",
    description:
      "Drag highs and lows around a map and watch the flow follow the isobars, where pressure gradient and Coriolis forces balance.",
    wide: true,
  },
  {
    slug: "parcel-oscillation",
    title: "Parcel oscillation",
    description:
      "A displaced fluid parcel oscillates at the buoyancy frequency in stable stratification and runs away in unstable.",
  },
  {
    slug: "shallow-water",
    title: "Shallow water simulation",
    description:
      "A rotating shallow water model running on your GPU: flow past a seamount, a dam break, a Kelvin wave, and more.",
    wide: true,
  },
  {
    slug: "channel-flow",
    title: "Laminar channel flow",
    description:
      "The parabolic velocity profile of laminar flow between two plates, set by the channel width and the wall stress.",
  },
  {
    slug: "wave-dispersion",
    title: "Wave dispersion",
    description:
      "The dispersion relation of surface gravity waves, from deep to shallow water as the depth changes.",
  },
];

/** Where an app appears in the book. */
export interface AppLocation {
  chapter: Chapter;
  /** Link to the app's place in the chapter. */
  href: string;
  /** The number of the figure it stands in for, if it does. */
  figure: string | null;
  /** The slot's contents in the chapter: its static fallback or starter code. */
  fallback: string;
}

export interface App extends AppInfo {
  location: AppLocation | null;
}

export function appHref(slug: string): string {
  return `/gallery/${slug}`;
}

const SLOT_RE = /<div class="interactive-slot"([^>]*)>([\s\S]*?)<\/div>/g;
const FIGURE_RE = /<figure class="book-figure"[^>]*>/g;

/** Every app with its place in the book, in the order the book uses them. */
export async function allApps(): Promise<App[]> {
  const info = new Map(APPS.map((app) => [app.slug, app]));
  const found = new Map<string, AppLocation>();

  for (const chapter of await allChapters()) {
    const body = chapter.body ?? "";
    for (const m of body.matchAll(SLOT_RE)) {
      const slug = m[1].match(/\bdata-interactive="([^"]+)"/)?.[1];
      if (!slug || found.has(slug)) continue;
      if (!info.has(slug)) {
        throw new Error(
          `The ${chapter.id} chapter uses the interactive "${slug}", which is missing from src/lib/apps.ts.`,
        );
      }
      const before = body.slice(0, m.index);
      // Numbered as in plugins/collect-labels.mjs.
      const inFigure = /<figure class="book-figure"[^>]*>\s*$/.test(before);
      const count = before.match(FIGURE_RE)?.length ?? 0;
      const prefix = chapter.data.number;
      found.set(slug, {
        chapter,
        // The id comes from plugins/rehype-book.mjs.
        href: `/${chapter.id}#app:${slug}`,
        figure: inFigure ? (prefix ? `${prefix}.${count}` : String(count)) : null,
        fallback: m[2].trim().replace(/\bsrc="(\/[^"]*)"/g, (_, src) => `src="${withBase(src)}"`),
      });
    }
  }

  // Book order; any app the book does not use goes last.
  const order = [...found.keys()];
  const rank = (slug: string) => {
    const i = order.indexOf(slug);
    return i < 0 ? order.length : i;
  };
  return [...APPS]
    .sort((a, b) => rank(a.slug) - rank(b.slug))
    .map((app) => ({ ...app, location: found.get(app.slug) ?? null }));
}

/** "Chapter 5: Rotating flows", or the title alone for unnumbered chapters. */
export function chapterName(chapter: Chapter): string {
  const { kind, number, title } = chapter.data;
  if (!number) return title;
  return `${kind === "appendix" ? "Appendix" : "Chapter"} ${number}: ${title}`;
}
