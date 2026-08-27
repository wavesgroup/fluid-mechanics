import { mount, unmount, type Component } from "svelte";
import WaveDispersion from "../interactives/WaveDispersion.svelte";
import ParcelOscillation from "../interactives/ParcelOscillation.svelte";
import ChannelFlow from "../interactives/ChannelFlow.svelte";
import DotProduct from "../interactives/DotProduct.svelte";
import CrossProduct from "../interactives/CrossProduct.svelte";
import GradientField from "../interactives/GradientField.svelte";
import DivergenceField from "../interactives/DivergenceField.svelte";
import CurlField from "../interactives/CurlField.svelte";
import PythonPlayground from "../interactives/PythonPlayground.svelte";

const registry: Record<string, Component> = {
  "wave-dispersion": WaveDispersion,
  "parcel-oscillation": ParcelOscillation,
  "channel-flow": ChannelFlow,
  "dot-product": DotProduct,
  "cross-product": CrossProduct,
  "gradient-field": GradientField,
  "divergence-field": DivergenceField,
  "curl-field": CurlField,
  "python-playground": PythonPlayground,
};

const tagNames: Record<string, string> = {
  "wave-dispersion": "fm-wave-dispersion",
  "parcel-oscillation": "fm-parcel-oscillation",
  "channel-flow": "fm-channel-flow",
  "dot-product": "fm-dot-product",
  "cross-product": "fm-cross-product",
  "gradient-field": "fm-gradient-field",
  "divergence-field": "fm-divergence-field",
  "curl-field": "fm-curl-field",
  "python-playground": "fm-python-playground",
};

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

function readStarter(node: HTMLElement): string {
  if (node.dataset.starter) {
    try {
      return dedentStarter(decodeURIComponent(node.dataset.starter));
    } catch {
      return dedentStarter(node.dataset.starter);
    }
  }
  const nested = node.querySelector("pre, textarea, script[type='text/plain']");
  if (nested) {
    const text = nested.textContent ?? "";
    nested.remove();
    return dedentStarter(text);
  }
  if (node.tagName === "PRE" || node.tagName === "TEXTAREA" || node.tagName === "SCRIPT") {
    return dedentStarter(node.textContent ?? "");
  }
  return "";
}

function mountTarget(node: HTMLElement): HTMLElement {
  if (node.tagName !== "PRE" && node.tagName !== "TEXTAREA" && node.tagName !== "SCRIPT") {
    return node;
  }
  const target = document.createElement("div");
  target.className = node.className;
  for (const [key, value] of Object.entries(node.dataset)) {
    target.dataset[key] = value;
  }
  node.replaceWith(target);
  return target;
}

function propsFor(name: string, node: HTMLElement): Record<string, string> {
  if (name !== "python-playground") return {};
  return { starter: readStarter(node) };
}

function defineElements() {
  for (const [name, Comp] of Object.entries(registry)) {
    const tag = tagNames[name];
    if (customElements.get(tag)) continue;
    customElements.define(
      tag,
      class extends HTMLElement {
        #inst: ReturnType<typeof mount> | null = null;
        connectedCallback() {
          this.#inst = mount(Comp, { target: this, props: propsFor(name, this) });
        }
        disconnectedCallback() {
          if (this.#inst) unmount(this.#inst);
        }
      },
    );
  }
}

export function hydrateInteractives(root: ParentNode = document) {
  defineElements();
  const instances: ReturnType<typeof mount>[] = [];
  for (const node of root.querySelectorAll<HTMLElement>("[data-interactive]")) {
    if (node.dataset.hydrated === "true") continue;
    const name = node.dataset.interactive || "";
    const Comp = registry[name];
    if (!Comp) continue;
    const props = propsFor(name, node);
    const target = mountTarget(node);
    target.dataset.hydrated = "true";
    instances.push(mount(Comp, { target, props }));
  }
  return () => instances.forEach((i) => unmount(i));
}
