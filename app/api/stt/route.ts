import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
        }

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
        }

        const arrayBuffer = await file.arrayBuffer();
        if (arrayBuffer.byteLength === 0) {
            return NextResponse.json({ error: "Audio file is empty" }, { status: 400 });
        }

        const buffer = Buffer.from(arrayBuffer);
        const fileName = file.name && file.name !== "blob" ? file.name : "audio.webm";
        const fileType = file.type || "audio/webm";

        const openAiFormData = new FormData();
        const blob = new Blob([buffer], { type: fileType });
        openAiFormData.append("file", blob, fileName);
        openAiFormData.append("model", "whisper-1");
        openAiFormData.append("language", "id");
        openAiFormData.append(
            "prompt",
            "Perintah suara kontrol robot dalam Bahasa Indonesia: maju, mundur, ikuti saya, navigasi, duduk, berdiri, stop.",
        );
        openAiFormData.append("temperature", "0");

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
            let errorMessage = `Whisper API error: ${response.statusText}`;
            try {
                const parsed = JSON.parse(errorText);
                if (parsed.error?.message) {
                    errorMessage = parsed.error.message;
                }
            } catch (e) {}
            return NextResponse.json({ error: errorMessage }, { status: response.status });
        }

        const result = await response.json();
        let transcribedText = (result.text || "").trim();

        // Filter out known OpenAI Whisper Indonesian hallucination patterns (YouTube subtitle noise)
        const hallucinations = [
            /^selamat menikmati[\s.]*$/i,
            /^terima kasih[\s.]*$/i,
            /^terima kasih telah menonton[\s.]*$/i,
            /^terima kasih sudah menonton[\s.]*$/i,
            /^selamat menyaksikan[\s.]*$/i,
            /^subscribe[\s.]*$/i,
            /^jangan lupa subscribe[\s.]*$/i,
            /^subtitles? by[\s.]*$/i,
            /^\.+$/,
        ];

        if (hallucinations.some((pattern) => pattern.test(transcribedText))) {
            transcribedText = "";
        }

        return NextResponse.json({ text: transcribedText });
    } catch (err: any) {
        console.error("STT proxy error:", err);
        return NextResponse.json({ error: err.message || "Failed to process audio" }, { status: 500 });
    }
}
