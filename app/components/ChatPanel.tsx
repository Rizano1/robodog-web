"use client";

/**
 * Chat panel component for the LLM (Gemini) conversation interface.
 * Uses useSendMessage hook which POSTs to the backend API with optimistic updates.
 * The backend handles session creation when session_id is null.
 */

import React, { useState, useRef, useEffect } from "react";
import { PlusCircle, Send, Bot, User, Loader2, ChevronDown } from "lucide-react";
import { useApp } from "@/app/context/AppContext";
import { useQueryClient } from "@tanstack/react-query";
import {
    useGetMessagesBySessionId,
    useSendMessage,
    useChatRealtime,
    messagesKey,
} from "@/services/useChat";
import { useOdometry, useRobotBasicState, useBatteryLevel } from "@/app/hooks/useRosData";
import type { ChatMessage } from "@/types/database";

const ImageWithLoader = ({ src, alt }: { src: string; alt: string }) => {
    const [isLoading, setIsLoading] = useState(true);

    return (
        <div className="relative w-full max-w-sm rounded-lg border border-border/50 overflow-hidden min-h-[200px] flex items-center justify-center bg-black/5">
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 size={24} className="animate-spin text-muted" />
                </div>
            )}
            <img
                src={src}
                alt={alt}
                className={`w-full h-auto object-cover transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                onLoad={() => setIsLoading(false)}
            />
        </div>
    );
};

export default function ChatPanel() {
    const {
        activeSessionId,
        setActiveSessionId,
        sessionTitle,
        setSessionTitle,
        newSession,
    } = useApp();

    const [input, setInput] = useState("");
    const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");
    const scrollRef = useRef<HTMLDivElement>(null);
    const odom = useOdometry();
    const rawState = useRobotBasicState();
    const battery = useBatteryLevel();

    const MODELS = [
        "gemini-3.1-pro-preview",
        "gemini-3-flash-preview",
        "gemini-3.1-flash-lite",
        "gemini-2.5-flash",
        "gemini-2.5-pro",
    ];

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

        // Build robot status as system_prompt (not injected into user prompt)
        const statusElements = [];
        if (odom) {
            statusElements.push(`Position: x=${odom.x.toFixed(2)}, y=${odom.y.toFixed(2)}, heading=${odom.heading.toFixed(0)}°`);
        }
        if (rawState !== null) {
            let stateName = "Unknown";
            if (rawState === 1) stateName = "Sitting";
            else if (rawState === 4) stateName = "Prepare";
            else if (rawState === 5) stateName = "Sit-to-Stand";
            else if (rawState === 6) stateName = "Standing";
            else if (rawState === 7) stateName = "Stand-to-Sit";
            else if (rawState === 8) stateName = "Protected";
            else if (rawState === 9) stateName = "Posture Adj";
            else if (rawState === 11) stateName = "Flipping";
            else if (rawState === 17) stateName = "Resetting";
            else if (rawState === 20) stateName = "Hello";
            else stateName = `State ${rawState}`;
            statusElements.push(`State: ${stateName} (${rawState})`);
        }
        if (battery !== null) {
            statusElements.push(`Battery: ${battery}%`);
        }

        const robotStatus = statusElements.length > 0
            ? `[ROBOT_STATUS] ${statusElements.join(", ")}`
            : undefined;

        sendMessage.mutate(
            {
                session_id: activeSessionId,
                user_prompt: trimmed + ` ${robotStatus}`,
                model_name: selectedModel,
                // system_prompt: robotStatus,
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
            const text = content
                .map((part) => part.text)
                .filter(Boolean)
                .join("\n");

            // Remove the injected [ROBOT_STATUS] text for cleaner UI
            return text.replace(/\n\n\[ROBOT_STATUS\][\s\S]*$/, "").trim();
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

    /** Render content text with newlines, inline formatting, and images from tool calls */
    const renderFormattedContent = (content: ChatMessage["content"]) => {
        let text = getContentText(content);
        let lines = text ? text.split("\n") : [];
        let hasToolResponse = false;

        const imageUrls: string[] = [];
        if (Array.isArray(content)) {
            content.forEach((part: any) => {
                if (part?.function_response?.name === "capture_and_upload_image") {
                    const url = part.function_response.response?.data?.public_url;
                    if (url) {
                        imageUrls.push(url);
                        lines = []
                    }
                } else if (part?.function_response || part?.function_call) {
                    hasToolResponse = true;
                }
            });
        }
        if (hasToolResponse) return null;
        if (imageUrls.length === 0 && lines.length === 0) return null;

        return (
            <div className="px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap flex flex-col gap-2">
                {imageUrls.map((url, i) => (
                    <ImageWithLoader
                        key={`img-${i}`}
                        src={url}
                        alt="Captured view"
                    />
                ))}
                {lines.length > 0 && (
                    <div>
                        {lines.map((line, idx) => (
                            <React.Fragment key={idx}>
                                {idx > 0 && <br />}
                                {renderFormattedLine(line, idx)}
                            </React.Fragment>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const isWaitingForLlm = messages.length > 0 && getContentText(messages[messages.length - 1].content).includes("[ROBOT_FEEDBACK]");
    const isWaiting = sendMessage.isPending || isWaitingForLlm;

    return (
        <div className="glass-panel flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                <div className="flex items-center gap-2">
                    <Bot size={18} className="text-accent" />
                    <h2 className="text-sm font-semibold text-foreground truncate max-w-[160px]">
                        {sessionTitle}
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    {/* Model selector */}
                    <div className="relative flex items-center">
                        <select
                            id="model-select"
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="appearance-none bg-surface border border-border rounded-lg pl-2.5 pr-7 py-1.5 text-xs text-muted hover:text-foreground hover:border-accent/40 focus:outline-none focus:border-accent/60 transition-colors cursor-pointer"
                        >
                            {MODELS.map((m) => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                        <ChevronDown size={11} className="pointer-events-none absolute right-2 text-muted" />
                    </div>
                    <button
                        onClick={handleNewSession}
                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
                    >
                        <PlusCircle size={14} />
                        New Session
                    </button>
                </div>
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
                    const rawText = getContentText(msg.content);
                    const isRobot = rawText.includes("ROBOT_FEEDBACK");
                    const isUser = msg.role === "user" && !isRobot;

                    const formattedContent = renderFormattedContent(msg.content);
                    // console.log("formattedContent", formattedContent)
                    if (!formattedContent) return null;

                    if (isRobot) {
                        // Strip ROBOT_FEEDBACK keyword for display
                        const displayContent = rawText.replace(/\[ROBOT_FEEDBACK\]\s*/g, "");
                        return (
                            <div key={msg.id} className="flex flex-col items-center justify-center py-2">
                                <div className="text-[13px] text-center px-4 py-2 rounded-2xl border border-green-500/30 bg-green-500/10 text-green-400 max-w-[90%] shadow-sm flex items-center gap-2">
                                    <Bot size={16} className="opacity-70 shrink-0" />
                                    <span>{displayContent}</span>
                                </div>
                                <p className="text-[10px] text-muted/40 mt-1.5 text-center">
                                    {new Date(msg.created_at).toLocaleTimeString("en-GB", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        second: "2-digit",
                                    })}
                                </p>
                            </div>
                        );
                    }

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
                                    {formattedContent}
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
                {isWaiting && (
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
                        disabled={isWaiting}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isWaiting}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white transition-all hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <Send size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}
