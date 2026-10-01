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
 */

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
  let moved: Node[] = [];

  function restore() {
    if (!dialog) return;
    slot.append(...moved, open);
    moved = [];
    slot.style.minHeight = "";
    document.documentElement.classList.remove("has-interactive-dialog");
    dialog.remove();
    dialog = null;
    open.focus({ preventScroll: true });
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
    close.addEventListener("click", () => d.close());
    const body = document.createElement("div");
    body.className = "interactive-dialog-body";
    body.append(...moved);
    d.append(close, body);
    // A click on the backdrop lands on the dialog itself, not on its content.
    d.addEventListener("click", (e) => {
      if (e.target === d) d.close();
    });
    d.addEventListener("close", restore);

    dialog = d;
    document.body.append(d);
    document.documentElement.classList.add("has-interactive-dialog");
    d.showModal();
  }

  open.addEventListener("click", expand);

  return () => {
    // `close` fires asynchronously; put the figure back now.
    dialog?.close();
    restore();
    open.remove();
  };
}
