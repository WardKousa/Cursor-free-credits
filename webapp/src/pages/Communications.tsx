import { useCallback, useEffect, useRef, useState } from "react";
import { Mail, RefreshCw, Inbox as InboxIcon, AlertTriangle, LogIn } from "lucide-react";
import { Card, Badge } from "../components/ui";

type Email = {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  snippet: string;
  date: string;
  labels: string[];
};

// Backend path (Fluxzero/n8n) — used when no client-side Gmail Client ID is set.
const ENDPOINT = (import.meta as any).env?.VITE_COMMUNICATIONS_ENDPOINT || "/api/communications";
// Client-side Gmail (browser OAuth). Client ID only — NEVER the client secret.
const CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID as string | undefined;
const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
const TOKEN_KEY = "mooizicht_gmail_token";

function formatDate(raw: string | null | undefined): string {
  if (!raw) return "";
  const n = Number(raw);
  const d = Number.isFinite(n) && n > 0 ? new Date(n) : new Date(raw);
  if (isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString();
}

function senderName(from: string): string {
  if (!from) return "(unknown)";
  const m = from.match(/^"?([^"<]+?)"?\s*<.+>$/);
  return (m ? m[1] : from).trim();
}

/** Load the Google Identity Services script once. */
function loadGis(): Promise<any> {
  const w = window as any;
  if (w.google?.accounts?.oauth2) return Promise.resolve(w.google);
  return new Promise((resolve, reject) => {
    let s = document.querySelector<HTMLScriptElement>("script[data-gsi]");
    if (!s) {
      s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.defer = true;
      s.setAttribute("data-gsi", "1");
      document.head.appendChild(s);
    }
    s.addEventListener("load", () => resolve((window as any).google));
    s.addEventListener("error", () => reject(new Error("Failed to load Google sign-in")));
    if (w.google?.accounts?.oauth2) resolve(w.google);
  });
}

const header = (headers: any[], name: string) =>
  headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";

export default function Communications() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Email | null>(null);
  const [token, setToken] = useState<string>(() => sessionStorage.getItem(TOKEN_KEY) || "");
  const tokenClientRef = useRef<any>(null);

  // ---- client-side Gmail (browser OAuth via GIS) ----------------------
  const fetchGmail = useCallback(async (accessToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const listRes = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=15&q=in:inbox",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (listRes.status === 401) { sessionStorage.removeItem(TOKEN_KEY); setToken(""); throw new Error("Gmail session expired — connect again."); }
      if (!listRes.ok) throw new Error(`Gmail API ${listRes.status}`);
      const list = await listRes.json();
      const ids: { id: string }[] = list.messages || [];
      const detailed = await Promise.all(
        ids.map(async ({ id }) => {
          const r = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          const m = await r.json();
          const h = m.payload?.headers || [];
          return {
            id: m.id,
            threadId: m.threadId,
            from: header(h, "From"),
            to: header(h, "To"),
            subject: header(h, "Subject"),
            snippet: (m.snippet || "").replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"'),
            date: header(h, "Date") || String(m.internalDate || ""),
            labels: m.labelIds || [],
          } as Email;
        })
      );
      setEmails(detailed);
    } catch (e: any) {
      setError(e.message || "Couldn't load Gmail.");
    } finally {
      setLoading(false);
    }
  }, []);

  const connectGmail = useCallback(async () => {
    if (!CLIENT_ID) return;
    setError(null);
    try {
      const google = await loadGis();
      tokenClientRef.current = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: GMAIL_SCOPE,
        callback: (resp: any) => {
          if (resp.error) { setError(`Sign-in failed: ${resp.error}`); return; }
          sessionStorage.setItem(TOKEN_KEY, resp.access_token);
          setToken(resp.access_token);
          fetchGmail(resp.access_token);
        },
      });
      tokenClientRef.current.requestAccessToken({ prompt: token ? "" : "consent" });
    } catch (e: any) {
      setError(e.message || "Couldn't start Google sign-in.");
    }
  }, [fetchGmail, token]);

  // ---- backend path (when no Client ID) -------------------------------
  const loadBackend = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(ENDPOINT);
      const data = await res.json();
      if (data.error) setError(data.error);
      setEmails(Array.isArray(data.emails) ? data.emails : []);
    } catch (e: any) {
      setError(`Couldn't reach backend: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (CLIENT_ID) {
      if (token) fetchGmail(token); // reuse a token from this session
    } else {
      loadBackend();
    }
  }, [token, fetchGmail, loadBackend]);

  const refresh = () => {
    if (CLIENT_ID) { token ? fetchGmail(token) : connectGmail(); }
    else loadBackend();
  };

  const needsConnect = !!CLIENT_ID && !token;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 10 }}>
            Communications
          </div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 650, letterSpacing: "-0.03em", lineHeight: 1.05 }}>Email with your customers</h1>
        </div>
        {needsConnect ? (
          <button onClick={connectGmail} style={{ ...btn(loading), border: "1px solid color-mix(in srgb, var(--accent-2) 45%, transparent)", color: "var(--accent-2)" }}>
            <LogIn size={14} /> Connect Gmail
          </button>
        ) : (
          <button onClick={refresh} disabled={loading} style={btn(loading)}>
            <RefreshCw size={14} style={{ animation: loading ? "spin 1s linear infinite" : undefined }} /> Refresh
          </button>
        )}
      </div>

      {error && (
        <Card>
          <div style={{ display: "flex", gap: 10, alignItems: "center", color: "var(--bad)", fontSize: 13.5 }}>
            <AlertTriangle size={16} /> {error}
          </div>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1.2fr" : "1fr", gap: 16 }}>
        <Card pad={0}>
          {needsConnect ? (
            <div style={{ padding: 48, textAlign: "center", color: "var(--text-faint)" }}>
              <Mail size={26} style={{ marginBottom: 10 }} />
              <div style={{ fontSize: 14, color: "var(--text-dim)", marginBottom: 4 }}>Connect Gmail to see your inbox.</div>
              <div style={{ fontSize: 12 }}>Read-only — the agents send and receive from here.</div>
            </div>
          ) : loading && emails.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-faint)" }}>Loading…</div>
          ) : emails.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-faint)" }}>
              <InboxIcon size={26} style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 14 }}>No emails yet.</div>
            </div>
          ) : (
            emails.map((e, i) => {
              const active = selected?.id === e.id;
              const unread = e.labels?.includes("UNREAD");
              return (
                <div
                  key={e.id}
                  onClick={() => setSelected(e)}
                  style={{ display: "flex", flexDirection: "column", gap: 4, padding: "14px 18px", borderTop: i ? "1px solid var(--border)" : "none", cursor: "pointer", background: active ? "var(--panel-strong)" : "transparent" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: unread ? 650 : 500, fontSize: 13.5, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {senderName(e.from)}
                    </span>
                    {unread && <Badge color="var(--accent)">new</Badge>}
                    <span style={{ fontSize: 11.5, color: "var(--text-faint)" }}>{formatDate(e.date)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: unread ? "var(--text)" : "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {e.subject || "(no subject)"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {e.snippet}
                  </div>
                </div>
              );
            })
          )}
        </Card>

        {selected && (
          <Card>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>{selected.subject || "(no subject)"}</h2>
                <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 13 }}>close</button>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-faint)" }}>
                <div><span style={{ color: "var(--text-dim)" }}>From:</span> {selected.from}</div>
                <div><span style={{ color: "var(--text-dim)" }}>To:</span> {selected.to}</div>
                <div><span style={{ color: "var(--text-dim)" }}>Date:</span> {formatDate(selected.date)}</div>
              </div>
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, fontSize: 13.5, color: "var(--text-dim)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {selected.snippet || "(no preview available)"}
              </div>
              <a href={`https://mail.google.com/mail/u/0/#inbox/${selected.threadId}`} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--accent)", textDecoration: "none", marginTop: 4 }}>
                <Mail size={13} /> Open in Gmail
              </a>
            </div>
          </Card>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const btn = (disabled: boolean): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "9px 14px",
  borderRadius: 10,
  border: "1px solid var(--border-strong)",
  background: "transparent",
  color: "var(--text-dim)",
  fontSize: 13,
  cursor: disabled ? "wait" : "pointer",
  opacity: disabled ? 0.6 : 1,
});
