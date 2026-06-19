import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file");

        if (!file) {
            return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
        }

        const openAiFormData = new FormData();
        openAiFormData.append("file", file);
        openAiFormData.append("model", "whisper-1");
        openAiFormData.append("language", "id");

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
        }

        const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
            },
            body: openAiFormData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("OpenAI Whisper API error:", errorText);
            return NextResponse.json({ error: `Whisper API error: ${response.statusText}` }, { status: response.status });
        }

        const result = await response.json();
        return NextResponse.json({ text: result.text });
    } catch (err: any) {
        console.error("STT proxy error:", err);
        return NextResponse.json({ error: err.message || "Failed to process audio" }, { status: 500 });
    }
}
