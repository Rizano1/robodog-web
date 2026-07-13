"use client";

/**
 * Native WebRTC Player connecting directly to go2rtc API.
 * This removes the need for stream.html iframe and gives full CSS control,
 * eliminating the black background.
 */

import React, { useState, useEffect, useRef } from "react";
import { Video, Circle } from "lucide-react";

const STREAM_URL =
  process.env.NEXT_PUBLIC_VIDEO_STREAM_URL ??
  "http://127.0.0.1:1984/stream.html?src=front_facing&mode=webrtc,mse,hls,mjpeg";

function NativeWebRTCPlayer({ streamUrl }: { streamUrl: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState("Connecting WebRTC...");

  useEffect(() => {
    let pc = new RTCPeerConnection();
    let active = true;

    const start = async () => {
      try {
        // Parse go2rtc stream URL
        let url;
        try {
          url = new URL(streamUrl);
        } catch {
          url = new URL(streamUrl, window.location.href);
        }
        const baseUrl = url.origin;
        const src = url.searchParams.get("src") || "front_facing";
        const webrtcUrl = `${baseUrl}/api/webrtc?src=${encodeURIComponent(src)}`;

        pc.addTransceiver("video", { direction: "recvonly" });

        pc.ontrack = (event) => {
          if (videoRef.current && active) {
            videoRef.current.srcObject = event.streams[0];
            setStatus("LIVE");
          }
        };

        pc.oniceconnectionstatechange = () => {
          if (
            pc.iceConnectionState === "disconnected" ||
            pc.iceConnectionState === "failed"
          ) {
            setStatus("Disconnected");
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const formData = new URLSearchParams();
        formData.append("type", offer.type);
        formData.append("sdp", offer.sdp!);

        const response = await fetch(webrtcUrl, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch WebRTC SDP: ${response.status}`);
        }

        const answerSdp = await response.text();
        let sdpObj = { type: "answer", sdp: answerSdp };
        if (answerSdp.trim().startsWith("{")) {
          sdpObj = JSON.parse(answerSdp);
        }

        if (active) {
          await pc.setRemoteDescription(sdpObj as RTCSessionDescriptionInit);
        }
      } catch (err) {
        console.error("WebRTC Connection Error:", err);
        if (active) setStatus("Stream Error");
      }
    };

    start();

    return () => {
      active = false;
      pc.close();
    };
  }, [streamUrl]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-transparent">
      {status !== "LIVE" && (
        <div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-muted">
          {status}
        </div>
      )}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-contain"
        style={{ backgroundColor: "transparent" }}
      />
    </div>
  );
}

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
        }),
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
          <span className="text-xs font-semibold text-foreground">
            Live Camera Feed
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Circle
            size={8}
            fill="#ff453a"
            className="text-danger animate-pulse"
          />
          <span className="text-[10px] font-medium text-danger">REC</span>
        </div>
      </div>

      {/* Video area */}
      <div className="flex-1 relative bg-surface-active flex items-center justify-center border-t border-border overflow-hidden">
        {/* Native React WebRTC player instead of iframe */}
        <NativeWebRTCPlayer streamUrl={STREAM_URL} />

        {/* Timestamp overlay */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-md bg-glass px-2.5 py-1 backdrop-blur-sm z-10 border border-border">
          <span className="text-[11px] font-mono text-foreground/80">
            {timestamp}
          </span>
        </div>

        {/* Camera info overlay */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-md bg-glass px-2.5 py-1 backdrop-blur-sm z-10 border border-border">
          <span className="text-[10px] font-mono text-foreground/50">
            WebRTC • CAM-01
          </span>
        </div>
      </div>
    </div>
  );
}
