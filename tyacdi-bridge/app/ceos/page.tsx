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
              className="rounded-xl bg-[#203c2a] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#31583d]"
            >
              Messages
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative isolate overflow-hidden bg-[#203c2a]">
        <div className="pointer-events-none absolute -right-20 -top-32 -z-10 h-80 w-80 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-8 -top-20 -z-10 h-60 w-60 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 -z-10 h-72 w-72 rounded-full bg-[#64886a]/20 blur-3xl" />

        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#dce9d9]">
              <span className="h-2 w-2 rounded-full bg-[#a8c9a4]" />
              Build meaningful connections
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl">
              Find the leaders
              <br />
              <span className="text-[#b5d2ae]">
                who move business forward.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-[#d0ddd0] sm:text-lg">
              Discover CEOs and business executives, explore their
              experience, and connect with people who can help you
              learn, build, and grow.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-[#d0ddd0]">
              {["Leadership", "Mentorship", "Business growth"].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/15 bg-white/5 px-4 py-2"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="rounded-2xl border border-[#e0e7dc] bg-white p-5 shadow-[0_8px_30px_rgba(32,60,42,0.04)] sm:p-7">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#66816a]">
              Explore the network
            </p>

            <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#203c2a]">
              Search business leaders
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#748075]">
              Filter by name, company, industry, or location to find
              the right connection.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#354a39]">
                Name or company
              </span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search CEOs..."
                className={inputStyles}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#354a39]">
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

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#354a39]">
                Location
              </span>
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="City or country..."
                className={inputStyles}
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1e9] pt-5">
            <p className="text-sm text-[#748075]">
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
              className="rounded-lg px-3 py-2 text-sm font-semibold text-[#527b59] transition hover:bg-[#edf3ea]"
            >
              Clear filters
            </button>
          </div>
        </div>

        <div className="mb-6 mt-12 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#66816a]">
              The TYACDI network
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#203c2a] sm:text-3xl">
              CEO directory
            </h2>
          </div>

          <p className="text-sm text-[#748075]">
            Connect with experience. Build with purpose.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-[#e0e7dc] bg-white px-6 py-16 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#e1eadf] border-t-[#31583d]" />
            <p className="mt-5 font-semibold text-[#354a39]">
              Loading CEO profiles
            </p>
            <p className="mt-2 text-sm text-[#829084]">
              Finding leaders in the TYACDI network...
            </p>
          </div>
        ) : error ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-6"
          >
            <h3 className="font-bold text-red-900">
              Unable to load CEO profiles
            </h3>
            <p className="mt-2 break-words text-sm leading-6 text-red-800">
              {error}
            </p>
            <button
              type="button"
              onClick={() => void loadCEOs()}
              className="mt-5 rounded-xl bg-[#203c2a] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#31583d]"
            >
              Try again
            </button>
          </div>
        ) : filteredCEOs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#cad8c7] bg-white px-6 py-16 text-center">
            <h3 className="text-xl font-bold text-[#203c2a]">
              No CEOs found yet
            </h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#748075]">
              Try adjusting your search filters. CEO profiles will appear
              here when members select the CEO / Executive role.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setIndustry("All industries");
                setLocation("");
              }}
              className="mt-6 rounded-xl bg-[#203c2a] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#31583d]"
            >
              Reset search
            </button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
                  className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#e0e7dc] bg-white shadow-[0_4px_20px_rgba(32,60,42,0.035)] transition duration-300 hover:-translate-y-1 hover:border-[#c4d5c0] hover:shadow-[0_14px_35px_rgba(32,60,42,0.09)]"
                >
                  <div className="h-1.5 bg-gradient-to-r from-[#203c2a] via-[#527b59] to-[#b5d2ae]" />

                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#dce8d8] bg-[#edf3ea] text-lg font-extrabold text-[#31583d]">
                        {initials}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="break-words text-lg font-bold text-[#203c2a]">
                          {ceo.full_name || "TYACDI Member"}
                        </h3>
                        <p className="mt-1 break-words text-sm font-semibold text-[#608668]">
                          CEO / Executive
                        </p>
                        {ceo.company && (
                          <p className="mt-1 break-words text-sm text-[#748075]">
                            {ceo.company}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {ceo.industry && (
                        <span className="rounded-full border border-[#dce8d8] bg-[#edf3ea] px-3 py-1.5 text-xs font-semibold text-[#31583d]">
                          {ceo.industry}
                        </span>
                      )}
                      {ceo.location && (
                        <span className="rounded-full bg-[#f3f5f0] px-3 py-1.5 text-xs font-medium text-[#667568]">
                          {ceo.location}
                        </span>
                      )}
                    </div>

                    <p className="mt-5 flex-1 whitespace-pre-line break-words text-sm leading-7 text-[#748075]">
                      {ceo.bio || "This executive has not added a biography yet."}
                    </p>

                    <div className="mt-6 border-t border-[#edf1e9] pt-5">
                      {ceo.id === currentUserId ? (
                        <Link
                          href="/dashboard"
                          className="flex w-full items-center justify-center rounded-xl border border-[#dce5d9] bg-[#f5f7f2] px-4 py-3 text-sm font-semibold text-[#667568] transition hover:bg-[#edf3ea]"
                        >
                          View your dashboard
                        </Link>
                      ) : (
                        <Link
                          href={`/messages?user=${encodeURIComponent(ceo.id)}`}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#203c2a] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#31583d] focus:outline-none focus:ring-4 focus:ring-[#527b59]/20"
                        >
                          Message CEO <span aria-hidden="true">→</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <footer className="mt-16 border-t border-[#dfe7dc] py-8 text-center">
          <Link
            href="/dashboard"
            className="text-sm font-extrabold tracking-tight text-[#203c2a]"
          >
            TYACDI <span className="text-[#608668]">BRIDGE</span>
          </Link>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#819083]">
            Learn · Build · Grow
          </p>
          <p className="mt-4 text-sm text-[#748075]">
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
