"use client";

/**
 * Global application state — UI routing + launch mode for roslibjs.
 * Manages navigation state, ROS connection lifecycle, and shell command execution.
 *
 * Shell commands are executed via the Next.js API route `/api/shell`
 * (server-side Node.js), replicating Electron's IPC mechanism.
 */

import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    type ReactNode,
} from "react";
import { getRosConnection, disconnectRos } from "@/app/hooks/useRosData";
import { LAUNCH_PROFILES } from "@/app/config/launchProfiles";

// ─── Shell execution helper ──────────────────────────
async function executeShellCommand(
    command: string,
    options?: { background?: boolean },
): Promise<{ ok: boolean; stdout?: string; stderr?: string; error?: string }> {
    try {
        const res = await fetch("/api/shell", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ command, background: options?.background }),
        });
        return await res.json();
    } catch (err: any) {
        console.error("[shell] Fetch error:", err);
        return { ok: false, error: err.message };
    }
}

// ─── Context ─────────────────────────────────────────
interface AppState {
    /** Index of the currently active sidebar tab */
    activePage: number;
    setActivePage: (page: number) => void;

    /** ID of the currently active chat session (null = no session yet) */
    activeSessionId: number | null;
    setActiveSessionId: (id: number | null) => void;

    /** Title displayed in the chat panel header */
    sessionTitle: string;
    setSessionTitle: (title: string) => void;

    /** Start a brand new chat session (clears active state) */
    newSession: () => void;

    /** Resume an existing session and navigate to the Inspection Hub */
    resumeSession: (sessionId: number, title: string) => void;

    /** Current launch mode: "inspection" | "slam" | null (idle) */
    launchMode: "inspection" | "slam" | null;

    /** Current launch profile key (e.g. "simulation", "realRobot") */
    launchProfile: string | null;

    /** Whether a launch/stop operation is in progress */
    launching: boolean;

    /** Start a launch mode with a specific profile */
    startLaunch: (mode: "inspection" | "slam", profileKey: string) => void;

    /** Stop the current launch session */
    stopLaunch: () => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
    const [activePage, setActivePage] = useState(0);
    const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
    const [sessionTitle, setSessionTitle] = useState("New Inspection Session");
    const [launchMode, setLaunchMode] = useState<"inspection" | "slam" | null>(null);
    const [launchProfile, setLaunchProfile] = useState<string | null>(null);
    const [launching, setLaunching] = useState(false);

    const newSession = useCallback(() => {
        setActiveSessionId(null);
        setSessionTitle("New Inspection Session");
    }, []);

    const resumeSession = useCallback(
        (sessionId: number, title: string) => {
            setActiveSessionId(sessionId);
            setSessionTitle(title);
            setActivePage(0); // Navigate to Inspection Hub
        },
        [],
    );

    const startLaunch = useCallback(
        async (mode: "inspection" | "slam", profileKey: string) => {
            const profile = LAUNCH_PROFILES[profileKey];
            if (!profile) return;

            setLaunching(true);

            try {
                // 1. Kill any existing processes first
                const killCommands = Object.values(LAUNCH_PROFILES)
                    .map((p) => p.killCommand)
                    .filter((c) => !c.startsWith("#"))
                    .join("\n");

                if (killCommands) {
                    console.log("[launch] Killing existing processes...");
                    await executeShellCommand(killCommands, { background: false });
                    // Small delay to let processes die
                    await new Promise((r) => setTimeout(r, 1000));
                }

                // 2. Execute the launch command
                const fullCommand = profile.command.trim();
                console.log(`[launch] Starting profile: ${profileKey}`);
                executeShellCommand(fullCommand, { background: !!profile.background });

                // 3. Connect roslibjs to rosbridge
                const url = profile.rosbridgeUrl || process.env.NEXT_PUBLIC_ROSBRIDGE_URL;
                getRosConnection(url);

                setLaunchMode(mode);
                setLaunchProfile(profileKey);
            } catch (err) {
                console.error("[launch] Error:", err);
            } finally {
                setLaunching(false);
            }
        },
        [],
    );

    const stopLaunch = useCallback(async () => {
        setLaunching(true);

        try {
            // 1. Disconnect roslibjs
            disconnectRos();

            // 2. Kill all processes
            const killCommands = Object.values(LAUNCH_PROFILES)
                .map((p) => p.killCommand)
                .filter((c) => !c.startsWith("#"))
                .join("; ");

            if (killCommands) {
                const currentProfile = launchProfile ? LAUNCH_PROFILES[launchProfile] : null;
                console.log("[launch] Killing all processes...");
                await executeShellCommand(killCommands, { background: !!currentProfile?.background });
            }
        } catch (err) {
            console.error("[launch] Stop error:", err);
        } finally {
            setLaunchMode(null);
            setLaunchProfile(null);
            setLaunching(false);
        }
    }, [launchProfile]);

    return (
        <AppContext.Provider
            value={{
                activePage,
                setActivePage,
                activeSessionId,
                setActiveSessionId,
                sessionTitle,
                setSessionTitle,
                newSession,
                resumeSession,
                launchMode,
                launchProfile,
                launching,
                startLaunch,
                stopLaunch,
            }}
        >
            {children}
        </AppContext.Provider>
    );
}

/** Convenience hook to consume the global app context */
export function useApp(): AppState {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error("useApp must be used within <AppProvider>");
    return ctx;
}
