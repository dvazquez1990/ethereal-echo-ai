import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";

type Mode = "spiritual_chat" | "session_interpretation";

function loadSystemPrompt(): string {
  const p = path.join(process.cwd(), "prompts", "ethereal-echo-google-ai-system-prompt.md");
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    // fallback if file missing
    return `
You are Ethereal Echo, a calm, intuitive, medium-style assistant.
Always spiritual, welcoming, and voice-ready. No fear language. No claims of proof.
Always include Speak Aloud content.
`;
  }
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GOOGLE_API_KEY. Add it in Vercel → Project Settings → Environment Variables." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const mode: Mode = body.mode === "session_interpretation" ? "session_interpretation" : "spiritual_chat";
    const rawText = String(body.raw_text || "").trim();
    const userContext = body.user_context ? String(body.user_context) : "";
    const fastMode = Boolean(body.fast_mode);
    const voiceMode = Boolean(body.voice_mode);

    if (!rawText) {
      return NextResponse.json(
        { error: "No text provided. Paste text or upload a transcript/log file." },
        { status: 400 }
      );
    }

    // Quick safety limit: avoid huge payloads in v1
    const MAX_CHARS = 18000;
    const clipped = rawText.length > MAX_CHARS ? rawText.slice(0, MAX_CHARS) : rawText;

    const systemPrompt = loadSystemPrompt();

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-1.5-flash"
    });

    // We pass the system prompt + a structured instruction for output.
    const prompt = `
${systemPrompt}

USER INPUT (mode=${mode}, fast_mode=${fastMode}, voice_mode=${voiceMode}):
${userContext ? `USER_CONTEXT:\n${userContext}\n` : ""}
RAW_TEXT:
${clipped}

RESPONSE REQUIREMENTS:
- Stay fully spiritual and medium-like.
- For spiritual_chat mode: natural chat reply + Speak Aloud + short disclaimer.
- For session_interpretation mode: follow the structured headings in the system prompt.
- ALWAYS include a "Speak Aloud" section suitable for TTS.
- Keep it welcoming and non-fear-based.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Simple extraction: Try to pull Speak Aloud block
    let speakAloud = "";
    const match = text.match(/Speak Aloud[\s\S]*?\n([\s\S]*?)(\n##|\n#|$)/i);
    if (match?.[1]) speakAloud = match[1].trim();

    return NextResponse.json({
      reply: text.trim(),
      speak_aloud: speakAloud || text.trim()
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
