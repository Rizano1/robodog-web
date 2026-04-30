"use client";

/**
 * 2D Navigation Map — renders OccupancyGrid from ROS via roslibjs.
 *
 * Uses the same viewport-percentage coordinate system as the desktop version
 * for pixel-perfect alignment of map, scan, robot, and plan overlays.
 *
 * Supports:
 *   • Mouse-wheel zoom, click-and-drag pan
 *   • Robot position overlay from /odom
 *   • Laser scan overlay
 *   • Navigation plan path overlay
 *   • 2D Pose Estimate & Nav Goal publishing with drag arrow
 */

import React, { useMemo, useRef, useState, useCallback, useLayoutEffect, useEffect } from "react";
import {
    Compass, Navigation, WifiOff, Route, Radar,
    Plus, Minus, Maximize2, Crosshair, MapPin, Target,
} from "lucide-react";
import { useApp } from "@/app/context/AppContext";
import {
    useMapData,
    useOdometry,
    useScanData,
    usePlanData,
    useSetInitialPose,
    useSetNavGoal,
    useRosConnection,
} from "@/app/hooks/useRosData";

// ── Zoom / Pan constants ──────────────────────────────────
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 10;
const ZOOM_STEP = 1.15;

/** Convert ROS world coords → percentage position on the map image */
function worldToPercent(
    worldX: number, worldY: number,
    originX: number, originY: number,
    resolution: number, mapW: number, mapH: number,
): { px: number; py: number } {
    const px = ((worldX - originX) / resolution) / mapW * 100;
    const py = 100 - ((worldY - originY) / resolution) / mapH * 100;
    return { px, py };
}

type InteractMode = "pan" | "pose" | "goal";

export default function NavigationMap() {
    const { launchProfile } = useApp();
    const rosConnected = useRosConnection();
    const rosMode = launchProfile || "simulation";

    // ROS data hooks
    const mapData = useMapData(rosMode);
    const odom = useOdometry(rosMode);
    const scanData = useScanData(rosMode);
    const planData = usePlanData(rosMode);
    const setInitialPose = useSetInitialPose();
    const setNavGoal = useSetNavGoal();

    // ── Track container size ──
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

    useLayoutEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const observer = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;
            setContainerSize({ w: width, h: height });
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    // ── Zoom & Pan state ──
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const isPanning = useRef(false);
    const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

    // ── Interaction Modes (Pose / Goal) ──
    const [interactionMode, setInteractionMode] = useState<InteractMode>("pan");
    const [interactionState, setInteractionState] = useState<{
        startX: number; startY: number;
        currentX: number; currentY: number;
    } | null>(null);

    const robotX = odom?.x ?? 0;
    const robotY = odom?.y ?? 0;
    const heading = odom?.heading ?? 0;
    const headingRad = (heading * Math.PI) / 180;

    // ── Viewport dimensions — fit map image to container ──
    const viewport = useMemo(() => {
        if (!mapData || containerSize.w === 0 || containerSize.h === 0) {
            return { width: containerSize.w, height: containerSize.h, left: 0, top: 0 };
        }
        const mapAspect = mapData.width / mapData.height;
        const containerAspect = containerSize.w / containerSize.h;
        let vpW: number, vpH: number;
        if (containerAspect > mapAspect) {
            vpH = containerSize.h;
            vpW = vpH * mapAspect;
        } else {
            vpW = containerSize.w;
            vpH = vpW / mapAspect;
        }
        return {
            width: vpW, height: vpH,
            left: (containerSize.w - vpW) / 2,
            top: (containerSize.h - vpH) / 2,
        };
    }, [mapData, containerSize]);

    // Robot percentage position within the viewport
    const { px: robotPctX, py: robotPctY } = mapData
        ? worldToPercent(robotX, robotY, mapData.originX, mapData.originY, mapData.resolution, mapData.width, mapData.height)
        : { px: 50, py: 50 };

    const hasMap = mapData !== null;
    const isOdomConnected = odom !== null;
    const isScanConnected = scanData !== null;
    const isPlanActive = planData !== null && planData.poses.length > 0;
    const zoomPct = Math.round(zoom * 100);

    // ── Mouse Wheel Zoom (zooms toward cursor) ──
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const worldX = (mouseX - pan.x) / zoom;
        const worldY = (mouseY - pan.y) / zoom;
        const direction = e.deltaY < 0 ? 1 : -1;
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * (direction > 0 ? ZOOM_STEP : 1 / ZOOM_STEP)));
        const newPanX = mouseX - worldX * newZoom;
        const newPanY = mouseY - worldY * newZoom;
        setZoom(newZoom);
        setPan({ x: newPanX, y: newPanY });
    }, [zoom, pan]);

    // ── Mouse Down ──
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return;
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        if (interactionMode === "pan") {
            isPanning.current = true;
            panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
        } else {
            // Pose or Goal mode — record viewport-pixel coordinate
            const worldX = (mouseX - pan.x) / zoom;
            const worldY = (mouseY - pan.y) / zoom;
            setInteractionState({ startX: worldX, startY: worldY, currentX: worldX, currentY: worldY });
        }
    }, [interactionMode, pan, zoom]);

    // ── Mouse Move ──
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (interactionMode !== "pan" && interactionState) {
            const container = containerRef.current;
            if (!container) return;
            const rect = container.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const worldX = (mouseX - pan.x) / zoom;
            const worldY = (mouseY - pan.y) / zoom;
            setInteractionState(prev => prev ? { ...prev, currentX: worldX, currentY: worldY } : null);
            return;
        }

        if (!isPanning.current) return;
        const dx = e.clientX - panStart.current.x;
        const dy = e.clientY - panStart.current.y;
        setPan({ x: panStart.current.panX + dx, y: panStart.current.panY + dy });
    }, [pan, zoom, interactionMode, interactionState]);

    // ── Mouse Up — publish pose/goal ──
    const handleMouseUp = useCallback(() => {
        if (interactionMode !== "pan" && interactionState && mapData) {
            // Convert viewport pixels → true ROS map world coords
            const mapVpW = viewport.width;
            const mapVpH = viewport.height;
            const pctX = (interactionState.startX - viewport.left) / mapVpW;
            const pctY = 1.0 - (interactionState.startY - viewport.top) / mapVpH;

            const pX = pctX * (mapData.width * mapData.resolution) + mapData.originX;
            const pY = pctY * (mapData.height * mapData.resolution) + mapData.originY;

            // Calculate yaw from drag direction (invert dy: SVG Y goes down, ROS Y goes up)
            const dx = interactionState.currentX - interactionState.startX;
            const dy = -(interactionState.currentY - interactionState.startY);
            const theta = dx === 0 && dy === 0 ? 0 : Math.atan2(dy, dx);

            if (interactionMode === "pose") {
                setInitialPose(pX, pY, theta);
            } else {
                setNavGoal(pX, pY, theta);
            }

            setInteractionState(null);
            setInteractionMode("pan");
            return;
        }

        isPanning.current = false;
    }, [interactionMode, interactionState, mapData, viewport, setInitialPose, setNavGoal]);

    const handleMouseLeave = useCallback(() => {
        isPanning.current = false;
        setInteractionState(null);
    }, []);

    // ── Zoom controls ──
    const handleZoomIn = useCallback(() => {
        setZoom((z) => Math.min(MAX_ZOOM, z * ZOOM_STEP * ZOOM_STEP));
    }, []);
    const handleZoomOut = useCallback(() => {
        setZoom((z) => Math.max(MIN_ZOOM, z / (ZOOM_STEP * ZOOM_STEP)));
    }, []);
    const handleResetView = useCallback(() => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }, []);
    const handleCenterOnRobot = useCallback(() => {
        if (!mapData || containerSize.w === 0) return;
        const robotVpX = viewport.left + (robotPctX / 100) * viewport.width;
        const robotVpY = viewport.top + (robotPctY / 100) * viewport.height;
        const newPanX = containerSize.w / 2 - robotVpX * zoom;
        const newPanY = containerSize.h / 2 - robotVpY * zoom;
        setPan({ x: newPanX, y: newPanY });
    }, [mapData, containerSize, viewport, robotPctX, robotPctY, zoom]);

    // ── SVG path for navigation plan ──
    const planSvgPath = useMemo(() => {
        if (!planData || !mapData || planData.poses.length < 2) return null;
        const points = planData.poses.map((pose) => {
            const { px, py } = worldToPercent(
                pose.x, pose.y,
                mapData.originX, mapData.originY,
                mapData.resolution, mapData.width, mapData.height,
            );
            return { px, py };
        });
        return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.px} ${p.py}`).join(" ");
    }, [planData, mapData]);

    // ── Scan points in percentage coords ──
    const scanPoints = useMemo(() => {
        if (!scanData || !mapData || !odom) return [];

        const isWorld = scanData.isWorldFrame;

        return scanData.points
            .filter((_, i) => i % 3 === 0) // Downsample for performance
            .map((pt) => {
                let worldX = pt.x;
                let worldY = pt.y;

                // Rotate scan from robot-local frame into world frame
                if (!isWorld) {
                    worldX = odom.x + pt.x * Math.cos(headingRad) - pt.y * Math.sin(headingRad);
                    worldY = odom.y + pt.x * Math.sin(headingRad) + pt.y * Math.cos(headingRad);
                }

                const { px, py } = worldToPercent(
                    worldX, worldY,
                    mapData.originX, mapData.originY,
                    mapData.resolution, mapData.width, mapData.height,
                );
                return { px, py };
            })
            .filter((p) => p.px >= 0 && p.px <= 100 && p.py >= 0 && p.py <= 100);
    }, [scanData, mapData, odom, headingRad]);

    return (
        <div className="glass-panel relative flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
                <div className="flex items-center gap-2">
                    <Compass size={16} className="text-accent" />
                    <span className="text-xs font-semibold text-foreground">2D Navigation Map</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-accent-soft text-accent">
                        OccupancyGrid
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {isScanConnected && (
                        <span className="flex items-center gap-1 text-[10px] font-mono text-cyan-400">
                            <Radar size={10} /> SCAN
                        </span>
                    )}
                    {isPlanActive && (
                        <span className="flex items-center gap-1 text-[10px] font-mono text-amber-400">
                            <Route size={10} /> NAV
                        </span>
                    )}
                    {hasMap ? (
                        <span className="text-[10px] font-mono text-success">● LIVE</span>
                    ) : (
                        <span className="flex items-center gap-1 text-[10px] font-mono text-muted">
                            <WifiOff size={10} /> waiting…
                        </span>
                    )}
                </div>
            </div>

            {/* Map area */}
            <div
                ref={containerRef}
                className="flex-1 relative bg-[#0c0c0e] overflow-hidden"
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                style={{
                    cursor: interactionMode !== "pan" ? "crosshair" : (isPanning.current ? "grabbing" : "grab"),
                    touchAction: "none",
                }}
            >
                {hasMap && mapData ? (
                    /* ── OccupancyGrid: image + SVG overlays ── */
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            transformOrigin: "0 0",
                            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                            willChange: "transform",
                        }}
                    >
                        <div
                            className="absolute"
                            style={{
                                width: viewport.width,
                                height: viewport.height,
                                left: viewport.left,
                                top: viewport.top,
                            }}
                        >
                            <img
                                src={mapData.dataUri}
                                alt="Occupancy grid map"
                                className="absolute inset-0 w-full h-full"
                                draggable={false}
                                style={{ imageRendering: "pixelated", objectFit: "fill" }}
                            />

                            {/* SVG overlay for plan path + scan points (percentage coords) */}
                            {(planSvgPath || scanPoints.length > 0) && (
                                <svg
                                    className="absolute inset-0 w-full h-full pointer-events-none"
                                    viewBox="0 0 100 100"
                                    preserveAspectRatio="none"
                                    style={{ zIndex: 5 }}
                                >
                                    {planSvgPath && (
                                        <>
                                            <path d={planSvgPath} fill="none" stroke="rgba(255, 214, 10, 0.25)"
                                                strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"
                                                vectorEffect="non-scaling-stroke" />
                                            <path d={planSvgPath} fill="none" stroke="#ffd60a"
                                                strokeWidth="0.6" strokeLinecap="round" strokeLinejoin="round"
                                                strokeDasharray="2 1.5" vectorEffect="non-scaling-stroke"
                                                className="plan-path-animated" />
                                        </>
                                    )}
                                    {scanPoints.map((pt, i) => (
                                        <circle key={i} cx={pt.px} cy={pt.py} r="0.3" fill="#06b6d4" opacity="1" />
                                    ))}
                                </svg>
                            )}

                            {/* Robot position indicator */}
                            <div
                                className="absolute"
                                style={{
                                    left: `${robotPctX}%`,
                                    top: `${robotPctY}%`,
                                    zIndex: 10,
                                    pointerEvents: "none",
                                }}
                            >
                                <div style={{ transform: "translate(-50%, -50%)" }}>
                                    <span className="absolute h-6 w-6 rounded-full animate-ping"
                                        style={{ background: "#0af3" }} />
                                    <div
                                        className="relative z-10 flex h-5 w-5 items-center justify-center rounded-full shadow-lg"
                                        style={{
                                            background: "#0af",
                                            boxShadow: "0 0 12px rgba(0,170,255,0.3)",
                                            transform: `rotate(${-heading}deg)`,
                                        }}
                                    >
                                        <Navigation size={10} className="text-black" fill="currentColor" />
                                    </div>
                                </div>
                            </div>

                            {/* Interaction Drag Arrow */}
                            {interactionState && (
                                <svg
                                    className="absolute inset-0 w-full h-full pointer-events-none"
                                    style={{ zIndex: 20 }}
                                >
                                    <line
                                        x1={interactionState.startX - viewport.left}
                                        y1={interactionState.startY - viewport.top}
                                        x2={interactionState.currentX - viewport.left}
                                        y2={interactionState.currentY - viewport.top}
                                        stroke={interactionMode === "pose" ? "#22c55e" : "#eab308"}
                                        strokeWidth="2"
                                        vectorEffect="non-scaling-stroke"
                                        markerEnd="url(#arrowhead)"
                                    />
                                    <defs>
                                        <marker
                                            id="arrowhead"
                                            markerWidth="6" markerHeight="4"
                                            refX="6" refY="2" orient="auto"
                                            fill={interactionMode === "pose" ? "#22c55e" : "#eab308"}
                                        >
                                            <polygon points="0 0, 6 2, 0 4" />
                                        </marker>
                                    </defs>
                                </svg>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Fallback: grid pattern */
                    <div className="absolute inset-0 grid-pattern">
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] font-mono text-muted/30">N (+Y)</div>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-mono text-muted/30">S (-Y)</div>
                        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-mono text-muted/30">W (-X)</div>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-mono text-muted/30">E (+X)</div>
                        <div className="absolute top-1/2 left-0 right-0 h-px bg-white/[0.04]" />
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/[0.04]" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-2 opacity-30">
                                <Compass size={32} strokeWidth={1} />
                                <p className="text-[10px] text-muted">Waiting for map topic...</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Zoom & Interaction controls */}
                <div className="absolute top-3 right-3 z-30 flex flex-col gap-1">
                    {mapData && (
                        <>
                            <button
                                onClick={() => setInteractionMode(prev => prev === "pose" ? "pan" : "pose")}
                                className={`map-ctrl-btn ${interactionMode === "pose" ? "bg-green-500/20 text-green-400 border-green-500/50" : ""}`}
                                title="2D Pose Estimate"
                            >
                                <MapPin size={13} />
                            </button>
                            <button
                                onClick={() => setInteractionMode(prev => prev === "goal" ? "pan" : "goal")}
                                className={`map-ctrl-btn ${interactionMode === "goal" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/50" : ""}`}
                                title="2D Nav Goal"
                            >
                                <Target size={13} />
                            </button>
                            <div className="h-2" />
                        </>
                    )}

                    <button onClick={handleZoomIn} className="map-ctrl-btn" title="Zoom in">
                        <Plus size={14} />
                    </button>
                    <div className="text-[9px] font-mono text-foreground/50 text-center py-0.5 select-none">
                        {zoomPct}%
                    </div>
                    <button onClick={handleZoomOut} className="map-ctrl-btn" title="Zoom out">
                        <Minus size={14} />
                    </button>
                    <div className="h-1" />
                    <button onClick={handleResetView} className="map-ctrl-btn" title="Reset view">
                        <Maximize2 size={13} />
                    </button>
                    <button onClick={handleCenterOnRobot} className="map-ctrl-btn" title="Center on robot">
                        <Crosshair size={13} />
                    </button>
                </div>

                {/* Status bar (coordinates) */}
                <div className="absolute bottom-3 left-3 z-20 flex items-center gap-3 rounded-lg bg-black/60 px-3 py-1.5">
                    <span className={`text-[10px] font-mono ${isOdomConnected ? "text-foreground/80" : "text-muted/40"}`}>
                        X: {robotX.toFixed(2)}
                    </span>
                    <span className={`text-[10px] font-mono ${isOdomConnected ? "text-foreground/80" : "text-muted/40"}`}>
                        Y: {robotY.toFixed(2)}
                    </span>
                    <span className={`text-[10px] font-mono ${isOdomConnected ? "text-foreground/80" : "text-muted/40"}`}>
                        HDG: {heading.toFixed(0)}°
                    </span>
                    {!isOdomConnected && (
                        <span className="text-[8px] font-mono text-warning/50">MOCK</span>
                    )}
                </div>

                {/* Scale indicator */}
                <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2 rounded-lg bg-black/60 px-3 py-1.5">
                    <div className="h-px w-8 bg-foreground/30" />
                    <span className="text-[9px] font-mono text-foreground/40">
                        {hasMap && mapData ? `${(mapData.resolution * 20 / zoom).toFixed(1)}m` : "–"}
                    </span>
                </div>
            </div>
        </div>
    );
}
