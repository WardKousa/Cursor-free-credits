import { useState } from "react";
import { Check, Copy } from "lucide-react";

/* Minimal, dependency-free markdown for chat replies: fenced code blocks with a
   copy button, headings, lists, blockquotes, and inline bold/italic/code/links.
   Deliberately small — enough for agent output, not a full CommonMark engine. */

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch { /* clipboard blocked */ }
  };
  return (
    <div style={{ position: "relative", margin: "10px 0", borderRadius: 10, border: "1px solid var(--border)", background: "rgba(0,0,0,0.34)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", borderBottom: "1px solid var(--border)", fontSize: 11, color: "var(--text-faint)", fontFamily: "var(--mono)" }}>
        <span>{lang || "code"}</span>
        <button onClick={copy} title="Copy code" style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: copied ? "var(--good)" : "var(--text-faint)", fontSize: 11 }}>
          {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre style={{ margin: 0, padding: "11px 12px", overflowX: "auto", fontSize: 12.5, lineHeight: 1.55, fontFamily: "var(--mono)", color: "var(--text)" }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

/** Inline spans: `code`, **bold**, *italic*, [text](url). */
function inline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)]+\))/g;
  let last = 0, m: RegExpExecArray | null, k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const key = `${keyBase}-${k++}`;
    if (tok.startsWith("`")) {
      out.push(<code key={key} style={{ fontFamily: "var(--mono)", fontSize: "0.9em", background: "rgba(255,255,255,0.07)", padding: "1px 5px", borderRadius: 5 }}>{tok.slice(1, -1)}</code>);
    } else if (tok.startsWith("**")) {
      out.push(<strong key={key}>{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith("*")) {
      out.push(<em key={key}>{tok.slice(1, -1)}</em>);
    } else {
      const mm = /\[([^\]]+)\]\(([^)]+)\)/.exec(tok)!;
      out.push(<a key={key} href={mm[2]} target="_blank" rel="noreferrer" style={{ color: "var(--accent-2)" }}>{mm[1]}</a>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function Markdown({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  const lines = text.split("\n");
  let i = 0, key = 0;
  let list: string[] | null = null;

  const flushList = () => {
    if (list) {
      const items = list;
      blocks.push(
        <ul key={`ul-${key++}`} style={{ margin: "6px 0", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 3 }}>
          {items.map((it, n) => <li key={n}>{inline(it, `li-${key}-${n}`)}</li>)}
        </ul>
      );
      list = null;
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("```")) {
      flushList();
      const lang = line.slice(3).trim();
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) { body.push(lines[i]); i++; }
      i++; // closing fence
      blocks.push(<CodeBlock key={`code-${key++}`} code={body.join("\n")} lang={lang} />);
      continue;
    }

    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      flushList();
      const lvl = h[1].length;
      const size = lvl === 1 ? 18 : lvl === 2 ? 16 : 14.5;
      blocks.push(<div key={`h-${key++}`} style={{ fontWeight: 700, fontSize: size, margin: "10px 0 4px" }}>{inline(h[2], `h-${key}`)}</div>);
      i++; continue;
    }

    if (/^[-*]\s+/.test(line)) {
      (list ||= []).push(line.replace(/^[-*]\s+/, ""));
      i++; continue;
    }

    if (line.startsWith(">")) {
      flushList();
      blocks.push(<blockquote key={`q-${key++}`} style={{ margin: "6px 0", paddingLeft: 12, borderLeft: "3px solid var(--border-strong)", color: "var(--text-dim)" }}>{inline(line.replace(/^>\s?/, ""), `q-${key}`)}</blockquote>);
      i++; continue;
    }

    if (line.trim() === "") { flushList(); i++; continue; }

    flushList();
    blocks.push(<p key={`p-${key++}`} style={{ margin: "4px 0", lineHeight: 1.55 }}>{inline(line, `p-${key}`)}</p>);
    i++;
  }
  flushList();

  return <div style={{ fontSize: 14, color: "var(--text)" }}>{blocks}</div>;
}
