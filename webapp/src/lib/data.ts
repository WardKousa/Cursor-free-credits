// Mock domain data for mooizicht — outreach automation.
// In production these come from n8n workflows, Apify scrapers and your CSV imports.

export type Company = {
  id: string;
  name: string;
  industry: string;
  city: string;
  lng: number;
  lat: number;
  employees: number;
  status: "researching" | "queued" | "contacted" | "replied" | "won";
  score: number; // fit score 0-100
};

export const companies: Company[] = [
  { id: "c1", name: "Dakdekkers Ummels", industry: "Construction", city: "Maastricht", lng: 5.6909, lat: 50.8514, employees: 24, status: "won", score: 92 },
  { id: "c2", name: "Altis Groep", industry: "Real Estate", city: "Amsterdam", lng: 4.9041, lat: 52.3676, employees: 140, status: "replied", score: 88 },
  { id: "c3", name: "Noord Logistics", industry: "Logistics", city: "Rotterdam", lng: 4.4777, lat: 51.9244, employees: 310, status: "contacted", score: 74 },
  { id: "c4", name: "Veld Agritech", industry: "Agriculture", city: "Utrecht", lng: 5.1214, lat: 52.0907, employees: 56, status: "researching", score: 81 },
  { id: "c5", name: "Brouwer Energy", industry: "Energy", city: "Eindhoven", lng: 5.4697, lat: 51.4416, employees: 210, status: "queued", score: 69 },
  { id: "c6", name: "Kustlijn Marine", industry: "Maritime", city: "Den Haag", lng: 4.3007, lat: 52.0705, employees: 88, status: "contacted", score: 77 },
  { id: "c7", name: "Hanze Software", industry: "Software", city: "Groningen", lng: 6.5665, lat: 53.2194, employees: 42, status: "replied", score: 95 },
  { id: "c8", name: "Zuid Pharma", industry: "Pharma", city: "Nijmegen", lng: 5.8372, lat: 51.8126, employees: 175, status: "researching", score: 84 },
  { id: "c9", name: "Tulp Retail", industry: "Retail", city: "Haarlem", lng: 4.6462, lat: 52.3874, employees: 96, status: "won", score: 90 },
  { id: "c10", name: "Maas Industrials", industry: "Manufacturing", city: "Tilburg", lng: 5.0913, lat: 51.5606, employees: 420, status: "queued", score: 66 },
  { id: "c11", name: "Polder Capital", industry: "Finance", city: "Amsterdam", lng: 4.8852, lat: 52.3702, employees: 60, status: "contacted", score: 79 },
  { id: "c12", name: "Delta Foods", industry: "Food", city: "Breda", lng: 4.7683, lat: 51.5719, employees: 150, status: "replied", score: 83 },
];

export const statusColors: Record<Company["status"], string> = {
  researching: "#2f7dff",
  queued: "#efd29a",
  contacted: "#ff8a3d",
  replied: "#ff2d9b",
  won: "#4fd06a",
};

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
