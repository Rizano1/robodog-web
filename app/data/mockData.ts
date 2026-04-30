/**
 * Mock data for the AI Robot Dog Inspection Dashboard.
 * All data is purely front-end; no backend connection.
 */

export interface ChatMessage {
    id: string;
    role: "user" | "ai";
    content: string;
    timestamp: string;
}

export interface Session {
    id: string;
    title: string;
    date: string;
    status: "completed" | "in-progress" | "error";
    messages: ChatMessage[];
}

export interface Waypoint {
    id: string;
    slug: string;
    display_name: string;
    group_tag: string;
    keywords: string;
    obj_x: number;
    obj_y: number;
    view_x: number;
    view_y: number;
    view_yaw: number;
    camera_pan: number;
    camera_tilt: number;
    camera_zoom: number;
}

export interface SOPDocument {
    id: string;
    name: string;
    size: string;
    uploadDate: string;
    type: string;
}

/* ── Seed Sessions ───────────────────────────────────── */
export const seedSessions: Session[] = [
    {
        id: "sess-001",
        title: "APAR Zone-A Routine Check",
        date: "2026-02-24 09:15",
        status: "completed",
        messages: [
            { id: "m1", role: "user", content: "Navigate to Zone A fire extinguisher area.", timestamp: "09:15:02" },
            { id: "m2", role: "ai", content: "Navigating to Zone A — APAR station. ETA 45 seconds.", timestamp: "09:15:04" },
            { id: "m3", role: "user", content: "Start visual inspection of pressure gauges.", timestamp: "09:16:01" },
            { id: "m4", role: "ai", content: "Inspection started. Capturing images of 3 extinguisher units. Pressure gauge readings: Unit 1 — 14 bar (OK), Unit 2 — 13.5 bar (OK), Unit 3 — 8 bar (LOW). Flagging Unit 3 for maintenance.", timestamp: "09:16:15" },
            { id: "m5", role: "user", content: "Good catch. Generate a summary report.", timestamp: "09:17:00" },
            { id: "m6", role: "ai", content: "Report generated: 2/3 units passed. Unit 3 requires immediate pressure recharge. Report saved as APAR_ZoneA_20260224.pdf.", timestamp: "09:17:05" },
        ],
    },
    {
        id: "sess-002",
        title: "Perimeter Fence Integrity Scan",
        date: "2026-02-23 14:30",
        status: "completed",
        messages: [
            { id: "m7", role: "user", content: "Begin perimeter fence scan on the north boundary.", timestamp: "14:30:10" },
            { id: "m8", role: "ai", content: "Starting scan. Following waypoint path FENCE-N-01 through FENCE-N-12.", timestamp: "14:30:12" },
            { id: "m9", role: "user", content: "Report any damage or anomalies.", timestamp: "14:31:00" },
            { id: "m10", role: "ai", content: "Scan complete. Found 1 anomaly at waypoint FENCE-N-07: section has visible corrosion (approx 30cm). Recommend repair within 7 days.", timestamp: "14:45:00" },
        ],
    },
    {
        id: "sess-003",
        title: "Electrical Panel Room B2",
        date: "2026-02-22 11:00",
        status: "error",
        messages: [
            { id: "m11", role: "user", content: "Inspect electrical panels in Room B2.", timestamp: "11:00:05" },
            { id: "m12", role: "ai", content: "Navigating to Room B2. Obstacle detected — door is closed. Unable to proceed.", timestamp: "11:00:30" },
            { id: "m13", role: "user", content: "Try the alternate corridor via stairwell C.", timestamp: "11:01:00" },
            { id: "m14", role: "ai", content: "Error: Wi-Fi signal lost in stairwell C area. Connection interrupted. Session ended.", timestamp: "11:01:20" },
        ],
    },
    {
        id: "sess-004",
        title: "Warehouse Thermal Imaging",
        date: "2026-02-21 16:00",
        status: "in-progress",
        messages: [
            { id: "m15", role: "user", content: "Switch to thermal camera and scan warehouse aisle 4.", timestamp: "16:00:00" },
            { id: "m16", role: "ai", content: "Thermal camera activated. Scanning aisle 4 — detecting heat signatures.", timestamp: "16:00:05" },
        ],
    },
];

/* ── Seed Waypoints ──────────────────────────────────── */
export const seedWaypoints: Waypoint[] = [
    { id: "wp-001", slug: "apar-zone-a", display_name: "APAR Zone A", group_tag: "fire-safety", keywords: "fire,extinguisher,apar", obj_x: 12.45, obj_y: -3.21, view_x: 12.00, view_y: -3.00, view_yaw: 90, camera_pan: 0, camera_tilt: -15, camera_zoom: 2.0 },
    { id: "wp-002", slug: "fence-north-07", display_name: "Fence North #7", group_tag: "perimeter", keywords: "fence,north,boundary", obj_x: 45.30, obj_y: 22.10, view_x: 44.80, view_y: 22.00, view_yaw: 0, camera_pan: 5, camera_tilt: -10, camera_zoom: 1.5 },
    { id: "wp-003", slug: "panel-room-b2", display_name: "Panel Room B2", group_tag: "electrical", keywords: "panel,electrical,room-b2", obj_x: -5.60, obj_y: 8.90, view_x: -5.00, view_y: 9.00, view_yaw: 180, camera_pan: -10, camera_tilt: -20, camera_zoom: 3.0 },
    { id: "wp-004", slug: "warehouse-aisle-4", display_name: "Warehouse Aisle 4", group_tag: "warehouse", keywords: "warehouse,aisle,thermal", obj_x: 30.00, obj_y: -15.50, view_x: 29.50, view_y: -15.00, view_yaw: 270, camera_pan: 0, camera_tilt: 0, camera_zoom: 1.0 },
    { id: "wp-005", slug: "loading-dock", display_name: "Loading Dock", group_tag: "logistics", keywords: "dock,loading,truck", obj_x: 55.20, obj_y: 0.40, view_x: 55.00, view_y: 0.00, view_yaw: 45, camera_pan: 15, camera_tilt: -5, camera_zoom: 1.8 },
];

/* ── Seed SOP Documents ──────────────────────────────── */
export const seedDocuments: SOPDocument[] = [
    { id: "doc-001", name: "SOP_APAR_Inspeksi.pdf", size: "2.4 MB", uploadDate: "2026-02-20", type: "pdf" },
    { id: "doc-002", name: "SOP_Perimeter_Security.pdf", size: "1.8 MB", uploadDate: "2026-02-18", type: "pdf" },
    { id: "doc-003", name: "Electrical_Panel_Checklist.xlsx", size: "540 KB", uploadDate: "2026-02-15", type: "xlsx" },
    { id: "doc-004", name: "Emergency_Procedures.pdf", size: "3.1 MB", uploadDate: "2026-02-10", type: "pdf" },
    { id: "doc-005", name: "Robot_Maintenance_Guide.pdf", size: "5.6 MB", uploadDate: "2026-01-28", type: "pdf" },
    { id: "doc-006", name: "Warehouse_Layout_Map.png", size: "1.2 MB", uploadDate: "2026-01-25", type: "png" },
];
