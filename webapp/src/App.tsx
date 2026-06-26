import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  Map as MapIcon,
  Building2,
  Bot,
  Mail,
  Table2,
  Inbox as InboxIcon,
  BarChart3,
  Sparkles,
  Settings,
  Bell,
  MessagesSquare,
} from "lucide-react";
import FaceIntro from "./components/FaceIntro";
import FaceMark from "./components/FaceMark";
import VoiceAssistant from "./components/VoiceAssistant";
import ParticleField from "./components/ParticleField";
import Dashboard from "./pages/Dashboard";
import MapView from "./pages/MapView";
import Companies from "./pages/Companies";
import Agents from "./pages/Agents";
import Outreach from "./pages/Outreach";
import DataCSV from "./pages/DataCSV";
import Inbox from "./pages/Inbox";
import Insights from "./pages/Insights";
import Assistant from "./pages/Assistant";
import { StoreProvider, useStore } from "./lib/store";

type View = "dashboard" | "assistant" | "map" | "companies" | "agents" | "outreach" | "data" | "inbox" | "insights";

const NAV: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard },
  { id: "assistant", label: "Assistant", icon: MessagesSquare },
  { id: "inbox", label: "Inbox", icon: InboxIcon },
  { id: "map", label: "Map", icon: MapIcon },
  { id: "companies", label: "Companies", icon: Building2 },
  { id: "insights", label: "Insights", icon: BarChart3 },
  { id: "agents", label: "Agents", icon: Bot },
  { id: "outreach", label: "Outreach", icon: Mail },
  { id: "data", label: "Data", icon: Table2 },
];

export default function App() {
  const [intro, setIntro] = useState(true);
  return (
    <StoreProvider>
      <AnimatePresence>{intro && <FaceIntro key="intro" onDone={() => setIntro(false)} />}</AnimatePresence>
      {!intro && <Shell />}
    </StoreProvider>
  );
}

function Shell() {
  const [view, setView] = useState<View>("dashboard");
  const { openCount } = useStore();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setView("assistant");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.04 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      style={{ position: "relative", height: "100%", display: "flex" }}
    >
      <ParticleField />
      <div className="aurora" />

      {/* Sidebar */}
      <aside
        className="glass-surface"
        style={{
          position: "relative",
          zIndex: 2,
          width: 232,
          flexShrink: 0,
          padding: "22px 16px",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          gap: 5,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "4px 8px 18px" }}>
          <FaceMark size={34} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 16, letterSpacing: "-0.02em" }}>mooizicht</div>
            <div style={{ fontSize: 11, color: "var(--text-faint)" }}>outreach automation</div>
          </div>
        </div>

        <div style={{ height: 6 }} />

        {NAV.map((n) => {
          const Icon = n.icon;
          const active = view === n.id;
          return (
            <button
              key={n.id}
              onClick={() => setView(n.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid transparent",
                background: active ? "var(--panel-strong)" : "transparent",
                color: active ? "var(--text)" : "var(--text-dim)",
                fontSize: 14,
                fontWeight: 500,
                textAlign: "left",
                transition: "all .16s ease",
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.03)";
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = "transparent";
              }}
            >
              <Icon size={18} color={active ? "var(--accent)" : "currentColor"} />
              <span style={{ flex: 1 }}>{n.label}</span>
              {n.id === "inbox" && openCount > 0 && (
                <span
                  style={{
                    minWidth: 19,
                    height: 19,
                    padding: "0 6px",
                    borderRadius: 999,
                    background: "var(--accent)",
                    color: "#1a0e06",
                    fontSize: 11,
                    fontWeight: 700,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {openCount}
                </span>
              )}
            </button>
          );
        })}

        <div style={{ marginTop: "auto" }}>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid transparent",
              background: "transparent",
              color: "var(--text-dim)",
              fontSize: 14,
            }}
          >
            <Settings size={18} /> Settings
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Topbar */}
        <header
          className="glass-surface"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "16px 28px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          {/* Ask bar — opens the full Assistant dashboard (⌘K also opens it). */}
          <button
            onClick={() => setView("assistant")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flex: 1,
              maxWidth: 560,
              padding: "11px 16px",
              borderRadius: 13,
              border: "1px solid var(--border)",
              background: "var(--panel)",
              color: "var(--text-faint)",
              fontSize: 14,
              textAlign: "left",
              cursor: "text",
            }}
          >
            <Sparkles size={16} color="var(--accent)" />
            <span style={{ flex: 1 }}>Ask mooizicht to find companies, draft emails, build a list…</span>
            <kbd style={{ fontSize: 11, color: "var(--text-faint)", border: "1px solid var(--border)", borderRadius: 6, padding: "2px 6px", fontFamily: "var(--mono)" }}>⌘K</kbd>
          </button>

          <VoiceAssistant />

          <button
            onClick={() => setView("inbox")}
            title="Agent requests"
            style={{ position: "relative", width: 38, height: 38, borderRadius: 11, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text-dim)", display: "grid", placeItems: "center" }}
          >
            <Bell size={17} />
            {openCount > 0 && (
              <span style={{ position: "absolute", top: -5, right: -5, minWidth: 17, height: 17, padding: "0 5px", borderRadius: 999, background: "var(--accent)", color: "#1a0e06", fontSize: 10.5, fontWeight: 700, display: "grid", placeItems: "center", border: "2px solid var(--bg)" }}>
                {openCount}
              </span>
            )}
          </button>

          <div style={{ width: 34, height: 34, borderRadius: 999, background: "var(--grad-gemini)", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 600, color: "#0a0a0f" }}>
            JC
          </div>
        </header>

        {/* Routed content. Keyed fade-in per view, no AnimatePresence/exit:
            an exiting view that holds a WebGL map can stall mode="wait" and
            wedge navigation, so we mount the new view immediately.
            The Assistant renders full-bleed (it manages its own panes/scroll);
            every other view keeps the padded scroll container. */}
        {view === "assistant" ? (
          <div style={{ flex: 1, minHeight: 0 }}>
            <Assistant />
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: "auto", padding: "26px 28px 48px" }}>
            <motion.div key={view} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.26 }}>
              {view === "dashboard" && <Dashboard onOpenInbox={() => setView("inbox")} />}
              {view === "inbox" && <Inbox />}
              {view === "insights" && <Insights />}
              {view === "map" && <MapView />}
              {view === "companies" && <Companies />}
              {view === "agents" && <Agents />}
              {view === "outreach" && <Outreach />}
              {view === "data" && <DataCSV />}
            </motion.div>
          </div>
        )}
      </main>
    </motion.div>
  );
}
