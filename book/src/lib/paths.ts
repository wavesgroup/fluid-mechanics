export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL || "/";
  const prefix = base.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${prefix}${p}` || "/";
}

export const BOOK_TITLE = "Fluid Mechanics for Atmosphere and Ocean Scientists";
export const BOOK_AUTHOR = "Milan Curcic";
export const BOOK_REPO = "https://github.com/wavesgroup/fluid-mechanics";
