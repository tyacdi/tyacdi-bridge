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

        const { data: profiles, error: profileError } = await supabase
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
    const content = text.trim();

    const { data, error } = await supabase
      .from("messages")
      .insert({
        sender_id: userId,
        receiver_id: selected.id,
        content,
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
        <Link href="/dashboard" className="flex items-center gap-3">
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
 
