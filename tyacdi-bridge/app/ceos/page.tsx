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
    "w-full min-w-0 rounded-xl border border-[#d9e4d8] bg-white px-4 py-3 text-sm text-[#203c2a] outline-none transition placeholder:text-[#9aa79b] focus:border-[#527b59] focus:ring-4 focus:ring-[#527b59]/10";

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f5f7f2] text-[#203c2a]">
      {/* Navigation */}
      <header className="sticky top-0 z-30 border-b border-[#e0e8dd] bg-white/95 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-8">
          <Link
            href="/dashboard"
            className="flex min-w-0 items-center gap-3"
            aria-label="TYACDI BRIDGE home"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#203c2a] text-xl font-black text-white shadow-lg shadow-[#203c2a]/15 sm:h-12 sm:w-12">
              T
            </div>

            <div className="min-w-0">
              <p className="text-base font-black tracking-tight sm:text-lg">
                TYACDI <span className="text-[#63866a]">BRIDGE</span>
              </p>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#849184] sm:text-[10px] sm:tracking-[0.25em]">
                Learn · Build · Grow
              </p>
            </div>
          </Link>

          <nav className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Link
              href="/dashboard"
              className="rounded-xl px-2 py-2.5 text-xs font-semibold text-[#637267] transition hover:bg-[#edf3e9] hover:text-[#203c2a] sm:px-3 sm:text-sm"
            >
              Dashboard
            </Link>

            <Link
              href="/messages"
              className="rounded-xl bg-[#203c2a] px-3 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-[#365a40] sm:px-4 sm:text-sm"
            >
              Messages
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-[#203c2a]">
        <div className="pointer-events-none absolute -right-20 -top-20 -z-10 h-80 w-80 rounded-full bg-[#8bb18a]/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 left-1/4 -z-10 h-96 w-96 rounded-full bg-[#63866a]/20 blur-3xl" />

        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
          <div className="max-w-4xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#dce9d9] sm:tracking-[0.18em]">
              <span className="h-2 w-2 rounded-full bg-[#b5d2ae]" />
              The TYACDI professional network
            </div>

            <h1 className="text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl md:text-7xl">
              Great connections.
              <br />
              <span className="text-[#b5d2ae]">
                Greater possibilities.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-[#d3dfd1] sm:text-lg">
              Meet CEOs and business executives, learn from their
              experience, and build relationships that move your
              ambitions forward.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              {["Leadership", "Mentorship", "Business growth"].map(
                (item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/15 bg-white/[0.07] px-4 py-2 text-sm font-medium text-white/90"
                  >
                    {item}
                  </span>
                )
              )}
            </div>

            <a
              href="#ceo-search"
              className="mt-9 inline-flex items-center gap-2 rounded-xl bg-[#b5d2ae] px-5 py-3 text-sm font-bold text-[#203c2a] shadow-lg transition hover:bg-white"
            >
              Explore business leaders
              <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>

        {/* Three steps */}
        <div className="border-t border-white/10 bg-white/[0.04]">
          <div className="mx-auto grid max-w-7xl gap-5 px-5 py-6 sm:grid-cols-3 sm:px-8">
            {[
              ["01", "Discover", "Find experienced business leaders"],
              ["02", "Connect", "Start meaningful conversations"],
              ["03", "Grow", "Learn from experience"],
            ].map(([number, title, description]) => (
              <div key={number} className="flex items-start gap-4">
                <span className="text-sm font-black text-[#b5d2ae]">
                  {number}
                </span>

                <div>
                  <p className="font-bold text-white">{title}</p>
                  <p className="mt-1 text-sm text-[#bdcdbd]">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Search and directory */}
      <section
        id="ceo-search"
        className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16"
      >
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#63866a]">
            Explore the network
          </p>

          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Find your next connection.
          </h2>

          <p className="mt-3 max-w-2xl leading-7 text-[#758176]">
            Search by name, company, industry, or location to discover
            the right people for your journey.
          </p>
        </div>

        {/* Search card */}
        <div className="rounded-3xl border border-[#e0e8dd] bg-white p-5 shadow-[0_15px_50px_rgba(32,60,42,0.06)] sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#edf3e9] text-[#31583d]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m16 16 4 4" />
              </svg>
            </div>

            <div>
              <h3 className="font-bold">Search business leaders</h3>
              <p className="text-sm text-[#849184]">
                Refine your search below
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <label className="block min-w-0">
              <span className="mb-2 block text-sm font-bold">
                Name or company
              </span>

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="e.g. business name"
                className={inputStyles}
              />
            </label>

            <label className="block min-w-0">
              <span className="mb-2 block text-sm font-bold">
                Industry
              </span>

              <select
                value={industry}
                onChange={(event) => setIndustry(event.target.value)}
                className={inputStyles}
              >
                {industries.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="block min-w-0">
              <span className="mb-2 block text-sm font-bold">
                Location
              </span>

              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="e.g. Lagos, Nigeria"
                className={inputStyles}
              />
            </label>
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-[#edf1e9] pt-5">
            <p className="text-sm text-[#758176]">
              {loading
                ? "Finding business leaders..."
                : `${filteredCEOs.length} ${
                    filteredCEOs.length === 1 ? "leader" : "leaders"
                  } found`}
            </p>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setIndustry("All industries");
                setLocation("");
              }}
              className="rounded-xl border border-[#dce6d8] px-4 py-2.5 text-sm font-bold text-[#31583d] transition hover:bg-[#edf3e9]"
            >
              Clear filters
            </button>
          </div>
        </div>

        {/* Directory heading */}
        <div className="mb-7 mt-14 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#63866a]">
              The TYACDI network
            </p>

            <h2 className="mt-2 text-3xl font-black tracking-tight">
              CEO directory
            </h2>
          </div>

          <p className="text-sm text-[#758176]">
            Connect with experience. Build with purpose.
          </p>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="rounded-3xl border border-[#e0e8dd] bg-white px-6 py-20 text-center shadow-sm">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#e1eadf] border-t-[#31583d]" />

            <p className="mt-5 font-bold">
              Loading CEO profiles...
            </p>

            <p className="mt-2 text-sm text-[#849184]">
              Finding leaders in the TYACDI network.
            </p>
          </div>
        ) : error ? (
          /* Error state */
          <div
            role="alert"
            className="rounded-3xl border border-red-200 bg-white p-7 shadow-sm sm:p-10"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-xl font-black text-red-700">
              !
            </div>

            <h3 className="mt-5 text-xl font-black">
              Unable to load CEO profiles
            </h3>

            <p className="mt-3 break-words text-sm leading-7 text-[#758176]">
              {error}
            </p>

            <button
              type="button"
              onClick={() => void loadCEOs()}
              className="mt-6 rounded-xl bg-[#203c2a] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#365a40]"
            >
              Try again
            </button>
          </div>
        ) : filteredCEOs.length === 0 ? (
          /* Empty state */
          <div className="rounded-3xl border border-dashed border-[#cad8c7] bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#edf3e9] text-[#31583d]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className="h-8 w-8"
                aria-hidden="true"
              >
                <circle cx="9" cy="8" r="4" />
                <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
                <path d="M16 5a4 4 0 0 1 0 7.8M18 14c2.2.8 3.5 2.8 3.5 5.5" />
              </svg>
            </div>

            <h3 className="mt-5 text-xl font-black">
              No CEOs found yet
            </h3>

            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#758176]">
              {profiles.length === 0
                ? "There are currently no profiles with the CEO / Executive role. Once members select that role, their profiles can appear here."
                : "No profiles match your current filters. Try changing your search or resetting the filters."}
            </p>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setIndustry("All industries");
                setLocation("");
              }}
              className="mt-6 rounded-xl bg-[#203c2a] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#365a40]"
            >
              Reset search
            </button>
          </div>
        ) : (
          /* CEO cards */
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCEOs.map((ceo) => {
              const initials =
                (ceo.full_name ?? "")
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0]?.toUpperCase())
                  .join("") || "CEO";

              return (
                <article
                  key={ceo.id}
                  className="group flex min-w-0 flex-col overflow-hidden rounded-3xl border border-[#e0e8dd] bg-white shadow-[0_6px_25px_rgba(32,60,42,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#c4d5c0] hover:shadow-[0_18px_40px_rgba(32,60,42,0.10)]"
                >
                  <div className="h-1.5 bg-gradient-to-r from-[#203c2a] via-[#63866a] to-[#b5d2ae]" />

                  <div className="flex flex-1 flex-col p-6 sm:p-7">
                    <div className="flex items-start gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[#dce8d8] bg-[#edf3e9] text-xl font-black text-[#31583d]">
                        {initials}
                      </div>

                      <div className="min-w-0 flex-1 pt-1">
                        <h3 className="break-words text-lg font-black">
                          {ceo.full_name || "TYACDI Member"}
                        </h3>

                        <p className="mt-1 text-sm font-bold text-[#63866a]">
                          CEO / Executive
                        </p>

                        {ceo.company && (
                          <p className="mt-1 break-words text-sm text-[#758176]">
                            {ceo.company}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-2">
                      {ceo.industry && (
                        <span className="rounded-full border border-[#dce8d8] bg-[#edf3e9] px-3 py-1.5 text-xs font-bold text-[#31583d]">
                          {ceo.industry}
                        </span>
                      )}

                      {ceo.location && (
                        <span className="rounded-full bg-[#f3f5f0] px-3 py-1.5 text-xs font-medium text-[#667568]">
                          {ceo.location}
                        </span>
                      )}
                    </div>

                    <p className="mt-5 flex-1 whitespace-pre-line break-words text-sm leading-7 text-[#758176]">
                      {ceo.bio ||
                        "This executive has not added a biography yet."}
                    </p>

                    <div className="mt-7 border-t border-[#edf1e9] pt-5">
                      {ceo.id === currentUserId ? (
                        <Link
                          href="/dashboard"
                          className="flex w-full items-center justify-center rounded-xl border border-[#dce5d9] bg-[#f5f7f2] px-4 py-3 text-sm font-bold text-[#667568] transition hover:bg-[#edf3e9]"
                        >
                          View your dashboard
                        </Link>
                      ) : (
                        <Link
                          href={`/messages?user=${encodeURIComponent(ceo.id)}`}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#203c2a] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#365a40] focus:outline-none focus:ring-4 focus:ring-[#527b59]/20"
                        >
                          Message CEO
                          <span aria-hidden="true">→</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 border-t border-[#dfe7dc] py-9 text-center">
          <Link
            href="/dashboard"
            className="text-base font-black tracking-tight"
          >
            TYACDI <span className="text-[#63866a]">BRIDGE</span>
          </Link>

          <p className="mt-2 text-xs font-bold uppercase tracking-[0.22em] text-[#819083]">
            Learn · Build · Grow
          </p>

          <p className="mt-4 text-sm text-[#758176]">
            Growth is gradual... But with us exponential.
          </p>

          <p className="mt-2 text-xs text-[#98a298]">
            Connecting ambition with experience.
          </p>
        </footer>
      </section>
    </main>
  );
}
