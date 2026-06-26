import { useCallback, useEffect, useRef, useState } from "react";

/* Voice I/O for the composer:
   - STT via Web Speech SpeechRecognition (interim + final transcript)
   - a live mic level (RMS 0..1) from a Web Audio AnalyserNode, for the meter
   - TTS via speechSynthesis with a global mute + per-message speak
   - barge-in: starting to listen cancels any in-progress speech
   - graceful degradation when the mic is denied or the API is missing

   When an ElevenLabs agent is configured the UI offers full-duplex "live voice"
   through the existing ConvAI widget; this hook is the always-available STT/TTS
   path that backs the composer mic and the per-message speak buttons. */

type SR = any;

const getSR = (): any => (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export type MicState = "idle" | "listening" | "denied" | "unsupported";

export function useVoiceIO(opts: { onFinal?: (text: string) => void; lang?: string } = {}) {
  const { onFinal, lang = "en-US" } = opts;
  const [micState, setMicState] = useState<MicState>(() => (getSR() ? "idle" : "unsupported"));
  const [interim, setInterim] = useState("");
  const [level, setLevel] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const recRef = useRef<SR | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef(0);
  const finalRef = useRef(onFinal);
  finalRef.current = onFinal;

  const stopMeter = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setLevel(0);
  }, []);

  const startMeter = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
        setLevel(Math.min(1, Math.sqrt(sum / data.length) * 2.2));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
      return true;
    } catch {
      setMicState("denied");
      return false;
    }
  }, []);

  const stopListening = useCallback(() => {
    recRef.current?.stop();
    recRef.current = null;
    stopMeter();
    setMicState((s) => (s === "listening" ? "idle" : s));
    setInterim("");
  }, [stopMeter]);

  const startListening = useCallback(async () => {
    const SR = getSR();
    if (!SR) { setMicState("unsupported"); return; }
    // barge-in: stop any TTS the moment the user starts talking
    window.speechSynthesis?.cancel();
    setSpeakingId(null);

    const ok = await startMeter();
    if (!ok) return;

    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      setInterim(text);
      const lastIsFinal = e.results[e.results.length - 1].isFinal;
      if (lastIsFinal) finalRef.current?.(text.trim());
    };
    rec.onerror = (e: any) => { if (e.error === "not-allowed" || e.error === "service-not-allowed") setMicState("denied"); };
    rec.onend = () => { stopMeter(); setMicState((s) => (s === "listening" ? "idle" : s)); setInterim(""); };
    rec.start();
    recRef.current = rec;
    setMicState("listening");
    setInterim("");
  }, [lang, startMeter, stopMeter]);

  const speak = useCallback((id: string, text: string) => {
    if (muted || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/```[\s\S]*?```/g, " code block ").replace(/[#*`>]/g, ""));
    u.lang = lang;
    u.onend = () => setSpeakingId((cur) => (cur === id ? null : cur));
    u.onerror = () => setSpeakingId((cur) => (cur === id ? null : cur));
    setSpeakingId(id);
    window.speechSynthesis.speak(u);
  }, [muted, lang]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeakingId(null);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      if (!m) { window.speechSynthesis?.cancel(); setSpeakingId(null); }
      return !m;
    });
  }, []);

  useEffect(() => () => { stopListening(); window.speechSynthesis?.cancel(); }, [stopListening]);

  return {
    micState, interim, level, muted, speakingId,
    startListening, stopListening, speak, stopSpeaking, toggleMute,
    ttsSupported: typeof window !== "undefined" && !!window.speechSynthesis,
  };
}
