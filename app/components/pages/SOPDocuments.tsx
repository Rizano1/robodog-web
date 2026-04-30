"use client";

/**
 * Page 3: SOP Documents — upload zone + document card grid.
 * Now powered by Supabase Storage via useSopDocuments hooks.
 * Supports real file uploads and deletions with loading/error states.
 */

import React, { useState, useCallback, useRef } from "react";
import {
    FileText,
    Upload,
    Trash2,
    File,
    FileSpreadsheet,
    Image,
    Loader2,
    AlertCircle,
} from "lucide-react";
import {
    useGetSopDocuments,
    useUploadSopDocument,
    useDeleteSopDocument,
} from "@/services/useSopDocuments";

/** Map MIME types / extensions to icons and colors */
function getFileIcon(mimeType: string) {
    if (mimeType.includes("pdf")) return { icon: FileText, color: "text-red-400" };
    if (mimeType.includes("sheet") || mimeType.includes("excel") || mimeType.includes("xlsx"))
        return { icon: FileSpreadsheet, color: "text-green-400" };
    if (mimeType.includes("image")) return { icon: Image, color: "text-purple-400" };
    return { icon: File, color: "text-muted" };
}

/** Format bytes into a human-readable string */
function formatSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export default function SOPDocuments() {
    const { data: documents = [], isLoading, isError, error } = useGetSopDocuments();
    const uploadDoc = useUploadSopDocument();
    const deleteDoc = useDeleteSopDocument();
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    /** Handle real file drop */
    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragOver(false);
            const files = Array.from(e.dataTransfer.files);
            files.forEach((file) => uploadDoc.mutate(file));
        },
        [uploadDoc],
    );

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = () => setDragOver(false);

    /** Handle click-to-browse — open file picker */
    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    /** Handle file input change */
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        files.forEach((file) => uploadDoc.mutate(file));
        // Reset input so the same file can be re-selected
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <div className="h-full flex flex-col gap-4">
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg"
                className="hidden"
                onChange={handleFileChange}
            />

            {/* Header */}
            <div className="flex items-center gap-2">
                <FileText size={20} className="text-accent" />
                <h2 className="text-lg font-semibold text-foreground">SOP Documents</h2>
                <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-muted">
                    {documents.length}
                </span>
                {uploadDoc.isPending && (
                    <Loader2 size={14} className="animate-spin text-accent ml-1" />
                )}
            </div>

            {/* Upload zone */}
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={handleUploadClick}
                className={`
          glass-panel flex flex-col items-center justify-center gap-3 py-10 cursor-pointer
          border-2 border-dashed transition-all duration-200
          ${dragOver
                        ? "border-accent bg-accent-soft/10 scale-[1.01]"
                        : "border-border hover:border-border-strong hover:bg-surface-hover/30"
                    }
        `}
            >
                <div className={`rounded-2xl p-4 transition-colors ${dragOver ? "bg-accent/20" : "bg-surface"}`}>
                    <Upload size={28} className={dragOver ? "text-accent" : "text-muted"} />
                </div>
                <div className="text-center">
                    <p className="text-sm font-medium text-foreground">
                        {dragOver ? "Drop files here" : "Drag & drop documents here"}
                    </p>
                    <p className="text-xs text-muted mt-1">or click to browse • PDF, DOCX, XLSX, PNG</p>
                </div>
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
                    <p className="text-sm">Failed to load documents</p>
                    <p className="text-xs text-muted">{(error as Error)?.message}</p>
                </div>
            )}

            {/* Document cards grid */}
            {!isLoading && !isError && (
                <div className="flex-1 overflow-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 content-start">
                    {documents.map((doc) => {
                        const { icon: DocIcon, color } = getFileIcon(doc.type);
                        return (
                            <div
                                key={doc.name}
                                className="glass-panel-light flex items-start gap-3 p-4 hover:bg-surface-hover/50 transition-colors group"
                            >
                                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-surface ${color}`}>
                                    <DocIcon size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                                    <p className="text-[11px] text-muted mt-0.5">
                                        {formatSize(doc.size)} • {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : "—"}
                                    </p>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteDoc.mutate(doc.name);
                                    }}
                                    disabled={deleteDoc.isPending}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 hover:bg-danger-soft transition-all text-muted hover:text-danger disabled:opacity-50"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        );
                    })}
                    {documents.length === 0 && (
                        <div className="col-span-full py-10 text-center text-sm text-muted">
                            No documents uploaded yet.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
