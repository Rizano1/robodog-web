/**
 * React hooks for consuming ROS 1 data via roslibjs WebSocket (rosbridge).
 * Data flows: ROS 1 → rosbridge_server → WebSocket → these hooks → React components.
 *
 * Replaces the Electron IPC-based hooks from robodog-desktop.
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Ros, Topic } from "roslib";

// ─── Types ────────────────────────────────────────────

export interface MapData {
  dataUri: string;
  width: number;
  height: number;
  resolution: number;
  originX: number;
  originY: number;
}

export interface OdomData {
  x: number;
  y: number;
  z: number;
  heading: number;
}

export interface ScanData {
  points: { x: number; y: number }[];
  rangeMax: number;
  isWorldFrame?: boolean;
}

export interface PlanData {
  poses: { x: number; y: number }[];
}

export interface ModeInfo {
  mode: string;
  mapType: "OccupancyGrid" | "PointCloud2";
}

// ─── Topic configurations per mode ────────────────────
interface TopicConfig {
  mapTopic: string;
  scanTopic: string;
  planTopic: string;
  odomTopic: string;
  scanRotate?: number;
  scanInvertX?: boolean;
  scanInvertY?: boolean;
  scanOffsetX?: number;
  scanOffsetY?: number;
}

const TOPIC_CONFIGS: Record<string, TopicConfig> = {
  simulation: {
    mapTopic: "/map",
    scanTopic: "/scan",
    planTopic: "/plan",
    odomTopic: "/odom",
  },
  realRobot: {
    mapTopic: "/map",
    scanTopic: "/scan",
    scanRotate: 90,
    scanInvertY: false,
    scanOffsetX: 0.15,
    planTopic: "/move_base/GlobalPlanner/plan",
    odomTopic: "/odom",
  },
  slam: {
    mapTopic: "/map",
    scanTopic: "/scan",
    planTopic: "/plan",
    odomTopic: "/odom",
  },
};

// ─── Quaternion helpers ───────────────────────────────
function quaternionToYaw(q: { x: number; y: number; z: number; w: number }): number {
  const siny_cosp = 2 * (q.w * q.z + q.x * q.y);
  const cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z);
  return Math.atan2(siny_cosp, cosy_cosp);
}

function yawToQuaternion(yawRad: number): { x: number; y: number; z: number; w: number } {
  return {
    x: 0,
    y: 0,
    z: Math.sin(yawRad / 2),
    w: Math.cos(yawRad / 2),
  };
}

// ─── Throttle helper ──────────────────────────────────
function throttle<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let last = 0;
  return ((...args: any[]) => {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn(...args);
    }
  }) as T;
}

// ─── Global ROS connection singleton ──────────────────
let rosInstance: any = null;
let rosConnected = false;
let rosCurrentUrl: string | null = null;
const rosListeners = new Set<(connected: boolean) => void>();

function notifyRosListeners(connected: boolean) {
  rosConnected = connected;
  rosListeners.forEach((fn) => fn(connected));
}

export function getRosConnection(url?: string): any {
  const rosbridgeUrl = url || process.env.NEXT_PUBLIC_ROSBRIDGE_URL || "ws://localhost:9090";

  // If already connected to the same URL, reuse
  if (rosInstance && rosCurrentUrl === rosbridgeUrl) return rosInstance;

  // If connected to a different URL, disconnect first
  if (rosInstance) {
    console.log(`[roslibjs] Disconnecting from ${rosCurrentUrl} to reconnect to ${rosbridgeUrl}`);
    try { rosInstance.close(); } catch { }
    rosInstance = null;
    rosCurrentUrl = null;
  }

  const ros = new Ros({ url: rosbridgeUrl });
  rosCurrentUrl = rosbridgeUrl;

  ros.on("connection", () => {
    console.log("[roslibjs] Connected to", rosbridgeUrl);
    notifyRosListeners(true);
  });

  ros.on("error", (error: any) => {
    console.error("[roslibjs] Error:", error);
    notifyRosListeners(false);
  });

  ros.on("close", () => {
    console.log("[roslibjs] Connection closed");
    notifyRosListeners(false);
  });

  rosInstance = ros;
  return ros;
}

export function disconnectRos() {
  if (rosInstance) {
    try {
      rosInstance.close();
    } catch { }
    rosInstance = null;
    rosCurrentUrl = null;
    notifyRosListeners(false);
  }
}

// ─── Hooks ────────────────────────────────────────────

/** Track ROS connection status */
export function useRosConnection(): boolean {
  const [connected, setConnected] = useState(rosConnected);

  useEffect(() => {
    const listener = (c: boolean) => setConnected(c);
    rosListeners.add(listener);
    return () => { rosListeners.delete(listener); };
  }, []);

  return connected;
}

/** Get topic config for a mode */
export function getTopicConfig(mode: string): TopicConfig {
  return TOPIC_CONFIGS[mode] || TOPIC_CONFIGS.simulation;
}

// ─── OccupancyGrid → Canvas Data URI ─────────────────
function occupancyGridToDataUri(msg: any): MapData | null {
  try {
    const { info, data } = msg;
    const width = info.width;
    const height = info.height;
    const resolution = info.resolution;
    const originX = info.origin.position.x;
    const originY = info.origin.position.y;

    // Create an offscreen canvas
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const imgData = ctx.createImageData(width, height);
    const pixels = imgData.data;

    // IMPORTANT: ROS OccupancyGrid row 0 = bottom of the map (south).
    // Canvas/PNG row 0 = top of the image.
    // We must flip Y so the image matches ROS orientation:
    //   Canvas row 0 (top of image) ← Grid row (height-1) (top of map / north)
    //   Canvas row (height-1)       ← Grid row 0           (bottom of map / south)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Read from the grid bottom-up so image top = map north
        const gridIdx = (height - 1 - y) * width + x;
        const val = data[gridIdx];
        const pixelIdx = (y * width + x) * 4;

        if (val === -1) {
          // Unknown
          pixels[pixelIdx] = 45;
          pixels[pixelIdx + 1] = 40;
          pixels[pixelIdx + 2] = 40;
          pixels[pixelIdx + 3] = 255;
        } else if (val === 0) {
          // Free space
          pixels[pixelIdx] = 20;
          pixels[pixelIdx + 1] = 25;
          pixels[pixelIdx + 2] = 30;
          pixels[pixelIdx + 3] = 255;
        } else {
          // Occupied
          const color = Math.min(255, Math.floor(50 + (val / 100) * 205));
          pixels[pixelIdx] = color;
          pixels[pixelIdx + 1] = color;
          pixels[pixelIdx + 2] = color;
          pixels[pixelIdx + 3] = 255;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    const dataUri = canvas.toDataURL("image/png");

    return { dataUri, width, height, resolution, originX, originY };
  } catch (err) {
    console.error("[roslibjs] Error converting OccupancyGrid:", err);
    return null;
  }
}

/** Subscribe to occupancy grid map. */
export function useMapData(mode: string = "simulation"): MapData | null {
  const [mapData, setMapData] = useState<MapData | null>(null);
  const config = getTopicConfig(mode);

  useEffect(() => {
    const ros = getRosConnection();

    const mapTopic = new Topic({
      ros,
      name: config.mapTopic,
      messageType: "nav_msgs/OccupancyGrid",
      throttle_rate: 1000,
    });

    const handler = throttle((msg: any) => {
      const result = occupancyGridToDataUri(msg);
      if (result) setMapData(result);
    }, 1000);

    mapTopic.subscribe(handler);
    console.log(`[roslibjs] Subscribed to ${config.mapTopic} (OccupancyGrid)`);

    return () => {
      mapTopic.unsubscribe(handler);
    };
  }, [config.mapTopic]);

  return mapData;
}

/** Subscribe to odometry from /odom. */
export function useOdometry(mode: string = "simulation"): OdomData | null {
  const [odom, setOdom] = useState<OdomData | null>(null);
  const config = getTopicConfig(mode);

  useEffect(() => {
    const ros = getRosConnection();

    const odomTopic = new Topic({
      ros,
      name: config.odomTopic,
      messageType: "nav_msgs/Odometry",
      throttle_rate: 200,
    });

    const handler = (msg: any) => {
      try {
        const pos = msg.pose.pose.position;
        const orient = msg.pose.pose.orientation;
        const yawRad = quaternionToYaw(orient);
        const yawDeg = (yawRad * 180) / Math.PI;
        setOdom({ x: pos.x, y: pos.y, z: pos.z, heading: yawDeg });
      } catch { }
    };

    odomTopic.subscribe(handler);
    console.log(`[roslibjs] Subscribed to ${config.odomTopic}`);

    return () => {
      odomTopic.unsubscribe(handler);
    };
  }, [config.odomTopic]);

  return odom;
}

/** Subscribe to laser scan. */
export function useScanData(mode: string = "simulation"): ScanData | null {
  const [scan, setScan] = useState<ScanData | null>(null);
  const config = getTopicConfig(mode);

  useEffect(() => {
    const ros = getRosConnection();

    const scanTopic = new Topic({
      ros,
      name: config.scanTopic,
      messageType: "sensor_msgs/LaserScan",
      throttle_rate: 100,
    });

    const handler = (msg: any) => {
      try {
        const { angle_min, angle_increment, range_min, range_max, ranges } = msg;
        const points: { x: number; y: number }[] = [];
        for (let i = 0; i < ranges.length; i++) {
          const r = ranges[i];
          if (r < range_min || r > range_max || !isFinite(r)) continue;
          let angle = angle_min + i * angle_increment;

          if (config.scanRotate) {
            angle += config.scanRotate * (Math.PI / 180.0);
          }

          let rx = r * Math.cos(angle);
          let ry = r * Math.sin(angle);

          if (config.scanInvertX) rx = -rx;
          if (config.scanInvertY) ry = -ry;
          if (config.scanOffsetX) rx += config.scanOffsetX;
          if (config.scanOffsetY) ry += config.scanOffsetY;

          points.push({ x: rx, y: ry });
        }
        setScan({ points, rangeMax: range_max, isWorldFrame: false });
      } catch { }
    };

    scanTopic.subscribe(handler);
    console.log(`[roslibjs] Subscribed to ${config.scanTopic}`);

    return () => {
      scanTopic.unsubscribe(handler);
    };
  }, [config.scanTopic, config.scanRotate, config.scanInvertX, config.scanInvertY, config.scanOffsetX, config.scanOffsetY]);

  return scan;
}

/** Subscribe to navigation plan. */
export function usePlanData(mode: string = "simulation"): PlanData | null {
  const [plan, setPlan] = useState<PlanData | null>(null);
  const config = getTopicConfig(mode);

  useEffect(() => {
    const ros = getRosConnection();

    const planTopic = new Topic({
      ros,
      name: config.planTopic,
      messageType: "nav_msgs/Path",
      throttle_rate: 500,
    });

    const handler = (msg: any) => {
      try {
        const poses = msg.poses.map((p: any) => ({
          x: p.pose.position.x,
          y: p.pose.position.y,
        }));
        setPlan({ poses });
      } catch { }
    };

    planTopic.subscribe(handler);
    console.log(`[roslibjs] Subscribed to ${config.planTopic}`);

    return () => {
      planTopic.unsubscribe(handler);
    };
  }, [config.planTopic]);

  return plan;
}

/** Publish initial pose estimate.
 *  Topic is created lazily at publish time to ensure it uses the
 *  current connected Ros instance (not a stale mount-time one). */
export function useSetInitialPose() {
  return useCallback((x: number, y: number, theta: number) => {
    if (!rosInstance) {
      console.warn("[roslibjs] Cannot publish /initialpose — not connected");
      return;
    }
    const topic = new Topic({
      ros: rosInstance,
      name: "/initialpose",
      messageType: "geometry_msgs/PoseWithCovarianceStamped",
    });
    const q = yawToQuaternion(theta);
    const msg = {
      header: { frame_id: "map" },
      pose: {
        pose: {
          position: { x, y, z: 0 },
          orientation: q,
        },
        covariance: [
          0.25, 0.0, 0.0, 0.0, 0.0, 0.0,
          0.0, 0.25, 0.0, 0.0, 0.0, 0.0,
          0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
          0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
          0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
          0.0, 0.0, 0.0, 0.0, 0.0, 0.06853892326654787,
        ],
      },
    };
    topic.publish(msg);
    console.log(`[roslibjs] Published /initialpose (x=${x.toFixed(2)}, y=${y.toFixed(2)}, theta=${theta.toFixed(2)})`);
  }, []);
}

/** Publish navigation goal.
 *  Topic is created lazily at publish time to ensure it uses the
 *  current connected Ros instance (not a stale mount-time one). */
export function useSetNavGoal() {
  return useCallback((x: number, y: number, theta: number) => {
    if (!rosInstance) {
      console.warn("[roslibjs] Cannot publish /move_base_simple/goal — not connected");
      return;
    }
    const topic = new Topic({
      ros: rosInstance,
      name: "/move_base_simple/goal",
      messageType: "geometry_msgs/PoseStamped",
    });
    const q = yawToQuaternion(theta);
    const msg = {
      header: { frame_id: "map" },
      pose: {
        position: { x, y, z: 0 },
        orientation: q,
      },
    };
    topic.publish(msg);
    console.log(`[roslibjs] Published /move_base_simple/goal (x=${x.toFixed(2)}, y=${y.toFixed(2)})`);
  }, []);
}
