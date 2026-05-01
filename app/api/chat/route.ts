/**
 * Proxy route for the chat robot API.
 *
 * The browser calls /api/chat (same origin → no CORS), and this handler
 * forwards the request to the actual chat service running on the host.
 * Uses a server-only env var so the real backend URL is never exposed to the client.
 */

import { NextRequest, NextResponse } from "next/server";

const CHAT_BACKEND_URL =
    process.env.CHAT_API_URL ?? "http://127.0.0.1:8082";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const upstream = await fetch(`${CHAT_BACKEND_URL}/api/chat_robot`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        const data = await upstream.json();

        return NextResponse.json(data, { status: upstream.status });
    } catch (err) {
        console.error("[/api/chat proxy]", err);
        return NextResponse.json(
            { error: "Failed to reach chat backend" },
            { status: 502 },
        );
    }
}
