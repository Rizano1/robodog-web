"use client";

/**
 * Modal form for creating or editing an Object Waypoint.
 * Pre-fills parent_id (location FK) from context.
 * Object selection via searchable dropdown.
 */

import React, { useState, useRef, useEffect } from "react";
import { X, ChevronDown, Search, Box } from "lucide-react";
import gsap from "gsap";
import { useCreateWaypoint, useUpdateWaypoint } from "@/services/useWaypoints";
import { useGetObjects } from "@/services/useObjects";
import type { ObjectWaypoint, ObjectWaypointInsert } from "@/types/database";

interface ObjectWaypointModalProps {
    onClose: () => void;
    editing?: ObjectWaypoint | null;
    /** Pre-filled location context for new waypoints */
    defaults?: {
        parent_id: number;
    };
}

type FormState = {
    display_name: string;
    object_id: number | "";
    obj_x: number | string;
    obj_y: number | string;
    view_x: number | string;
    view_y: number | string;
    view_yaw: number | string;
    camera_pan: number | string;
    camera_tilt: number | string;
    camera_zoom: number | string;
};

export default function ObjectWaypointModal({ onClose, editing, defaults }: ObjectWaypointModalProps) {
    const createWaypoint = useCreateWaypoint();
    const updateWaypoint = useUpdateWaypoint();
    const { data: objects = [] } = useGetObjects();

    const [form, setForm] = useState<FormState>({
        display_name: editing?.display_name ?? "",
        object_id: editing?.object_id ?? "",
        obj_x: editing?.obj_x ?? "",
        obj_y: editing?.obj_y ?? "",
        view_x: editing?.view_x ?? "",
        view_y: editing?.view_y ?? "",
        view_yaw: editing?.view_yaw ?? "",
        camera_pan: editing?.camera_pan ?? "",
        camera_tilt: editing?.camera_tilt ?? "",
        camera_zoom: editing?.camera_zoom ?? "",
    });

    const [objectDropdownOpen, setObjectDropdownOpen] = useState(false);
    const [objectSearch, setObjectSearch] = useState("");
    const overlayRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const tl = gsap.timeline();
        tl.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25 });
        tl.fromTo(
            panelRef.current,
            { opacity: 0, scale: 0.95, y: 10 },
            { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: "power3.out" },
            0.05,
        );
    }, []);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setObjectDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleClose = () => {
        const tl = gsap.timeline({ onComplete: onClose });
        tl.to(panelRef.current, { opacity: 0, scale: 0.95, y: 10, duration: 0.2, ease: "power2.in" });
        tl.to(overlayRef.current, { opacity: 0, duration: 0.2 }, 0);
    };

    const toNum = (v: string | number) => {
        if (v === "" || v === undefined) return 0;
        const n = Number(v);
        return isNaN(n) ? 0 : n;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const payload: ObjectWaypointInsert = {
            display_name: form.display_name,
            object_id: Number(form.object_id) || 0,
            parent_id: editing?.parent_id ?? defaults?.parent_id ?? 0,
            obj_x: toNum(form.obj_x),
            obj_y: toNum(form.obj_y),
            view_x: toNum(form.view_x),
            view_y: toNum(form.view_y),
            view_yaw: toNum(form.view_yaw),
            camera_pan: toNum(form.camera_pan),
            camera_tilt: toNum(form.camera_tilt),
            camera_zoom: toNum(form.camera_zoom),
        };

        try {
            if (editing) {
                await updateWaypoint.mutateAsync({ id: editing.id, updates: payload });
            } else {
                await createWaypoint.mutateAsync(payload);
            }
            handleClose();
        } catch (err) {
            console.error("Waypoint save failed:", err);
        }
    };

    const isPending = createWaypoint.isPending || updateWaypoint.isPending;
    const selectedObject = objects.find((o) => o.id === Number(form.object_id));
    const filteredObjects = objects.filter((o) =>
        o.name.toLowerCase().includes(objectSearch.toLowerCase()),
    );

    const numericFields: { key: keyof FormState; label: string }[] = [
        { key: "obj_x", label: "Object X" },
        { key: "obj_y", label: "Object Y" },
        { key: "view_x", label: "View X" },
        { key: "view_y", label: "View Y" },
        { key: "view_yaw", label: "View Yaw" },
        { key: "camera_pan", label: "Cam Pan" },
        { key: "camera_tilt", label: "Cam Tilt" },
        { key: "camera_zoom", label: "Cam Zoom" },
    ];

    return (
        <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center slide-over-backdrop">
            <div ref={panelRef} className="glass-panel w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <h3 className="text-base font-semibold text-foreground">
                        {editing ? "Edit Object Waypoint" : "Add Object Waypoint"}
                    </h3>
                    <button
                        onClick={handleClose}
                        className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-surface-hover transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                    {/* Display Name */}
                    <div>
                        <label className="block text-[11px] font-medium text-muted mb-1">Display Name</label>
                        <input
                            type="text"
                            required
                            value={form.display_name}
                            onChange={(e) => setForm((p) => ({ ...p, display_name: e.target.value }))}
                            placeholder="e.g. Pressure Tank - Front View"
                            className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted/40 outline-none focus:border-accent/40 transition-colors"
                        />
                    </div>

                    {/* Object Selection — Searchable Dropdown */}
                    <div>
                        <label className="block text-[11px] font-medium text-muted mb-1">Object</label>
                        <div ref={dropdownRef} className="relative">
                            <button
                                type="button"
                                onClick={() => setObjectDropdownOpen(!objectDropdownOpen)}
                                className="w-full flex items-center gap-2 rounded-lg bg-surface border border-border px-3 py-2 text-sm text-left transition-colors hover:border-border-strong focus:border-accent/40 outline-none"
                            >
                                <Box size={14} className="text-muted shrink-0" />
                                <span className={`flex-1 truncate ${form.object_id ? "text-foreground" : "text-muted/40"}`}>
                                    {selectedObject?.name ?? "Select object..."}
                                </span>
                                <ChevronDown
                                    size={14}
                                    className={`text-muted transition-transform ${objectDropdownOpen ? "rotate-180" : ""}`}
                                />
                            </button>

                            {objectDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-1 z-10 rounded-lg bg-[#1c1c1e] border border-border shadow-xl max-h-52 overflow-hidden flex flex-col">
                                    {/* Search input */}
                                    <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
                                        <Search size={12} className="text-muted" />
                                        <input
                                            type="text"
                                            value={objectSearch}
                                            onChange={(e) => setObjectSearch(e.target.value)}
                                            placeholder="Search objects..."
                                            className="bg-transparent text-xs text-foreground placeholder:text-muted/40 outline-none flex-1"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="overflow-y-auto">
                                        {filteredObjects.map((obj) => (
                                            <button
                                                key={obj.id}
                                                type="button"
                                                onClick={() => {
                                                    setForm((p) => ({ ...p, object_id: obj.id }));
                                                    setObjectDropdownOpen(false);
                                                    setObjectSearch("");
                                                }}
                                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors
                                                    ${form.object_id === obj.id
                                                        ? "bg-accent/10 text-accent"
                                                        : "text-foreground hover:bg-surface-hover"
                                                    }`}
                                            >
                                                <Box size={13} className="shrink-0 text-muted" />
                                                <span className="truncate">{obj.name}</span>
                                            </button>
                                        ))}
                                        {filteredObjects.length === 0 && (
                                            <p className="px-3 py-3 text-xs text-muted text-center">
                                                No objects found
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <p className="text-[10px] text-muted mt-1">
                            Manage objects in the Objects tab
                        </p>
                    </div>

                    {/* Coordinate & Camera fields */}
                    <div>
                        <label className="block text-[11px] font-medium text-muted mb-2">Coordinates & Camera</label>
                        <div className="grid grid-cols-4 gap-2">
                            {numericFields.map(({ key, label }) => (
                                <div key={key}>
                                    <label className="block text-[10px] text-muted/70 mb-0.5">{label}</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={form[key]}
                                        onChange={(e) =>
                                            setForm((p) => ({ ...p, [key]: e.target.value }))
                                        }
                                        className="w-full rounded-lg bg-surface border border-border px-2 py-1.5 text-xs font-mono text-foreground outline-none focus:border-accent/40 transition-colors"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isPending || !form.display_name.trim()}
                            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
                        >
                            {isPending ? "Saving..." : editing ? "Save Changes" : "Add Waypoint"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
