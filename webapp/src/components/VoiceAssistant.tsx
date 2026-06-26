import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Mic, X, AudioLines, Square, Loader2 } from "lucide-react";
import { ENDPOINT_KEY, sendToAgent, type ChatTurn } from "../lib/agent";
import { elevenLabsTTS, browserTTS, hasElevenLabs } from "../lib/tts";

type VState = "idle" | "listening" | "thinking" | "speaking";

/**
 * Voice "Talk" — speak to your agent and hear it reply.
 *   Web Speech STT → your n8n agent (the brain) → reply text → ElevenLabs TTS
 *   (your API key) for the voice, falling back to the browser voice if no key.
 * No ElevenLabs "agent mode" — ElevenLabs is used only to synthesize speech.
 */
export default function VoiceAssistant() {
  const [open, setOpen] = useState(false);

  const envEndpoint = (import.meta as any).env?.VITE_CHAT_ENDPOINT as string | undefined;
  const endpoint = localStorage.getItem(ENDPOINT_KEY) || envEndpoint || "";

  const [state, setState] = useState<VState>("idle");
  const [heard, setHeard] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");

  const recRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const convoRef = useRef(false); // conversation active → re-listen after each reply
  const historyRef = useRef<ChatTurn[]>([]);

  const stopRecognition = () => { try { recRef.current?.stop(); } catch { /* */ } recRef.current = null; };
  const stopAudio = () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } window.speechSynthesis?.cancel(); };

  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setError("Speech recognition isn't available in this browser. Use Chrome or Edge."); return; }
    stopAudio(); // barge-in: stop any reply being spoken
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      const text = Array.from(e.results).map((r: any) => r[0].transcript).join("");
      setHeard(text);
      if (e.results[e.results.length - 1].isFinal) handleFinal(text.trim());
    };
    rec.onerror = (e: any) => { if (e.error === "not-allowed") setError("Microphone permission denied."); };
    rec.onend = () => { setState((s) => (s === "listening" ? "idle" : s)); };
    rec.start();
    recRef.current = rec;
    setState("listening");
    setHeard("");
    setError("");
  };

  const relisten = () => { if (convoRef.current) setTimeout(() => { if (convoRef.current) startListening(); }, 350); };

  const speak = async (text: string) => {
    setState("speaking");
    try {
      const audio = await elevenLabsTTS(text); // null when no ElevenLabs key
      if (audio) {
        audioRef.current = audio;
        audio.onended = () => { audioRef.current = null; setState("idle"); relisten(); };
        audio.onerror = () => { audioRef.current = null; setState("idle"); relisten(); };
        await audio.play();
        return;
      }
    } catch (e: any) {
      setError(e.message || "TTS failed — using the browser voice.");
    }
    // fallback: browser speech
    browserTTS(text, () => { setState("idle"); relisten(); });
  };

  const handleFinal = async (text: string) => {
    stopRecognition();
    if (!text) { relisten(); return; }
    setState("thinking");
    historyRef.current.push({ role: "user", content: text });
    try {
      if (!endpoint) { const r = "No agent endpoint is set yet — add one in the Assistant settings."; setReply(r); speak(r); return; }
      const res = await sendToAgent(endpoint, text, historyRef.current.slice(0, -1));
      historyRef.current.push({ role: "agent", content: res.text });
      setReply(res.text);
      speak(res.text);
    } catch (e: any) {
      const r = `Couldn't reach the agent: ${e.message}.`;
      setReply(r);
      speak(r);
    }
  };

  const startConversation = () => { convoRef.current = true; historyRef.current = []; setReply(""); startListening(); };
  const stopConversation = () => { convoRef.current = false; stopRecognition(); stopAudio(); setState("idle"); };

  const close = () => { stopConversation(); setOpen(false); };

  useEffect(() => () => { stopRecognition(); stopAudio(); }, []);

  const stateLabel: Record<VState, string> = { idle: "Tap to start talking", listening: "Listening…", thinking: "Thinking…", speaking: "Speaking…" };
  const active = state !== "idle";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Talk to mooizicht"
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: 11, border: "1px solid color-mix(in srgb, var(--accent-2) 40%, transparent)", background: "color-mix(in srgb, var(--accent-2) 12%, transparent)", color: "var(--accent-2)", fontSize: 13, fontWeight: 500 }}
      >
        <AudioLines size={16} /> Talk
      </button>

      {open && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 2000 }}>
          <div onClick={close} style={{ position: "absolute", inset: 0 }} />
          <div className="glass-surface" style={{ position: "absolute", top: 70, right: 24, width: 380, maxWidth: "92vw", borderRadius: 18, border: "1px solid var(--border-strong)", padding: 20, animation: "fadeUp .2s ease both" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--grad-gemini)", display: "grid", placeItems: "center" }}>
                <AudioLines size={17} color="#0a0a0f" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>Talk to mooizicht</div>
                <div style={{ fontSize: 11.5, color: "var(--text-faint)" }}>
                  Speak — your agent answers in {hasElevenLabs ? "an ElevenLabs voice" : "the browser voice"}
                </div>
              </div>
              <button onClick={close} style={{ background: "none", border: "none", color: "var(--text-faint)" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <button
                onClick={active ? stopConversation : startConversation}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "22px", borderRadius: 14, border: `1px solid ${active ? "color-mix(in srgb, var(--magenta) 45%, transparent)" : "var(--border-strong)"}`, background: active ? "color-mix(in srgb, var(--magenta) 10%, transparent)" : "var(--panel)", color: "var(--text)" }}
              >
                <div style={{ width: 60, height: 60, borderRadius: 999, display: "grid", placeItems: "center", background: state === "listening" ? "var(--magenta)" : active ? "var(--panel-strong)" : "var(--grad-gemini)", boxShadow: state === "listening" ? "0 0 0 8px color-mix(in srgb, var(--magenta) 18%, transparent)" : "none", transition: "all .2s" }}>
                  {state === "thinking" || state === "speaking" ? <Loader2 size={24} color="#fff" className="asst-spin" />
                    : active ? <Square size={22} color="#fff" />
                    : <Mic size={24} color="#0a0a0f" />}
                </div>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{active ? "Tap to stop" : stateLabel.idle}</span>
                {active && <span style={{ fontSize: 11.5, color: "var(--magenta)" }}>{stateLabel[state]}</span>}
              </button>

              {heard && <div style={{ fontSize: 12.5, color: "var(--text-faint)" }}>You: “{heard}”</div>}
              {reply && (
                <div style={{ padding: "11px 13px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--panel)", fontSize: 13, color: "var(--text-dim)", lineHeight: 1.5, maxHeight: 160, overflowY: "auto" }}>
                  {reply}
                </div>
              )}
              {error && <div style={{ fontSize: 12, color: "var(--warn)", lineHeight: 1.5 }}>{error}</div>}

              <div style={{ fontSize: 11, color: "var(--text-faint)", lineHeight: 1.5 }}>
                {hasElevenLabs
                  ? "Voice: ElevenLabs TTS. The agent does the work; ElevenLabs only speaks the reply."
                  : "Set VITE_ELEVENLABS_API_KEY in .env to speak replies in your ElevenLabs voice."}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
