/**
 * Next.js API Route: POST /api/shell
 *
 * Executes shell commands on the HOST OS (not inside the container).
 * Uses `nsenter` to enter the host's PID/mount namespace via PID 1,
 * so ROS scripts and system commands run as if executed directly on the robot.
 *
 * Requires the container to run with: --pid=host --privileged
 *
 * ⚠️ This must be secured in production (e.g. auth middleware).
 */

import { NextRequest, NextResponse } from "next/server";
import { exec, spawn } from "child_process";

/**
 * Wrap a command so it executes on the host OS via nsenter.
 * Falls back to direct execution if HOST_EXEC is disabled (e.g. dev mode).
 */
function hostCommand(command: string, user?: string): string {
    const useNsenter = process.env.HOST_EXEC !== "false";
    if (!useNsenter) return command;

    // nsenter into the host's mount/uts/ipc/net/pid namespaces via PID 1
    // Run as the specified user (default: ysc) to get the correct ~ and env
    const targetUser = user || process.env.HOST_USER || "ysc";
    return `nsenter -t 1 -m -u -i -n -p -- su - ${targetUser} -c ${shellEscape(command)}`;
}

/** Escape a string for safe embedding in a shell single-quote context */
function shellEscape(s: string): string {
    // Wrap in single quotes, escaping any existing single quotes
    return "'" + s.replace(/'/g, "'\\''") + "'";
}

export async function POST(request: NextRequest) {
    try {
        const { command, background } = await request.json();

        if (!command || typeof command !== "string") {
            return NextResponse.json(
                { error: "Missing or invalid 'command' field" },
                { status: 400 },
            );
        }

        // Treat empty/whitespace-only commands as no-ops
        if (!command.trim()) {
            return NextResponse.json({ ok: true, message: "No command to execute" });
        }

        const hostCmd = hostCommand(command);
        console.log(`[shell-api] Executing${background ? " (background)" : ""}:`, command.slice(0, 200));

        if (background) {
            // Fire-and-forget: spawn a detached bash process
            const child = spawn("bash", ["-c", hostCmd], {
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
                hostCmd,
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
