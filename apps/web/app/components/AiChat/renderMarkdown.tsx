import React from "react";

/**
 * Lightweight Markdown-to-JSX renderer for AI chat messages.
 * Handles: headings, bold, italic, inline code, code blocks, lists (ul/ol),
 * blockquotes, horizontal rules, tables, links, and line breaks.
 *
 * No external dependencies required.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Parse inline markdown (bold, italic, code, links) */
function parseInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Regex order matters: bold+italic first, then bold, italic, code, links
  const inlineRegex =
    /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = inlineRegex.exec(text)) !== null) {
    // Push text before match
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      // bold + italic ***text***
      nodes.push(
        <strong key={key}>
          <em>{match[2]}</em>
        </strong>
      );
    } else if (match[3]) {
      // bold **text**
      nodes.push(<strong key={key}>{match[3]}</strong>);
    } else if (match[4]) {
      // italic *text*
      nodes.push(<em key={key}>{match[4]}</em>);
    } else if (match[5]) {
      // inline code `code`
      nodes.push(<code key={key}>{match[5]}</code>);
    } else if (match[6] && match[7]) {
      // link [text](url)
      nodes.push(
        <a key={key} href={match[7]} target="_blank" rel="noopener noreferrer">
          {match[6]}
        </a>
      );
    }

    key++;
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

interface BlockNode {
  type:
    | "heading"
    | "paragraph"
    | "code"
    | "ul"
    | "ol"
    | "blockquote"
    | "hr"
    | "table";
  level?: number; // heading level
  lang?: string; // code language
  content?: string;
  items?: string[]; // list items
  rows?: string[][]; // table rows (first = header)
}

/** Parse markdown string into block-level nodes */
function parseBlocks(markdown: string): BlockNode[] {
  const lines = markdown.split("\n");
  const blocks: BlockNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;

    // Fenced code block
    if (line.trimStart().startsWith("```")) {
      const lang = line.trimStart().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.trimStart().startsWith("```")) {
        codeLines.push(lines[i]!);
        i++;
      }
      blocks.push({ type: "code", lang, content: codeLines.join("\n") });
      i++; // skip closing ```
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line.trim())) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1]!.length,
        content: headingMatch[2]!,
      });
      i++;
      continue;
    }

    // Blockquote
    if (line.trimStart().startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i]!.trimStart().startsWith("> ")) {
        quoteLines.push(lines[i]!.trimStart().slice(2));
        i++;
      }
      blocks.push({ type: "blockquote", content: quoteLines.join("\n") });
      continue;
    }

    // Table detection: | col | col |
    if (
      line.trim().startsWith("|") &&
      line.trim().endsWith("|") &&
      i + 1 < lines.length &&
      /^\|[\s-:|]+\|$/.test(lines[i + 1]!.trim())
    ) {
      const tableRows: string[][] = [];
      // header row
      tableRows.push(
        line
          .trim()
          .slice(1, -1)
          .split("|")
          .map((c) => c.trim())
      );
      i++; // skip separator
      i++;
      while (
        i < lines.length &&
        lines[i]!.trim().startsWith("|") &&
        lines[i]!.trim().endsWith("|")
      ) {
        tableRows.push(
          lines[i]!
            .trim()
            .slice(1, -1)
            .split("|")
            .map((c) => c.trim())
        );
        i++;
      }
      blocks.push({ type: "table", rows: tableRows });
      continue;
    }

    // Unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i]!)) {
        items.push(lines[i]!.replace(/^\s*[-*+]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    // Ordered list
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i]!)) {
        items.push(lines[i]!.replace(/^\s*\d+[.)]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    // Empty line – skip
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph: collect consecutive non-empty, non-special lines
    const paraLines: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i]!.trim() !== "" &&
      !lines[i]!.trimStart().startsWith("```") &&
      !lines[i]!.trimStart().startsWith("#") &&
      !lines[i]!.trimStart().startsWith("> ") &&
      !/^\s*[-*+]\s+/.test(lines[i]!) &&
      !/^\s*\d+[.)]\s+/.test(lines[i]!) &&
      !/^(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i]!.trim()) &&
      !(
        lines[i]!.trim().startsWith("|") && lines[i]!.trim().endsWith("|")
      )
    ) {
      paraLines.push(lines[i]!);
      i++;
    }
    blocks.push({ type: "paragraph", content: paraLines.join("\n") });
  }

  return blocks;
}

/** Render a markdown string to React elements */
export function renderMarkdown(markdown: string): React.ReactNode {
  const blocks = parseBlocks(markdown);

  return blocks.map((block, idx) => {
    switch (block.type) {
      case "heading": {
        const Tag = `h${block.level ?? 2}` as keyof React.JSX.IntrinsicElements;
        return <Tag key={idx}>{parseInline(block.content ?? "")}</Tag>;
      }

      case "paragraph":
        return <p key={idx}>{parseInline(block.content ?? "")}</p>;

      case "code":
        return (
          <pre key={idx}>
            <code>{escapeHtml(block.content ?? "")}</code>
          </pre>
        );

      case "ul":
        return (
          <ul key={idx}>
            {(block.items ?? []).map((item, j) => (
              <li key={j}>{parseInline(item)}</li>
            ))}
          </ul>
        );

      case "ol":
        return (
          <ol key={idx}>
            {(block.items ?? []).map((item, j) => (
              <li key={j}>{parseInline(item)}</li>
            ))}
          </ol>
        );

      case "blockquote":
        return (
          <blockquote key={idx}>
            {parseInline(block.content ?? "")}
          </blockquote>
        );

      case "hr":
        return <hr key={idx} />;

      case "table": {
        const rows = block.rows ?? [];
        if (rows.length === 0) return null;
        const header = rows[0]!;
        const body = rows.slice(1);
        return (
          <table key={idx}>
            <thead>
              <tr>
                {header.map((cell, ci) => (
                  <th key={ci}>{parseInline(cell)}</th>
                ))}
              </tr>
            </thead>
            {body.length > 0 && (
              <tbody>
                {body.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci}>{parseInline(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        );
      }

      default:
        return null;
    }
  });
}
