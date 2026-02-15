"use client";

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import styles from "./AiChat.module.css";
import { renderMarkdown } from "./renderMarkdown";
import {
  CloseIcon,
  SendIcon,
  SparklesIcon,
  DocumentIcon,
  ReportIcon,
  TimelineIcon,
  InsightsIcon,
  ComplianceIcon,
  CopyIcon,
  BotIcon,
  UserIcon,
  AlertCircleIcon,
  TrashIcon,
} from "./icons";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface RecordItem {
  ipfsHash: string;
  fileName: string;
  doctor: `0x${string}`;
  timestamp: bigint;
}

export interface AccessRequestItem {
  requester: string;
  timestamp: bigint;
  status: bigint;
  durationInHours: bigint;
  grantedAt: bigint;
  expiresAt: bigint;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface AiChatProps {
  records: RecordItem[];
  requests: AccessRequestItem[];
  patientAddress: string;
  userAddress?: string;
  hasAccess?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function truncateAddr(addr: string): string {
  if (!addr || addr.length <= 13) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function categorizeRecordName(name: string): {
  type: string;
  format: string;
  dept: string;
} {
  const n = name.toLowerCase();
  if (n.includes("mri"))
    return { type: "MRI Scan", format: "DICOM", dept: "Radiology" };
  if (n.includes("x-ray") || n.includes("xray"))
    return { type: "X-Ray", format: "DICOM", dept: "Radiology" };
  if (n.includes("ct"))
    return { type: "CT Scan", format: "DICOM", dept: "Radiology" };
  if (n.includes("blood") || n.includes("cbc") || n.includes("lipid"))
    return { type: "Blood Test", format: "PDF Report", dept: "Pathology" };
  if (n.includes("ecg") || n.includes("ekg"))
    return { type: "ECG Report", format: "PDF Report", dept: "Cardiology" };
  if (n.includes("prescription") || n.includes("rx"))
    return { type: "Prescription", format: "Digital RX", dept: "General" };
  if (n.includes("lab") || n.includes("report"))
    return { type: "Lab Report", format: "PDF Report", dept: "Pathology" };
  if (n.includes("scan") || n.includes("ultrasound"))
    return { type: "Scan", format: "DICOM", dept: "Radiology" };
  if (n.includes("insurance") || n.includes("claim"))
    return { type: "Insurance", format: "PDF", dept: "Administration" };
  return { type: "Medical Record", format: "PDF Report", dept: "General" };
}

/* ------------------------------------------------------------------ */
/*  Build document context string for the AI                           */
/* ------------------------------------------------------------------ */

function buildDocumentContext(
  records: RecordItem[],
  requests: AccessRequestItem[],
  patientAddress: string,
  userAddress?: string,
  hasAccess?: boolean,
): string {
  if (records.length === 0 && requests.length === 0) return "";

  const lines: string[] = [];

  lines.push(`**Patient Address:** ${patientAddress || "Not specified"}`);
  if (userAddress) lines.push(`**Your Address:** ${truncateAddr(userAddress)}`);
  lines.push(
    `**Access Status:** ${hasAccess ? "Granted" : "No active access"}`,
  );
  lines.push("");

  if (records.length > 0) {
    lines.push(`### Medical Records (${records.length} total)`);
    lines.push("");
    lines.push(
      "| # | File Name | Type | Department | Format | Doctor | Date | IPFS Hash |",
    );
    lines.push(
      "|---|-----------|------|------------|--------|--------|------|-----------|",
    );

    records.forEach((record, index) => {
      const cat = categorizeRecordName(record.fileName);
      const date = new Date(Number(record.timestamp) * 1000);
      const dateStr = date.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      });
      lines.push(
        `| ${index + 1} | ${record.fileName} | ${cat.type} | ${cat.dept} | ${cat.format} | ${truncateAddr(record.doctor)} | ${dateStr} | ${record.ipfsHash.slice(0, 12)}... |`,
      );
    });

    lines.push("");
  }

  if (requests.length > 0) {
    const statusMap: Record<number, string> = {
      0: "Pending",
      1: "Approved",
      2: "Rejected",
    };
    lines.push(`### Access Requests (${requests.length} total)`);
    lines.push("");

    requests.forEach((req, index) => {
      const status = statusMap[Number(req.status)] ?? "Unknown";
      const date = new Date(Number(req.timestamp) * 1000);
      lines.push(
        `- Request #${index + 1}: from ${truncateAddr(req.requester)}, status: ${status}, duration: ${req.durationInHours}h, requested on ${date.toLocaleDateString("en-US")}`,
      );
    });
    lines.push("");
  }

  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/*  Quick action prompts                                               */
/* ------------------------------------------------------------------ */

const QUICK_ACTIONS = [
  {
    label: "Full Report",
    icon: ReportIcon,
    prompt:
      "Generate a comprehensive medical records report for this patient. Include an executive summary, timeline analysis, record categorization breakdown, key observations, and any recommendations.",
  },
  {
    label: "Timeline",
    icon: TimelineIcon,
    prompt:
      "Create a detailed chronological timeline of all medical records for this patient, highlighting patterns and gaps in documentation.",
  },
  {
    label: "Insights",
    icon: InsightsIcon,
    prompt:
      "Analyze the medical records and provide key insights: patterns you notice, potential areas of concern, documentation gaps, and recommendations for the care team.",
  },
  {
    label: "Compliance",
    icon: ComplianceIcon,
    prompt:
      "Review the medical records for compliance considerations. Check for documentation completeness, access patterns, and any potential HIPAA or regulatory concerns based on the record metadata.",
  },
];

const WELCOME_PROMPTS = [
  {
    icon: ReportIcon,
    text: "Generate a full patient report from my records",
    prompt:
      "Generate a comprehensive medical records report for this patient. Include an executive summary, timeline analysis, record categorization breakdown, key observations, and any recommendations.",
  },
  {
    icon: DocumentIcon,
    text: "Summarize the uploaded documents",
    prompt:
      "Provide a concise summary of all uploaded medical records including their types, departments, dates, and any notable patterns.",
  },
  {
    icon: InsightsIcon,
    text: "What patterns do you see in these records?",
    prompt:
      "What patterns do you see in these medical records? Look at record types, timing, departments, and suggest what these patterns might indicate.",
  },
  {
    icon: ComplianceIcon,
    text: "Check records for compliance gaps",
    prompt:
      "Review the medical records for compliance considerations. Check for documentation completeness, access patterns, and any potential HIPAA or regulatory concerns based on the record metadata.",
  },
];

/* ================================================================== */
/*  COMPONENT                                                         */
/* ================================================================== */

export default function AiChat({
  records,
  requests,
  patientAddress,
  userAddress,
  hasAccess,
}: AiChatProps) {
  /* ---- state ---- */
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPulse, setShowPulse] = useState(true);

  /* ---- refs ---- */
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* ---- derived ---- */
  const documentContext = useMemo(
    () =>
      buildDocumentContext(
        records,
        requests,
        patientAddress,
        userAddress,
        hasAccess,
      ),
    [records, requests, patientAddress, userAddress, hasAccess],
  );

  const hasDocuments = records.length > 0;

  /* ---- scroll to bottom ---- */
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  /* ---- auto-resize textarea ---- */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      const el = e.target;
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    },
    [],
  );

  /* ---- stop pulse after first open ---- */
  useEffect(() => {
    if (isOpen) setShowPulse(false);
  }, [isOpen]);

  /* ---- focus input when panel opens ---- */
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  /* ---- send message ---- */
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      setError(null);

      const userMessage: ChatMessage = {
        id: generateId(),
        role: "user",
        content: text.trim(),
        timestamp: new Date(),
      };

      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setInput("");
      setIsStreaming(true);

      // Reset textarea height
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }

      // Build messages array for API (exclude the empty assistant message)
      const apiMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const abortController = new AbortController();
      abortRef.current = abortController;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: apiMessages,
            documentContext: documentContext || undefined,
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(
            (errData as { error?: string }).error ||
              `Request failed: ${response.status}`,
          );
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream available");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;

            const data = trimmed.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data) as { content?: string };
              if (parsed.content) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      content: last.content + parsed.content,
                    };
                  }
                  return updated;
                });
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          // User cancelled — do nothing
        } else {
          const errorMsg =
            err instanceof Error ? err.message : "Something went wrong";
          setError(errorMsg);
          // Remove the empty assistant message on error
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === "assistant" && last.content === "") {
              return prev.slice(0, -1);
            }
            return prev;
          });
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [isStreaming, messages, documentContext],
  );

  /* ---- handle submit ---- */
  const handleSubmit = useCallback(() => {
    sendMessage(input);
  }, [input, sendMessage]);

  /* ---- handle key down ---- */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  /* ---- handle quick action ---- */
  const handleQuickAction = useCallback(
    (prompt: string) => {
      sendMessage(prompt);
    },
    [sendMessage],
  );

  /* ---- stop streaming ---- */
  const handleStopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  /* ---- clear chat ---- */
  const handleClearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  /* ---- copy message ---- */
  const handleCopy = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // fallback: do nothing
    }
  }, []);

  /* ---- retry last message ---- */
  const handleRetry = useCallback(() => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg) {
      // Remove the last assistant message (if it's empty/error)
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === "assistant") {
          return prev.slice(0, -1);
        }
        return prev;
      });
      setError(null);
      // Remove the last user message too, since sendMessage will re-add it
      setMessages((prev) => {
        const idx = prev.length - 1;
        if (idx >= 0 && prev[idx]!.role === "user") {
          return prev.slice(0, -1);
        }
        return prev;
      });
      setTimeout(() => sendMessage(lastUserMsg.content), 50);
    }
  }, [messages, sendMessage]);

  /* ================================================================ */
  /*  RENDER                                                          */
  /* ================================================================ */

  return (
    <>
      {/* ---- FLOATING BUTTON ---- */}
      <button
        className={`${styles.floatingButton} ${isOpen ? styles.floatingButtonOpen : ""}`}
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? "Close AI chat" : "Open AI chat"}
        title="MedAssist AI"
      >
        {showPulse && !isOpen && <span className={styles.floatingPulse} />}
        {isOpen ? <CloseIcon size={22} /> : <SparklesIcon size={22} />}
      </button>

      {/* ---- CHAT PANEL ---- */}
      {isOpen && (
        <>
          <div
            className={styles.overlay}
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div className={styles.panel} role="dialog" aria-label="AI Chat">
            {/* ---- HEADER ---- */}
            <div className={styles.panelHeader}>
              <div className={styles.panelHeaderLeft}>
                <div className={styles.panelHeaderIcon}>
                  <BotIcon size={18} />
                </div>
                <div className={styles.panelHeaderInfo}>
                  <h3>MedAssist AI</h3>
                  <p>Document analysis &amp; reports</p>
                </div>
              </div>
              <div className={styles.panelHeaderActions}>
                {messages.length > 0 && (
                  <button
                    className={styles.headerBtn}
                    onClick={handleClearChat}
                    title="Clear chat"
                  >
                    <TrashIcon size={14} />
                  </button>
                )}
                <button
                  className={styles.headerBtn}
                  onClick={() => setIsOpen(false)}
                  title="Close"
                >
                  <CloseIcon size={16} />
                </button>
              </div>
            </div>

            {/* ---- CONTEXT BAR ---- */}
            <div
              className={`${styles.contextBar} ${!hasDocuments ? styles.contextBarEmpty : ""}`}
            >
              <span
                className={`${styles.contextDot} ${!hasDocuments ? styles.contextDotEmpty : ""}`}
              />
              {hasDocuments ? (
                <span>
                  {records.length} record{records.length !== 1 ? "s" : ""}{" "}
                  loaded
                  {patientAddress ? ` · ${truncateAddr(patientAddress)}` : ""}
                </span>
              ) : (
                <span>
                  No records loaded — load a patient to get document insights
                </span>
              )}
            </div>

            {/* ---- QUICK ACTIONS ---- */}
            {messages.length === 0 && (
              <div className={styles.quickActions}>
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    className={styles.quickBtn}
                    onClick={() => handleQuickAction(action.prompt)}
                    disabled={isStreaming}
                  >
                    <action.icon size={13} />
                    {action.label}
                  </button>
                ))}
              </div>
            )}

            {/* ---- MESSAGES ---- */}
            <div className={styles.messagesArea}>
              {messages.length === 0 && !isStreaming ? (
                <div className={styles.welcomeMessage}>
                  <div className={styles.welcomeIcon}>
                    <SparklesIcon size={28} />
                  </div>
                  <h4>MedAssist AI</h4>
                  <p>
                    Ask me anything about your medical records. I can generate
                    reports, analyze trends, and provide insights.
                  </p>
                  <div className={styles.welcomePrompts}>
                    {WELCOME_PROMPTS.map((wp) => (
                      <button
                        key={wp.text}
                        className={styles.welcomePrompt}
                        onClick={() => handleQuickAction(wp.prompt)}
                      >
                        <wp.icon size={16} />
                        {wp.text}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`${styles.message} ${
                        msg.role === "user"
                          ? styles.messageUser
                          : styles.messageAssistant
                      }`}
                    >
                      <div
                        className={`${styles.messageAvatar} ${
                          msg.role === "user"
                            ? styles.messageAvatarUser
                            : styles.messageAvatarAssistant
                        }`}
                      >
                        {msg.role === "user" ? (
                          <UserIcon size={14} />
                        ) : (
                          <BotIcon size={14} />
                        )}
                      </div>
                      <div>
                        <div
                          className={`${styles.messageBubble} ${
                            msg.role === "user"
                              ? styles.messageBubbleUser
                              : styles.messageBubbleAssistant
                          }`}
                        >
                          {msg.role === "assistant" && msg.content === "" ? (
                            <div className={styles.typingIndicator}>
                              <span className={styles.typingDot} />
                              <span className={styles.typingDot} />
                              <span className={styles.typingDot} />
                            </div>
                          ) : msg.role === "assistant" ? (
                            renderMarkdown(msg.content)
                          ) : (
                            msg.content
                          )}
                        </div>
                        <div className={styles.messageTime}>
                          {formatTime(msg.timestamp)}
                        </div>
                        {msg.role === "assistant" && msg.content && (
                          <div className={styles.messageActions}>
                            <button
                              className={styles.msgActionBtn}
                              onClick={() => handleCopy(msg.content)}
                              title="Copy message"
                            >
                              <CopyIcon size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {error && (
                    <div className={styles.errorMessage}>
                      <AlertCircleIcon size={16} />
                      <div>
                        <div>{error}</div>
                        <button
                          className={styles.retryBtn}
                          onClick={handleRetry}
                        >
                          Retry
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* ---- INPUT AREA ---- */}
            <div className={styles.inputArea}>
              {messages.length > 0 && !isStreaming && (
                <div className={styles.quickActions}>
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.label}
                      className={styles.quickBtn}
                      onClick={() => handleQuickAction(action.prompt)}
                      disabled={isStreaming}
                    >
                      <action.icon size={13} />
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
              <div className={styles.inputRow}>
                <textarea
                  ref={inputRef}
                  className={styles.chatInput}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    hasDocuments
                      ? "Ask about your records or request a report..."
                      : "Ask me anything..."
                  }
                  rows={1}
                  disabled={isStreaming}
                />
                {isStreaming ? (
                  <button
                    className={styles.sendBtn}
                    onClick={handleStopStreaming}
                    title="Stop generating"
                    style={{ background: "#ef4444" }}
                  >
                    <CloseIcon size={14} />
                  </button>
                ) : (
                  <button
                    className={styles.sendBtn}
                    onClick={handleSubmit}
                    disabled={!input.trim()}
                    title="Send message"
                  >
                    <SendIcon size={14} />
                  </button>
                )}
              </div>
              <div className={styles.inputHint}>
                <span>
                  <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for new line
                </span>
                <span>Powered by AI</span>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
