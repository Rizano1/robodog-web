"use client";

/**
 * ActiveSessionBar — Shows which launch profile is running
 * with a prominent Stop button to disconnect roslibjs.
 */

import React from "react";
import { Square, Zap } from "lucide-react";
import { useApp } from "@/app/context/AppContext";
import { LAUNCH_PROFILES } from "@/app/config/launchProfiles";

export default function ActiveSessionBar() {
    const { launchMode, launchProfile, stopLaunch } = useApp();

    if (!launchMode || !launchProfile) return null;

    const profile = LAUNCH_PROFILES[launchProfile];
    const modeLabel = launchMode === "inspection" ? "Inspection" : "SLAM Mapping";

    return (
        <div className="glass-panel-light flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-2.5">
                <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 pulse-glow" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                </span>
                <div className="flex items-center gap-2">
                    <Zap size={14} className="text-warning" />
                    <span className="text-xs font-medium text-foreground">
                        {modeLabel}
                    </span>
                    <span className="text-[11px] text-muted">•</span>
                    <span className="text-[11px] text-muted">
                        {profile?.label || launchProfile}
                    </span>
                </div>
            </div>

            <button
                onClick={stopLaunch}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-danger/20 text-danger hover:bg-danger/30 active:bg-danger/40 transition-colors"
            >
                <Square size={12} />
                Stop Session
            </button>
        </div>
    );
}
