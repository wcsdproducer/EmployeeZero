"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function SupportChat() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! 👋 I'm the Employee Zero Support Assistant. I can help with setting up connections, managing workflows, troubleshooting, and more. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ticketCreated, setTicketCreated] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Poll for agent replies when user is logged in
  useEffect(() => {
    if (!user?.uid) return;
    const MC_BASE =
      "https://mission-control--gravity-claw-brain-1773939330.us-central1.hosted.app";
    const checkReplies = async () => {
      try {
        const res = await fetch(
          `${MC_BASE}/api/support/check?userId=${user.uid}&workspace=employee-zero`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.hasUnread && data.tickets?.length > 0) {
            setHasUnread(true);
            if (open) {
              data.tickets.forEach(
                (t: { lastAgentMessage: string; subject: string }) => {
                  if (t.lastAgentMessage) {
                    setMessages((prev) => {
                      const alreadyShown = prev.some(
                        (m) => m.content === t.lastAgentMessage
                      );
                      if (alreadyShown) return prev;
                      return [
                        ...prev,
                        {
                          role: "assistant" as const,
                          content: `🛡️ **Support Team Response:**\n\n${t.lastAgentMessage}`,
                        },
                      ];
                    });
                  }
                }
              );
            }
          }
        }
      } catch {
        /* silent */
      }
    };
    checkReplies();
    const interval = setInterval(checkReplies, 30000);
    return () => clearInterval(interval);
  }, [user?.uid, open]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: [...messages, userMsg].slice(-10),
        }),
      });
      const data = await res.json();
      const reply = data.reply || "Sorry, I couldn't process that.";

      if (reply.includes("[ESCALATE]")) {
        const cleanReply = reply.replace("[ESCALATE]", "").trim();
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: cleanReply },
        ]);
        await handleEscalate();
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I'm having trouble connecting. Please try again or email john@t3kniq.com.",
        },
      ]);
    }

    setLoading(false);
  };

  const handleEscalate = async () => {
    if (ticketCreated) return;
    setLoading(true);
    try {
      const res = await fetch("/api/support/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.uid || "anonymous",
          userEmail: user?.email || "",
          userName: user?.displayName || "",
          subject: "Chat Escalation",
          messages: messages.map((m) => ({
            ...m,
            timestamp: new Date().toISOString(),
          })),
          category: "escalation",
        }),
      });
      const data = await res.json();
      setTicketCreated(true);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `✅ Support ticket created (ID: ${data.ticketId?.slice(0, 8)}...). Our team will review your issue within 24 hours. You can also email john@t3kniq.com for urgent matters.`,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I couldn't create a ticket right now. Please email john@t3kniq.com directly.",
        },
      ]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating bubble */}
      <button
        onClick={() => setOpen(!open)}
        aria-label="Open support chat"
        id="support-chat-toggle"
        type="button"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 24px rgba(124,58,237,0.4)",
          zIndex: 9998,
          transition: "transform 0.2s",
        }}
      >
        {open ? (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            {hasUnread && !open && (
              <span
                style={{
                  position: "absolute",
                  top: -2,
                  right: -2,
                  width: 14,
                  height: 14,
                  background: "#ef4444",
                  borderRadius: "50%",
                  border: "2px solid #1a1a2e",
                  animation: "pulse 2s infinite",
                }}
              />
            )}
          </>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 90,
            right: 24,
            width: 380,
            maxHeight: 520,
            borderRadius: 16,
            background: "#0f0f1a",
            border: "1px solid rgba(124,58,237,0.2)",
            boxShadow: "0 12px 48px rgba(0,0,0,0.5)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 9999,
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 16px",
              background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                }}
              >
                ⚡
              </div>
              <div>
                <div
                  style={{ fontWeight: 700, fontSize: "0.88rem", color: "#fff" }}
                >
                  Employee Zero Support
                </div>
                <div
                  style={{
                    fontSize: "0.72rem",
                    color: "rgba(255,255,255,0.7)",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#22c55e",
                    }}
                  />
                  AI-Powered • Typically instant
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              type="button"
              aria-label="Close chat"
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.7)",
                cursor: "pointer",
                padding: 4,
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflow: "auto",
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent:
                    msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "85%",
                    padding: "8px 12px",
                    borderRadius: 12,
                    fontSize: "0.84rem",
                    lineHeight: 1.5,
                    background:
                      msg.role === "user"
                        ? "linear-gradient(135deg, #7c3aed, #6d28d9)"
                        : "rgba(255,255,255,0.06)",
                    color: "#fff",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div
                  style={{
                    padding: "8px 14px",
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.06)",
                    display: "flex",
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#7c3aed",
                      animation: "pulse 1.4s infinite",
                    }}
                  />
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#7c3aed",
                      animation: "pulse 1.4s infinite 0.2s",
                    }}
                  />
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#7c3aed",
                      animation: "pulse 1.4s infinite 0.4s",
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Escalate button */}
          {!ticketCreated && messages.length > 2 && (
            <button
              onClick={handleEscalate}
              disabled={loading}
              type="button"
              style={{
                margin: "0 14px 8px",
                padding: "6px 12px",
                borderRadius: 8,
                background: "rgba(124,58,237,0.1)",
                border: "1px solid rgba(124,58,237,0.2)",
                color: "#a78bfa",
                fontSize: "0.76rem",
                fontWeight: 600,
                cursor: loading ? "wait" : "pointer",
                transition: "all 0.2s",
              }}
            >
              🙋 Talk to a Human
            </button>
          )}

          {/* Input */}
          <div
            style={{
              padding: "10px 14px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              gap: 8,
            }}
          >
            <input
              type="text"
              placeholder="Ask a question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              id="support-chat-input"
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: 8,
                fontSize: "0.84rem",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#fff",
                outline: "none",
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              type="button"
              aria-label="Send message"
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                background: input.trim()
                  ? "linear-gradient(135deg, #7c3aed, #6d28d9)"
                  : "rgba(255,255,255,0.06)",
                border: "none",
                color: input.trim() ? "#fff" : "rgba(255,255,255,0.3)",
                cursor: input.trim() ? "pointer" : "default",
                transition: "all 0.2s",
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
