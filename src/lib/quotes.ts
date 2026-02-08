import type { Quote } from "./api";

const MAX_SLUG_LENGTH = 80;

const slugify = (value: string) => {
  const base = value
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base.slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, "");
};

export const buildQuoteSlug = (quote: Pick<Quote, "text" | "author">) => {
  const base = `${quote.text ?? ""} ${quote.author ?? ""}`.trim();
  return slugify(base);
};

export const getQuotePath = (quote: Pick<Quote, "id" | "text" | "author">) => {
  const slug = buildQuoteSlug(quote);
  return `/q/${quote.id}${slug ? `/${slug}` : ""}`;
};

export const getQuoteUrl = (quote: Pick<Quote, "id" | "text" | "author">) => {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}${getQuotePath(quote)}`;
};
