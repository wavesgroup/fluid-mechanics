import { mount, unmount, type Component } from "svelte";
import { makeExpandable } from "./expand";
import { withBase } from "../lib/paths";

type Loader = () => Promise<Component>;

/**
 * Loaded on demand so a chapter only downloads the interactives it actually
 * uses — the Python playground drags in CodeMirror, which no other page needs.
 */
const registry: Record<string, Loader> = {
  "wave-dispersion": () => load(import("./WaveDispersion.svelte")),
  "parcel-oscillation": () => load(import("./ParcelOscillation.svelte")),
  "channel-flow": () => load(import("./ChannelFlow.svelte")),
  "dot-product": () => load(import("./DotProduct.svelte")),
  "cross-product": () => load(import("./CrossProduct.svelte")),
  "gradient-field": () => load(import("./GradientField.svelte")),
  "divergence-field": () => load(import("./DivergenceField.svelte")),
  "curl-field": () => load(import("./CurlField.svelte")),
  "continuity-volume": () => load(import("./ContinuityVolume.svelte")),
  "seawater-density": () => load(import("./SeawaterDensity.svelte")),
  "rotating-vector": () => load(import("./RotatingVector.svelte")),
  "centrifugal-force": () => load(import("./CentrifugalForce.svelte")),
  "rotation-components": () => load(import("./RotationComponents.svelte")),
  "geostrophic-flow": () => load(import("./GeostrophicFlow.svelte")),
  "shallow-water": () => load(import("./ShallowWater.svelte")),
  "python-playground": () => load(import("./PythonPlayground.svelte")),
};

async function load(mod: Promise<{ default: Component }>): Promise<Component> {
  return (await mod).default;
}

function dedentStarter(raw: string): string {
  let text = raw.replace(/^\n/, "").replace(/\s+$/, "");
  const lines = text.split("\n");
  const indents = lines
    .filter((line) => line.trim().length > 0)
    .map((line) => line.match(/^[ \t]*/)?.[0].length ?? 0);
  const trim = indents.length ? Math.min(...indents) : 0;
  if (trim > 0) {
    text = lines.map((line) => line.slice(trim)).join("\n");
  }
  return text.trimEnd();
}

/**
 * The starter code lives in a `<pre>` inside the slot, so it is still readable
 * if this script never runs. Read it here; the mount clears it.
 */
function readStarter(node: HTMLElement): string {
  const nested = node.querySelector("pre");
  return nested ? dedentStarter(nested.textContent ?? "") : "";
}

function propsFor(name: string, node: HTMLElement): Record<string, string> {
  if (name !== "python-playground") return {};
  return { starter: readStarter(node) };
}

const OPEN_ICON =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9 2h5v5M14 2L7.5 8.5M12 9.5V14H2V4h4.5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';

/**
 * The controls in a hydrated slot's corner: a link to the app's own page
 * (pages/apps/[app].astro, which every interactive has) and, if the slot opts
 * in, the expand button.
 */
function addTools(node: HTMLElement, name: string): () => void {
  const tools = document.createElement("div");
  tools.className = "interactive-tools";
  const title = node.querySelector(".interactive-title")?.textContent?.trim() || "this interactive figure";
  const link = document.createElement("a");
  link.className = "interactive-open";
  link.href = withBase(`/apps/${name}`);
  link.target = "_blank";
  link.innerHTML = `${OPEN_ICON}<span>Open</span>`;
  link.setAttribute("aria-label", `Open ${title} in its own page`);
  link.title = "Open in its own page";
  tools.append(link);
  node.append(tools);
  const collapse = node.hasAttribute("data-expandable") ? makeExpandable(node, tools) : null;
  return () => {
    collapse?.();
    tools.remove();
  };
}

/**
 * Mount the interactives in `root`. In the book, each gets a link to its own
 * page; pass `standalone` on that page itself.
 */
export function hydrateInteractives(root: ParentNode = document, { standalone = false } = {}) {
  const instances: ReturnType<typeof mount>[] = [];
  const cleanups: (() => void)[] = [];
  let disposed = false;

  for (const node of root.querySelectorAll<HTMLElement>("[data-interactive]")) {
    // "pending" while the chunk is in flight, so the fallback stays visible and
    // a second call does not mount the same slot twice.
    if (node.dataset.hydrated) continue;
    const name = node.dataset.interactive || "";
    const loader = registry[name];
    if (!loader) continue;
    node.dataset.hydrated = "pending";
    const props = propsFor(name, node);
    void loader().then(
      (Comp) => {
        if (disposed) return;
        node.replaceChildren();
        node.dataset.hydrated = "true";
        instances.push(mount(Comp, { target: node, props }));
        if (!standalone) cleanups.push(addTools(node, name));
      },
      () => {
        // Leave the fallback in place if the chunk fails to load.
        delete node.dataset.hydrated;
      },
    );
  }

  return () => {
    disposed = true;
    for (const cleanup of cleanups) cleanup();
    cleanups.length = 0;
    for (const inst of instances) unmount(inst);
    instances.length = 0;
  };
}
