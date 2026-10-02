import type { ReactNode } from "react";

// Renders the small Markdown subset the AI drafts and admins write: headings,
// paragraphs, lists, quotes, bold, italics and http(s) links. Output is built
// as React elements, so raw HTML in an article is shown as text, never run.
const INLINE = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*/g;

function renderInline(text: string, key: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let index = 0;
  for (const match of text.matchAll(INLINE)) {
    const start = match.index ?? 0;
    if (start > last) nodes.push(text.slice(last, start));
    const childKey = `${key}-${index++}`;
    if (match[1]) nodes.push(<a key={childKey} href={match[2]} target="_blank" rel="noopener noreferrer nofollow">{match[1]}</a>);
    else if (match[3]) nodes.push(<strong key={childKey}>{renderInline(match[3], childKey)}</strong>);
    else nodes.push(<em key={childKey}>{match[4]}</em>);
    last = start + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function Markdown({ source }: { source: string }) {
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length) blocks.push(<p key={blocks.length}>{renderInline(paragraph.join(" "), `p${blocks.length}`)}</p>);
    paragraph = [];
  };
  const flushList = () => {
    if (list) {
      const key = blocks.length;
      const items = list.items.map((item, index) => <li key={index}>{renderInline(item, `l${key}-${index}`)}</li>);
      blocks.push(list.ordered ? <ol key={key}>{items}</ol> : <ul key={key}>{items}</ul>);
    }
    list = null;
  };

  for (const rawLine of source.replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.trim();
    const heading = /^(#{1,4})\s+(.+)$/.exec(line);
    const item = /^(?:[-*•]|(\d+)[.)])\s+(.+)$/.exec(line);
    const quote = /^>\s?(.*)$/.exec(line);
    if (!line) {
      flushParagraph();
      flushList();
    } else if (heading) {
      flushParagraph();
      flushList();
      const content = renderInline(heading[2], `h${blocks.length}`);
      blocks.push(heading[1].length <= 2 ? <h2 key={blocks.length}>{content}</h2> : <h3 key={blocks.length}>{content}</h3>);
    } else if (item) {
      flushParagraph();
      const ordered = Boolean(item[1]);
      if (list && list.ordered !== ordered) flushList();
      list ??= { ordered, items: [] };
      list.items.push(item[2]);
    } else if (quote) {
      flushParagraph();
      flushList();
      blocks.push(<blockquote key={blocks.length}>{renderInline(quote[1], `q${blocks.length}`)}</blockquote>);
    } else {
      flushList();
      paragraph.push(line);
    }
  }
  flushParagraph();
  flushList();
  return <>{blocks}</>;
}

// Plain text for meta descriptions and structured data.
export function stripMarkdown(source: string) {
  return source
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_#>`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
