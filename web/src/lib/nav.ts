import { getCollection, type CollectionEntry } from "astro:content";

export type Chapter = CollectionEntry<"chapters">;

export async function allChapters(): Promise<Chapter[]> {
  const chapters = await getCollection("chapters");
  return chapters.sort((a, b) => a.data.order - b.data.order);
}

export function chapterHref(ch: Chapter): string {
  return `/${ch.id}`;
}

export function chapterLabel(ch: Chapter): string {
  if (ch.data.number) return `${ch.data.number}. ${ch.data.title}`;
  return ch.data.title;
}
