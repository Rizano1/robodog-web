"use client";

/**
 * LaunchGate — A full-page "choose your launch" gate.
 * Shows Simulation vs Real Robot cards. Blocks launch if
 * another mode (inspection/slam) is already running.
 *
 * Web version: executes shell commands via the /api/shell API route
 * and connects roslibjs to rosbridge.
 */

import React from "react";
import {
    Play,
    Monitor,
    Cpu,
    AlertTriangle,
    Scan,
    Camera,
    Loader2,
} from "lucide-react";
import { useApp } from "@/app/context/AppContext";
import { LAUNCH_PROFILES } from "@/app/config/launchProfiles";

interface LaunchGateProps {
    /** Which mode this gate is for */
    mode: "inspection" | "slam";
    /** Title shown at the top */
    title: string;
    /** Subtitle / description */
    subtitle: string;
}

/** Map mode→profile key for simulation */
const MODE_PROFILE_MAP: Record<string, { sim: string; real: string }> = {
    inspection: { sim: "simulation", real: "realRobot" },
    slam: { sim: "slam", real: "realRobot" },
};

export default function LaunchGate({ mode, title, subtitle }: LaunchGateProps) {
    const { launchMode, launching, startLaunch } = useApp();

    // If another mode is currently running, show a blocker
    const isBlocked = launchMode !== null && launchMode !== mode;
    const blockedByLabel = launchMode === "inspection" ? "Inspection Hub" : "SLAM Mapping";

    const profileMap = MODE_PROFILE_MAP[mode];
    const simProfile = LAUNCH_PROFILES[profileMap.sim];
    const realProfile = LAUNCH_PROFILES[profileMap.real];

    // Loading state while launching
    if (launching) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md px-6">
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-accent-soft border border-accent/20">
                        <Loader2 size={36} className="text-accent animate-spin" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">
                        Launching...
                    </h2>
                    <p className="text-sm text-muted leading-relaxed">
                        Executing launch commands and connecting to rosbridge.
                        This may take a few seconds.
                    </p>
                </div>
            </div>
        );
    }

    if (isBlocked) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md px-6">
                    {/* Warning icon */}
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-warning-soft border border-warning/20">
                        <AlertTriangle size={36} className="text-warning" />
                    </div>

                    <h2 className="text-xl font-semibold text-foreground mb-2">
                        Another Session is Running
                    </h2>
                    <p className="text-sm text-muted mb-6 leading-relaxed">
                        <span className="text-warning font-medium">{blockedByLabel}</span> is currently active.
                        You must stop it before starting a new {mode === "inspection" ? "inspection" : "SLAM mapping"} session.
                    </p>
                    <p className="text-xs text-muted/60">
                        Go to the {blockedByLabel} tab and click &quot;Stop Session&quot; first.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-2xl px-6">
                {/* Icon */}
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-accent-soft border border-accent/20">
                    {mode === "inspection" ? (
                        <Camera size={36} className="text-accent" />
                    ) : (
                        <Scan size={36} className="text-accent" />
                    )}
                </div>

                <h2 className="text-2xl font-bold text-foreground mb-2">{title}</h2>
                <p className="text-sm text-muted mb-10 leading-relaxed max-w-md mx-auto">
                    {subtitle}
                </p>

                {/* Launch cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
                    {/* Simulation */}
                    <button
                        onClick={() => startLaunch(mode, profileMap.sim)}
                        className="group relative flex flex-col items-center gap-4 p-6 rounded-2xl border border-border bg-surface hover:bg-surface-hover hover:border-accent/30 transition-all duration-300"
                    >
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent/15 text-accent group-hover:bg-accent/25 transition-colors">
                            <Monitor size={28} />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-foreground mb-1">
                                {simProfile?.label || "Simulation"}
                            </h3>
                            <p className="text-xs text-muted leading-relaxed">
                                {simProfile?.description || "Launch Gazebo simulation"}
                            </p>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play size={12} />
                            Launch
                        </div>
                    </button>

                    {/* Real Robot */}
                    <button
                        onClick={() => startLaunch(mode, profileMap.real)}
                        className="group relative flex flex-col items-center gap-4 p-6 rounded-2xl border border-border bg-surface hover:bg-surface-hover hover:border-success/30 transition-all duration-300"
                    >
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-success/15 text-success group-hover:bg-success/25 transition-colors">
                            <Cpu size={28} />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-foreground mb-1">
                                {realProfile?.label || "Real Robot"}
                            </h3>
                            <p className="text-xs text-muted leading-relaxed">
                                {realProfile?.description || "Connect to physical robot"}
                            </p>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-success opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play size={12} />
                            Launch
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}
