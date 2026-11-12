import type { ReactNode } from 'react';

/**
 * Minimal, safe Markdown renderer for AI output: "## " headings, "- " bullets,
 * paragraphs, **bold**, *italic* and `code`. Everything renders as React text,
 * so model output can never inject HTML.
 */
function renderInline(text: string, keyBase: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g;
  let last = 0;
  let i = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyBase}-${i++}`;
    if (token.startsWith('**')) {
      parts.push(
        <strong key={key} className="font-semibold text-starlight">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith('`')) {
      parts.push(
        <code key={key} className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[0.9em] text-ion">
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      parts.push(<em key={key}>{token.slice(1, -1)}</em>);
    }
    last = match.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function MarkdownLite({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  let paragraph: string[] = [];
  let k = 0;

  const flushList = () => {
    if (!list.length) return;
    const id = k++;
    blocks.push(
      <ul key={`ul-${id}`} className="my-3 space-y-2">
        {list.map((item, i) => (
          <li key={i} className="flex gap-3">
            <span aria-hidden className="mt-[0.7em] h-1 w-1 flex-none rounded-full bg-ion/80" />
            <span>{renderInline(item, `li-${id}-${i}`)}</span>
          </li>
        ))}
      </ul>,
    );
    list = [];
  };

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const id = k++;
    blocks.push(
      <p key={`p-${id}`} className="my-3">
        {renderInline(paragraph.join(' '), `p-${id}`)}
      </p>,
    );
    paragraph = [];
  };

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) {
      flushList();
      flushParagraph();
      continue;
    }
    const heading = /^#{1,4}\s+(.*)$/.exec(line);
    if (heading) {
      flushList();
      flushParagraph();
      blocks.push(
        <h3 key={`h-${k++}`} className="mb-1 mt-8 font-display text-2xl font-medium text-starlight first:mt-0">
          {(heading[1] ?? '').replace(/\*\*/g, '')}
        </h3>,
      );
      continue;
    }
    const bullet = /^(?:[-*•]|\d+\.)\s+(.*)$/.exec(line);
    if (bullet) {
      flushParagraph();
      list.push(bullet[1] ?? '');
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushList();
  flushParagraph();
  return <>{blocks}</>;
}
