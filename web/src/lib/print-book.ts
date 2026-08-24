function toInDocumentHref(href: string): string | null {
  if (!href || href.startsWith("#") || href.startsWith("mailto:")) return null;

  let url: URL;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return null;
  }

  if (url.origin !== window.location.origin) return null;

  if (url.hash) {
    const id = decodeURIComponent(url.hash.slice(1));
    if (id && document.getElementById(id)) return url.hash;
  }

  const slug = url.pathname.replace(/\/+$/, "").split("/").pop();
  if (slug && document.getElementById(slug)) return `#${slug}`;

  return null;
}

export function rewritePrintLinks(root: ParentNode = document): void {
  for (const a of root.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    const next = toInDocumentHref(a.getAttribute("href") || "");
    if (next) a.setAttribute("href", next);
  }
}

function waitForImages(root: ParentNode): Promise<void[]> {
  return Promise.all(
    [...root.querySelectorAll("img")].map((img) => {
      if (typeof img.decode === "function") {
        return img.decode().then(
          () => undefined,
          () => undefined,
        );
      }
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.addEventListener("load", () => resolve(), { once: true });
        img.addEventListener("error", () => resolve(), { once: true });
      });
    }),
  );
}

export async function waitForPrintAssets(root: ParentNode = document): Promise<void> {
  const fonts = document.fonts?.ready ?? Promise.resolve();
  await Promise.all([fonts, waitForImages(root)]);
}

export async function initPrintBook(): Promise<void> {
  const root = document.getElementById("print-book");
  const button = document.querySelector<HTMLButtonElement>("[data-print-book]");
  if (!root) return;

  rewritePrintLinks(root);
  await waitForPrintAssets(root);

  if (button) {
    button.disabled = false;
    button.textContent = "Save as PDF";
    button.addEventListener("click", () => window.print());
  }

  if (new URLSearchParams(window.location.search).has("autoprint")) {
    window.print();
  }
}
