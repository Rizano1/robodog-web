"use client";

/**
 * Modal form for creating or editing a Location.
 * Pre-fills map_id and parent_id based on context.
 */

import React, { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import gsap from "gsap";
import { useCreateLocation, useUpdateLocation } from "@/services/useLocations";
import type { Location, LocationInsert } from "@/types/database";

interface LocationModalProps {
    onClose: () => void;
    editing?: Location | null;
    /** Pre-filled context for new locations */
    defaults?: {
        map_id: number;
        parent_id: number | null;
    };
}

type FormState = {
    name: string;
    type: string;
    arrival_x: number | string;
    arrival_y: number | string;
    arrival_yaw: number | string;
};

export default function LocationModal({ onClose, editing, defaults }: LocationModalProps) {
    const createLocation = useCreateLocation();
    const updateLocation = useUpdateLocation();

    const [form, setForm] = useState<FormState>({
        name: editing?.name ?? "",
        type: editing?.type ?? "",
        arrival_x: editing?.arrival_x ?? "",
        arrival_y: editing?.arrival_y ?? "",
        arrival_yaw: editing?.arrival_yaw ?? "",
    });

    const overlayRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

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

        const payload: LocationInsert = {
            name: form.name,
            type: form.type,
            arrival_x: toNum(form.arrival_x),
            arrival_y: toNum(form.arrival_y),
            arrival_yaw: toNum(form.arrival_yaw),
            map_id: editing?.map_id ?? defaults?.map_id ?? 0,
            parent_id: editing?.parent_id ?? defaults?.parent_id ?? null,
        };

        try {
            if (editing) {
                await updateLocation.mutateAsync({ id: editing.id, updates: payload });
            } else {
                await createLocation.mutateAsync(payload);
            }
            handleClose();
        } catch (err) {
            console.error("Location save failed:", err);
        }
    };

    const isPending = createLocation.isPending || updateLocation.isPending;

    return (
        <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center slide-over-backdrop">
            <div ref={panelRef} className="glass-panel w-full max-w-md mx-4 max-h-[85vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <h3 className="text-base font-semibold text-foreground">
                        {editing ? "Edit Location" : defaults?.parent_id ? "Add Sub-Location" : "Add Location"}
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
                    <div>
                        <label className="block text-[11px] font-medium text-muted mb-1">Name</label>
                        <input
                            type="text"
                            required
                            value={form.name}
                            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                            placeholder="e.g. Boiler Room"
                            className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted/40 outline-none focus:border-accent/40 transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-medium text-muted mb-1">Type</label>
                        <input
                            type="text"
                            value={form.type}
                            onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                            placeholder="e.g. room, floor, aisle, zone"
                            className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted/40 outline-none focus:border-accent/40 transition-colors"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-[11px] font-medium text-muted mb-1">Arrival X</label>
                            <input
                                type="number"
                                step="0.01"
                                value={form.arrival_x}
                                onChange={(e) => setForm((p) => ({ ...p, arrival_x: e.target.value }))}
                                className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted/40 outline-none focus:border-accent/40 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-medium text-muted mb-1">Arrival Y</label>
                            <input
                                type="number"
                                step="0.01"
                                value={form.arrival_y}
                                onChange={(e) => setForm((p) => ({ ...p, arrival_y: e.target.value }))}
                                className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted/40 outline-none focus:border-accent/40 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-medium text-muted mb-1">Arrival Yaw</label>
                            <input
                                type="number"
                                step="0.01"
                                value={form.arrival_yaw}
                                onChange={(e) => setForm((p) => ({ ...p, arrival_yaw: e.target.value }))}
                                className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted/40 outline-none focus:border-accent/40 transition-colors"
                            />
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
                            disabled={isPending || !form.name.trim()}
                            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
                        >
                            {isPending ? "Saving..." : editing ? "Save Changes" : "Add Location"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
