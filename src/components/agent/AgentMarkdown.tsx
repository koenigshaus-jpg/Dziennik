"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

// Minimalny renderer markdown dla wiadomości agenta. Zamiast dorzucania
// react-markdown (~30KB) obsługujemy tu konkretny podzbiór formatowania,
// który modele OpenAI emitują w odpowiedziach: listy, pogrubienie, kursywa,
// kod inline, nagłówki H1-H3, akapity.
//
// Pełne bezpieczeństwo XSS — wszystko renderowane jako React tree, NIGDY
// nie używamy dangerouslySetInnerHTML.

interface Props {
  text: string;
  className?: string;
}

export function AgentMarkdown({ text, className }: Props) {
  const blocks = React.useMemo(() => parseBlocks(text), [text]);
  return (
    <div className={cn("text-sm leading-relaxed space-y-2.5", className)}>
      {blocks.map((b, i) => (
        <Block key={i} block={b} />
      ))}
    </div>
  );
}

type BlockNode =
  | { type: "h1" | "h2" | "h3"; content: string }
  | { type: "p"; content: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "code"; content: string };

function parseBlocks(input: string): BlockNode[] {
  const lines = input.replace(/\r\n/g, "\n").split("\n");
  const blocks: BlockNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }

    // Code block ```
    if (line.startsWith("```")) {
      i++;
      const buf: string[] = [];
      while (i < lines.length && !lines[i].startsWith("```")) {
        buf.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // closing ```
      blocks.push({ type: "code", content: buf.join("\n") });
      continue;
    }

    // Headings
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      blocks.push({
        type: (`h${h[1].length}` as "h1" | "h2" | "h3"),
        content: h[2],
      });
      i++;
      continue;
    }

    // Bullet list
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    // Numbered list
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    // Paragraph (zbiera kolejne nie-puste linie do pierwszej pustej / specjalnej)
    const para: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !/^#{1,3}\s+/.test(lines[i]) &&
      !lines[i].startsWith("```")
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push({ type: "p", content: para.join(" ") });
  }

  return blocks;
}

function Block({ block }: { block: BlockNode }) {
  switch (block.type) {
    case "h1":
      return (
        <h2 className="text-base font-semibold mt-1">
          <Inline text={block.content} />
        </h2>
      );
    case "h2":
      return (
        <h3 className="text-sm font-semibold mt-1">
          <Inline text={block.content} />
        </h3>
      );
    case "h3":
      return (
        <h4 className="text-sm font-medium mt-1">
          <Inline text={block.content} />
        </h4>
      );
    case "p":
      return (
        <p>
          <Inline text={block.content} />
        </p>
      );
    case "ul":
      return (
        <ul className="list-disc pl-5 space-y-1">
          {block.items.map((it, i) => (
            <li key={i}>
              <Inline text={it} />
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="list-decimal pl-5 space-y-1">
          {block.items.map((it, i) => (
            <li key={i}>
              <Inline text={it} />
            </li>
          ))}
        </ol>
      );
    case "code":
      return (
        <pre className="bg-foreground/5 rounded-md p-2 text-xs overflow-x-auto whitespace-pre">
          <code>{block.content}</code>
        </pre>
      );
  }
}

// ──────────────────────────────────────────────────────────────────
// Inline parser — **bold**, *italic*, `code`. Wszystko jako React.
// ──────────────────────────────────────────────────────────────────

const INLINE_TOKEN = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*[^*\s]\*|\*[^*\s]\*)/g;

function Inline({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = INLINE_TOKEN.exec(text)) !== null) {
    if (m.index > lastIndex) {
      parts.push(text.slice(lastIndex, m.index));
    }
    const tok = m[0];
    if (tok.startsWith("**")) {
      parts.push(
        <strong key={`b${key++}`}>{tok.slice(2, -2)}</strong>
      );
    } else if (tok.startsWith("`")) {
      parts.push(
        <code
          key={`c${key++}`}
          className="bg-foreground/8 rounded px-1 py-0.5 text-[0.85em]"
        >
          {tok.slice(1, -1)}
        </code>
      );
    } else {
      parts.push(<em key={`i${key++}`}>{tok.slice(1, -1)}</em>);
    }
    lastIndex = m.index + tok.length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return <>{parts}</>;
}
