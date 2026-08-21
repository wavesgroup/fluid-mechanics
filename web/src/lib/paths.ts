export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL || "/";
  const prefix = base.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${prefix}${p}` || "/";
}

export const PDF_URL =
  "https://raw.githubusercontent.com/wavesgroup/fluid-mechanics-notes/artifacts/fluid-mechanics-book.pdf";

export const BOOK_TITLE = "Fluid Mechanics for Atmosphere and Ocean Scientists";
export const BOOK_AUTHOR = "Milan Curcic";
