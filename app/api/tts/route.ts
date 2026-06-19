import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { text } = await req.json();

        if (!text) {
            return NextResponse.json({ error: "Missing text to synthesize" }, { status: 400 });
        }

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
        }

        const response = await fetch("https://api.openai.com/v1/audio/speech", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "tts-1",
                input: text,
                voice: "alloy",
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("OpenAI TTS API error:", errorText);
            return NextResponse.json({ error: `TTS API error: ${response.statusText}` }, { status: response.status });
        }

        // Return the audio stream directly to the browser
        const audioBuffer = await response.arrayBuffer();

        return new NextResponse(audioBuffer, {
            headers: {
                "Content-Type": "audio/mpeg",
                "Content-Length": audioBuffer.byteLength.toString(),
            },
        });
    } catch (err: any) {
        console.error("TTS proxy error:", err);
        return NextResponse.json({ error: err.message || "Failed to synthesize speech" }, { status: 500 });
    }
}
