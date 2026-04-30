"use client";

/**
 * Page 1: Inspection Hub — the main dashboard.
 * 
 * Flow:
 * 1. When no launch is active → shows LaunchGate (choose Simulation or Real Robot)
 * 2. When inspection launch is active → shows the full dashboard
 *    (ChatPanel, VideoFeed, NavigationMap) with an ActiveSessionBar to stop
 */

import React from "react";
import { useApp } from "@/app/context/AppContext";
import ChatPanel from "@/app/components/ChatPanel";
import VideoFeed from "@/app/components/VideoFeed";
import NavigationMap from "@/app/components/NavigationMap";
import LaunchGate from "@/app/components/LaunchGate";
import ActiveSessionBar from "@/app/components/ActiveSessionBar";

export default function InspectionHub() {
    const { launchMode } = useApp();
    const isRunning = launchMode === "inspection";

    // Gate: show launch chooser if inspection is not active
    if (!isRunning) {
        return (
            <LaunchGate
                mode="inspection"
                title="Inspection Hub"
                subtitle="Choose your deployment environment to start the inspection session with live camera, navigation map, and AI assistant."
            />
        );
    }

    // Active: show the full dashboard
    return (
        <div className="h-full flex flex-col gap-3">
            {/* Session control bar */}
            <ActiveSessionBar />

            {/* Dashboard grid */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3 min-h-0">
                {/* Left column — full-height chat */}
                <div className="min-h-[400px] lg:row-span-2">
                    <ChatPanel />
                </div>

                {/* Right column — video (compact) + map (dominant) */}
                <div className="min-h-[180px]">
                    <VideoFeed />
                </div>

                <div className="min-h-[450px]">
                    <NavigationMap />
                </div>
            </div>
        </div>
    );
}
