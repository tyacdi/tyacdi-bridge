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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
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

      setMessages((current) => [...current, data as Message]);
      setText("");
    } catch {
      setNotice(
        "Message could not be sent. Check your connection and permissions, then try again."
      );
    } finally {
      setSending(false);
    }
  }

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
          border: 1
