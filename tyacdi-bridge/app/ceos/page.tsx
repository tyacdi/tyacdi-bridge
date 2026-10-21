"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type CEOProfile = {
  id: string;
  full_name: string;
  role: string | null;
  company: string | null;
  industry: string | null;
  location: string | null;
  bio: string | null;
};

export default function FindCEOsPage() {
  const [profiles, setProfiles] = useState<CEOProfile[]>([]);
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("All industries");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  async function loadCEOs() {
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        window.location.href = "/login";
        return;
      }

      setCurrentUserId(user.id);

      const { data, error: queryError } = await supabase
        .from("profiles")
        .select("id, full_name, role, company, industry, location, bio")
        .eq("role", "CEO / Executive")
        .order("full_name", { ascending: true });

      if (queryError) {
        console.error("Error loading CEO profiles:", queryError);
        setError(
          `Unable to load CEO profiles: ${queryError.message}. Check your Supabase column names and permissions.`
        );
        return;
      }

      setProfiles((data ?? []) as CEOProfile[]);
    } catch (err) {
      console.error("Unexpected error loading CEO profiles:", err);
      setError(
        "Something went wrong while loading CEO profiles. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCEOs();
  }, []);

  const industries = useMemo(() => {
    const values = profiles
      .map((profile) => profile.industry?.trim())
      .filter((value): value is string => Boolean(value));

    return [
      "All industries",
      ...Array.from(new Set(values)).sort(),
    ];
  }, [profiles]);

  const filteredCEOs = useMemo(() => {
    const term = search.trim().toLowerCase();
    const place = location.trim().toLowerCase();

    return profiles.filter((profile) => {
      const matchesSearch =
        !term ||
        (profile.full_name ?? "").toLowerCase().includes(term) ||
        (profile.company ?? "").toLowerCase().includes(term);

      const matchesIndustry =
        industry === "All industries" ||
        profile.industry === industry;

      const matchesLocation =
        !place ||
        (profile.location ?? "").toLowerCase().includes(place);

      return matchesSearch && matchesIndustry && matchesLocation;
    });
  }, [profiles, search, industry, location]);

  const inputStyles =
    "w-full rounded-xl border border-[#d9e4d8] bg-white px-4 py-3 text-sm text-[#203c2a] outline-none transition placeholder:text-[#9aa79b] focus:border-[#527b59] focus:ring-4 focus:ring-[#527b59]/10";

  return (
    <main className="min-h-screen bg-[#f5f7f2] text-[#203c2a]">
      <header className="sticky top-0 z-20 border-b border-[#e1e8de] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link
            href="/dashboard"
            className="flex items-center gap-3"
            aria-label="TYACDI BRIDGE home"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#203c2a] text-lg font-extrabold text-white shadow-sm">
              T
            </div>

            <div>
              <p className="text-lg font-extrabold tracking-tight text-[#203c2a]">
                TYACDI <span className="text-[#608668]">BRIDGE</span>
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#819083]">
                Learn · Build · Grow
              </p>
            </div>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/dashboard"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-[#667568] transition hover:bg-[#f0f4ed] hover:text-[#203c2a]"
            >
              Dashboard
            </Link>

            <Link
              href="/messages"
              className="rounded-xl bg-[#203c2a] px-4 py-2.5 text-sm font
