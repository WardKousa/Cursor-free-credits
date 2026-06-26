/* Agent transport: shapes the request, streams tokens when the backend
   supports it, and normalizes whatever reply shape comes back. */

export const ENDPOINT_KEY = "mooizicht_chat_endpoint";

export type ChatTurn = { role: "user" | "agent"; content: string };

/** A tool/agent action surfaced in the status panel. */
export type ToolEvent = { name: string; detail?: string; at: number };

/** Pull the assistant text out of whatever shape the backend returns.
 *  Handles plain strings, array-wrapped payloads (common from n8n webhooks),
 *  the n8n AI Agent `output` field, and the usual reply/text/message keys. */
export function extractReply(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "(empty response from agent)";

  let data: any;
  try {
    data = JSON.parse(trimmed);
  } catch {
    return trimmed; // not JSON — the body itself is the reply
  }

  const fromObject = (o: any): string | undefined => {
    if (o == null) return undefined;
    if (typeof o === "string") {
      // A value can itself be stringified JSON (e.g. n8n AI Agent returns
      // {output: "{\"reply\":\"…\"}"}). Unwrap one level so we show the reply,
      // not the raw JSON. Plain text falls through unchanged.
      const t = o.trim();
      if (t.startsWith("{") || t.startsWith("[")) {
        try { const r = fromObject(JSON.parse(t)); if (r) return r; } catch { /* not JSON */ }
      }
      return o;
    }
    if (Array.isArray(o)) {
      for (const item of o) {
        const r = fromObject(item);
        if (r) return r;
      }
      return undefined;
    }
    if (typeof o === "object") {
      const v =
        o.reply ?? o.output ?? o.text ?? o.message ?? o.answer ??
        o.response ?? o.content ?? o.json ?? o.data ?? o.result;
      if (v != null) return fromObject(v);
    }
    return undefined;
  };

  const reply = fromObject(data);
  if (reply) return String(reply);
  return typeof data === "object" ? JSON.stringify(data) : String(data);
}

export type SendCallbacks = {
  onToken?: (chunk: string) => void;       // streamed text delta
  onTool?: (ev: ToolEvent) => void;        // tool / agent action observed
  signal?: AbortSignal;
};

export type SendResult = {
  text: string;
  model?: string;
  latencyMs: number;
  streamed: boolean;
};

/**
 * Send a prompt to the agent backend.
 *
 * Streams when the response is text/event-stream or chunked plain text, calling
 * onToken per delta; otherwise reads the whole body once and normalizes it.
 * SSE events of shape {type:"tool", name, detail} are surfaced via onTool, and
 * a {model} field anywhere in the payload is reported back for the status panel.
 */
export async function sendToAgent(
  endpoint: string,
  prompt: string,
  history: ChatTurn[],
  cb: SendCallbacks = {}
): Promise<SendResult> {
  const started = performance.now();
  // Keep the request minimal so we don't change how the backend responds:
  // no forced Accept / stream flag (some backends content-negotiate on those).
  // We detect streaming purely from the response content-type below.
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, history }),
    signal: cb.signal,
  });

  // A non-2xx is a backend failure, not an empty reply — surface it loudly
  // instead of rendering a blank agent bubble.
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const snippet = body.trim().slice(0, 160);
    throw new Error(`agent backend returned HTTP ${res.status}${snippet ? ` — ${snippet}` : ""}`);
  }

  const ctype = res.headers.get("content-type") || "";
  const canStream = !!res.body && (ctype.includes("event-stream") || ctype.includes("text/plain"));

  let model: string | undefined;

  if (canStream) {
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let acc = "";
    let buf = "";
    const handleSSE = (block: string) => {
      // SSE "data:" lines — may be JSON deltas or raw text
      const dataLines = block.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim());
      const payload = dataLines.join("\n");
      if (!payload || payload === "[DONE]") return;
      try {
        const j = JSON.parse(payload);
        if (j.type === "tool" && j.name) { cb.onTool?.({ name: j.name, detail: j.detail, at: Date.now() }); return; }
        if (j.model) model = j.model;
        const delta = j.delta ?? j.token ?? j.content ?? extractReply(payload);
        if (delta) { acc += delta; cb.onToken?.(String(delta)); }
      } catch {
        acc += payload; cb.onToken?.(payload);
      }
    };

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      if (buf.includes("\n\n") || ctype.includes("event-stream")) {
        // SSE frames are separated by a blank line
        let idx;
        while ((idx = buf.indexOf("\n\n")) >= 0) {
          handleSSE(buf.slice(0, idx));
          buf = buf.slice(idx + 2);
        }
      } else {
        // chunked plain text — stream raw
        acc += buf; cb.onToken?.(buf); buf = "";
      }
    }
    if (buf.trim()) handleSSE(buf);
    if (!acc.trim()) acc = "(empty response from agent)";
    return { text: acc, model, latencyMs: performance.now() - started, streamed: true };
  }

  // Non-streaming: read once and normalize.
  const raw = await res.text();
  try {
    const j = JSON.parse(raw);
    const m = (Array.isArray(j) ? j[0] : j)?.model;
    if (m) model = m;
  } catch { /* not JSON */ }
  return { text: extractReply(raw), model, latencyMs: performance.now() - started, streamed: false };
}

/** Rough token estimate for the telemetry counters (≈4 chars/token). */
export const estimateTokens = (s: string) => Math.max(0, Math.round(s.length / 4));
