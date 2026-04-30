"use client";

/**
 * Chat panel component for the LLM (Gemini) conversation interface.
 * Uses useSendMessage hook which POSTs to the backend API with optimistic updates.
 * The backend handles session creation when session_id is null.
 */

import React, { useState, useRef, useEffect } from "react";
import { PlusCircle, Send, Bot, User, Loader2 } from "lucide-react";
import { useApp } from "@/app/context/AppContext";
import { useQueryClient } from "@tanstack/react-query";
import {
    useGetMessagesBySessionId,
    useSendMessage,
    useChatRealtime,
    messagesKey,
} from "@/services/useChat";
import type { ChatMessage } from "@/types/database";

export default function ChatPanel() {
    const {
        activeSessionId,
        setActiveSessionId,
        sessionTitle,
        setSessionTitle,
        newSession,
    } = useApp();

    const [input, setInput] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    // Fetch messages for the active session
    const { data: messages = [], isLoading: messagesLoading } =
        useGetMessagesBySessionId(activeSessionId);
    const sendMessage = useSendMessage();
    console.log("Messages:", messages);
    // Subscribe to realtime inserts so backend-pushed messages appear instantly
    useChatRealtime(activeSessionId);

    /** Auto-scroll to newest message */
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = () => {
        const trimmed = input.trim();
        if (!trimmed || sendMessage.isPending) return;

        setInput("");

        sendMessage.mutate(
            {
                session_id: activeSessionId,
                user_prompt: trimmed,
            },
            {
                onSuccess: (resp) => {
                    // If the backend created a new session, capture its ID
                    const newSessionId = resp.data?.session_id;
                    if (activeSessionId === null && newSessionId) {
                        setActiveSessionId(newSessionId);
                        setSessionTitle(`Session #${newSessionId}`);
                    }
                },
            },
        );
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const queryClient = useQueryClient();

    /** Handle "New Session" click */
    const handleNewSession = () => {
        newSession();
        // Clear anything in the "null" session cache so the UI is empty immediately
        queryClient.setQueryData(messagesKey(null), []);
    };

    /** Extract display text from the jsonb content field (stored as [{text: "..."}]) */
    const getContentText = (content: ChatMessage["content"]): string => {
        if (Array.isArray(content)) {
            return content
                .map((part) => part.text)
                .filter(Boolean)
                .join("\n");
        }
        return JSON.stringify(content);
    };

    /** Render text with basic formatting: bold, italic, inline code */
    const renderFormattedLine = (line: string, lineIdx: number) => {
        // Split on formatting tokens: **bold**, `code`, *italic*
        const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);

        return (
            <span key={lineIdx}>
                {parts.map((segment, i) => {
                    // Bold: **text**
                    if (segment.startsWith("**") && segment.endsWith("**")) {
                        return <strong key={i}>{segment.slice(2, -2)}</strong>;
                    }
                    // Inline code: `code`
                    if (segment.startsWith("`") && segment.endsWith("`")) {
                        return (
                            <code
                                key={i}
                                className="bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono"
                            >
                                {segment.slice(1, -1)}
                            </code>
                        );
                    }
                    // Italic: *text*
                    if (segment.startsWith("*") && segment.endsWith("*")) {
                        return <em key={i}>{segment.slice(1, -1)}</em>;
                    }
                    return <span key={i}>{segment}</span>;
                })}
            </span>
        );
    };

    /** Render content text with newlines and inline formatting */
    const renderFormattedContent = (content: ChatMessage["content"]) => {
        const text = getContentText(content);
        const lines = text.split("\n");

        return (
            <div className="px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
                {lines.map((line, idx) => (
                    <React.Fragment key={idx}>
                        {idx > 0 && <br />}
                        {renderFormattedLine(line, idx)}
                    </React.Fragment>
                ))}
            </div>
        );
    };

    return (
        <div className="glass-panel flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                <div className="flex items-center gap-2">
                    <Bot size={18} className="text-accent" />
                    <h2 className="text-sm font-semibold text-foreground truncate max-w-[200px]">
                        {sessionTitle}
                    </h2>
                </div>
                <button
                    onClick={handleNewSession}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
                >
                    <PlusCircle size={14} />
                    New Session
                </button>
            </div>

            {/* Messages area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {messagesLoading && (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 size={24} className="animate-spin text-muted" />
                    </div>
                )}
                {!messagesLoading && messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center opacity-40 gap-3 py-10">
                        <Bot size={40} strokeWidth={1.2} />
                        <p className="text-sm text-muted">Start a conversation with RoboDog AI</p>
                        <p className="text-xs text-muted/60">
                            Type a command like &quot;Navigate to Zone A&quot;
                        </p>
                    </div>
                )}
                {messages.map((msg) => {
                    const isUser = msg.role === "user";
                    return (
                        <div
                            key={msg.id}
                            className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
                        >
                            {!isUser && (
                                <div className="shrink-0 mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-accent">
                                    <Bot size={14} />
                                </div>
                            )}
                            <div className="max-w-[80%]">
                            <div className={isUser ? "chat-bubble-user" : "chat-bubble-ai"}>
                                    {renderFormattedContent(msg.content)}
                                </div>
                                <p
                                    className={`text-[10px] text-muted/50 mt-1 ${isUser ? "text-right" : "text-left"}`}
                                >
                                    {new Date(msg.created_at).toLocaleTimeString("en-GB", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        second: "2-digit",
                                    })}
                                </p>
                            </div>
                            {isUser && (
                                <div className="shrink-0 mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-surface-active text-foreground/60">
                                    <User size={14} />
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Sending indicator — shown while backend is processing */}
                {sendMessage.isPending && (
                    <div className="flex gap-2.5 justify-start">
                        <div className="shrink-0 mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-accent">
                            <Bot size={14} />
                        </div>
                        <div className="chat-bubble-ai px-3.5 py-2.5">
                            <Loader2 size={14} className="animate-spin text-muted" />
                        </div>
                    </div>
                )}
            </div>

            {/* Input bar */}
            <div className="border-t border-border px-4 py-3">
                <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-1.5 border border-border focus-within:border-accent/40 transition-colors">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a command..."
                        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted/50 outline-none py-1.5"
                        disabled={sendMessage.isPending}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || sendMessage.isPending}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white transition-all hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <Send size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}
