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
  const [currentUserId, setCurrentUserId] = useState<string | null>(
    null
  );

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
        .select(
          "id, full_name, role, company, industry, location, bio"
        )
        .eq("role", "CEO / Executive")
        .order("full_name", { ascending: true });

      if (queryError) {
        console.error("Error loading CEO profiles:", queryError);
        setError(
          `Unable to load CEO profiles: ${queryError.message}`
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

      return (
        matchesSearch &&
        matchesIndustry &&
        matchesLocation
      );
    });
  }, [profiles, search, industry, location]);

  const inputStyles =
    "w-full rounded-xl border border-[#dce5dc] bg-[#fbfcf9] px-4 py-3.5 text-sm text-[#182b28] outline-none transition placeholder:text-[#929e95] focus:border-[#4c8867] focus:bg-white focus:ring-4 focus:ring-[#4c8867]/10";

  function clearFilters() {
    setSearch("");
    setIndustry("All industries");
    setLocation("");
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f8f8f4] text-[#182b28]">
      {/* Navigation */}
      <header className="sticky top-0 z-30 border-b border-[#e5e7df] bg-[#f8f8f4]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center gap-3"
            aria-label="TYACDI BRIDGE dashboard"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#182b28] text-xl font-black text-[#c8f0d4] shadow-lg shadow-[#182b28]/10">
              T
            </div>

            <div>
              <p className="text-base font-extrabold tracking-tight sm:text-lg">
                TYACDI{" "}
                <span className="text-[#4c8867]">BRIDGE</span>
              </p>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-[#7b877e] sm:text-[10px]">
                Learn · Build · Grow
              </p>
            </div>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-3">
            <Link
              href="/dashboard"
              className="rounded-lg px-2.5 py-2 text-xs font-semibold text-[#697672] transition hover:bg-[#eaf0e8] hover:text-[#182b28] sm:px-4 sm:text-sm"
            >
              Dashboard
            </Link>

            <Link
              href="/messages"
              className="rounded-lg bg-[#182b28] px-3 py-2.5 text-xs font-bold text-white transition hover:bg-[#25443c] sm:px-5 sm:text-sm"
            >
              Messages
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b border-[#e5e7df] bg-[#f8f8f4]">
        <div className="pointer-events-none absolute -right-28 -top-20 -z-10 h-96 w-96 rounded-full bg-[#c8e5ce]/50 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-32 left-1/4 -z-10 h-80 w-80 rounded-full bg-[#e4eee0]/70 blur-3xl" />

        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#dce7da] bg-white/80 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#526f5b] sm:text-xs">
              <span className="h-2 w-2 rounded-full bg-[#4c8867]" />
              The TYACDI professional network
            </div>

            <h1 className="mt-7 text-4xl font-semibold leading-[1.1] tracking-[-0.06em] sm:text-5xl md:text-6xl lg:text-[4.4rem]">
              Great connections.
              <br />
              <span className="text-[#4c8867]">
                Greater possibilities.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-sm leading-7 text-[#697672] sm:text-base sm:leading-8">
              Meet CEOs and business executives, learn from their
              experience, and build relationships that move your
              ambitions forward.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#ceo-directory"
                className="inline-flex items-center gap-3 rounded-lg bg-[#182b28] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#182b28]/10 transition hover:-translate-y-0.5 hover:bg-[#25443c]"
              >
                Explore business leaders
                <span aria-hidden="true">↓</span>
              </a>

              <Link
                href="/messages"
                className="inline-flex items-center rounded-lg border border-[#dce3d9] bg-white px-5 py-3.5 text-sm font-bold text-[#30483a] transition hover:border-[#b8d1ba] hover:bg-[#f0f5ed]"
              >
                View messages
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 border-t border-[#e5e7df] pt-6">
              {[
                "Leadership",
                "Mentorship",
                "Business growth",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 text-xs font-semibold text-[#697672]"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#78a884]" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Decorative network illustration */}
          <div className="relative mx-auto flex min-h-[330px] w-full max-w-lg items-center justify-center sm:min-h-[410px]">
            <div className="absolute h-64 w-64 rounded-full border border-[#b7d1b9]/70 sm:h-80 sm:w-80" />

            <div className="absolute h-52 w-80 rotate-[-28deg] rounded-[50%] border border-[#b7d1b9]/70 sm:h-64 sm:w-[430px]" />

            <div className="absolute h-72 w-48 rotate-[35deg] rounded-[50%] border border-[#b7d1b9]/60 sm:h-96 sm:w-64" />

            <div className="absolute h-48 w-48 rounded-full bg-[#d9ebd8]/70 blur-2xl sm:h-64 sm:w-64" />

            <div className="absolute left-[7%] top-[17%] rounded-xl border border-[#e1e8df] bg-white/95 p-3 shadow-lg shadow-[#243f30]/5 sm:left-[5%]">
              <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-[#849184]">
                Your network
              </p>
              <p className="mt-1.5 text-xs font-bold text-[#203c2a]">
                New opportunities
              </p>
            </div>

            <div className="absolute right-[4%] top-[23%] rounded-xl border border-[#e1e8df] bg-white/95 p-3 shadow-lg shadow-[#243f30]/5 sm:right-[1%]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#d8e9d7] text-xs font-black text-[#31583d]">
                  CEO
                </div>
                <div>
                  <p className="text-xs font-bold text-[#203c2a]">
                    Leadership
                  </p>
                  <p className="mt-1 text-[10px] text-[#849184]">
                    Experience that matters
                  </p>
                </div>
              </div>
            </div>

            <div className="relative z-10 w-[min(290px,85%)] rounded-2xl border border-white bg-white p-5 shadow-[0_25px_70px_rgba(24,43,40,0.12)] sm:p-6">
              <div className="flex items-center justify-between border-b border-[#edf0e9] pb-4">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#849184]">
                    The right connection
                  </p>
                  <p className="mt-1 text-sm font-extrabold text-[#182b28]">
                    Built on experience
                  </p>
                </div>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eaf4e9] text-[#4c8867]">
                  ↗
                </span>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#dcebd9] to-[#b8d8bf] text-lg font-black text-[#31583d]">
                  TB
                </div>
                <div>
                  <p className="text-sm font-extrabold text-[#182b28]">
                    TYACDI BRIDGE
                  </p>
                  <p className="mt-1 text-xs text-[#697672]">
                    Ambition meets experience.
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-xl bg-[#f2f6ef] p-3.5">
                <p className="text-xs leading-6 text-[#52665a]">
                  Learn from leaders. Discover opportunities. Build
                  relationships that help you grow.
                </p>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#4c8867]" />
                <span className="text-[10px] font-semibold text-[#65806b]">
                  Learn · Build · Grow
                </span>
              </div>
            </div>

            <div className="absolute bottom-[12%] left-[3%] rounded-xl border border-[#e1e8df] bg-white/95 px-4 py-3 shadow-lg shadow-[#243f30]/5 sm:bottom-[9%]">
              <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-[#849184]">
                The mission
              </p>
              <p className="mt-1 text-xs font-extrabold text-[#31583d]">
                Growth through connection
              </p>
            </div>
          </div>
        </div>

        {/* Three steps */}
        <div className="border-t border-[#e5e7df] bg-[#f2f3ed]">
          <div className="mx-auto grid max-w-7xl gap-0 px-5 sm:grid-cols-3 sm:px-8">
            {[
              {
                number: "01",
                title: "Discover",
                description: "Find experienced business leaders",
              },
              {
                number: "02",
                title: "Connect",
                description: "Start meaningful conversations",
              },
              {
                number: "03",
                title: "Grow",
                description: "Learn from experience",
              },
            ].map((step, index) => (
              <div
                key={step.number}
                className={`flex items-start gap-4 py-5 sm:px-5 sm:py-7 ${
                  index > 0 ? "sm:border-l sm:border-[#dfe5da]" : ""
                }`}
              >
                <span className="pt-0.5 text-xs font-extrabold tracking-wider text-[#4c8867]">
                  {step.number}
                </span>
                <div>
                  <p className="text-sm font-extrabold text-[#203c2a]">
                    {step.title}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#758176]">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Search and CEO directory */}
      <section
        id="ceo-directory"
        className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20"
      >
        <div className="mb-9 grid gap-5 md:grid-cols-[1fr_0.7fr] md:items-end">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#4c8867] sm:text-xs">
              Explore the network
            </p>

            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl md:text-5xl">
              Find your next
              <br className="hidden sm:block" />{" "}
              <span className="text-[#4c8867]">
                connection.
              </span>
            </h2>
          </div>

          <p className="max-w-md text-sm leading-7 text-[#697672] md:justify-self-end">
            Search by name, company, industry, or location to
            discover business leaders whose experience can help
            you move forward.
          </p>
        </div>

        {/* Search card */}
        <div className="rounded-2xl border border-[#e3e7de] bg-white p-5 shadow-[0_12px_45px_rgba(24,43,40,0.045)] sm:rounded-3xl sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf3e8] text-[#31583d]">
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
              <h3 className="text-base font-extrabold text-[#203c2a]">
                Search business leaders
              </h3>
              <p className="mt-1 text-xs text-[#849184]">
                Refine your search to find the right people
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-[#354a39]">
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
              <span className="mb-2 block text-xs font-bold text-[#354a39]">
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
              <span className="mb-2 block text-xs font-bold text-[#354a39]">
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

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[#edf0e9] pt-5">
            <p
              aria-live="polite"
              className="text-xs font-medium text-[#758176]"
            >
              {loading
                ? "Finding business leaders..."
                : `${filteredCEOs.length} ${
                    filteredCEOs.length === 1
                      ? "leader"
                      : "leaders"
                  } found`}
            </p>

            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg border border-[#dce5dc] px-4 py-2.5 text-xs font-bold text-[#31583d] transition hover:bg-[#edf3e9]"
            >
              Clear filters
            </button>
          </div>
        </div>

        {/* Directory heading */}
        <div className="mb-7 mt-12 flex flex-col justify-between gap-3 sm:mt-16 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#4c8867] sm:text-xs">
              The TYACDI network
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
              CEO directory
            </h2>
          </div>

          <p className="text-xs text-[#758176]">
            Connect with experience. Build with purpose.
          </p>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="rounded-2xl border border-[#e3e7de] bg-white px-6 py-20 text-center sm:rounded-3xl">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#e1eadf] border-t-[#31583d]" />

            <p className="mt-5 text-sm font-bold text-[#203c2a]">
              Loading CEO profiles
            </p>

            <p className="mt-2 text-xs text-[#849184]">
              Finding leaders in the TYACDI network...
            </p>
          </div>
        ) : error ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-white p-6 sm:rounded-3xl sm:p-9"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-lg font-bold text-red-700">
              !
            </div>

            <h3 className="mt-4 text-lg font-extrabold text-[#203c2a]">
              Unable to load CEO profiles
            </h3>

            <p className="mt-3 break-words text-sm leading-7 text-[#758176]">
              {error}
            </p>

            <button
              type="button"
              onClick={() => void loadCEOs()}
              className="mt-5 rounded-lg bg-[#182b28] px-5 py-3 text-xs font-bold text-white transition hover:bg-[#25443c]"
            >
              Try again
            </button>
          </div>
        ) : filteredCEOs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#cbd9c8] bg-white px-6 py-16 text-center sm:rounded-3xl sm:py-20">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eaf3e8] text-[#31583d]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className="h-7 w-7"
                aria-hidden="true"
              >
                <circle cx="9" cy="8" r="4" />
                <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
                <path d="M16 5a4 4 0 0 1 0 7.8M18 14c2.2.8 3.5 2.8 3.5 5.5" />
              </svg>
            </div>

            <h3 className="mt-5 text-xl font-extrabold text-[#203c2a]">
              {profiles.length === 0
                ? "No CEOs have joined the directory yet"
                : "No matching CEOs found"}
            </h3>

            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#758176]">
              {profiles.length === 0
                ? "Business leaders will appear here when members have completed their profiles and selected the CEO / Executive role."
                : "Try another name, industry, or location, or clear your filters to see all available CEOs."}
            </p>

            <button
              type="button"
              onClick={clearFilters}
              className="mt-6 rounded-lg bg-[#182b28] px-6 py-3 text-xs font-bold text-white transition hover:bg-[#25443c]"
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
                  className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#e3e7de] bg-white shadow-[0_5px_24px_rgba(24,43,40,0.035)] transition duration-300 hover:-translate-y-1 hover:border-[#c4d8c5] hover:shadow-[0_18px_40px_rgba(24,43,40,0.09)] sm:rounded-3xl"
                >
                  <div className="h-1 bg-gradient-to-r from-[#182b28] via-[#4c8867] to-[#bce8cb]" />

                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#dce8d8] bg-gradient-to-br from-[#edf5e9] to-[#d7e9d5] text-base font-extrabold text-[#31583d]">
                        {initials}
                      </div>

                      <div className="min-w-0 flex-1 pt-1">
                        <h3 className="break-words text-base font-extrabold text-[#203c2a]">
                          {ceo.full_name || "TYACDI Member"}
                        </h3>

                        <p className="mt-1 text-xs font-bold text-[#4c8867]">
                          CEO / Executive
                        </p>

                        {ceo.company && (
                          <p className="mt-1.5 break-words text-xs text-[#758176]">
                            {ceo.company}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 flex min-h-6 flex-wrap gap-2">
                      {ceo.industry && (
                        <span className="rounded-md border border-[#dce8d8] bg-[#edf5e9] px-2.5 py-1.5 text-[10px] font-bold text-[#31583d]">
                          {ceo.industry}
                        </span>
                      )}

                      {ceo.location && (
                        <span className="rounded-md bg-[#f3f5f0] px-2.5 py-1.5 text-[10px] font-medium text-[#667568]">
                          {ceo.location}
                        </span>
                      )}
                    </div>

                    <p className="mt-5 flex-1 whitespace-pre-line break-words text-xs leading-7 text-[#697672]">
                      {ceo.bio ||
                        "This executive has not added a biography yet."}
                    </p>

                    <div className="mt-6 border-t border-[#edf0e9] pt-5">
                      {ceo.id === currentUserId ? (
                        <Link
                          href="/dashboard"
                          className="flex w-full items-center justify-center rounded-lg border border-[#dce5d9] bg-[#f5f7f2] px-4 py-3 text-xs font-bold text-[#667568] transition hover:bg-[#edf3ea]"
                        >
                          View your dashboard
                        </Link>
                      ) : (
                        <Link
                          href={`/messages?user=${encodeURIComponent(ceo.id)}`}
                          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#182b28] px-4 py-3 text-xs font-bold text-white transition hover:bg-[#25443c] focus:outline-none focus:ring-4 focus:ring-[#4c8867]/20"
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
        <footer className="mt-16 border-t border-[#e5e7df] pt-8 sm:mt-20">
          <div className="flex flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-left">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#182b28] text-base font-black text-[#c8f0d4]">
                T
              </span>

              <span className="text-sm font-extrabold tracking-tight text-[#182b28]">
                TYACDI{" "}
                <span className="text-[#4c8867]">BRIDGE</span>
              </span>
            </Link>

            <p className="text-xs text-[#758176]">
              Connecting ambition with experience.
            </p>
          </div>

          <div className="mt-6 border-t border-[#e5e7df] py-5 text-center">
            <p className="text-sm font-semibold text-[#4c8867]">
              Growth is gradual... But with us exponential.
            </p>

            <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#849184]">
              Learn · Build · Grow
            </p>
          </div>
        </footer>
      </section>
    </main>
  );
}
