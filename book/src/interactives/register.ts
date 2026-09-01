import { mount, unmount, type Component } from "svelte";

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

export function hydrateInteractives(root: ParentNode = document) {
  const instances: ReturnType<typeof mount>[] = [];
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
      },
      () => {
        // Leave the fallback in place if the chunk fails to load.
        delete node.dataset.hydrated;
      },
    );
  }

  return () => {
    disposed = true;
    for (const inst of instances) unmount(inst);
    instances.length = 0;
  };
}
