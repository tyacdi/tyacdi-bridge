"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  full_name: string;
  role?: string;
  company?: string | null;
};

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
};

const theme = {
  green: "#183D2B",
  greenLight: "#E8F0E9",
  cream: "#F7F7F1",
  border: "#E1E7E0",
  muted: "#718078",
};

export default function MessagesPage() {
  const [userId, setUserId] = useState("");
  const [connections, setConnections] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);

  // Load the logged-in user's accepted connections.
  useEffect(() => {
    let active = true;

    async function loadConnections() {
      const supabase = createClient();

      try {
        const { data: auth, error: authError } =
          await supabase.auth.getUser();

        if (authError || !auth.user) {
          window.location.href = "/login";
          return;
        }

        if (!active) return;

        setUserId(auth.user.id);

        const { data: requests, error } = await supabase
          .from("connection_requests")
          .select("from_user,to_user")
          .eq("status", "accepted")
          .or(
            `from_user.eq.${auth.user.id},to_user.eq.${auth.user.id}`
          );

        if (error) throw error;

        const ids = [
          ...new Set(
            (requests || []).map((request) =>
              request.from_user === auth.user.id
                ? request.to_user
                : request.from_user
            )
          ),
        ];

        if (ids.length === 0) {
          if (active) setConnections([]);
          return;
        }

        const { data: profiles, error: profileError } =
          await supabase
            .from("profiles")
            .select("id,full_name,role,company")
            .in("id", ids);

        if (profileError) throw profileError;

        if (active) {
          setConnections((profiles || []) as Profile[]);
        }
      } catch (error) {
        if (active) {
          setNotice(
            error instanceof Error
              ? error.message
              : "Could not load your connections."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadConnections();

    return () => {
      active = false;
    };
  }, []);

  // Automatically scroll to the newest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // REAL-TIME MESSAGING:
  // Receive messages from the other user without refreshing.
  useEffect(() => {
    if (!userId || !selected?.id) return;

    const supabase = createClient();
    const conversationId = selected.id;

    const channel = supabase
      .channel(`messages:${userId}:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const incoming = payload.new as Message;

          const belongsToConversation =
            (incoming.sender_id === userId &&
              incoming.receiver_id === conversationId) ||
            (incoming.sender_id === conversationId &&
              incoming.receiver_id === userId);

          if (!belongsToConversation) return;

          setMessages((current) => {
            // Prevent duplicate messages.
            if (
              current.some(
                (message) => message.id === incoming.id
              )
            ) {
              return current;
            }

            return [...current, incoming].sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime()
            );
          });

          if (incoming.sender_id !== userId) {
            setNotice(
              `New message from ${
                selected.full_name || "your connection"
              }`
            );
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, selected?.id, selected?.full_name]);

  // Open an existing conversation.
  async function openConversation(person: Profile) {
    setSelected(person);
    setMessages([]);
    setNotice("");
    setLoadingMessages(true);

    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${person.id}),and(sender_id.eq.${person.id},receiver_id.eq.${userId})`
        )
        .order("created_at", { ascending: true })
        .limit(200);

      if (error) throw error;

      setMessages((data || []) as Message[]);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? `Could not load messages: ${error.message}`
          : "Could not load this conversation."
      );
    } finally {
      setLoadingMessages(false);
    }
  }

  // Send a message.
  async function sendMessage(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const content = text.trim();

    if (!selected || !content || sending) return;

    setSending(true);
    setNotice("");

    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("messages")
        .insert({
          sender_id: userId,
          receiver_id: selected.id,
          content,
        })
        .select("*")
        .single();

      if (error) throw error;

      setMessages((current) => {
        if (current.some((message) => message.id === data.id)) {
          return current;
        }

        return [...current, data as Message];
      });

      setText("");
    } catch {
      setNotice(
        "Message could not be sent. Check your connection and permissions, then try again."
      );
    } finally {
      setSending(false);
    }
  }

  // Search your connections by name.
  const filteredConnections = connections.filter((person) =>
    (person.full_name || "Member")
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );

  function initials(name: string) {
    return name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: theme.cream,
        color: "#20372B",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        .message-layout {
          display: grid;
          grid-template-columns: 300px minmax(0, 1fr);
          min-height: 570px;
          overflow: hidden;
          border: 1px solid ${theme.border};
          border-radius: 20px;
          background: #fff;
          box-shadow: 0 12px 40px rgba(24, 61, 43, 0.06);
        }

        .connection-panel {
          min-width: 0;
          padding: 22px 16px;
          border-right: 1px solid ${theme.border};
          background: #fff;
        }

        .conversation-panel {
          display: flex;
          min-width: 0;
          min-height: 570px;
          flex-direction: column;
          background: #fff;
        }

        .connection-button {
          display: flex;
          width: 100%;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border: 1px solid transparent;
          border-radius: 13px;
          background: transparent;
          color: #20372b;
          text-align: left;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
        }

        .connection-button:hover {
          background: ${theme.cream};
        }

        .connection-button.active {
          border-color: #cbdccf;
          background: ${theme.greenLight};
        }

        .avatar {
          display: flex;
          width: 43px;
          height: 43px;
          flex: 0 0 43px;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: ${theme.green};
          color: #fff;
          font-size: 13px;
          font-weight: 700;
        }

        .chat-messages {
          display: flex;
          flex: 1;
          min-height: 300px;
          flex-direction: column;
          gap: 16px;
          overflow-y: auto;
          padding: 24px;
          background: #fbfcf9;
        }

        .chat-bubble {
          max-width: 78%;
          overflow-wrap: anywhere;
          padding: 13px 16px;
          border-radius: 17px;
          font-size: 14px;
          line-height: 1.65;
          white-space: pre-wrap;
        }

        .chat-bubble.mine {
          border-bottom-right-radius: 5px;
          background: ${theme.green};
          color: #fff;
        }

        .chat-bubble.theirs {
          border: 1px solid ${theme.border};
          border-bottom-left-radius: 5px;
          background: #fff;
          color: #26372d;
        }

        .chat-composer {
          display: flex;
          gap: 10px;
          padding: 16px;
          border-top: 1px solid ${theme.border};
          background: #fff;
        }

        .chat-input {
          width: 100%;
          min-width: 0;
          border: 1px solid ${theme.border};
          border-radius: 13px;
          background: #fafbf8;
          padding: 13px 15px;
          color: #20372b;
          font: inherit;
          font-size: 14px;
          outline: none;
        }

        .chat-input:focus {
          border-color: ${theme.green};
          box-shadow: 0 0 0 3px rgba(24, 61, 43, 0.08);
        }

        .send-button {
          flex-shrink: 0;
          border: 0;
          border-radius: 13px;
          background: ${theme.green};
          padding: 0 22px;
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s;
        }

        .send-button:hover:not(:disabled) {
          background: #285a3e;
        }

        .send-button:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }

        .dashboard-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid ${theme.border};
          border-radius: 10px;
          padding: 10px 15px;
          color: ${theme.green};
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
        }

        .dashboard-link:hover {
          background: ${theme.greenLight};
        }

        @media (max-width: 640px) {
          .message-layout {
            grid-template-columns: minmax(0, 1fr);
            min-height: 0;
            border-radius: 15px;
          }

          .connection-panel {
            border-right: 0;
            border-bottom: 1px solid ${theme.border};
            padding: 17px 12px;
          }

          .connection-list {
            display: flex;
            gap: 9px;
            overflow-x: auto;
            padding-bottom: 5px;
          }

          .connection-list li {
            flex: 0 0 190px;
          }

          .connection-button {
            height: 100%;
            padding: 10px;
          }

          .conversation-panel {
            min-height: 440px;
          }

          .chat-messages {
            min-height: 260px;
            padding: 16px 12px;
          }

          .chat-bubble {
            max-width: 88%;
          }

          .chat-composer {
            gap: 8px;
            padding: 12px;
          }

          .send-button {
            padding: 0 15px;
          }

          .page-heading {
            font-size: 30px !important;
          }
        }
      `}</style>

      {/* Brand navigation */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          borderBottom: `1px solid ${theme.border}`,
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            minHeight: 76,
            margin: "0 auto",
            padding: "10px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <Link
            href="/dashboard"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              minWidth: 0,
              color: theme.green,
              textDecoration: "none",
            }}
          >
            <Image
              src="/tyacdi-logo.png"
              alt="TYACDI BRIDGE logo"
              width={150}
              height={75}
              priority
              style={{
                width: 95,
                height: 48,
                objectFit: "contain",
              }}
            />

            <span
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 3,
              }}
            >
              <strong
                style={{ fontSize: 14, letterSpacing: "0.04em" }}
              >
                TYACDI BRIDGE
              </strong>

              <span
                style={{
                  color: theme.muted,
                  fontSize: 10,
                  letterSpacing: "0.12em",
                }}
              >
                LEARN. BUILD. GROW.
              </span>
            </span>
          </Link>

          <Link className="dashboard-link" href="/dashboard">
            ← Dashboard
          </Link>
        </div>
      </header>

      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "30px 20px 40px",
        }}
      >
        {/* Page introduction */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 25,
          }}
        >
          <div>
            <p
              style={{
                margin: "0 0 9px",
                color: "#53745e",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.16em",
              }}
            >
              YOUR NETWORK · YOUR NEXT OPPORTUNITY
            </p>

            <h1
              className="page-heading"
              style={{
                margin: 0,
                color: theme.green,
                fontSize: 38,
                fontWeight: 800,
                letterSpacing: "-0.04em",
              }}
            >
              Messages
            </h1>

            <p
              style={{
                margin: "10px 0 0",
                color: theme.muted,
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              Build meaningful professional relationships, one conversation
              at a time.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: theme.green,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#5d9a69",
              }}
            />
            Private conversations
          </div>
        </div>

        {notice && (
          <div
            role="status"
            style={{
              marginBottom: 18,
              border: "1px solid #e8d9b2",
              borderRadius: 12,
              background: "#fff8e8",
              padding: "13px 16px",
              color: "#775a22",
              fontSize: 13,
              overflowWrap: "anywhere",
            }}
          >
            {notice}
          </div>
        )}

        {/* Main messaging workspace */}
        <div className="message-layout">
          <aside className="connection-panel">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                marginBottom: 15,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  color: theme.green,
                  fontSize: 15,
                  fontWeight: 800,
                }}
              >
                Your connections
              </h2>

              <span
                style={{
                  minWidth: 25,
                  borderRadius: 20,
                  background: theme.greenLight,
                  padding: "4px 8px",
                  color: theme.green,
                  textAlign: "center",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {connections.length}
              </span>
            </div>

            <input
              className="chat-input"
              aria-label="Search connections"
              placeholder="Search connections..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ marginBottom: 14 }}
            />

            {loading ? (
              <p style={{ color: theme.muted, fontSize: 13 }}>
                Loading connections...
              </p>
            ) : connections.length === 0 ? (
              <div
                style={{
                  borderRadius: 13,
                  background: theme.cream,
                  padding: 15,
                  color: theme.muted,
                  fontSize: 13,
                  lineHeight: 1.7,
                }}
              >
                No accepted connections yet. Visit your dashboard to connect
                with members and start a conversation.

                <p style={{ margin: "12px 0 0" }}>
                  <Link
                    href="/dashboard"
                    style={{
                      color: theme.green,
                      fontWeight: 700,
                    }}
                  >
                    Discover members →
                  </Link>
                </p>
              </div>
            ) : filteredConnections.length === 0 ? (
              <p style={{ color: theme.muted, fontSize: 13 }}>
                No connections match your search.
              </p>
            ) : (
              <ul
                className="connection-list"
                style={{
                  display: "grid",
                  gap: 6,
                  margin: 0,
                  padding: 0,
                  listStyle: "none",
                }}
              >
                {filteredConnections.map((person) => (
                  <li key={person.id}>
                    <button
                      type="button"
                      onClick={() => openConversation(person)}
                      aria-pressed={selected?.id === person.id}
                      className={`connection-button ${
                        selected?.id === person.id ? "active" : ""
                      }`}
                    >
                      <span className="avatar">
                        {initials(person.full_name || "Member")}
                      </span>

                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span
                          style={{
                            display: "block",
                            overflow: "hidden",
                            color: theme.green,
                            fontSize: 13,
                            fontWeight: 700,
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {person.full_name || "Member"}
                        </span>

                        <span
                          style={{
                            display: "block",
                            overflow: "hidden",
                            marginTop: 5,
                            color: theme.muted,
                            fontSize: 11,
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {[person.role, person.company]
                            .filter(Boolean)
                            .join(" · ") || "TYACDI member"}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          {/* Conversation panel */}
          <section className="conversation-panel">
            {!selected ? (
              <div
                style={{
                  display: "flex",
                  flex: 1,
                  minHeight: 400,
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 30,
                  textAlign: "center",
                }}
              >
                <div style={{ maxWidth: 300 }}>
                  <div
                    style={{
                      display: "flex",
                      width: 68,
                      height: 68,
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 18px",
                      borderRadius: 22,
                      background: theme.greenLight,
                      color: theme.green,
                      fontSize: 29,
                    }}
                  >
                    ↗
                  </div>

                  <h2
                    style={{
                      margin: "0 0 10px",
                      color: theme.green,
                      fontSize: 20,
                      fontWeight: 800,
                    }}
                  >
                    Your next conversation starts here.
                  </h2>

                  <p
                    style={{
                      margin: 0,
                      color: theme.muted,
                      fontSize: 13,
                      lineHeight: 1.8,
                    }}
                  >
                    Choose a connection to exchange ideas, share progress,
                    and learn from one another.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Conversation heading */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    borderBottom: `1px solid ${theme.border}`,
                    padding: "17px 20px",
                  }}
                >
                  <span className="avatar">
                    {initials(selected.full_name || "Member")}
                  </span>

                  <div style={{ minWidth: 0 }}>
                    <h2
                      style={{
                        margin: 0,
                        color: theme.green,
                        fontSize: 15,
                        fontWeight: 800,
                      }}
                    >
                      {selected.full_name || "Member"}
                    </h2>

                    <p
                      style={{
                        margin: "5px 0 0",
                        color: theme.muted,
                        fontSize: 12,
                      }}
                    >
                      {[selected.role, selected.company]
                        .filter(Boolean)
                        .join(" · ") || "TYACDI BRIDGE member"}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div
                  className="chat-messages"
                  aria-live="polite"
                  aria-label="Conversation messages"
                >
                  {loadingMessages ? (
                    <p
                      style={{
                        margin: "auto",
                        color: theme.muted,
                        fontSize: 13,
                      }}
                    >
                      Loading conversation...
                    </p>
                  ) : messages.length === 0 ? (
                    <div style={{ margin: "auto", textAlign: "center" }}>
                      <p
                        style={{
                          margin: "0 0 8px",
                          color: theme.green,
                          fontWeight: 700,
                          fontSize: 15,
                        }}
                      >
                        Start a meaningful conversation.
                      </p>

                      <p
                        style={{
                          margin: 0,
                          color: theme.muted,
                          fontSize: 12,
                        }}
                      >
                        Introduce yourself or share an idea.
                      </p>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const mine = message.sender_id === userId;

                      return (
                        <div
                          key={message.id}
                          style={{
                            display: "flex",
                            justifyContent: mine
                              ? "flex-end"
                              : "flex-start",
                          }}
                        >
                          <div
                            className={`chat-bubble ${
                              mine ? "mine" : "theirs"
                            }`}
                          >
                            <p style={{ margin: 0 }}>
                              {message.content}
                            </p>

                            <p
                              style={{
                                margin: "7px 0 0",
                                fontSize: 10,
                                opacity: mine ? 0.72 : 0.75,
                                textAlign: "right",
                              }}
                            >
                              {new Date(
                                message.created_at
                              ).toLocaleString([], {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}

                  <div ref={bottomRef} />
                </div>

                {/* Message composer */}
                <form onSubmit={sendMessage} className="chat-composer">
                  <input
                    className="chat-input"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    maxLength={5000}
                    placeholder={`Message ${
                      selected.full_name || "member"
                    }...`}
                    aria-label="Message"
                    autoComplete="off"
                  />

                  <button
                    type="submit"
                    disabled={
                      !text.trim() || sending || loadingMessages
                    }
                    className="send-button"
                  >
                    {sending ? "Sending..." : "Send"}
                  </button>
                </form>
              </>
            )}
          </section>
        </div>

        <footer
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 10,
            marginTop: 24,
            color: theme.muted,
            fontSize: 11,
          }}
        >
          <span>© TYACDI BRIDGE · LEARN. BUILD. GROW.</span>
          <span>Growth is gradual. With us, exponential.</span>
        </footer>
      </div>
    </main>
  );
}
