"use client";

/**
 * Page 4: Session History — list of past inspection sessions.
 * Now powered by Supabase via useGetSessions hook.
 * Clicking a row opens SlideOverPanel which fetches messages by session ID.
 */

import React, { useState } from "react";
import { Clock, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { useGetSessions } from "@/services/useChat";
import SlideOverPanel from "@/app/components/SlideOverPanel";
import type { ChatSession } from "@/types/database";

export default function SessionHistory() {
    const { data: sessions = [], isLoading, isError, error } = useGetSessions();
    const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);

    return (
        <div className="h-full flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Clock size={20} className="text-accent" />
                <h2 className="text-lg font-semibold text-foreground">Session History</h2>
                <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-muted">
                    {sessions.length}
                </span>
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
                    <p className="text-sm">Failed to load sessions</p>
                    <p className="text-xs text-muted">{(error as Error)?.message}</p>
                </div>
            )}

            {/* Sessions list */}
            {!isLoading && !isError && (
                <div className="glass-panel flex-1 overflow-auto divide-y divide-border/50">
                    {sessions.map((session) => (
                        <button
                            key={session.id}
                            onClick={() => setSelectedSession(session)}
                            className="w-full flex items-center gap-4 px-5 py-4 hover:bg-surface-hover/50 transition-colors text-left group"
                        >
                            {/* Date/time */}
                            <div className="flex-shrink-0 w-36">
                                <p className="text-xs font-mono text-muted">
                                    {new Date(session.created_at).toLocaleString("en-GB", {
                                        year: "numeric",
                                        month: "2-digit",
                                        day: "2-digit",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </p>
                            </div>

                            {/* Title */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{session.title}</p>
                            </div>

                            {/* Arrow */}
                            <ChevronRight
                                size={16}
                                className="flex-shrink-0 text-muted/30 group-hover:text-muted transition-colors"
                            />
                        </button>
                    ))}
                    {sessions.length === 0 && (
                        <div className="py-10 text-center text-sm text-muted">
                            No sessions recorded yet.
                        </div>
                    )}
                </div>
            )}

            {/* Slide-over panel */}
            {selectedSession && (
                <SlideOverPanel
                    session={selectedSession}
                    onClose={() => setSelectedSession(null)}
                />
            )}
        </div>
    );
}
