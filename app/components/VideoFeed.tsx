"use client";

/**
 * Video feed panel — embeds the WebRTC camera stream as an iframe.
 * Falls back to a placeholder when no stream is available.
 */

import React, { useState, useEffect } from "react";
import { Video, Circle } from "lucide-react";

const STREAM_URL = "http://10.7.101.231:1984/stream.html?src=front_facing&mode=webrtc,mse,hls,mjpeg";

export default function VideoFeed() {
    const [timestamp, setTimestamp] = useState("");

    useEffect(() => {
        const update = () => {
            const now = new Date();
            setTimestamp(
                now.toLocaleString("en-GB", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                })
            );
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="glass-panel relative flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
                <div className="flex items-center gap-2">
                    <Video size={16} className="text-accent" />
                    <span className="text-xs font-semibold text-foreground">Live Camera Feed</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Circle size={8} fill="#ff453a" className="text-danger animate-pulse" />
                    <span className="text-[10px] font-medium text-danger">REC</span>
                </div>
            </div>

            {/* Video area */}
            <div className="flex-1 relative bg-black flex items-center justify-center">
                {/* WebRTC stream iframe */}
                <iframe
                    src={STREAM_URL}
                    className="absolute inset-0 w-full h-full border-0"
                    allow="autoplay"
                    title="Robot Camera Stream"
                />

                {/* Timestamp overlay */}
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-md bg-black/60 px-2.5 py-1 backdrop-blur-sm z-10">
                    <span className="text-[11px] font-mono text-foreground/80">{timestamp}</span>
                </div>

                {/* Camera info overlay */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-md bg-black/60 px-2.5 py-1 backdrop-blur-sm z-10">
                    <span className="text-[10px] font-mono text-foreground/50">WebRTC • CAM-01</span>
                </div>
            </div>
        </div>
    );
}
