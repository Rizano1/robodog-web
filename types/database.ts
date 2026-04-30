/**
 * Strict TypeScript interfaces matching the Supabase database schema.
 * Table names use hyphens (e.g. "object-waypoints") as required by the DB.
 */

/* ── maps ────────────────────────────────────────────── */

export interface MapRecord {
    id: number;
    created_at: string;
    name: string;
    yaml_path: string;
}

/** Payload for creating a new map */
export type MapRecordInsert = Omit<MapRecord, "id" | "created_at">;

/** Payload for updating an existing map */
export type MapRecordUpdate = Partial<MapRecordInsert>;

/* ── locations ───────────────────────────────────────── */

export interface Location {
    id: number;
    created_at: string;
    name: string;
    type: string;
    arrival_x: number;
    arrival_y: number;
    arrival_yaw: number;
    /** null = top-level location under a map */
    parent_id: number | null;
    map_id: number;
}

/** Payload for creating a new location */
export type LocationInsert = Omit<Location, "id" | "created_at">;

/** Payload for updating an existing location */
export type LocationUpdate = Partial<LocationInsert>;

/* ── objects ──────────────────────────────────────────── */

export interface ObjectRecord {
    id: number;
    created_at: string;
    name: string;
    keywords: string[];
    /** Public URL of the SOP doc in Supabase Storage */
    sop_url: string;
}

/** Payload for creating a new object */
export type ObjectRecordInsert = Omit<ObjectRecord, "id" | "created_at">;

/** Payload for updating an existing object */
export type ObjectRecordUpdate = Partial<ObjectRecordInsert>;

/* ── object-waypoints ────────────────────────────────── */

export interface ObjectWaypoint {
    id: number;
    created_at: string;
    display_name: string;
    obj_x: number;
    obj_y: number;
    view_x: number;
    view_y: number;
    view_yaw: number;
    camera_pan: number;
    camera_tilt: number;
    camera_zoom: number;
    /** FK → objects.id */
    object_id: number;
    /** FK → locations.id */
    parent_id: number;
}

/** Payload for creating a new waypoint (omit server-generated fields) */
export type ObjectWaypointInsert = Omit<ObjectWaypoint, "id" | "created_at">;

/** Payload for updating an existing waypoint */
export type ObjectWaypointUpdate = Partial<ObjectWaypointInsert>;

/* ── chat-sessions ───────────────────────────────────── */

export interface ChatSession {
    id: number;
    created_at: string;
    title: string;
}

/** Payload for creating a new chat session */
export type ChatSessionInsert = Pick<ChatSession, "title">;

/* ── chat-messages ───────────────────────────────────── */

export interface ChatMessage {
    id: number;
    created_at: string;
    session_id: number;
    role: "user" | "assistant" | "system";
    /** Content is stored as jsonb — an array of parts, e.g. [{"text":"Hello"}] */
    content: Array<{ text: string;[key: string]: unknown }>;
    /** Whether this message should be displayed in the UI */
    showed: boolean;
}

/** Payload for creating a new chat message */
export type ChatMessageInsert = Omit<ChatMessage, "id" | "created_at">;

/* ── SOP Documents (Supabase Storage metadata) ──────── */

export interface SopDocument {
    /** Unique name/path within the storage bucket */
    name: string;
    /** Full public URL for downloading */
    url: string;
    /** File size in bytes as reported by storage */
    size: number;
    /** ISO timestamp of when the file was uploaded */
    created_at: string;
    /** MIME type */
    type: string;
}
