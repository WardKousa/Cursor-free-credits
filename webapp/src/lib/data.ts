// Mock domain data for mooizicht — outreach automation.
// In production these come from n8n workflows, Apify scrapers and your CSV imports.

// CRM status — the exact lifecycle values the n8n CRM Agent writes to the sheet.
export type Status =
  | "uncontacted"
  | "awaiting"
  | "owner_input"
  | "counter"
  | "rejected"
  | "meeting"
  | "shutdown";

// Display label + color per status. One source of truth for the whole UI.
export const STATUS_META: Record<Status, { label: string; color: string }> = {
  uncontacted: { label: "Uncontacted", color: "#8a8f98" },
  awaiting: { label: "Awaiting Reply", color: "#ff8a3d" },
  owner_input: { label: "Owner Input Needed", color: "#2f7dff" },
  counter: { label: "Counter Rejection", color: "#efc25a" },
  rejected: { label: "Rejected", color: "#ff4d6d" },
  meeting: { label: "Meeting Booked", color: "#4fd06a" },
  shutdown: { label: "Shutdown", color: "#5b616b" },
};

// Pipeline order (early → terminal), used for the dashboard funnel + legends.
export const STATUS_ORDER: Status[] = ["uncontacted", "awaiting", "owner_input", "counter", "rejected", "meeting", "shutdown"];

export const statusColors = Object.fromEntries(
  (Object.entries(STATUS_META) as [Status, { color: string }][]).map(([k, v]) => [k, v.color])
) as Record<Status, string>;

export const statusLabel = (s: Status): string => STATUS_META[s]?.label ?? s;

/** Map any raw CRM status string to a canonical Status. Order matters:
 *  "Counter Rejection" must be matched before "Rejected". */
export function normalizeStatus(raw?: string): Status {
  const s = (raw || "").trim().toLowerCase();
  if (!s || s.includes("uncontact")) return "uncontacted";
  if (s.includes("await")) return "awaiting";
  if (s.includes("owner")) return "owner_input";
  if (s.includes("counter")) return "counter";
  if (s.includes("reject")) return "rejected";
  if (s.includes("meeting") || s.includes("booked") || s.includes("won")) return "meeting";
  if (s.includes("shut")) return "shutdown";
  return "uncontacted";
}

export type Company = {
  id: string;
  name: string;
  industry: string;
  city: string;
  lng: number;
  lat: number;
  employees: number;
  status: Status;
  score: number; // fit score 0-100
};

export const companies: Company[] = [
  { id: "c1", name: "Dakdekkers Ummels", industry: "Construction", city: "Maastricht", lng: 5.6909, lat: 50.8514, employees: 24, status: "meeting", score: 92 },
  { id: "c2", name: "Altis Groep", industry: "Real Estate", city: "Amsterdam", lng: 4.9041, lat: 52.3676, employees: 140, status: "counter", score: 88 },
  { id: "c3", name: "Noord Logistics", industry: "Logistics", city: "Rotterdam", lng: 4.4777, lat: 51.9244, employees: 310, status: "awaiting", score: 74 },
  { id: "c4", name: "Veld Agritech", industry: "Agriculture", city: "Utrecht", lng: 5.1214, lat: 52.0907, employees: 56, status: "uncontacted", score: 81 },
  { id: "c5", name: "Brouwer Energy", industry: "Energy", city: "Eindhoven", lng: 5.4697, lat: 51.4416, employees: 210, status: "uncontacted", score: 69 },
  { id: "c6", name: "Kustlijn Marine", industry: "Maritime", city: "Den Haag", lng: 4.3007, lat: 52.0705, employees: 88, status: "owner_input", score: 77 },
  { id: "c7", name: "Hanze Software", industry: "Software", city: "Groningen", lng: 6.5665, lat: 53.2194, employees: 42, status: "meeting", score: 95 },
  { id: "c8", name: "Zuid Pharma", industry: "Pharma", city: "Nijmegen", lng: 5.8372, lat: 51.8126, employees: 175, status: "awaiting", score: 84 },
  { id: "c9", name: "Tulp Retail", industry: "Retail", city: "Haarlem", lng: 4.6462, lat: 52.3874, employees: 96, status: "rejected", score: 90 },
  { id: "c10", name: "Maas Industrials", industry: "Manufacturing", city: "Tilburg", lng: 5.0913, lat: 51.5606, employees: 420, status: "uncontacted", score: 66 },
  { id: "c11", name: "Polder Capital", industry: "Finance", city: "Amsterdam", lng: 4.8852, lat: 52.3702, employees: 60, status: "owner_input", score: 79 },
  { id: "c12", name: "Delta Foods", industry: "Food", city: "Breda", lng: 4.7683, lat: 51.5719, employees: 150, status: "shutdown", score: 83 },
];

export type Agent = {
  id: string;
  name: string;
  role: string;
  engine: "n8n" | "apify";
  status: "running" | "idle" | "error";
  runsToday: number;
  successRate: number;
};

export const agents: Agent[] = [
  { id: "a1", name: "Prospector", role: "Finds companies by ICP filters", engine: "apify", status: "running", runsToday: 38, successRate: 0.94 },
  { id: "a2", name: "Enricher", role: "Scrapes contacts, size, tech stack", engine: "apify", status: "running", runsToday: 52, successRate: 0.89 },
  { id: "a3", name: "Researcher", role: "Summarizes news & signals", engine: "n8n", status: "idle", runsToday: 21, successRate: 0.97 },
  { id: "a4", name: "Composer", role: "Drafts personalized first emails", engine: "n8n", status: "running", runsToday: 64, successRate: 0.91 },
  { id: "a5", name: "Sender", role: "Sends & schedules follow-ups", engine: "n8n", status: "running", runsToday: 130, successRate: 0.99 },
  { id: "a6", name: "Replier", role: "Classifies replies, books meetings", engine: "n8n", status: "error", runsToday: 12, successRate: 0.72 },
];

// 14-day outreach timeline
export const timeline = Array.from({ length: 14 }, (_, i) => {
  const sent = 60 + Math.round(Math.sin(i / 2) * 18 + i * 6);
  const opened = Math.round(sent * (0.52 + (i % 3) * 0.03));
  const replied = Math.round(opened * (0.18 + (i % 4) * 0.01));
  const meetings = Math.round(replied * 0.34);
  return { day: `D${i + 1}`, sent, opened, replied, meetings };
});

export const funnel = [
  { stage: "Researched", value: 1840, fill: "#2f7dff" },
  { stage: "Qualified", value: 920, fill: "#efd29a" },
  { stage: "Contacted", value: 610, fill: "#ff8a3d" },
  { stage: "Replied", value: 188, fill: "#ff2d9b" },
  { stage: "Meetings", value: 64, fill: "#4fd06a" },
];

export const industryMix = [
  { name: "Construction", value: 28, fill: "#ff8a3d" },
  { name: "Software", value: 22, fill: "#2f7dff" },
  { name: "Logistics", value: 17, fill: "#ff2d9b" },
  { name: "Finance", value: 14, fill: "#efd29a" },
  { name: "Other", value: 19, fill: "#4fd06a" },
];

export const campaigns = [
  { name: "NL Construction Q3", sent: 412, openRate: 0.58, replyRate: 0.14, meetings: 18, status: "active" },
  { name: "Software Founders", sent: 286, openRate: 0.64, replyRate: 0.21, meetings: 22, status: "active" },
  { name: "Logistics Decision Makers", sent: 198, openRate: 0.49, replyRate: 0.11, meetings: 7, status: "paused" },
  { name: "Energy Transition", sent: 134, openRate: 0.55, replyRate: 0.16, meetings: 9, status: "active" },
];

export const kpis = [
  { label: "Companies researched", value: "1,840", delta: "+12.4%", up: true },
  { label: "Emails sent", value: "1,030", delta: "+8.1%", up: true },
  { label: "Reply rate", value: "18.2%", delta: "+2.3pt", up: true },
  { label: "Meetings booked", value: "64", delta: "-4.0%", up: false },
];
