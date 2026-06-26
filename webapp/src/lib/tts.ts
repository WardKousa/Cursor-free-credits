/* Text-to-speech for spoken agent replies.
 *
 * Primary path: the ElevenLabs TTS API (NOT agent/ConvAI mode) — your n8n agent
 * produces the reply text, then ElevenLabs synthesizes the voice. The API key is
 * read client-side for the demo (it is exposed in the browser; move TTS to the
 * backend for production). Falls back to the browser's speechSynthesis when no
 * ElevenLabs key is configured.
 */

const ELEVEN_KEY = (import.meta as any).env?.VITE_ELEVENLABS_API_KEY as string | undefined;
const VOICE_ID = ((import.meta as any).env?.VITE_ELEVENLABS_VOICE_ID as string | undefined) || "21m00Tcm4TlvDq8ikWAM"; // "Rachel"
const MODEL_ID = "eleven_turbo_v2_5"; // low-latency, good for conversation

export const hasElevenLabs = !!ELEVEN_KEY;

const strip = (s: string) =>
  s.replace(/```[\s\S]*?```/g, " code block ").replace(/[#*`_>]/g, "").replace(/\[(.*?)\]\(.*?\)/g, "$1").trim();

/** Synthesize speech with ElevenLabs and return a ready-to-play Audio element.
 *  Returns null when no key is set (caller should fall back to speechSynthesis). */
export async function elevenLabsTTS(text: string, signal?: AbortSignal): Promise<HTMLAudioElement | null> {
  if (!ELEVEN_KEY) return null;
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?optimize_streaming_latency=2`, {
    method: "POST",
    headers: { "xi-api-key": ELEVEN_KEY, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({
      text: strip(text),
      model_id: MODEL_ID,
      voice_settings: { stability: 0.45, similarity_boost: 0.7 },
    }),
    signal,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    let msg = `ElevenLabs TTS error (${res.status})`;
    try {
      const j = JSON.parse(body);
      const detail = j?.detail;
      const status = detail?.status || j?.status;
      const text = detail?.message || (typeof detail === "string" ? detail : "") || j?.message;
      if (status === "payment_issue" || /payment/i.test(body)) {
        msg = "ElevenLabs billing issue — settle your invoice to enable the voice. Using the browser voice for now.";
      } else if (res.status === 401) {
        msg = "ElevenLabs auth failed — check the API key. Using the browser voice for now.";
      } else if (text) {
        msg = `ElevenLabs: ${text}. Using the browser voice for now.`;
      }
    } catch { /* non-JSON body */ }
    throw new Error(msg);
  }
  const blob = await res.blob();
  const audio = new Audio(URL.createObjectURL(blob));
  audio.addEventListener("ended", () => URL.revokeObjectURL(audio.src), { once: true });
  return audio;
}

/** Browser-native fallback so the reply is still spoken without an ElevenLabs key. */
export function browserTTS(text: string, onEnd: () => void): void {
  if (!window.speechSynthesis) { onEnd(); return; }
  const u = new SpeechSynthesisUtterance(strip(text));
  u.lang = "en-US";
  u.onend = onEnd;
  u.onerror = onEnd;
  window.speechSynthesis.speak(u);
}
