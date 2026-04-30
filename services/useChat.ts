/**
 * React Query hooks for chat sessions and messages.
 * - Sessions come from `chat-sessions` table.
 * - Messages come from `chat-messages` table (keyed by session_id).
 */

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowserClient } from "@/utils/supabaseClient";
import type {
    ChatSession,
    ChatSessionInsert,
    ChatMessage,
    ChatMessageInsert,
} from "@/types/database";

export const SESSION_KEY = ["chat-sessions"] as const;
export const messagesKey = (sessionId: number | null) =>
    ["chat-messages", sessionId] as const;

/* ── Sessions ────────────────────────────────────────── */

/** Fetch all chat sessions, newest first */
export function useGetSessions() {
    const supabase = getSupabaseBrowserClient();

    return useQuery<ChatSession[]>({
        queryKey: SESSION_KEY,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("chat-sessions")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            return data as ChatSession[];
        },
    });
}

/** Create a new chat session and return the inserted row */
export function useCreateSession() {
    const supabase = getSupabaseBrowserClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: ChatSessionInsert) => {
            const { data, error } = await supabase
                .from("chat-sessions")
                .insert(payload)
                .select()
                .single();

            if (error) throw error;
            return data as ChatSession;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: SESSION_KEY });
        },
    });
}

/* ── Messages ────────────────────────────────────────── */

/** Fetch all messages for a given session, oldest first */
export function useGetMessagesBySessionId(sessionId: number | null) {
    const supabase = getSupabaseBrowserClient();

    return useQuery<ChatMessage[]>({
        queryKey: messagesKey(sessionId),
        enabled: sessionId !== null,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("chat-messages")
                .select("*")
                .eq("session_id", sessionId!)
                .eq("showed", true)
                .order("created_at", { ascending: true });

            if (error) throw error;
            return data as ChatMessage[];
        },
    });
}

/**
 * Send a user message to the backend chat API.
 * Matches the backend QuestionRequest schema:
 *   { session_id?, user_prompt, user_id?, files? }
 * If session_id is null, the backend creates a new session automatically.
 *
 * Uses optimistic updates to immediately show the user's message in the UI.
 *
 * Flow:
 * 1. onMutate — Optimistically append the user message to the cache.
 * 2. mutationFn — POST to the backend. Backend saves user message,
 *    calls the LLM, then saves the AI response — all in one round-trip.
 * 3. onError — Roll back the cache to the previous snapshot.
 * 4. onSettled — Invalidate the messages query so the real AI response
 *    (and any corrected data) is fetched from the database.
 */
export interface SendMessagePayload {
    session_id: number | null;
    user_prompt: string;
    user_id?: string;
    files?: string[];
}

/** Shape of the response from the chat API: { status, data: { session_id, answer } } */
export interface SendMessageResponse {
    status: number;
    data: {
        session_id: number;
        answer: string;
        [key: string]: unknown;
    };
}

export function useSendMessage() {
    const queryClient = useQueryClient();

    return useMutation<
        SendMessageResponse,
        Error,
        SendMessagePayload,
        /** Context returned by onMutate for rollback */
        { previousMessages: ChatMessage[] | undefined; key: readonly ["chat-messages", number | null] }
    >({
        mutationFn: async (payload) => {
            console.log("Sending payload:", payload);
            const res = await fetch("http://10.7.101.231:8082/api/chat_robot", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const body = await res.text().catch(() => "Unknown error");
                throw new Error(`Chat API error ${res.status}: ${body}`);
            }

            const data = (await res.json()) as SendMessageResponse;
            console.log("AI Response Data:", data);
            return data;
        },

        /** Optimistically append the user message before the request completes */
        onMutate: async (payload) => {
            const key = messagesKey(payload.session_id);

            // Cancel any in-flight refetches so they don't overwrite optimistic data
            await queryClient.cancelQueries({ queryKey: key });

            // Snapshot the current cache for rollback
            const previousMessages = queryClient.getQueryData<ChatMessage[]>(key);

            // Build a temporary optimistic message
            const optimisticMsg: ChatMessage = {
                id: -Date.now(), // Negative temp ID — will be replaced on refetch
                created_at: new Date().toISOString(),
                session_id: payload.session_id ?? 0,
                role: "user",
                content: [{ text: payload.user_prompt }],
                showed: true,
            };

            // Append to cache
            queryClient.setQueryData<ChatMessage[]>(key, (old = []) => [
                ...old,
                optimisticMsg,
            ]);

            return { previousMessages, key };
        },

        /** Roll back to the snapshot on failure */
        onError: (_err, _vars, context) => {
            if (context?.previousMessages) {
                queryClient.setQueryData<ChatMessage[]>(context.key, context.previousMessages);
            }
        },

        /** Always refetch from DB so we get the real AI response */
        onSettled: (data, _err, variables) => {
            // Use the session_id from the response (backend may have created a new one)
            const resolvedSessionId = data?.data?.session_id ?? variables.session_id;
            queryClient.invalidateQueries({ queryKey: messagesKey(resolvedSessionId) });

            // If we just transitioned from session_id=null to a real ID, clear the 'null' cache
            // so it's empty next time the user clicks "New Session".
            if (variables.session_id === null) {
                queryClient.setQueryData(messagesKey(null), []);
            }

            // Also refresh the sessions list (a new session may have been created)
            queryClient.invalidateQueries({ queryKey: SESSION_KEY });
        },
    });
}

/* ── Realtime Subscription ───────────────────────────── */

/**
 * Subscribe to Supabase Realtime for new messages inserted into a session.
 *
 * This enables "push" updates from the backend — e.g. when the robot dog
 * finishes navigating to a waypoint and the FastAPI server inserts the
 * final AI response directly into the `chat-messages` table.
 *
 * New messages are appended to the React Query cache in real-time,
 * so the chat UI updates instantly without polling or page refresh.
 * Duplicate messages are skipped by checking the message ID.
 */
export function useChatRealtime(sessionId: number | null) {
    const supabase = getSupabaseBrowserClient();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (sessionId === null) return;

        const key = messagesKey(sessionId);
        const channelName = `chat-messages-session-${sessionId}`;

        const channel = supabase
            .channel(channelName)
            .on(
                "postgres_changes",
                {
                    event: "*", // Listen for INSERT, UPDATE, and DELETE
                    schema: "public",
                    table: "chat-messages",
                    filter: `session_id=eq.${sessionId}`,
                },
                (payload) => {
                    console.log("[Realtime]", payload.eventType, payload.new);

                    if (payload.eventType === "INSERT") {
                        const newMsg = payload.new as ChatMessage;

                        // Skip messages that should not be displayed in the UI
                        if (newMsg.showed === false) return;

                        queryClient.setQueryData<ChatMessage[]>(key, (old = []) => {
                            // Skip if this exact message ID is already in the cache
                            if (old.some((msg) => msg.id === newMsg.id)) return old;

                            // Replace optimistic placeholder (negative temp ID) if it matches
                            const optimisticIdx = old.findIndex(
                                (msg) => msg.id < 0 && msg.role === newMsg.role,
                            );
                            if (optimisticIdx !== -1) {
                                const updated = [...old];
                                updated[optimisticIdx] = newMsg;
                                return updated;
                            }

                            return [...old, newMsg];
                        });
                    }

                    if (payload.eventType === "UPDATE") {
                        const updatedMsg = payload.new as ChatMessage;

                        queryClient.setQueryData<ChatMessage[]>(key, (old = []) => {
                            const idx = old.findIndex((msg) => msg.id === updatedMsg.id);
                            if (idx !== -1) {
                                // Replace the existing message with updated data
                                const updated = [...old];
                                updated[idx] = updatedMsg;
                                return updated;
                            }
                            // Message not in cache yet (e.g. showed changed to true) — append it
                            return [...old, updatedMsg];
                        });
                    }

                    if (payload.eventType === "DELETE") {
                        const deletedId = (payload.old as { id?: number })?.id;
                        if (deletedId != null) {
                            queryClient.setQueryData<ChatMessage[]>(key, (old = []) =>
                                old.filter((msg) => msg.id !== deletedId),
                            );
                        }
                    }
                },
            )
            .subscribe();

        // Cleanup: unsubscribe when sessionId changes or component unmounts
        return () => {
            supabase.removeChannel(channel);
        };
    }, [sessionId, supabase, queryClient]);
}

