export type MessageSegment =
  | { kind: 'text'; text: string }
  | { kind: 'link'; text: string; href: string };

// A URL runs to the next whitespace, the way WhatsApp and SMS apps detect one.
// Only http(s) and www. forms, so a stray "a.b" in prose stays text.
const URL_PATTERN = /(?:https?:\/\/|www\.)\S+/gi;

// Punctuation that closes the sentence around a URL rather than belonging to
// it: "תעקבו: https://x.com/a!" links to https://x.com/a.
const TRAILING_PUNCTUATION = /[.,!?;:'")\]]+$/;

/**
 * Splits a message body into plain text and the URLs a guest's phone will show
 * as links, so the preview can render them the same way.
 */
export function splitMessageLinks(body: string): MessageSegment[] {
  const segments: MessageSegment[] = [];
  let cursor = 0;

  for (const match of body.matchAll(URL_PATTERN)) {
    const url = match[0].replace(TRAILING_PUNCTUATION, '');
    if (url.length === 0 || /^(?:https?:\/\/|www\.)$/i.test(url)) continue;

    const start = match.index;
    if (start > cursor) segments.push({ kind: 'text', text: body.slice(cursor, start) });
    segments.push({
      kind: 'link',
      text: url,
      href: /^https?:\/\//i.test(url) ? url : `https://${url}`,
    });
    cursor = start + url.length;
  }

  if (cursor < body.length) segments.push({ kind: 'text', text: body.slice(cursor) });
  return segments;
}
