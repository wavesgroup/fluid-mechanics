import { mount, unmount, type Component } from "svelte";
import WaveDispersion from "../interactives/WaveDispersion.svelte";
import ParcelOscillation from "../interactives/ParcelOscillation.svelte";
import ChannelFlow from "../interactives/ChannelFlow.svelte";

const registry: Record<string, Component> = {
  "wave-dispersion": WaveDispersion,
  "parcel-oscillation": ParcelOscillation,
  "channel-flow": ChannelFlow,
};

const tagNames: Record<string, string> = {
  "wave-dispersion": "fm-wave-dispersion",
  "parcel-oscillation": "fm-parcel-oscillation",
  "channel-flow": "fm-channel-flow",
};

function defineElements() {
  for (const [name, Comp] of Object.entries(registry)) {
    const tag = tagNames[name];
    if (customElements.get(tag)) continue;
    customElements.define(
      tag,
      class extends HTMLElement {
        #inst: ReturnType<typeof mount> | null = null;
        connectedCallback() {
          this.#inst = mount(Comp, { target: this });
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
    const Comp = registry[node.dataset.interactive || ""];
    if (!Comp) continue;
    node.dataset.hydrated = "true";
    instances.push(mount(Comp, { target: node }));
  }
  return () => instances.forEach((i) => unmount(i));
}
