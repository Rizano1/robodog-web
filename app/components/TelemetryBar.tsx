"use client";

/**
 * Top telemetry status bar showing real-time mock robot data.
 * Cycles battery and signal values on an interval for realism.
 */

import React, { useState, useEffect } from "react";
import { Wifi, Battery, Radio, Activity } from "lucide-react";
import { useRobotBasicState, useBatteryLevel } from "@/app/hooks/useRosData";

export default function TelemetryBar() {
    const rawBattery = useBatteryLevel();
    const rawState = useRobotBasicState();

    const [signal, setSignal] = useState(-45);

    /** Simulate wifi signal since it's not provided by ROS yet */
    useEffect(() => {
        const interval = setInterval(() => {
            setSignal(-30 - Math.floor(Math.random() * 30));
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    // Fallback to 85 if no battery data
    const battery = rawBattery !== null ? rawBattery : 85;

    // Convert raw basic state to string label
    let stateLabel = "Idle";
    if (rawState !== null) {
        if (rawState === 1) stateLabel = "Sitting";
        else if (rawState === 4) stateLabel = "Prepare";
        else if (rawState === 5) stateLabel = "Sit-to-Stand";
        else if (rawState === 6) stateLabel = "Standing";
        else if (rawState === 7) stateLabel = "Stand-to-Sit";
        else if (rawState === 8) stateLabel = "Protected";
        else if (rawState === 9) stateLabel = "Posture Adj";
        else if (rawState === 11) stateLabel = "Flipping";
        else if (rawState === 17) stateLabel = "Resetting";
        else if (rawState === 20) stateLabel = "Hello";
        else stateLabel = `State ${rawState}`;
    }

    /** Color-coded battery level */
    const batteryColor =
        battery > 50 ? "text-success" : battery > 20 ? "text-warning" : "text-danger";

    /** State badge styling based on general category */
    let badgeClass = "bg-muted/20 text-muted";
    if (stateLabel === "Sitting" || stateLabel === "Idle") {
        badgeClass = "bg-muted/20 text-muted";
    } else if (stateLabel === "Standing") {
        badgeClass = "bg-success-soft text-success";
    } else if (stateLabel === "Protected") {
        badgeClass = "bg-danger-soft text-danger";
    } else {
        badgeClass = "bg-warning-soft text-warning";
    }

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
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badgeClass}`}>
                    {stateLabel}
                </span>
            </div>
        </div>
    );
}
