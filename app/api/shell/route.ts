/**
 * Next.js API Route: POST /api/shell
 *
 * Executes shell commands on the server side (Node.js).
 * This replicates the Electron `electronAPI.executeBashCommand()` functionality
 * for the web version.
 *
 * ⚠️ This must be secured in production (e.g. auth middleware).
 */

import { NextRequest, NextResponse } from "next/server";
import { exec, spawn } from "child_process";

export async function POST(request: NextRequest) {
    try {
        const { command, background } = await request.json();

        if (!command || typeof command !== "string") {
            return NextResponse.json(
                { error: "Missing or invalid 'command' field" },
                { status: 400 },
            );
        }

        console.log(`[shell-api] Executing${background ? " (background)" : ""}:`, command.slice(0, 200));

        if (background) {
            // Fire-and-forget: spawn a detached bash process
            const child = spawn("bash", ["-c", command], {
                detached: true,
                stdio: "ignore",
            });
            child.unref();

            return NextResponse.json({
                ok: true,
                background: true,
                pid: child.pid,
                message: "Command started in background",
            });
        }

        // Foreground: wait for the command to finish (with timeout)
        const result = await new Promise<{ stdout: string; stderr: string; code: number }>((resolve) => {
            exec(
                command,
                {
                    shell: "/bin/bash",
                    timeout: 60_000, // 60 seconds max
                    maxBuffer: 1024 * 1024, // 1 MB
                },
                (error, stdout, stderr) => {
                    resolve({
                        stdout: stdout?.toString() ?? "",
                        stderr: stderr?.toString() ?? "",
                        code: error?.code ?? 0,
                    });
                },
            );
        });

        return NextResponse.json({
            ok: result.code === 0,
            ...result,
        });
    } catch (err: any) {
        console.error("[shell-api] Error:", err);
        return NextResponse.json(
            { error: err.message || "Internal server error" },
            { status: 500 },
        );
    }
}
