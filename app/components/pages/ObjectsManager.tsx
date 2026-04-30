"use client";

/**
 * Objects Manager page — CRUD table for inspection objects.
 * Each object has a name, keywords, and an SOP document URL
 * selected from the Supabase Storage bucket.
 */

import React, { useState } from "react";
import { Box, Plus, Pencil, Trash2, Search, Loader2, AlertCircle, ExternalLink, FileText } from "lucide-react";
import { useGetObjects, useDeleteObject } from "@/services/useObjects";
import ObjectModal from "@/app/components/ObjectModal";
import type { ObjectRecord } from "@/types/database";

export default function ObjectsManager() {
    const { data: objects = [], isLoading, isError, error } = useGetObjects();
    const deleteObject = useDeleteObject();
    const [search, setSearch] = useState("");
    const [modal, setModal] = useState<{ open: boolean; editing: ObjectRecord | null }>({
        open: false,
        editing: null,
    });

    /** Filtered objects based on search query */
    const filtered = objects.filter(
        (obj) =>
            obj.name.toLowerCase().includes(search.toLowerCase()) ||
            (obj.keywords ?? []).some((k) => k.toLowerCase().includes(search.toLowerCase())),
    );

    /** Extract filename from SOP URL */
    const getSopDisplayName = (url: string) => {
        if (!url) return "—";
        try {
            const parts = url.split("/");
            const fileName = parts[parts.length - 1];
            return decodeURIComponent(fileName.replace(/^\d+_/, ""));
        } catch {
            return url;
        }
    };

    return (
        <div className="h-full flex flex-col gap-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Box size={20} className="text-accent" />
                    <h2 className="text-lg font-semibold text-foreground">Objects</h2>
                    <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-muted">
                        {objects.length}
                    </span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="flex items-center gap-2 rounded-xl bg-surface border border-border px-3 py-2 flex-1 sm:flex-initial sm:w-60">
                        <Search size={14} className="text-muted" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search objects..."
                            className="bg-transparent text-sm text-foreground placeholder:text-muted/40 outline-none flex-1"
                        />
                    </div>
                    <button
                        onClick={() => setModal({ open: true, editing: null })}
                        className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition-colors whitespace-nowrap"
                    >
                        <Plus size={16} />
                        Add Object
                    </button>
                </div>
            </div>

            {/* Loading state */}
            {isLoading && (
                <div className="glass-panel flex-1 flex items-center justify-center">
                    <Loader2 size={28} className="animate-spin text-muted" />
                </div>
            )}

            {/* Error state */}
            {isError && (
                <div className="glass-panel flex-1 flex flex-col items-center justify-center gap-2 text-danger">
                    <AlertCircle size={28} />
                    <p className="text-sm">Failed to load objects</p>
                    <p className="text-xs text-muted">{(error as Error)?.message}</p>
                </div>
            )}

            {/* Table */}
            {!isLoading && !isError && (
                <div className="glass-panel flex-1 overflow-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-border text-left">
                                {["Name", "Keywords", "SOP Document", "Created", ""].map((h) => (
                                    <th key={h} className="px-4 py-3 font-semibold text-muted whitespace-nowrap">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((obj) => (
                                <tr
                                    key={obj.id}
                                    className="border-b border-border/50 hover:bg-surface-hover/50 transition-colors group"
                                >
                                    <td className="px-4 py-3 font-medium text-foreground">{obj.name}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                                            {(obj.keywords ?? []).map((kw, i) => (
                                                <span
                                                    key={i}
                                                    className="rounded-full bg-surface-active px-2 py-0.5 text-[10px] font-medium text-foreground/70"
                                                >
                                                    {kw}
                                                </span>
                                            ))}
                                            {(!obj.keywords || obj.keywords.length === 0) && (
                                                <span className="text-muted">—</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {obj.sop_url ? (
                                            <a
                                                href={obj.sop_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-1.5 text-accent hover:text-accent-hover transition-colors max-w-[200px]"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <FileText size={12} className="shrink-0" />
                                                <span className="truncate">{getSopDisplayName(obj.sop_url)}</span>
                                                <ExternalLink size={10} className="shrink-0 opacity-50" />
                                            </a>
                                        ) : (
                                            <span className="text-muted">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-muted">
                                        {new Date(obj.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => setModal({ open: true, editing: obj })}
                                                className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-surface-active transition-colors text-muted hover:text-foreground"
                                            >
                                                <Pencil size={13} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm(`Delete object "${obj.name}"?`)) {
                                                        deleteObject.mutate(obj.id);
                                                    }
                                                }}
                                                disabled={deleteObject.isPending}
                                                className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-danger-soft transition-colors text-muted hover:text-danger disabled:opacity-50"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted">
                                        {search ? "No objects match your search." : "No objects created yet."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {modal.open && (
                <ObjectModal
                    editing={modal.editing}
                    onClose={() => setModal({ open: false, editing: null })}
                />
            )}
        </div>
    );
}
