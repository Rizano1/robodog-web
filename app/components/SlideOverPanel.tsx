"use client";

/**
 * Slide-over panel for viewing a session's chat transcript.
 * Now fetches messages from Supabase via useGetMessagesBySessionId.
 * "Resume Session" loads the session into global context and navigates to Hub.
 * Animated with GSAP — slides in from the right.
 */

import React, { useRef, useEffect } from "react";
import { X, Play, Bot, User, Loader2 } from "lucide-react";
import gsap from "gsap";
import { useApp } from "@/app/context/AppContext";
import { useGetMessagesBySessionId } from "@/services/useChat";
import type { ChatSession, ChatMessage } from "@/types/database";

interface SlideOverPanelProps {
    session: ChatSession;
    onClose: () => void;
}

export default function SlideOverPanel({ session, onClose }: SlideOverPanelProps) {
    const { resumeSession } = useApp();
    const backdropRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    // Fetch messages for this specific session
    const { data: messages = [], isLoading } = useGetMessagesBySessionId(session.id);

    /** GSAP slide-in animation on mount */
    useEffect(() => {
        const tl = gsap.timeline();
        tl.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3 });
        tl.fromTo(
            panelRef.current,
            { x: "100%" },
            { x: "0%", duration: 0.4, ease: "power3.out" },
            0.05,
        );
    }, []);

    /** Animate out then close */
    const handleClose = () => {
        const tl = gsap.timeline({ onComplete: onClose });
        tl.to(panelRef.current, { x: "100%", duration: 0.3, ease: "power2.in" });
        tl.to(backdropRef.current, { opacity: 0, duration: 0.25 }, 0.05);
    };

    /** Resume session: load into context and navigate to Hub */
    const handleResume = () => {
        resumeSession(session.id, session.title);
        onClose();
    };

    /** Extract display text from the jsonb content field (stored as [{text: "..."}]) */
    const getContentText = (content: ChatMessage["content"]): string => {
        if (Array.isArray(content)) {
            return content.map((part) => part.text).join("\n");
        }
        return JSON.stringify(content);
    };

    return (
        <div ref={backdropRef} className="fixed inset-0 z-50 slide-over-backdrop" onClick={handleClose}>
            <div
                ref={panelRef}
                className="absolute right-0 top-0 h-full w-full max-w-lg bg-[#111113] border-l border-border flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <div>
                        <h3 className="text-base font-semibold text-foreground">{session.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted">
                                {new Date(session.created_at).toLocaleString("en-GB", {
                                    year: "numeric",
                                    month: "2-digit",
                                    day: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-surface-hover transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Resume button */}
                <div className="px-6 py-3 border-b border-border">
                    <button
                        onClick={handleResume}
                        className="flex items-center justify-center gap-2 w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
                    >
                        <Play size={16} />
                        Resume Session
                    </button>
                </div>

                {/* Chat transcript */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                    <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">
                        Chat Transcript
                    </p>

                    {isLoading && (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 size={24} className="animate-spin text-muted" />
                        </div>
                    )}

                    {!isLoading && messages.length === 0 && (
                        <p className="text-sm text-muted text-center py-10">No messages in this session.</p>
                    )}

                    {messages.map((msg) => {
                        const isUser = msg.role === "user";
                        return (
                            <div
                                key={msg.id}
                                className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
                            >
                                {!isUser && (
                                    <div className="flex-shrink-0 mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 text-accent">
                                        <Bot size={12} />
                                    </div>
                                )}
                                <div className="max-w-[80%]">
                                    <div className={isUser ? "chat-bubble-user" : "chat-bubble-ai"}>
                                        <p className="px-3 py-2 text-xs leading-relaxed">
                                            {getContentText(msg.content)}
                                        </p>
                                    </div>
                                    <p
                                        className={`text-[9px] text-muted/40 mt-0.5 ${isUser ? "text-right" : "text-left"}`}
                                    >
                                        {new Date(msg.created_at).toLocaleTimeString("en-GB", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            second: "2-digit",
                                        })}
                                    </p>
                                </div>
                                {isUser && (
                                    <div className="flex-shrink-0 mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-surface-active text-foreground/60">
                                        <User size={12} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
