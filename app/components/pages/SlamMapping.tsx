"use client";

/**
 * SLAM Page — Full-screen SLAM map with save-map functionality.
 *
 * Flow:
 * 1. When no launch is active → shows LaunchGate (choose Simulation or Real Robot)
 *    - If Inspection is running, LaunchGate shows a blocker message.
 * 2. When SLAM launch is active → shows full SLAM view with save-map dialog
 *    and ActiveSessionBar to stop the session.
 *
 * Web version: save-map uploads directly to Supabase from browser
 * (no Electron shell access).
 */

import React, { useState } from "react";
import NavigationMap from "@/app/components/NavigationMap";
import LaunchGate from "@/app/components/LaunchGate";
import ActiveSessionBar from "@/app/components/ActiveSessionBar";
import { Save, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useApp } from "@/app/context/AppContext";

type SaveState = "idle" | "saving" | "done" | "error";

export default function SlamMapping() {
    const { launchMode } = useApp();
    const isRunning = launchMode === "slam";

    const [saveState, setSaveState] = useState<SaveState>("idle");
    const [mapName, setMapName] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [showSaveDialog, setShowSaveDialog] = useState(false);

    const handleSaveMap = async () => {
        // In the web version, we can't run ros2 map_saver directly.
        // This is a placeholder for future map saving via rosbridge service call.
        setSaveState("saving");
        try {
            // TODO: Implement map saving via rosbridge service call
            // For now, just show a message
            setErrorMsg("Map saving via browser is not yet implemented. Use the desktop app or run map_saver manually.");
            setSaveState("error");
        } catch (err: any) {
            console.error("Save map error:", err);
            setErrorMsg(err?.message || "Save failed");
            setSaveState("error");
        }
    };

    // Gate: show launch chooser if SLAM is not active
    if (!isRunning) {
        return (
            <LaunchGate
                mode="slam"
                title="SLAM Mapping"
                subtitle="Start a SLAM session to build a real-time map of the environment. Choose your deployment environment to begin."
            />
        );
    }

    // Active: show full SLAM view
    return (
        <div className="h-full flex flex-col gap-3">
            {/* Session control bar */}
            <ActiveSessionBar />

            {/* Header with save button */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-foreground">SLAM Mapping</h2>
                    <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[11px] font-medium text-purple-400">
                        Live
                    </span>
                </div>

                <button
                    onClick={() => {
                        setShowSaveDialog(true);
                        setSaveState("idle");
                        setErrorMsg("");
                    }}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-accent text-white hover:bg-accent-hover transition-colors"
                >
                    <Save size={14} />
                    Save Map
                </button>
            </div>

            {/* Save map dialog — overlays on top */}
            {showSaveDialog && (
                <div className="glass-panel-light px-4 py-3 flex items-center gap-3 relative z-10">
                    {saveState === "done" ? (
                        <div className="flex items-center gap-2 text-success text-sm">
                            <CheckCircle size={16} />
                            Map saved successfully!
                        </div>
                    ) : saveState === "error" ? (
                        <div className="flex-1 flex items-center gap-2">
                            <AlertCircle size={16} className="text-danger shrink-0" />
                            <span className="text-danger text-xs">{errorMsg}</span>
                            <button
                                onClick={() => setSaveState("idle")}
                                className="ml-auto text-xs text-muted hover:text-foreground"
                            >
                                Retry
                            </button>
                        </div>
                    ) : (
                        <>
                            <input
                                type="text"
                                value={mapName}
                                onChange={(e) => setMapName(e.target.value)}
                                placeholder="Map name (e.g. office_floor1)"
                                className="flex-1 bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted/50 outline-none focus:border-accent/50"
                                disabled={saveState !== "idle"}
                            />
                            <button
                                onClick={handleSaveMap}
                                disabled={saveState !== "idle"}
                                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-accent text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
                            >
                                {saveState === "saving" && <Loader2 size={12} className="animate-spin" />}
                                {saveState === "idle" && <Save size={12} />}
                                {saveState === "saving" ? "Saving..." : "Save"}
                            </button>
                            <button
                                onClick={() => setShowSaveDialog(false)}
                                className="text-muted hover:text-foreground text-xs"
                            >
                                Cancel
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Full SLAM map */}
            <div className="flex-1 min-h-0">
                <NavigationMap />
            </div>
        </div>
    );
}
