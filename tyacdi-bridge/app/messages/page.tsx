"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
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

export default function MessagesPage() {
  const [userId, setUserId] = useState("");
  const [connections, setConnections] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    async function loadConnections() {
      const supabase = createClient();

      try {
        const { data: auth, error: authError } =
          await supabase.auth.getUser();

        if (authError || !auth.user) {
          window.location.href = "/login";
          return;
        }

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
          setConnections([]);
          return;
        }

        const { data: profiles, error: profileError } =
          await supabase
            .from("profiles")
            .select("id,full_name,role,company")
            .in("id", ids);

        if (profileError) throw profileError;

        setConnections((profiles || []) as Profile[]);
      } catch (error) {
        setNotice(
          error instanceof Error
            ? error.message
            : "Could not load your connections."
        );
      } finally {
        setLoading(false);
      }
    }

    loadConnections();
  }, []);

  async function openConversation(person: Profile) {
    setSelected(person);
    setMessages([]);
    setNotice("");

    const supabase = createClient();

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${userId},receiver_id.eq.${person.id}),and(sender_id.eq.${person.id},receiver_id.eq.${userId})`
      )
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) {
      setNotice("Could not load messages: " + error.message);
      return;
    }

    setMessages((data || []) as Message[]);
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selected || !text.trim() || sending) return;

    setSending(true);
    setNotice("");

    const supabase = createClient();

    const { data, error } = await supabase
      .from("messages")
      .insert({
        sender_id: userId,
        receiver_id: selected.id,
        content: text.trim(),
      })
      .select("*")
      .single();

    if (error) {
      setNotice(
        "Message could not be sent. Check your connection and permissions."
      );
    } else {
      setMessages((current) => [...current, data as Message]);
      setText("");
    }

    setSending(false);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="flex items-center justify-between border-b bg-white px-5 py-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-3"
        >
          <Image
            src="/tyacdi-logo.png"
            alt="TYACDI Bridge"
            width={44}
            height={44}
            className="h-11 w-11 object-contain"
          />
          <span className="font-semibold">TYACDI BRIDGE</span>
        </Link>

        <Link
          href="/dashboard"
          className="rounded-lg border px-4 py-2 text-sm"
        >
          Dashboard
        </Link>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-bold">Messages</h1>

        <p className="mt-2 text-slate-600">
          Have professional conversations with your connections.
        </p>

        {notice && (
          <p
            role="status"
            className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
          >
            {notice}
          </p>
        )}

        <div className="mt-6 grid min-h-[500px] overflow-hidden rounded-2xl border bg-white md:grid-cols-[280px_1fr]">
          <aside className="border-b p-4 md:border-b-0 md:border-r">
            <h2 className="font-semibold">Your connections</h2>

            {loading ? (
              <p className="mt-4 text-sm text-slate-500">
                Loading connections...
              </p>
            ) : connections.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                No accepted connections yet. Connect with someone
                from your dashboard to start a conversation.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {connections.map((person) => (
                  <li key={person.id}>
                    <button
                      type="button"
                      onClick={() => openConversation(person)}
                      className={`w-full rounded-xl border p-3 text-left hover:bg-slate-50 ${
                        selected?.id === person.id
                          ? "border-slate-900 bg-slate-50"
                          : "border-slate-200"
                      }`}
                    >
                      <span className="block font-medium">
                        {person.full_name || "Member"}
                      </span>

                      <span className="mt-1 block text-sm text-slate-500">
                        {[person.role, person.company]
                          .filter(Boolean)
                          .join(" · ") ||
                          "TYACDI Bridge member"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          <section className="flex min-h-[500px] flex-col">
            {!selected ? (
              <div className="flex flex-1 items-center justify-center p-8 text-center text-slate-500">
                Select a connection to view your conversation.
              </div>
            ) : (
              <>
                <div className="border-b p-4">
                  <h2 className="font-semibold">
                    {selected.full_name || "Member"}
                  </h2>
                  <p className="text-sm text-slate-500">
                    Private conversation
                  </p>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  {messages.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500">
                      No messages yet. Send the first message.
                    </p>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.sender_id === userId
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[70%] ${
                            message.sender_id === userId
                              ? "bg-slate-900 text-white"
                              : "bg-slate-100 text-slate-900"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">
                            {message.content}
                          </p>

                          <p
                            className={`mt-1 text-xs ${
                              message.sender_id === userId
                                ? "text-slate-300"
                                : "text-slate-500"
                            }`}
                          >
                            {new Date(
                              message.created_at
                            ).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <form
                  onSubmit={sendMessage}
                  className="flex gap-2 border-t p-4"
                >
                  <input
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    maxLength={5000}
                    placeholder="Write a message..."
                    aria-label="Message"
                    className="min-w-0 flex-1 rounded-xl border px-4 py-3 outline-none focus:border-slate-500"
                  />

                  <button
                    type="submit"
                    disabled={!text.trim() || sending}
                    className="rounded-xl bg-slate-900 px-5 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {sending ? "Sending..." : "Send"}
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
