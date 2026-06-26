import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { companies as seedCompanies, Company } from "./data";

/* ------------------------------------------------------------------ types */

export type InboxItem = {
  id: string;
  agent: string;
  kind: "approval" | "decision" | "blocker";
  company?: string;
  title: string;
  detail: string;
  createdAt: number;
  status: "open" | "approved" | "dismissed";
  reply?: string;
};

type SheetState = "idle" | "syncing" | "ok" | "error";

type Store = {
  companies: Company[];

  // Google Sheets auto-sync
  sheet: { url: string; apiKey: string; range: string; autoSync: boolean };
  sheetState: SheetState;
  lastSync: number | null;
  sheetRows: number;
  sheetError: string | null;
  sheetTable: { headers: string[]; rows: string[][] } | null; // raw CRM rows
  saveSheet: (p: Partial<Store["sheet"]>) => void;
  syncNow: () => Promise<void>;

  // Agent inbox + notifications
  inbox: InboxItem[];
  openCount: number;
  resolve: (id: string, status: "approved" | "dismissed") => void;
  respond: (id: string, text: string) => void;
  notifyEmail: string;
  setNotifyEmail: (s: string) => void;
  notifyWebhook: string;
  setNotifyWebhook: (s: string) => void;
  gmailComposeUrl: (item: InboxItem) => string;

  // automation
  autopilot: boolean;
  setAutopilot: (b: boolean) => void;
};

const Ctx = createContext<Store | null>(null);
export const useStore = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore outside provider");
  return v;
};

/* -------------------------------------------------------------- seed inbox */

const seedInbox: InboxItem[] = [
  {
    id: "i1",
    agent: "Replier",
    kind: "decision",
    company: "Hanze Software",
    title: "Meeting time needs your confirmation",
    detail: "Sanne replied “works for me” to Tue 14:00 or Thu 10:00. Pick one and the agent will book it.",
    createdAt: Date.now() - 1000 * 60 * 9,
    status: "open",
  },
  {
    id: "i2",
    agent: "Composer",
    kind: "approval",
    company: "Altis Groep",
    title: "Approve first email before send",
    detail: "Draft references their Q3 acquisition. Approve to let the Sender agent send automatically.",
    createdAt: Date.now() - 1000 * 60 * 26,
    status: "open",
  },
  {
    id: "i3",
    agent: "Sender",
    kind: "blocker",
    company: undefined,
    title: "Domain warm-up limit reached",
    detail: "Daily send cap of 130 hit on outbound-1. Approve a second sending domain to keep auto-sending.",
    createdAt: Date.now() - 1000 * 60 * 52,
    status: "open",
  },
];

/* ---------------------------------------------------------- sheet → company */

// Map a CRM / lead sheet (the n8n "Demo CRM" columns, or a geo sheet) into the
// app's Company shape. CRM statuses are bucketed into the app's display states.
function rowsToCompanies(headers: string[], rows: string[][]): Company[] | null {
  const idx = (names: string[]) => headers.findIndex((h) => names.includes(h.trim().toLowerCase()));
  const ni = idx(["name", "company", "company_name"]);
  if (ni < 0) return null;
  const la = idx(["lat", "latitude"]);
  const lo = idx(["lng", "lon", "long", "longitude"]);
  const ind = idx(["industry", "sector"]);
  const ci = idx(["city", "location"]);
  const st = idx(["status"]);
  const sc = idx(["score", "fit", "icp_rating", "icp_score"]);
  const em = idx(["employees", "size", "company_size"]);
  const mapStatus = (raw?: string): Company["status"] => {
    const s = (raw || "").trim().toLowerCase();
    if (["researching", "queued", "contacted", "replied", "won"].includes(s)) return s as Company["status"];
    if (s.includes("meeting")) return "won";
    if (s.includes("uncontacted")) return "queued";
    if (s.includes("awaiting")) return "contacted";
    if (s.includes("reject") || s.includes("counter") || s.includes("owner") || s.includes("shutdown")) return "replied";
    return "queued";
  };
  return rows
    .filter((r) => r[ni])
    .map((r, i) => ({
      id: "s" + i,
      name: r[ni],
      industry: ind >= 0 ? r[ind] : "—",
      city: ci >= 0 ? r[ci] : "—",
      lat: la >= 0 ? parseFloat(r[la]) : NaN, // no geo column → off-map (skipped by map)
      lng: lo >= 0 ? parseFloat(r[lo]) : NaN,
      employees: em >= 0 ? parseInt(r[em]) || 0 : 0,
      status: mapStatus(st >= 0 ? r[st] : undefined),
      score: sc >= 0 ? parseInt(r[sc]) || 60 : 60,
    }));
}

const LS = "mooizicht_sheet_cfg";
const LS_NOTIFY = "mooizicht_notify_cfg";

/* ----------------------------------------------------------------- provider */

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>(seedCompanies);

  const [sheet, setSheet] = useState<Store["sheet"]>(() => {
    const env = (import.meta as any).env || {};
    const base = { url: env.VITE_GOOGLE_SHEET_URL || "", apiKey: env.VITE_GOOGLE_SHEETS_API_KEY || "", range: "A1:Z1000", autoSync: true };
    const saved = localStorage.getItem(LS);
    if (!saved) return base;
    const s = JSON.parse(saved);
    // prefer saved values, but fall back to env so we don't nag for creds we have
    return { ...base, ...s, url: s.url || base.url, apiKey: s.apiKey || base.apiKey };
  });
  const [sheetState, setSheetState] = useState<SheetState>("idle");
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [sheetRows, setSheetRows] = useState(0);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [sheetTable, setSheetTable] = useState<{ headers: string[]; rows: string[][] } | null>(null);

  const [inbox, setInbox] = useState<InboxItem[]>(seedInbox);
  const notifyCfg = JSON.parse(localStorage.getItem(LS_NOTIFY) || "{}");
  const [notifyEmail, setNotifyEmailS] = useState<string>(notifyCfg.email || "josemacontrerasp@gmail.com");
  const [notifyWebhook, setNotifyWebhookS] = useState<string>(notifyCfg.webhook || (import.meta as any).env?.VITE_WEBHOOKURL || "");
  const [autopilot, setAutopilot] = useState(true);

  const saveSheet = useCallback((p: Partial<Store["sheet"]>) => {
    setSheet((s) => {
      const next = { ...s, ...p };
      localStorage.setItem(LS, JSON.stringify(next));
      return next;
    });
  }, []);

  const setNotifyEmail = (email: string) => {
    setNotifyEmailS(email);
    localStorage.setItem(LS_NOTIFY, JSON.stringify({ email, webhook: notifyWebhook }));
  };
  const setNotifyWebhook = (webhook: string) => {
    setNotifyWebhookS(webhook);
    localStorage.setItem(LS_NOTIFY, JSON.stringify({ email: notifyEmail, webhook }));
  };

  const gmailComposeUrl = useCallback(
    (item: InboxItem) => {
      const su = encodeURIComponent(`[mooizicht] ${item.agent} needs you: ${item.title}`);
      const body = encodeURIComponent(
        `${item.agent} agent flagged a request${item.company ? ` for ${item.company}` : ""}.\n\n${item.title}\n${item.detail}\n\nOpen mooizicht to approve or decline.`
      );
      return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(notifyEmail)}&su=${su}&body=${body}`;
    },
    [notifyEmail]
  );

  // fire the Gmail notification automatically (via the n8n webhook if set)
  const autoNotify = useCallback(
    (item: InboxItem) => {
      if (!notifyWebhook) return;
      fetch(notifyWebhook, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: notifyEmail, subject: `${item.agent} needs you: ${item.title}`, item }),
      }).catch(() => {});
    },
    [notifyWebhook, notifyEmail]
  );

  const syncNow = useCallback(async () => {
    const id = sheet.url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1] || sheet.url.trim();
    if (!id || !sheet.apiKey) return;
    setSheetState("syncing");
    setSheetError(null);
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(sheet.range)}?key=${sheet.apiKey}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || `HTTP ${res.status}`);
      const values: string[][] = json.values || [];
      setSheetRows(Math.max(0, values.length - 1));
      setSheetTable(values.length ? { headers: values[0], rows: values.slice(1) } : { headers: [], rows: [] });
      const mapped = values.length ? rowsToCompanies(values[0], values.slice(1)) : null;
      if (mapped && mapped.length) setCompanies(mapped);
      setSheetState("ok");
      setLastSync(Date.now());
    } catch (e: any) {
      setSheetState("error");
      setSheetError(e.message || "Sync failed");
    }
  }, [sheet]);

  // auto-sync: on mount + poll every 30s when configured
  const syncRef = useRef(syncNow);
  syncRef.current = syncNow;
  useEffect(() => {
    if (!sheet.autoSync || !sheet.url || !sheet.apiKey) return;
    syncRef.current();
    const t = setInterval(() => syncRef.current(), 30000);
    return () => clearInterval(t);
  }, [sheet.autoSync, sheet.url, sheet.apiKey]);

  const resolve = useCallback((id: string, status: "approved" | "dismissed") => {
    setInbox((items) => items.map((it) => (it.id === id ? { ...it, status } : it)));
  }, []);

  // reply to an agent from inside the app — routes the instruction back to the
  // agent (via the n8n webhook when configured) and closes the request.
  const respond = useCallback(
    (id: string, text: string) => {
      setInbox((items) => items.map((it) => (it.id === id ? { ...it, status: "approved", reply: text } : it)));
      const item = inbox.find((i) => i.id === id);
      if (notifyWebhook && item) {
        fetch(notifyWebhook, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "reply", agent: item.agent, company: item.company, requestId: id, reply: text }),
        }).catch(() => {});
      }
    },
    [inbox, notifyWebhook]
  );

  // demo: one new request arrives shortly after load to show the live badge +
  // auto Gmail notification. (In production these come from the agents / n8n.)
  useEffect(() => {
    const t = setTimeout(() => {
      const item: InboxItem = {
        id: "i" + Math.round(performance.now()),
        agent: "Researcher",
        kind: "approval",
        company: "Zuid Pharma",
        title: "Found a buying signal — start outreach?",
        detail: "Zuid Pharma posted 3 SDR roles this week. Approve to let agents research contacts and draft a first email.",
        createdAt: Date.now(),
        status: "open",
      };
      setInbox((items) => [item, ...items]);
      autoNotify(item);
    }, 12000);
    return () => clearTimeout(t);
  }, [autoNotify]);

  const openCount = inbox.filter((i) => i.status === "open").length;

  const value = useMemo<Store>(
    () => ({
      companies,
      sheet,
      sheetState,
      lastSync,
      sheetRows,
      sheetError,
      sheetTable,
      saveSheet,
      syncNow,
      inbox,
      openCount,
      resolve,
      respond,
      notifyEmail,
      setNotifyEmail,
      notifyWebhook,
      setNotifyWebhook,
      gmailComposeUrl,
      autopilot,
      setAutopilot,
    }),
    [companies, sheet, sheetState, lastSync, sheetRows, sheetError, sheetTable, inbox, openCount, notifyEmail, notifyWebhook, autopilot, saveSheet, syncNow, resolve, respond, gmailComposeUrl]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
