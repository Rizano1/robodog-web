"use client";

import React, { useState } from "react";
import { Image, Trash2, Loader2, AlertCircle, X, Download } from "lucide-react";
import {
    useGetCapturedGallery,
    useDeleteCapturedImage,
} from "@/services/useCapturedGallery";

export default function CapturedGallery() {
    const { data: images = [], isLoading, isError, error } = useGetCapturedGallery();
    const deleteImage = useDeleteCapturedImage();
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    return (
        <div className="h-full flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Image size={20} className="text-accent" />
                <h2 className="text-lg font-semibold text-foreground">Captured Gallery</h2>
                <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-muted">
                    {images.length}
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
                    <p className="text-sm">Failed to load images</p>
                    <p className="text-xs text-muted">{(error as Error)?.message}</p>
                </div>
            )}

            {/* Image cards grid */}
            {!isLoading && !isError && (
                <div className="flex-1 overflow-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 content-start">
                    {images.map((img) => (
                        <div
                            key={img.name}
                            className="glass-panel group relative aspect-square overflow-hidden cursor-pointer bg-black/20"
                            onClick={() => setSelectedImage(img.url)}
                        >
                            <img
                                src={img.url}
                                alt={img.name}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            
                            {/* Overlay with details and actions */}
                            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                <p className="text-xs font-medium text-white truncate">{img.name}</p>
                                <p className="text-[10px] text-white/70">
                                    {new Date(img.created_at).toLocaleDateString()} {new Date(img.created_at).toLocaleTimeString()}
                                </p>
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm("Are you sure you want to delete this image?")) {
                                        deleteImage.mutate(img.name);
                                    }
                                }}
                                disabled={deleteImage.isPending}
                                className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white/70 opacity-0 group-hover:opacity-100 hover:text-danger hover:bg-black/70 transition-all disabled:opacity-50"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                    {images.length === 0 && (
                        <div className="col-span-full py-10 text-center text-sm text-muted">
                            No captured images found.
                        </div>
                    )}
                </div>
            )}

            {/* Lightbox for large view */}
            {selectedImage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="relative max-w-5xl max-h-full w-full h-full flex flex-col items-center justify-center">
                        <button
                            onClick={() => setSelectedImage(null)}
                            className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors"
                        >
                            <X size={24} />
                        </button>
                        <a 
                            href={selectedImage}
                            download
                            target="_blank"
                            rel="noreferrer"
                            className="absolute top-4 right-16 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors"
                            title="Download Image"
                        >
                            <Download size={20} />
                        </a>
                        <img 
                            src={selectedImage} 
                            alt="Preview" 
                            className="max-w-full max-h-full object-contain rounded-lg"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
