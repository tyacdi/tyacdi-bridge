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

        <div className="mt-9 grid gap-3 rounded-2xl border border-[#e1e7df] bg-white p-4 shadow-sm md:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">
              Search CEOs
            </span>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name or company..."
              className="w-full rounded-xl border border-[#dce3da] px-4 py-3 outline-none focus:border-[#648c6c]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold">
              Industry
            </span>

            <select
              value={industry}
              onChange={(event) => setIndustry(event.target.value)}
              className="w-full rounded-xl border border-[#dce3da] bg-white px-4 py-3 outline-none focus:border-[#648c6c]"
            >
              {industries.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold">
              Location
            </span>

            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="City or country..."
              className="w-full rounded-xl border border-[#dce3da] px-4 py-3 outline-none focus:border-[#648c6c]"
            />
          </label>
        </div>

        <div className="mb-5 mt-8 flex items-center justify-between">
          <h2 className="text-xl font-bold">CEO directory</h2>

          <span className="text-sm text-[#68746b]">
            {loading
              ? "Loading..."
              : `${filteredCEOs.length} ${
                  filteredCEOs.length === 1 ? "CEO" : "CEOs"
                } found`}
          </span>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-[#e1e7df] bg-white p-10 text-center text-[#68746b]">
            Loading CEO profiles...
          </div>
        ) : error ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800"
          >
            {error}
          </div>
        ) : filteredCEOs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#cbd7c9] bg-white px-6 py-14 text-center">
            <h3 className="text-lg font-bold">
              No CEOs found yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#68746b]">
              Try another search or location. CEO profiles will
              appear here when members have selected the
              CEO / Executive role.
            </p>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setIndustry("All industries");
                setLocation("");
              }}
              className="mt-5 rounded-xl bg-[#203c2a] px-5 py-3 text-sm font-semibold text-white hover:bg-[#31583d]"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredCEOs.map((ceo) => (
              <article
                key={ceo.id}
                className="flex flex-col rounded-2xl border border-[#e1e7df] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#e8f0e6] text-xl font-bold text-[#31583d]">
                    {ceo.full_name
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0]?.toUpperCase())
                      .join("") || "CEO"}
                  </div>

                  <div className="min-w-0">
                    <h3 className="break-words text-lg font-bold">
                      {ceo.full_name}
                    </h3>

                    <p className="mt-1 text-sm font-semibold text-[#52815c]">
                      CEO / Executive
                      {ceo.company ? ` · ${ceo.company}` : ""}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {ceo.industry && (
                    <span className="rounded-full bg-[#edf3eb] px-3 py-1 text-xs font-medium text-[#31583d]">
                      {ceo.industry}
                    </span>
                  )}

                  {ceo.location && (
                    <span className="rounded-full bg-[#f2f3ef] px-3 py-1 text-xs text-[#58635a]">
                      {ceo.location}
                    </span>
                  )}
                </div>

                <p className="mt-4 flex-1 whitespace-pre-line break-words text-sm leading-6 text-[#68746b]">
                  {ceo.bio || "This CEO has not added a biography yet."}
                </p>

                <div className="mt-6 border-t border-[#edf0eb] pt-4">
                  {ceo.id === currentUserId ? (
                    <span className="text-sm text-[#68746b]">
                      This is your profile
                    </span>
                  ) : (
                    <Link
                      href={`/messages?user=${encodeURIComponent(ceo.id)}`}
                      className="block rounded-xl bg-[#203c2a] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[#31583d]"
                    >
                      Message CEO
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        <footer className="mt-16 border-t border-[#e1e7df] py-6 text-center text-xs leading-6 text-[#788279]">
          TYACDI BRIDGE · LEARN BUILD GROW
          <br />
          Growth is gradual... But with us exponential.
        </footer>
      </section>
    </main>
  );
}
