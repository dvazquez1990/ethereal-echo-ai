usee clientt";

import React, { useMemo, useState } from "react";

type ChatMsg = { role: "user" | "echo"; text: string };

function speak(text: string) {
  if (typeof window === "undefined") return;
  const synth = window.speechSynthesis;
  if (!synth) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.95;
  u.pitch = 1.0;
  u.volume = 1.0;
  synth.speak(u);
}

export default function Page() {
  const [mode, setMode] = useState<"spiritual_chat" | "session_interpretation">("spiritual_chat");
  const [fastMode, setFastMode] = useState(true);
  const [userContext, setUserContext] = useState("");
  const [inputText, setInputText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "echo",
      text:
        "Hey love… welcome to Ethereal Echo. Take a soft breath with me. You can chat with me about anything spiritual, or upload/paste a transcript or ITC log and I’ll interpret it gently."
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [lastSpeakAloud, setLastSpeakAloud] = useState<string>("");

  const canSend = useMemo(() => inputText.trim().length > 0 || (fileName && inputText.trim().length > 0), [inputText, fileName]);

  async function onUploadFile(file: File | null) {
    if (!file) return;
    setFileName(file.name);

    // v1: only text-based files. We read client-side for speed.
    const allowed = ["text/plain", "application/json", "text/csv", "text/markdown"];
    const extOk = /\.(txt|json|csv|md)$/i.test(file.name);

    if (!extOk && !allowed.includes(file.type)) {
      setMessages((m) => [
        ...m,
        {
          role: "echo",
          text:
            "Hey love… I couldn’t read that file type yet. For now, upload a .txt, .csv, .json, or .md transcript/log — or just paste the text into the box. You’re good."
        }
      ]);
      return;
    }

    const text = await file.text();
    if (!text.trim()) {
      setMessages((m) => [
        ...m,
        {
          role: "echo",
          text:
            "Mmm… that file came through empty, baby. If you can, re-export the transcript/log from your app or paste the words here and I’ll read the energy on it."
        }
      ]);
      return;
    }
    setInputText(text);
  }

  async function send() {
    const text = inputText.trim();
    if (!text) return;

    setLoading(true);
    setMessages((m) => [...m, { role: "user", text }]);
    setInputText("");

    try {
      const res = await fetch("/api/echo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          raw_text: text,
          user_context: userContext || undefined,
          voice_mode: true,
          fast_mode: fastMode
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Request failed");
      }

      const reply = String(data.reply || "").trim();
      const speakAloud = String(data.speak_aloud || "").trim();

      setMessages((m) => [...m, { role: "echo", text: reply || "Hey love… I’m here. Try sending that again." }]);
      setLastSpeakAloud(speakAloud || reply);

    } catch (e: any) {
      setMessages((m) => [
        ...m,
        {
          role: "echo",
          text:
            "Hey love… something glitched on the connection side. Try again in a moment. If it keeps happening, paste a shorter section of the transcript and we’ll go piece by piece — slow and gentle."
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <div className="header">
        <div className="brand">
          <div className="h1">🌙 Ethereal Echo</div>
          <div className="sub">
            Mystic-but-clean spiritual chat + ITC transcript interpretation — with voice-ready readings.
          </div>
          <div className="row">
            <span className="pill">Palette: Veil Night</span>
            <span className="pill">Mode: medium vibe</span>
            <span className="pill">Speak Aloud: on</span>
          </div>
        </div>
      </div>

      <div className="grid">
        <section className="card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div className="row">
              <button
                className={`btn ${mode === "spiritual_chat" ? "btnPrimary" : ""}`}
                onClick={() => setMode("spiritual_chat")}
              >
                💬 Spiritual Chat
              </button>
              <button
                className={`btn ${mode === "session_interpretation" ? "btnPrimary" : ""}`}
                onClick={() => setMode("session_interpretation")}
              >
                🔮 Interpret Upload
              </button>
            </div>

            <button className="btn" disabled={!lastSpeakAloud} onClick={() => speak(lastSpeakAloud)}>
              🔊 Speak Aloud
            </button>
          </div>

          <div className="hr" />

          <div className="row">
            <label className="pill">
              <input
                type="checkbox"
                checked={fastMode}
                onChange={(e) => setFastMode(e.target.checked)}
                style={{ marginRight: 8 }}
              />
              Fast Mode (Quick Insight)
            </label>
          </div>

          <div className="hr" />

          <div style={{ marginBottom: 10 }} className="small">
            Upload a transcript/log file (.txt/.csv/.json/.md) or paste the text below. Audio upload comes next in v2.
          </div>

          <input
            type="file"
            accept=".txt,.csv,.json,.md,text/plain,application/json,text/csv,text/markdown"
            onChange={(e) => onUploadFile(e.target.files?.[0] || null)}
          />
          {fileName && <div className="small" style={{ marginTop: 8 }}>Loaded: {fileName}</div>}

          <div className="hr" />

          <textarea
            placeholder={
              mode === "spiritual_chat"
                ? "Ask Ethereal Echo anything spiritual… (signs, dreams, ancestors, energy, guidance)"
                : "Paste transcript or ITC word log here…"
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />

          <div style={{ marginTop: 10 }} className="row">
            <button className="btn btnPrimary" disabled={!canSend || loading} onClick={send}>
              {loading ? "Reading the energy…" : "Send"}
            </button>
            <button className="btn" onClick={() => setInputText("")} disabled={loading}>
              Clear
            </button>
          </div>

          <div className="hr" />

          <div className="small">
            Optional context (helps the reading feel personal): what you’re asking, how you feel, what’s going on lately.
          </div>
          <textarea
            placeholder="User context (optional)…"
            value={userContext}
            onChange={(e) => setUserContext(e.target.value)}
            style={{ minHeight: 80, marginTop: 10 }}
          />

          <div className="hr" />
          <div className="small">
            Disclaimer: Intuitive guidance only — not factual proof of spiritual contact.
          </div>
        </section>

        <aside className="card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div style={{ fontWeight: 700 }}>Session</div>
            <div className="small">Ethereal Echo chat</div>
          </div>

          <div className="hr" />

          <div style={{ maxHeight: 560, overflow: "auto", paddingRight: 6 }}>
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.role === "user" ? "msgUser" : "msgEcho"}`}>
                <div className="small" style={{ marginBottom: 6 }}>
                  {m.role === "user" ? "You" : "Ethereal Echo"}
                </div>
                <pre>{m.text}</pre>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
  }
