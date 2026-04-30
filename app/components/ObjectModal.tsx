"use client";

/**
 * Modal form for creating or editing an Object.
 * SOP document field uses a dropdown populated from Supabase Storage bucket.
 * GSAP fade + scale animation on mount/unmount.
 */

import React, { useState, useRef, useEffect } from "react";
import { X, Loader2, FileText, ChevronDown } from "lucide-react";
import gsap from "gsap";
import { useCreateObject, useUpdateObject } from "@/services/useObjects";
import { useGetSopDocuments } from "@/services/useSopDocuments";
import type { ObjectRecord, ObjectRecordInsert } from "@/types/database";

interface ObjectModalProps {
    onClose: () => void;
    editing?: ObjectRecord | null;
}

type FormState = {
    name: string;
    keywords: string;
    sop_url: string;
};

export default function ObjectModal({ onClose, editing }: ObjectModalProps) {
    const createObject = useCreateObject();
    const updateObject = useUpdateObject();
    const { data: sopDocs = [], isLoading: sopLoading } = useGetSopDocuments();

    const [form, setForm] = useState<FormState>({
        name: editing?.name ?? "",
        keywords: editing?.keywords?.join(", ") ?? "",
        sop_url: editing?.sop_url ?? "",
    });

    const [sopDropdownOpen, setSopDropdownOpen] = useState(false);
    const overlayRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    /** Animate in on mount */
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

    /** Close dropdown when clicking outside */
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setSopDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    /** Animate out then close */
    const handleClose = () => {
        const tl = gsap.timeline({ onComplete: onClose });
        tl.to(panelRef.current, { opacity: 0, scale: 0.95, y: 10, duration: 0.2, ease: "power2.in" });
        tl.to(overlayRef.current, { opacity: 0, duration: 0.2 }, 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const keywordsArray = form.keywords
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean);

        const payload: ObjectRecordInsert = {
            name: form.name,
            keywords: keywordsArray,
            sop_url: form.sop_url,
        };

        try {
            if (editing) {
                await updateObject.mutateAsync({ id: editing.id, updates: payload });
            } else {
                await createObject.mutateAsync(payload);
            }
            handleClose();
        } catch (err) {
            console.error("Object save failed:", err);
        }
    };

    const isPending = createObject.isPending || updateObject.isPending;

    /** Find the display name of the currently selected SOP doc */
    const selectedSopName = sopDocs.find((d) => d.url === form.sop_url)?.name ?? "";

    return (
        <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center slide-over-backdrop">
            <div ref={panelRef} className="glass-panel w-full max-w-md mx-4 max-h-[85vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <h3 className="text-base font-semibold text-foreground">
                        {editing ? "Edit Object" : "Add Object"}
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
                    {/* Name */}
                    <div>
                        <label className="block text-[11px] font-medium text-muted mb-1">Name</label>
                        <input
                            type="text"
                            required
                            value={form.name}
                            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                            placeholder="e.g. Pressure Tank"
                            className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted/40 outline-none focus:border-accent/40 transition-colors"
                        />
                    </div>

                    {/* Keywords */}
                    <div>
                        <label className="block text-[11px] font-medium text-muted mb-1">Keywords</label>
                        <input
                            type="text"
                            value={form.keywords}
                            onChange={(e) => setForm((p) => ({ ...p, keywords: e.target.value }))}
                            placeholder="e.g. valve, katup, klep (comma-separated)"
                            className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted/40 outline-none focus:border-accent/40 transition-colors"
                        />
                        <p className="text-[10px] text-muted mt-1">Separate multiple keywords with commas</p>
                    </div>

                    {/* SOP Document — Dropdown */}
                    <div>
                        <label className="block text-[11px] font-medium text-muted mb-1">SOP Document</label>
                        <div ref={dropdownRef} className="relative">
                            <button
                                type="button"
                                onClick={() => setSopDropdownOpen(!sopDropdownOpen)}
                                className="w-full flex items-center gap-2 rounded-lg bg-surface border border-border px-3 py-2 text-sm text-left transition-colors hover:border-border-strong focus:border-accent/40 outline-none"
                            >
                                {sopLoading ? (
                                    <Loader2 size={14} className="animate-spin text-muted" />
                                ) : (
                                    <FileText size={14} className="text-muted shrink-0" />
                                )}
                                <span className={`flex-1 truncate ${form.sop_url ? "text-foreground" : "text-muted/40"}`}>
                                    {form.sop_url ? selectedSopName || "Selected document" : "Select SOP document..."}
                                </span>
                                <ChevronDown
                                    size={14}
                                    className={`text-muted transition-transform ${sopDropdownOpen ? "rotate-180" : ""}`}
                                />
                            </button>

                            {sopDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-1 z-10 rounded-lg bg-[#1c1c1e] border border-border shadow-xl max-h-48 overflow-y-auto">
                                    {/* No doc option */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setForm((p) => ({ ...p, sop_url: "" }));
                                            setSopDropdownOpen(false);
                                        }}
                                        className="w-full px-3 py-2 text-sm text-left text-muted hover:bg-surface-hover transition-colors"
                                    >
                                        None
                                    </button>

                                    {sopDocs.map((doc) => (
                                        <button
                                            key={doc.name}
                                            type="button"
                                            onClick={() => {
                                                setForm((p) => ({ ...p, sop_url: doc.url }));
                                                setSopDropdownOpen(false);
                                            }}
                                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors
                                                ${form.sop_url === doc.url
                                                    ? "bg-accent/10 text-accent"
                                                    : "text-foreground hover:bg-surface-hover"
                                                }`}
                                        >
                                            <FileText size={13} className="shrink-0 text-muted" />
                                            <span className="truncate">{doc.name}</span>
                                        </button>
                                    ))}

                                    {sopDocs.length === 0 && !sopLoading && (
                                        <p className="px-3 py-3 text-xs text-muted text-center">
                                            No SOP documents uploaded yet
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                        <p className="text-[10px] text-muted mt-1">
                            Upload documents in the SOP Documents tab
                        </p>
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
                            {isPending ? "Saving..." : editing ? "Save Changes" : "Add Object"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
