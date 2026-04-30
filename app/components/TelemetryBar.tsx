"use client";

/**
 * Top telemetry status bar showing real-time mock robot data.
 * Cycles battery and signal values on an interval for realism.
 */

import React, { useState, useEffect } from "react";
import { Wifi, Battery, Radio, Activity } from "lucide-react";

export default function TelemetryBar() {
    const [battery, setBattery] = useState(85);
    const [signal, setSignal] = useState(-45);
    const [state, setState] = useState<"Idle" | "Navigating" | "Inspecting" | "Returning">("Idle");

    /** Simulate telemetry changes every 5 seconds */
    useEffect(() => {
        const states: ("Idle" | "Navigating" | "Inspecting" | "Returning")[] = [
            "Idle", "Navigating", "Inspecting", "Returning",
        ];
        const interval = setInterval(() => {
            setBattery((prev) => Math.max(10, prev - Math.floor(Math.random() * 2)));
            setSignal(-30 - Math.floor(Math.random() * 30));
            setState(states[Math.floor(Math.random() * states.length)]);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    /** Color-coded battery level */
    const batteryColor =
        battery > 50 ? "text-success" : battery > 20 ? "text-warning" : "text-danger";

    /** State badge styling */
    const stateBadge: Record<string, string> = {
        Idle: "bg-muted/20 text-muted",
        Navigating: "bg-accent-soft text-accent",
        Inspecting: "bg-success-soft text-success",
        Returning: "bg-warning-soft text-warning",
    };

    return (
        <div className="glass-panel-light flex items-center gap-6 px-5 py-2.5 text-xs font-medium">
            {/* Connection */}
            <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 pulse-glow" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                </span>
                <span className="text-foreground/80">Online</span>
            </div>

            {/* Divider */}
            <div className="h-4 w-px bg-border" />

            {/* Battery */}
            <div className="flex items-center gap-1.5">
                <Battery size={14} className={batteryColor} />
                <span className={batteryColor}>{battery}%</span>
            </div>

            {/* Divider */}
            <div className="h-4 w-px bg-border" />

            {/* Wi-Fi Signal */}
            <div className="flex items-center gap-1.5">
                <Wifi size={14} className="text-accent" />
                <span className="text-foreground/80">{signal} dBm</span>
            </div>

            {/* Divider */}
            <div className="h-4 w-px bg-border" />

            {/* Connection quality */}
            <div className="flex items-center gap-1.5">
                <Radio size={14} className="text-muted" />
                <span className="text-foreground/80">5 GHz</span>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Current State badge */}
            <div className="flex items-center gap-1.5">
                <Activity size={14} className="text-muted" />
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${stateBadge[state]}`}>
                    {state}
                </span>
            </div>
        </div>
    );
}
