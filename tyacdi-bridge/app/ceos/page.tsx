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

  useEffect(() => {
    async function loadCEOs() {
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
        .select(
          "id, full_name, role, company, industry, location, bio"
        )
        .eq("role", "CEO / Executive")
        .order("full_name", { ascending: true });

      if (queryError) {
        console.error("Error loading CEO profiles:", queryError);
        setError(
          "We couldn't load CEO profiles. Check your Supabase profiles table and permissions."
        );
      } else {
        setProfiles((data ?? []) as CEOProfile[]);
      }

      setLoading(false);
    }

    loadCEOs();
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

      return (
        matchesSearch &&
        matchesIndustry &&
        matchesLocation
      );
    });
  }, [profiles, search, industry, location]);

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#17251c]">
      <header className="border-b border-[#e1e7df] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5">
          <Link
            href="/dashboard"
            className="text-xl font-bold tracking-tight"
          >
            TYACDI <span className="text-[#52815c]">BRIDGE</span>
          </Link>

          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link
              href="/dashboard"
              className="text-[#5e6b61] hover:text-[#17251c]"
            >
              Dashboard
            </Link>

            <Link
              href="/messages"
              className="rounded-xl bg-[#203c2a] px-4 py-2.5 text-white hover:bg-[#31583d]"
            >
              Messages
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-12">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#64806a]">
          Build meaningful connections
        </p>

        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              Find CEOs
            </h1>

            <p className="mt-4 max-w-2xl leading-7 text-[#68746b]">
              Discover business leaders, explore their experience,
              and connect with people who can help you grow.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="w-fit rounded-xl border border-[#d8e0d6] bg-white px-5 py-3 text-sm font-semibold hover:bg-[#eef3ed]"
          >
            Back to dashboard
          </Link>
        </div>

        <div className="mt-9 grid gap-3 rounded-2xl border border-[#e1e7df] bg-white p
