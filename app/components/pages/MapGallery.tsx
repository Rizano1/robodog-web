"use client";

/**
 * Map Gallery page — displays saved SLAM maps (.pgm + .yaml) from Supabase.
 * Allows viewing, downloading, and deleting saved maps.
 */

import React, { useState } from "react";
import { Map, Trash2, Loader2, AlertCircle, X, Download, FileText, CheckCircle } from "lucide-react";
import {
    useGetSavedMaps,
    useDeleteSavedMap,
} from "@/services/useMapGallery";

/** Format bytes into a human-readable string */
function formatSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export default function MapGallery() {
    const { data: maps = [], isLoading, isError, error } = useGetSavedMaps();
    const deleteMap = useDeleteSavedMap();
    const [selectedMap, setSelectedMap] = useState<string | null>(null);

    return (
        <div className="h-full flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Map size={20} className="text-accent" />
                <h2 className="text-lg font-semibold text-foreground">Map Gallery</h2>
                <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-muted">
                    {maps.length}
                </span>
            </div>

            {/* Loading state */}
            {isLoading && (
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 size={28} className="animate-spin text-muted" />
                </div>
            )}

            {/* Error state */}
            {isError && (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-danger">
                    <AlertCircle size={28} />
                    <p className="text-sm">Failed to load maps</p>
                    <p className="text-xs text-muted">{(error as Error)?.message}</p>
                </div>
            )}

            {/* Map cards grid */}
            {!isLoading && !isError && (
                <div className="flex-1 overflow-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 content-start">
                    {maps.map((m) => (
                        <div
                            key={m.name}
                            className="glass-panel group relative overflow-hidden cursor-pointer"
                            onClick={() => setSelectedMap(m.pgmUrl)}
                        >
                            {/* Map preview */}
                            <div className="aspect-square bg-black/30 overflow-hidden">
                                <img
                                    src={m.pgmUrl}
                                    alt={m.name}
                                    className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                                    style={{ imageRendering: "pixelated" }}
                                />
                            </div>

                            {/* Info bar */}
                            <div className="p-3 flex items-center gap-2">
                                <Map size={14} className="text-accent shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                                    <p className="text-[10px] text-muted">
                                        {formatSize(m.size)} • {m.created_at ? new Date(m.created_at).toLocaleDateString() : "—"}
                                        {m.hasYaml && (
                                            <span className="ml-1.5 inline-flex items-center gap-0.5 text-success">
                                                <CheckCircle size={8} /> YAML
                                            </span>
                                        )}
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {m.yamlUrl && (
                                        <a
                                            href={m.yamlUrl}
                                            download
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-surface-hover transition-colors text-muted hover:text-foreground"
                                            title="Download YAML"
                                        >
                                            <FileText size={14} />
                                        </a>
                                    )}
                                    <a
                                        href={m.pgmUrl}
                                        download
                                        target="_blank"
                                        rel="noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-surface-hover transition-colors text-muted hover:text-foreground"
                                        title="Download PGM"
                                    >
                                        <Download size={14} />
                                    </a>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm(`Delete map "${m.name}"?`)) {
                                                deleteMap.mutate(m.name);
                                            }
                                        }}
                                        disabled={deleteMap.isPending}
                                        className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-danger-soft transition-colors text-muted hover:text-danger disabled:opacity-50"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {maps.length === 0 && (
                        <div className="col-span-full py-10 text-center text-sm text-muted">
                            No saved maps yet. Use SLAM Mapping to create and save maps.
                        </div>
                    )}
                </div>
            )}

            {/* Lightbox for large view */}
            {selectedMap && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="relative max-w-5xl max-h-full w-full h-full flex flex-col items-center justify-center">
                        <button
                            onClick={() => setSelectedMap(null)}
                            className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors"
                        >
                            <X size={24} />
                        </button>
                        <img
                            src={selectedMap}
                            alt="Map Preview"
                            className="max-w-full max-h-full object-contain rounded-lg"
                            style={{ imageRendering: "pixelated" }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
