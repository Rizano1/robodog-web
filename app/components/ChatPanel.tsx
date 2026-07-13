"use client";

/**
 * Chat panel component for the LLM (Gemini) conversation interface.
 * Uses useSendMessage hook which POSTs to the backend API with optimistic updates.
 * The backend handles session creation when session_id is null.
 */

import { useApp } from "@/app/context/AppContext";
import {
  useBatteryLevel,
  useOdometry,
  useRobotBasicState,
} from "@/app/hooks/useRosData";
import {
  messagesKey,
  useChatRealtime,
  useGetMessagesBySessionId,
  useSendMessage,
} from "@/services/useChat";
import type { ChatMessage } from "@/types/database";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  ChevronDown,
  Loader2,
  Mic,
  MicOff,
  Paperclip,
  PlusCircle,
  Send,
  Tag,
  User,
  Volume2,
  VolumeX,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const ImageWithLoader = ({ src, alt }: { src: string; alt: string }) => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="relative w-full max-w-sm rounded-lg border border-border/50 overflow-hidden min-h-[200px] flex items-center justify-center bg-surface-active">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-muted" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full h-auto object-cover transition-opacity duration-300 ${isLoading ? "opacity-0" : "opacity-100"}`}
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
  const [attachedFiles, setAttachedFiles] = useState<
    { name: string; type: string; base64: string }[]
  >([]);
  const [tags, setTags] = useState<string[]>(["pengujian-e2e"]);
  const [tagInput, setTagInput] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const odom = useOdometry();

  // Speech Synthesis & Speech Recognition (TTS / STT) States
  const [isListening, setIsListening] = useState(false);
  const [sttLoading, setSttLoading] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<number | null>(null);
  const [synthesizingMessageId, setSynthesizingMessageId] = useState<
    number | null
  >(null);
  const [autoReadAloud, setAutoReadAloud] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeObjectUrlRef = useRef<string | null>(null);
  const shouldAutoplayRef = useRef<boolean>(false);
  const lastReadMessageIdRef = useRef<number | null>(null);

  // Clean up speech synthesis/recognition resources on unmount
  useEffect(() => {
    return () => {
      stopSpeech();
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  // Speech Recognition (STT) Handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const options = { mimeType: "audio/webm" };
      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, options);
      } catch (e) {
        mediaRecorder = new MediaRecorder(stream);
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType,
        });

        // Stop all tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());

        // Send to STT endpoint
        await processAudioTranscription(audioBlob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsListening(true);
    } catch (err) {
      console.error("Failed to start recording:", err);
      alert(
        "Tidak dapat mengakses mikrofon. Pastikan Anda telah memberikan izin.",
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const processAudioTranscription = async (audioBlob: Blob) => {
    setSttLoading(true);
    try {
      const formData = new FormData();
      const extension = audioBlob.type.includes("webm") ? "webm" : "wav";
      formData.append("file", audioBlob, `audio.${extension}`);

      const response = await fetch("/api/stt", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Gagal mentranskripsi audio.");
      }

      const result = await response.json();
      if (result.text) {
        setInput((prev) => (prev ? `${prev} ${result.text}` : result.text));
      }
    } catch (err) {
      console.error("Transcription error:", err);
      alert("Terjadi kesalahan saat mengubah suara ke teks.");
    } finally {
      setSttLoading(false);
    }
  };

  // Speech Synthesis (TTS) Handlers
  const speakText = async (text: string, messageId: number) => {
    if (playingMessageId === messageId) {
      stopSpeech();
      return;
    }

    stopSpeech();
    setSynthesizingMessageId(messageId);

    try {
      const cleanText = text
        .replace(/\[ROBOT_STATUS\][\s\S]*$/, "")
        .replace(/\[ROBOT_FEEDBACK\]/g, "")
        .replace(/[*_`#\-+>]/g, "")
        .trim();

      if (!cleanText) return;

      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleanText }),
      });

      if (!response.ok) {
        throw new Error("Gagal melakukan sintesis suara.");
      }

      const audioBuffer = await response.arrayBuffer();
      const audioBlob = new Blob([audioBuffer], { type: "audio/mpeg" });
      const audioUrl = URL.createObjectURL(audioBlob);

      if (activeObjectUrlRef.current) {
        try {
          URL.revokeObjectURL(activeObjectUrlRef.current);
        } catch (e) {}
      }
      activeObjectUrlRef.current = audioUrl;

      const audio = activeAudioRef.current || new Audio();
      activeAudioRef.current = audio;
      audio.src = audioUrl;
      setPlayingMessageId(messageId);

      audio.onended = () => {
        setPlayingMessageId(null);
        if (activeObjectUrlRef.current === audioUrl) {
          try {
            URL.revokeObjectURL(audioUrl);
          } catch (e) {}
          activeObjectUrlRef.current = null;
        }
      };

      audio.onerror = () => {
        setPlayingMessageId(null);
        if (activeObjectUrlRef.current === audioUrl) {
          try {
            URL.revokeObjectURL(audioUrl);
          } catch (e) {}
          activeObjectUrlRef.current = null;
        }
        alert("Gagal memutar audio.");
      };

      await audio.play();
    } catch (err) {
      console.error("TTS error:", err);
      alert("Gagal menyintesis teks ke suara.");
    } finally {
      setSynthesizingMessageId(null);
    }
  };

  const stopSpeech = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
    }
    if (activeObjectUrlRef.current) {
      try {
        URL.revokeObjectURL(activeObjectUrlRef.current);
      } catch (e) {}
      activeObjectUrlRef.current = null;
    }
    setPlayingMessageId(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files);

    filesArray.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setAttachedFiles((prev) => [
          ...prev,
          { name: file.name, type: file.type, base64: base64String },
        ]);
      };
      reader.readAsDataURL(file);
    });
    // Reset file input value so same file can be uploaded again
    e.target.value = "";
  };

  const removeAttachedFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };
  const rawState = useRobotBasicState();
  const battery = useBatteryLevel();

  const MODELS = [
    "gemini-3.1-pro-preview",
    "gemini-3-flash-preview",
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gpt-4o",
    "gpt-4o-mini",
    "qwen3.5:27b",
  ];

  // Fetch messages for the active session
  const { data: messages = [], isLoading: messagesLoading } =
    useGetMessagesBySessionId(activeSessionId);
  const sendMessage = useSendMessage();

  // Auto Read Aloud new assistant messages
  useEffect(() => {
    if (messages.length === 0 || !autoReadAloud) return;

    const lastMsg = messages[messages.length - 1];
    const rawText = getContentText(lastMsg.content);
    const isRobot = rawText.includes("ROBOT_FEEDBACK");

    console.log(
      "Last message:",
      lastMsg,
      "isRobot:",
      isRobot,
      "lastReadMessageIdRef:",
      lastReadMessageIdRef.current,
    );
    const isAssistant = lastMsg.role === "assistant" || isRobot;

    if (isAssistant && lastMsg.id !== lastReadMessageIdRef.current) {
      lastReadMessageIdRef.current = lastMsg.id;
      speakText(rawText, lastMsg.id);
    }
  }, [messages, autoReadAloud]);
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
    if ((!trimmed && attachedFiles.length === 0) || sendMessage.isPending)
      return;

    setInput("");
    const filePayload = attachedFiles.map((f) => f.base64);
    const finalPrompt =
      trimmed ||
      `[Attached Files: ${attachedFiles.map((f) => f.name).join(", ")}]`;

    // Stop speech if something is speaking
    stopSpeech();

    // Unlock audio for autoplay by playing a silent sound inside the user gesture
    if (!activeAudioRef.current) {
      activeAudioRef.current = new Audio();
    }
    activeAudioRef.current.src =
      "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAAAD";
    activeAudioRef.current
      .play()
      .catch((err) => console.warn("Audio unlock failed:", err));

    shouldAutoplayRef.current = true;

    // Build robot status as system_prompt (not injected into user prompt)
    const statusElements = [];
    if (odom) {
      statusElements.push(
        `Position: x=${odom.x.toFixed(2)}, y=${odom.y.toFixed(2)}, heading=${odom.heading.toFixed(0)}°`,
      );
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

    const robotStatus =
      statusElements.length > 0
        ? `[ROBOT_STATUS] ${statusElements.join(", ")}`
        : undefined;

    sendMessage.mutate(
      {
        session_id: activeSessionId,
        user_prompt: finalPrompt + (robotStatus ? `\n\n${robotStatus}` : ""),
        model_name: selectedModel,
        files: filePayload,
        tags: tags.length > 0 ? tags : undefined,
      },
      {
        onSuccess: (resp) => {
          setAttachedFiles([]);
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
    stopSpeech();
    lastReadMessageIdRef.current = null;
    // setTags([]);
    setTagInput("");
    setShowTagInput(false);
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

  /** Render content text with markdown formatting and images from tool calls */
  const renderFormattedContent = (content: ChatMessage["content"]) => {
    let text = getContentText(content);
    let hasToolResponse = false;
    let hasText = text.length > 0;

    const imageUrls: string[] = [];
    const inlineFiles: { mime_type: string; data: string }[] = [];
    if (Array.isArray(content)) {
      content.forEach((part: any) => {
        if (part?.function_response?.name === "capture_and_inspect_image") {
          const url = part.function_response.response?.data?.public_url;
          if (url) {
            imageUrls.push(url);
            hasText = false;
          }
        } else if (part?.inline_data) {
          if (part.inline_data.mime_type?.startsWith("image/")) {
            imageUrls.push(
              `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`,
            );
          } else {
            inlineFiles.push(part.inline_data);
          }
        } else if (part?.function_response || part?.function_call) {
          hasToolResponse = true;
        }
      });
    }
    if (hasToolResponse) return null;
    if (imageUrls.length === 0 && !hasText && inlineFiles.length === 0)
      return null;

    return (
      <div className="px-3.5 py-2.5 text-sm leading-relaxed flex flex-col gap-2">
        {imageUrls.map((url, i) => (
          <ImageWithLoader
            key={`img-${i}`}
            src={url}
            alt="Uploaded/Captured view"
          />
        ))}
        {inlineFiles.map((file, idx) => (
          <div
            key={`file-${idx}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface border border-border text-xs text-foreground/80 max-w-xs"
          >
            <span className="font-semibold">
              📄{" "}
              {file.mime_type === "application/pdf"
                ? "PDF Document"
                : file.mime_type.includes("wordprocessingml")
                  ? "Word Document"
                  : "Attached File"}
            </span>
            <span className="text-muted/60 text-[10px]">
              ({((file.data.length * 0.75) / 1024).toFixed(1)} KB)
            </span>
          </div>
        ))}
        {hasText && (
          <div className="chat-markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
          </div>
        )}
      </div>
    );
  };

  // Helper: check if content contains function_call or function_response parts
  const isFunctionMessage = (content: ChatMessage["content"]): boolean => {
    if (!Array.isArray(content)) return false;
    return content.some(
      (part: any) => part?.function_call || part?.function_response,
    );
  };

  // isWaitingForLlm stays true from the moment a [ROBOT_FEEDBACK] message appears,
  // until a subsequent message arrives that is a normal text reply (no [ROBOT_FEEDBACK], no function call/response)
  const isWaitingForLlm = (() => {
    if (messages.length === 0) return false;
    // Walk backwards from the last message to find [ROBOT_FEEDBACK]
    for (let i = messages.length - 1; i >= 0; i--) {
      const content = messages[i].content;
      const text = getContentText(content);
      const isFunction = isFunctionMessage(content);
      const hasFeedback = text.includes("[ROBOT_FEEDBACK]");

      if (hasFeedback) {
        // Found a [ROBOT_FEEDBACK] but no normal text reply after it yet → still waiting
        return true;
      }
      if (!isFunction && text.length > 0) {
        // Found a normal text message before hitting any [ROBOT_FEEDBACK] → not waiting
        return false;
      }
      // Skip function call/response messages and keep looking
    }
    return false;
  })();
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
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <ChevronDown
              size={11}
              className="pointer-events-none absolute right-2 text-muted"
            />
          </div>
          <button
            onClick={() => setAutoReadAloud(!autoReadAloud)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
              autoReadAloud
                ? "text-accent bg-accent/10 hover:bg-accent/20"
                : "text-muted hover:text-foreground hover:bg-surface-hover"
            }`}
            title={
              autoReadAloud
                ? "Disable Auto Read Aloud"
                : "Enable Auto Read Aloud"
            }
          >
            {autoReadAloud ? <Volume2 size={14} /> : <VolumeX size={14} />}
            <span>Auto Read</span>
          </button>
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
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
      >
        {messagesLoading && (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={24} className="animate-spin text-muted" />
          </div>
        )}
        {!messagesLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-40 gap-3 py-10">
            <Bot size={40} strokeWidth={1.2} />
            <p className="text-sm text-muted">
              Start a conversation with RoboDog AI
            </p>
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
            const displayContent = rawText.replace(
              /\[ROBOT_FEEDBACK\]\s*/g,
              "",
            );
            return (
              <div
                key={msg.id}
                className="flex flex-col items-center justify-center py-2"
              >
                <div className="text-[13px] text-center px-4 py-2 rounded-2xl border border-success/30 bg-success-soft text-success max-w-[90%] shadow-sm flex items-center gap-2">
                  <Bot size={16} className="opacity-70 shrink-0" />
                  <span>{displayContent}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5 justify-center">
                  <p className="text-[10px] text-muted/40 text-center">
                    {new Date(msg.created_at).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </p>
                  <button
                    onClick={() => speakText(displayContent, msg.id)}
                    className="text-muted/60 hover:text-accent p-0.5 rounded transition-colors cursor-pointer"
                    disabled={
                      synthesizingMessageId !== null &&
                      synthesizingMessageId !== msg.id
                    }
                    title={
                      playingMessageId === msg.id
                        ? "Stop reading"
                        : "Read aloud"
                    }
                  >
                    {synthesizingMessageId === msg.id ? (
                      <Loader2 size={11} className="animate-spin text-accent" />
                    ) : playingMessageId === msg.id ? (
                      <VolumeX
                        size={11}
                        className="text-accent animate-pulse"
                      />
                    ) : (
                      <Volume2 size={11} />
                    )}
                  </button>
                </div>
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
                <div
                  className={`flex items-center gap-1.5 mt-1 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <p className="text-[10px] text-muted/50">
                    {new Date(msg.created_at).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </p>
                  {!isUser && (
                    <button
                      onClick={() => speakText(rawText, msg.id)}
                      className="text-muted/60 hover:text-accent p-0.5 rounded transition-colors cursor-pointer"
                      disabled={
                        synthesizingMessageId !== null &&
                        synthesizingMessageId !== msg.id
                      }
                      title={
                        playingMessageId === msg.id
                          ? "Stop reading"
                          : "Read aloud"
                      }
                    >
                      {synthesizingMessageId === msg.id ? (
                        <Loader2
                          size={11}
                          className="animate-spin text-accent"
                        />
                      ) : playingMessageId === msg.id ? (
                        <VolumeX
                          size={11}
                          className="text-accent animate-pulse"
                        />
                      ) : (
                        <Volume2 size={11} />
                      )}
                    </button>
                  )}
                </div>
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

      {/* Attached Files List */}
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 py-2 border-t border-border bg-surface">
          {attachedFiles.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-border text-xs text-foreground/80"
            >
              <span className="truncate max-w-[150px]">{file.name}</span>
              <button
                onClick={() => removeAttachedFile(idx)}
                className="text-muted hover:text-foreground hover:bg-surface-hover rounded p-0.5"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Active Tags List */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 py-2 border-t border-border bg-surface">
          {tags.map((tag, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-xs text-accent font-medium"
            >
              <span>#{tag}</span>
              <button
                onClick={() =>
                  setTags((prev) => prev.filter((_, i) => i !== idx))
                }
                className="hover:bg-accent/25 rounded-full w-4 h-4 flex items-center justify-center font-bold text-[10px] ml-1 text-accent"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-1.5 border border-border focus-within:border-accent/40 transition-colors">
          <input
            type="file"
            id="chat-file-upload"
            multiple
            accept="image/*,.pdf,.docx"
            className="hidden"
            onChange={handleFileChange}
            disabled={isWaiting}
          />
          <button
            onClick={() => document.getElementById("chat-file-upload")?.click()}
            disabled={isWaiting}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-surface-hover transition-all disabled:opacity-30"
          >
            <Paperclip size={14} />
          </button>
          <button
            type="button"
            onClick={toggleListening}
            disabled={isWaiting || sttLoading}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all ${
              isListening
                ? "bg-danger-soft text-danger hover:bg-danger/20 animate-pulse"
                : "text-muted hover:text-foreground hover:bg-surface-hover"
            }`}
            title={isListening ? "Stop listening" : "Start voice input"}
          >
            {sttLoading ? (
              <Loader2 size={14} className="animate-spin text-accent" />
            ) : isListening ? (
              <MicOff size={14} />
            ) : (
              <Mic size={14} />
            )}
          </button>
          <button
            type="button"
            onClick={() => setShowTagInput(!showTagInput)}
            disabled={isWaiting}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all ${
              showTagInput || tags.length > 0
                ? "text-accent bg-accent/10 hover:bg-accent/20"
                : "text-muted hover:text-foreground hover:bg-surface-hover"
            }`}
            title="Manage tags"
          >
            <Tag size={14} />
          </button>
          {showTagInput && (
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  const val = tagInput.trim().replace(/^#/, "");
                  if (val && !tags.includes(val)) {
                    setTags((prev) => [...prev, val]);
                  }
                  setTagInput("");
                }
              }}
              placeholder="Tag... (Enter)"
              className="bg-surface-hover border border-border/50 rounded-lg px-2 py-1 text-xs text-foreground placeholder:text-muted/40 outline-none w-24 shrink-0 transition-all focus:border-accent/40"
              disabled={isWaiting}
            />
          )}
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
            disabled={
              (!input.trim() && attachedFiles.length === 0) || isWaiting
            }
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white transition-all hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
