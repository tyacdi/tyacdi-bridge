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
          "We couldn't load the CEO directory. Please try again."
        );
        return;
      }

      setProfiles((data ?? []) as CEOProfile[]);
    } catch (err) {
      console.error("Unexpected error loading CEOs:", err);
      setError(
        "Something went wrong while loading the directory."
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
      const name = (profile.full_name ?? "").toLowerCase();
      const company = (profile.company ?? "").toLowerCase();
      const profileIndustry = (profile.industry ?? "").toLowerCase();
      const profileLocation = (profile.location ?? "").toLowerCase();

      const matchesSearch =
        !term || name.includes(term) || company.includes(term);

      const matchesIndustry =
        industry === "All industries" ||
        profile.industry === industry;

      const matchesLocation =
        !place || profileLocation.includes(place);

      return (
        matchesSearch &&
        matchesIndustry &&
        matchesLocation
      );
    });
  }, [profiles, search, industry, location]);

  function getInitials(name: string | null) {
    return (
      (name ?? "")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("") || "CEO"
    );
  }

  return (
    <main className="ceo-page">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap');

        .ceo-page,
        .ceo-page * {
          box-sizing: border-box;
        }

        .ceo-page {
          --ceo-ink: #182b28;
          --ceo-muted: #68766e;
          --ceo-paper: #f8f8f4;
          --ceo-green: #c8edcf;
          --ceo-line: #e3e8df;
          min-height: 100vh;
          background: var(--ceo-paper);
          color: var(--ceo-ink);
          font-family: 'DM Sans', sans-serif;
        }

        .ceo-page a {
          color: inherit;
          text-decoration: none;
        }

        .ceo-container {
          width: min(1160px, calc(100% - 48px));
          margin: 0 auto;
        }

        .ceo-nav {
          min-height: 78px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          border-bottom: 1px solid var(--ceo-line);
        }

        .ceo-brand {
          display: flex;
          align-items: center;
          gap: 11px;
          font-family: 'Manrope', sans-serif;
          font-size: 17px;
          font-weight: 800;
          letter-spacing: -0.6px;
        }

        .ceo-brand-mark {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 11px;
          background: var(--ceo-ink);
          color: var(--ceo-green);
          font-size: 22px;
        }

        .ceo-brand small {
          display: block;
          margin-top: 2px;
          color: var(--ceo-muted);
          font-family: 'DM Sans', sans-serif;
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 1.5px;
        }

        .ceo-nav-links {
          display: flex;
          align-items: center;
          gap: 27px;
          font-size: 12px;
          color: #65736b;
        }

        .ceo-nav-links a:hover {
          color: #398054;
        }

        .ceo-nav-active {
          color: var(--ceo-ink) !important;
          font-weight: 700;
        }

        .ceo-nav-button,
        .ceo-button {
          display: inline-flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
          min-height: 43px;
          padding: 0 17px;
          border: 1px solid var(--ceo-ink);
          border-radius: 6px;
          background: var(--ceo-ink);
          color: white !important;
          font-size: 12px;
          font-weight: 700;
          transition: transform 0.2s, background 0.2s;
          cursor: pointer;
        }

        .ceo-nav-button:hover,
        .ceo-button:hover {
          transform: translateY(-2px);
          background: #29483d;
        }

        .ceo-hero {
          position: relative;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          align-items: center;
          gap: 45px;
          padding-top: 75px;
          padding-bottom: 72px;
        }

        .ceo-eyebrow {
          display: flex;
          align-items: center;
          gap: 9px;
          color: #60776a;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1.8px;
          text-transform: uppercase;
        }

        .ceo-eyebrow-dot {
          width: 8px;
          height: 8px;
          flex-shrink: 0;
          border-radius: 50%;
          background: #4b9b69;
          box-shadow: 0 0 0 4px #4b9b691b;
        }

        .ceo-hero h1 {
          max-width: 650px;
          margin: 24px 0 20px;
          font-family: 'Manrope', sans-serif;
          font-size: clamp(42px, 5.5vw, 67px);
          font-weight: 700;
          line-height: 1.08;
          letter-spacing: -3px;
        }

        .ceo-hero h1 span {
          color: #4b8963;
        }

        .ceo-hero-copy {
          max-width: 490px;
          color: var(--ceo-muted);
          font-size: 15px;
          line-height: 1.9;
        }

        .ceo-hero-actions {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 20px;
          margin-top: 27px;
        }

        .ceo-text-link {
          color: #385e47 !important;
          font-size: 12px;
          font-weight: 700;
        }

        .ceo-hero-art {
          position: relative;
          min-height: 360px;
          display: grid;
          place-items: center;
          overflow: hidden;
          border: 1px solid #e2e9df;
          border-radius: 10px;
          background:
            radial-gradient(
              circle at 50% 45%,
              #d2e9d2 0,
              transparent 48%
            ),
            linear-gradient(140deg, #eef2e9, #e0e9df);
        }

        .ceo-orbit {
          position: absolute;
          width: 82%;
          height: 45%;
          border: 1px solid #83a78a7a;
          border-radius: 50%;
          transform: rotate(-28deg);
        }

        .ceo-orbit-two {
          width: 62%;
          height: 80%;
          transform: rotate(37deg);
        }

        .ceo-art-circle {
          position: absolute;
          width: 170px;
          height: 170px;
          border-radius: 50%;
          background: #b9dfbf;
          opacity: 0.65;
        }

        .ceo-art-card {
          position: relative;
          z-index: 2;
          width: min(280px, 78%);
          padding: 21px;
          border: 1px solid #e1e8df;
          border-radius: 11px;
          background: white;
          box-shadow: 0 22px 55px #213c2b18;
        }

        .ceo-art-card-label {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #738176;
          font-size: 9px;
          letter-spacing: 1.3px;
        }

        .ceo-status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #49a76c;
        }

        .ceo-art-person {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 23px 0 16px;
        }

        .ceo-art-avatar {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #d9e9d8;
          color: #315c3f;
          font-family: 'Manrope', sans-serif;
          font-weight: 800;
        }

        .ceo-art-person strong,
        .ceo-art-person small {
          display: block;
        }

        .ceo-art-person strong {
          font-size: 13px;
        }

        .ceo-art-person small {
          margin-top: 5px;
          color: #778379;
          font-size: 10px;
        }

        .ceo-art-quote {
          padding-top: 14px;
          border-top: 1px solid #e9eee7;
          color: #5d6a61;
          font-size: 11px;
          line-height: 1.8;
        }

        .ceo-art-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 13px;
        }

        .ceo-art-tags span {
          padding: 6px 8px;
          border-radius: 4px;
          background: #eff5ed;
          color: #52715b;
          font-size: 9px;
        }

        .ceo-floating-note {
          position: absolute;
          z-index: 3;
          right: 5%;
          bottom: 9%;
          padding: 13px 15px;
          border: 1px solid #dfe7dd;
          border-radius: 7px;
          background: #fff;
          box-shadow: 0 12px 28px #1e3a2810;
          font-size: 10px;
        }

        .ceo-floating-note strong {
          display: block;
          margin-bottom: 4px;
        }

        .ceo-floating-note span {
          color: #718077;
        }

        .ceo-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          border-top: 1px solid var(--ceo-line);
          border-bottom: 1px solid var(--ceo-line);
          background: #f1f3ec;
        }

        .ceo-stat {
          padding: 24px 20px;
          text-align: center;
        }

        .ceo-stat + .ceo-stat {
          border-left: 1px solid var(--ceo-line);
        }

        .ceo-stat strong {
          display: block;
          font-family: 'Manrope', sans-serif;
          font-size: 23px;
          font-weight: 800;
        }

        .ceo-stat span {
          display: block;
          margin-top: 5px;
          color: #718077;
          font-size: 10px;
          letter-spacing: 0.6px;
        }

        .ceo-directory {
          padding-top: 76px;
          padding-bottom: 95px;
          scroll-margin-top: 25px;
        }

        .ceo-directory-heading {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 25px;
          margin-bottom: 29px;
        }

        .ceo-directory-heading h2 {
          margin: 13px 0 9px;
          font-family: 'Manrope', sans-serif;
          font-size: clamp(29px, 4vw, 42px);
          line-height: 1.15;
          letter-spacing: -1.7px;
        }

        .ceo-directory-heading p {
          max-width: 460px;
          margin: 0;
          color: var(--ceo-muted);
          font-size: 13px;
          line-height: 1.8;
        }

        .ceo-count {
          flex-shrink: 0;
          padding: 10px 13px;
          border: 1px solid var(--ceo-line);
          border-radius: 6px;
          background: white;
          color: #52675a;
          font-size: 11px;
          font-weight: 700;
        }

        .ceo-search-panel {
          display: grid;
          grid-template-columns: 1.6fr 1fr 1fr auto;
          gap: 12px;
          padding: 17px;
          border: 1px solid #e1e7dd;
          border-radius: 9px;
          background: white;
          box-shadow: 0 10px 35px #233d2b08;
        }

        .ceo-field label {
          display: block;
          margin-bottom: 8px;
          color: #59695f;
          font-size: 10px;
          font-weight: 700;
        }

        .ceo-field input,
        .ceo-field select {
          width: 100%;
          min-width: 0;
          height: 44px;
          padding: 0 12px;
          border: 1px solid #dfe5dc;
          border-radius: 5px;
          outline: none;
          background: #fbfcf9;
          color: var(--ceo-ink);
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
        }

        .ceo-field input:focus,
        .ceo-field select:focus {
          border-color: #6a9e78;
          box-shadow: 0 0 0 3px #6a9e7818;
        }

        .ceo-search-button {
          align-self: end;
          height: 44px;
          padding: 0 17px;
          border: 0;
          border-radius: 5px;
          background: var(--ceo-ink);
          color: white;
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .ceo-search-button:hover {
          background: #315044;
        }

        .ceo-results-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin: 31px 0 17px;
        }

        .ceo-results-row h3 {
          margin: 0;
          font-family: 'Manrope', sans-serif;
          font-size: 18px;
        }

        .ceo-results-row span {
          color: #7a857c;
          font-size: 11px;
        }

        .ceo-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 17px;
        }

        .ceo-profile-card {
          display: flex;
          min-width: 0;
          flex-direction: column;
          padding: 22px;
          border: 1px solid #e1e7de;
          border-radius: 9px;
          background: white;
          box-shadow: 0 7px 25px #213a2a05;
          transition: transform 0.2s, box-shadow 0.2s,
            border-color 0.2s;
        }

        .ceo-profile-card:hover {
          transform: translateY(-4px);
          border-color: #c9d9c8;
          box-shadow: 0 15px 35px #213a2a0e;
        }

        .ceo-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .ceo-avatar {
          width: 56px;
          height: 56px;
          display: grid;
          flex-shrink: 0;
          place-items: center;
          border: 1px solid #dce8d9;
          border-radius: 50%;
          background: linear-gradient(140deg, #e0eddd, #c6e1c8);
          color: #315940;
          font-family: 'Manrope', sans-serif;
          font-size: 16px;
          font-weight: 800;
        }

        .ceo-profile-badge {
          padding: 7px 9px;
          border-radius: 4px;
          background: #eef6ed;
          color: #497451;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .ceo-profile-card h3 {
          overflow-wrap: anywhere;
          margin: 20px 0 5px;
          font-family: 'Manrope', sans-serif;
          font-size: 17px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }

        .ceo-company {
          color: #51665a;
          font-size: 12px;
          line-height: 1.6;
        }

        .ceo-location {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 13px;
          color: #879188;
          font-size: 10px;
        }

        .ceo-industry {
          display: inline-flex;
          align-self: flex-start;
          margin-top: 15px;
          padding: 7px 9px;
          border-radius: 4px;
          background: #f0f4ed;
          color: #58715e;
          font-size: 10px;
        }

        .ceo-bio {
          display: -webkit-box;
          overflow: hidden;
          margin: 16px 0 21px;
          color: #69766e;
          font-size: 12px;
          line-height: 1.8;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 3;
        }

        .ceo-card-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: auto;
          padding-top: 15px;
          border-top: 1px solid #edf0e9;
        }

        .ceo-card-bottom small {
          color: #78847b;
          font-size: 10px;
        }

        .ceo-message-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 36px;
          padding: 0 11px;
          border: 1px solid var(--ceo-ink);
          border-radius: 5px;
          background: var(--ceo-ink);
          color: white !important;
          font-size: 10px;
          font-weight: 700;
        }

        .ceo-message-button:hover {
          background: #315044;
        }

        .ceo-empty {
          grid-column: 1 / -1;
          padding: 50px 20px;
          border: 1px dashed #cfd9cc;
          border-radius: 9px;
          background: white;
          text-align: center;
        }

        .ceo-empty-icon {
          width: 52px;
          height: 52px;
          display: grid;
          place-items: center;
          margin: 0 auto 17px;
          border-radius: 50%;
          background: #edf5eb;
          color: #4c7c57;
          font-size: 22px;
        }

        .ceo-empty h3 {
          margin: 0 0 9px;
          font-family: 'Manrope', sans-serif;
          font-size: 19px;
        }

        .ceo-empty p {
          margin: 0 auto 19px;
          color: #758077;
          font-size: 12px;
          line-height: 1.8;
        }

        .ceo-error {
          grid-column: 1 / -1;
          padding: 18px;
          border: 1px solid #f0d4d1;
          border-radius: 7px;
          background: #fff4f2;
          color: #943e36;
          font-size: 12px;
          line-height: 1.8;
        }

        .ceo-loading {
          grid-column: 1 / -1;
          padding: 50px 20px;
          border: 1px solid var(--ceo-line);
          border-radius: 9px;
          background: white;
          color: #68766e;
          text-align: center;
          font-size: 13px;
        }

        .ceo-loading-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          margin-right: 8px;
          border-radius: 50%;
          background: #4c9463;
          animation: ceo-pulse 1s infinite alternate;
        }

        @keyframes ceo-pulse {
          from {
            opacity: 0.35;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1.15);
          }
        }

        .ceo-cta {
          position: relative;
          overflow: hidden;
          padding: 60px 25px;
          border-radius: 10px;
          background: #1b332b;
          color: white;
          text-align: center;
        }

        .ceo-cta::after {
          position: absolute;
          top: -70px;
          right: -15px;
          color: #ffffff08;
          content: 'B.';
          font-family: 'Manrope', sans-serif;
          font-size: 220px;
          font-weight: 800;
          line-height: 1;
          pointer-events: none;
        }

        .ceo-cta .ceo-eyebrow {
          justify-content: center;
          color: #b8d8bf;
        }

        .ceo-cta h2 {
          position: relative;
          z-index: 1;
          margin: 18px 0 12px;
          font-family: 'Manrope', sans-serif;
          font-size: clamp(28px, 4vw, 42px);
          letter-spacing: -1.6px;
        }

        .ceo-cta h2 span {
          color: #bce8c7;
        }

        .ceo-cta p {
          position: relative;
          z-index: 1;
          max-width: 530px;
          margin: 0 auto 24px;
          color: #c3d2c7;
          font-size: 13px;
          line-height: 1.9;
        }

        .ceo-cta .ceo-button {
          position: relative;
          z-index: 1;
          border-color: #c8edcf;
          background: #c8edcf;
          color: #19362a !important;
        }

        .ceo-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 18px;
          padding-top: 24px;
          padding-bottom: 24px;
          color: #778279;
          font-size: 10px;
        }

        .ceo-footer-brand {
          color: var(--ceo-ink);
          font-family: 'Manrope', sans-serif;
          font-size: 13px;
          font-weight: 800;
        }

        .ceo-footer-motto {
          flex-basis: 100%;
          margin: 0;
          padding-top: 18px;
          border-top: 1px solid var(--ceo-line);
          color: #7d795a;
          font-size: 11px;
          line-height: 1.8;
          text-align: center;
        }

        @media (max-width: 900px) {
          .ceo-hero {
            grid-template-columns: 1fr;
            gap: 30px;
            padding-top: 55px;
          }

          .ceo-hero-art {
            min-height: 340px;
          }

          .ceo-search-panel {
            grid-template-columns: 1fr 1fr;
          }

          .ceo-search-button {
            width: 100%;
          }

          .ceo-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 600px) {
          .ceo-container {
            width: calc(100% - 32px);
          }

          .ceo-nav {
            min-height: 70px;
            gap: 10px;
          }

          .ceo-brand {
            gap: 8px;
            font-size: 13px;
          }

          .ceo-brand-mark {
            width: 33px;
            height: 33px;
            font-size: 19px;
          }

          .ceo-nav-links {
            gap: 12px;
            font-size: 10px;
          }

          .ceo-nav-links .ceo-nav-optional {
            display: none;
          }

          .ceo-nav-button {
            min-height: 36px;
            padding: 0 10px;
            font-size: 10px;
          }

          .ceo-hero {
            padding-top: 47px;
            padding-bottom: 45px;
          }

          .ceo-hero h1 {
            margin-top: 20px;
            font-size: clamp(39px, 10vw, 51px);
            letter-spacing: -2.4px;
          }

          .ceo-hero-copy {
            font-size: 13px;
          }

          .ceo-hero-art {
            min-height: 310px;
          }

          .ceo-art-card {
            padding: 17px;
          }

          .ceo-floating-note {
            right: 3%;
            bottom: 5%;
          }

          .ceo-stat {
            padding: 19px 7px;
          }

          .ceo-stat strong {
            font-size: 19px;
          }

          .ceo-stat span {
            font-size: 8px;
            line-height: 1.6;
          }

          .ceo-directory {
            padding-top: 58px;
            padding-bottom: 60px;
          }

          .ceo-directory-heading {
            align-items: flex-start;
            flex-direction: column;
            gap: 14px;
          }

          .ceo-directory-heading h2 {
            font-size: 33px;
            letter-spacing: -1.2px;
          }

          .ceo-search-panel {
            grid-template-columns: 1fr;
            padding: 14px;
          }

          .ceo-grid {
            grid-template-columns: 1fr;
          }

          .ceo-profile-card {
            padding: 21px;
          }

          .ceo-cta {
            padding: 46px 18px;
          }

          .ceo-cta::after {
            font-size: 150px;
          }

          .ceo-footer {
            gap: 12px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ceo-page *,
          .ceo-page *::before,
          .ceo-page *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>

      <header className="ceo-container ceo-nav">
        <Link href="/dashboard" className="ceo-brand">
          <span className="ceo-brand-mark">b.</span>
          <span>
            TYACDI BRIDGE
            <small>LEARN · BUILD · GROW</small>
          </span>
        </Link>

        <nav className="ceo-nav-links" aria-label="Main navigation">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/ceos" className="ceo-nav-active">
            Find CEOs
          </Link>
          <Link href="/messages" className="ceo-nav-optional">
            Messages
          </Link>
        </nav>

        <Link href="/dashboard" className="ceo-nav-button">
          My Dashboard <span aria-hidden="true">↗</span>
        </Link>
      </header>

      <section className="ceo-container ceo-hero">
        <div>
          <div className="ceo-eyebrow">
            <span className="ceo-eyebrow-dot" />
            YOUR NEXT CHAPTER STARTS HERE
          </div>

          <h1>
            Great leaders.
            <br />
            <span>Greater possibilities.</span>
          </h1>

          <p className="ceo-hero-copy">
            Meet CEOs and business executives, learn from their
            experience, and build relationships that move your
            ambitions forward.
          </p>

          <div className="ceo-hero-actions">
            <a href="#ceo-directory" className="ceo-button">
              Explore business leaders <span aria-hidden="true">↓</span>
            </a>

            <Link href="/dashboard" className="ceo-text-link">
              Back to dashboard <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>

        <div
          className="ceo-hero-art"
          aria-label="Illustration representing professional connections"
          role="img"
        >
          <div className="ceo-art-circle" />
          <div className="ceo-orbit" />
          <div className="ceo-orbit ceo-orbit-two" />

          <div className="ceo-art-card">
            <div className="ceo-art-card-label">
              <span className="ceo-status-dot" />
              TYACDI PROFESSIONAL NETWORK
            </div>

            <div className="ceo-art-person">
              <div className="ceo-art-avatar">CEO</div>
              <div>
                <strong>Leadership starts with connection.</strong>
                <small>Experience · Vision · Growth</small>
              </div>
            </div>

            <div className="ceo-art-quote">
              The right conversation can open the door to your next
              opportunity.
            </div>

            <div className="ceo-art-tags">
              <span>Leadership</span>
              <span>Mentorship</span>
              <span>Growth</span>
            </div>
          </div>

          <div className="ceo-floating-note">
            <strong>Build meaningful relationships</strong>
            <span>Connect. Learn. Grow.</span>
          </div>
        </div>
      </section>

      <section className="ceo-stats">
        <div className="ceo-container" style={{ display: "contents" }}>
          <div className="ceo-stat">
            <strong>{profiles.length}</strong>
            <span>BUSINESS LEADERS</span>
          </div>
          <div className="ceo-stat">
            <strong>01</strong>
            <span>SHARED AMBITION</span>
          </div>
          <div className="ceo-stat">
            <strong>∞</strong>
            <span>POSSIBILITIES TO GROW</span>
          </div>
        </div>
      </section>

      <section id="ceo-directory" className="ceo-container ceo-directory">
        <div className="ceo-directory-heading">
          <div>
            <div className="ceo-eyebrow">
              <span className="ceo-eyebrow-dot" />
              THE CEO DIRECTORY
            </div>

            <h2>
              Find your next
              <br />
              <span style={{ color: "#4b8963" }}>connection.</span>
            </h2>

            <p>
              Search for experienced leaders by name, company,
              industry, or location. Your next meaningful connection
              could start here.
            </p>
          </div>

          <div className="ceo-count">
            {profiles.length} {profiles.length === 1 ? "CEO" : "CEOs"}{" "}
            in the network
          </div>
        </div>

        <div className="ceo-search-panel">
          <div className="ceo-field">
            <label htmlFor="ceo-search">NAME OR COMPANY</label>
            <input
              id="ceo-search"
              type="search"
              placeholder="e.g. business leader or company"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="ceo-field">
            <label htmlFor="ceo-industry">INDUSTRY</label>
            <select
              id="ceo-industry"
              value={industry}
              onChange={(event) => setIndustry(event.target.value)}
            >
              {industries.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="ceo-field">
            <label htmlFor="ceo-location">LOCATION</label>
            <input
              id="ceo-location"
              type="search"
              placeholder="e.g. Lagos, Nigeria"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />
          </div>

          <button
            type="button"
            className="ceo-search-button"
            onClick={() => {
              document
                .getElementById("ceo-results")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            Find CEOs ↗
          </button>
        </div>

        <div id="ceo-results" className="ceo-results-row">
          <h3>Business leaders</h3>
          <span>
            Showing {filteredCEOs.length} of {profiles.length} profiles
          </span>
        </div>

        <div className="ceo-grid">
          {loading ? (
            <div className="ceo-loading">
              <span className="ceo-loading-dot" />
              Finding business leaders in the network...
            </div>
          ) : error ? (
            <div className="ceo-error">
              <strong>We couldn't load the directory.</strong>
              <br />
              {error}
              <br />
              <button
                type="button"
                className="ceo-search-button"
                style={{ marginTop: 12 }}
                onClick={() => void loadCEOs()}
              >
                Try again
              </button>
            </div>
          ) : filteredCEOs.length === 0 ? (
            <div className="ceo-empty">
              <div className="ceo-empty-icon" aria-hidden="true">
                ↗
              </div>

              <h3>
                {profiles.length === 0
                  ? "Your CEO network is just getting started."
                  : "No matching CEOs found."}
              </h3>

              <p>
                {profiles.length === 0
                  ? "When members register with the CEO / Executive role, their profiles will appear here."
                  : "Try another name, company, industry, or location."}
              </p>

              {profiles.length > 0 && (
                <button
                  type="button"
                  className="ceo-button"
                  onClick={() => {
                    setSearch("");
                    setIndustry("All industries");
                    setLocation("");
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            filteredCEOs.map((ceo) => (
              <article key={ceo.id} className="ceo-profile-card">
                <div className="ceo-card-top">
                  <div className="ceo-avatar">
                    {getInitials(ceo.full_name)}
                  </div>

                  <span className="ceo-profile-badge">
                    CEO / Executive
                  </span>
                </div>

                <h3>{ceo.full_name || "Business Leader"}</h3>

                <div className="ceo-company">
                  {ceo.company || "Independent Executive"}
                </div>

                <div className="ceo-location">
                  <span aria-hidden="true">⌖</span>
                  {ceo.location || "Location not provided"}
                </div>

                {ceo.industry && (
                  <div className="ceo-industry">{ceo.industry}</div>
                )}

                <p className="ceo-bio">
                  {ceo.bio ||
                    "A member of the TYACDI BRIDGE professional network. Connect to start a conversation and explore opportunities to learn and grow."}
                </p>

                <div className="ceo-card-bottom">
                  <small>Professional network</small>

                  {ceo.id === currentUserId ? (
                    <Link
                      href="/dashboard"
                      className="ceo-message-button"
                    >
                      Your profile ↗
                    </Link>
                  ) : (
                    <Link
                      href={`/messages?user=${encodeURIComponent(ceo.id)}`}
                      className="ceo-message-button"
                    >
                      Message CEO <span aria-hidden="true">↗</span>
                    </Link>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="ceo-container">
        <div className="ceo-cta">
          <div className="ceo-eyebrow">
            <span className="ceo-eyebrow-dot" />
            YOUR GROWTH MATTERS
          </div>

          <h2>
            Your ambition deserves
            <br />
            <span>the right connections.</span>
          </h2>

          <p>
            Learn from experience, share ideas, and build relationships
            that help you move forward. Every great connection begins
            with a conversation.
          </p>

          <Link href="/messages" className="ceo-button">
            Start a conversation ↗
          </Link>
        </div>
      </section>

      <footer className="ceo-container ceo-footer">
        <Link href="/dashboard" className="ceo-footer-brand">
          TYACDI BRIDGE
        </Link>

        <span>LEARN · BUILD · GROW</span>

        <Link href="/ceos">Find CEOs</Link>
        <Link href="/messages">Messages</Link>

        <p className="ceo-footer-motto">
          “Tosi says: You also can do it.” Growth is gradual... But with
          us exponential.
          <br />
          <span>Founder: WEYA-AJAYI VICTOR</span>
        </p>
      </footer>
    </main>
  );
}
