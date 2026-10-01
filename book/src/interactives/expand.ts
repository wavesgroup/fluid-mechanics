/**
 * Lets a reader pop a hydrated interactive out of the text into a dialog that
 * fills most of the window, so it can be explored at a larger size.
 *
 * Opt in per use, in the chapter markup:
 *
 *   <div class="interactive-slot" data-interactive="..." data-expandable>
 *
 * The component itself needs no changes: its DOM is moved into a modal
 * `<dialog class="interactive-dialog">` and back again, so its state, timers,
 * and observers carry on untouched. Anything sized from its container (SVG
 * viewBoxes, a ResizeObserver on a canvas) grows with the dialog. A component
 * that wants a different layout when expanded can style itself under
 * `.interactive-dialog`.
 *
 * Opening and closing fade over FADE_MS: the dialog and its backdrop on the
 * way in and out, and the figure as it lands back in the page.
 */

const FADE_MS = 100;

/** Fade `el` (and its ::backdrop, for a dialog) between two opacities. */
function fade(el: HTMLElement, from: number, to: number, backdrop = false): Promise<void> {
  if (typeof el.animate !== "function") return Promise.resolve();
  const keyframes = { opacity: [from, to] };
  const timing: KeyframeAnimationOptions = { duration: FADE_MS, easing: "ease-out", fill: "forwards" };
  const runs = [el.animate(keyframes, timing)];
  if (backdrop) {
    try {
      runs.push(el.animate(keyframes, { ...timing, pseudoElement: "::backdrop" }));
    } catch {
      // No pseudo-element animation here; the backdrop just appears.
    }
  }
  return Promise.all(runs.map((a) => a.finished)).then(
    () => {
      // A fade to full opacity hands back to the stylesheet; a fade out holds
      // until the element is closed and removed.
      if (to === 1) for (const a of runs) a.cancel();
    },
    () => {},
  );
}

const EXPAND_ICON =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
const CLOSE_ICON =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';

function iconButton(className: string, icon: string, label: string, text?: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.innerHTML = icon;
  if (text) button.append(text);
  button.setAttribute("aria-label", label);
  button.title = label;
  return button;
}

/** Add the expand control to a hydrated slot. Returns a cleanup function. */
export function makeExpandable(slot: HTMLElement): () => void {
  const name = slot.querySelector(".interactive-title")?.textContent?.trim() || "interactive figure";
  const open = iconButton("interactive-expand", EXPAND_ICON, `Expand ${name}`, "Expand");
  slot.append(open);

  let dialog: HTMLDialogElement | null = null;
  let closing = false;
  let moved: Node[] = [];

  function restore() {
    if (!dialog) return;
    slot.append(...moved, open);
    moved = [];
    slot.style.minHeight = "";
    document.documentElement.classList.remove("has-interactive-dialog");
    dialog.remove();
    dialog = null;
    closing = false;
    open.focus({ preventScroll: true });
    void fade(slot, 0, 1);
  }

  /** Fade the dialog out, then close it; `close` puts the figure back. */
  function dismiss() {
    const d = dialog;
    if (!d || closing) return;
    closing = true;
    void fade(d, 1, 0, true).then(() => d.close());
  }

  function expand() {
    if (dialog) return;
    // Hold the slot's place so the text doesn't jump while the figure is away.
    slot.style.minHeight = `${slot.offsetHeight}px`;
    moved = [...slot.childNodes].filter((n) => n !== open);
    open.remove();

    const d = document.createElement("dialog");
    d.className = "interactive-dialog";
    d.setAttribute("aria-label", name);
    const close = iconButton("interactive-collapse", CLOSE_ICON, "Close expanded view");
    close.addEventListener("click", dismiss);
    const body = document.createElement("div");
    body.className = "interactive-dialog-body";
    body.append(...moved);
    d.append(close, body);
    // A click on the backdrop lands on the dialog itself, not on its content.
    d.addEventListener("click", (e) => {
      if (e.target === d) dismiss();
    });
    // Esc closes a modal dialog at once; hold it for the fade. If the browser
    // insists (a repeated Esc can't be cancelled), `close` still restores.
    d.addEventListener("cancel", (e) => {
      e.preventDefault();
      dismiss();
    });
    d.addEventListener("close", restore);

    dialog = d;
    document.body.append(d);
    document.documentElement.classList.add("has-interactive-dialog");
    d.showModal();
    void fade(d, 0, 1, true);
  }

  open.addEventListener("click", expand);

  return () => {
    // `close` fires asynchronously; put the figure back now.
    dialog?.close();
    restore();
    open.remove();
  };
}
