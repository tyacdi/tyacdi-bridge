"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  full_name: string;
  role: string;
  company: string | null;
  bio: string | null;
  location: string | null;
  interests: string[] | null;
};

type ConnectionRequest = {
  id: string;
  from_user: string;
  to_user: string;
  status: string;
  created_at: string;
  profiles?: {
    full_name?: string;
    role?: string;
    company?: string | null;
  } | null;
};

const roles = [
  "Founder",
  "Mentor",
  "CEO / Executive",
  "Operator",
  "Professional",
  "Student / Emerging talent",
  "Investor",
];

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All roles");
  const [saving, setSaving] = useState(false);
  const [workingRequest, setWorkingRequest] = useState("");
  const [connectingTo, setConnectingTo] = useState<string[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const supabase = createClient();

        const { data: authData, error: authError } =
          await supabase.auth.getUser();

        if (authError || !authData.user) {
          window.location.href = "/login";
          return;
        }

        const user = authData.user;

        if (!active) return;

        setUserId(user.id);

        let { data: currentProfile, error: profileError } =
          await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();

        if (profileError) throw profileError;

        if (!currentProfile) {
          const metadata = user.user_metadata || {};

          const seed = {
            id: user.id,
            full_name:
              metadata.full_name ||
              user.email?.split("@")[0] ||
              "Member",
            role: metadata.role || "Professional",
            company: metadata.company || "",
            bio: metadata.bio || "",
            interests: [],
          };

          const { data: createdProfile, error: createError } =
            await supabase
              .from("profiles")
              .upsert(seed)
              .select("*")
              .single();

          if (createError) throw createError;

          currentProfile = createdProfile;
        }

        const { data: people, error: peopleError } = await supabase
          .from("profiles")
          .select("*")
          .neq("id", user.id)
          .order("created_at", { ascending: false })
          .limit(100);

        if (peopleError) throw peopleError;

        const { data: pendingRequests, error: requestsError } =
          await supabase
            .from("connection_requests")
            .select(
              "id,from_user,to_user,status,created_at,profiles!connection_requests_from_user_fkey(full_name,role,company)"
            )
            .eq("to_user", user.id)
            .eq("status", "pending")
            .limit(20);

        if (requestsError) throw requestsError;

        const { data: sentRequests, error: sentError } =
          await supabase
            .from("connection_requests")
            .select("to_user")
            .eq("from_user", user.id)
            .in("status", ["pending", "accepted"]);

        if (sentError) throw sentError;

        if (!active) return;

        setProfile(currentProfile as Profile);
        setMembers((people || []) as Profile[]);
        setRequests((pendingRequests || []) as ConnectionRequest[]);
        setConnectingTo(
          (sentRequests || []).map((request) => request.to_user)
        );
      } catch (err: unknown) {
        if (active) {
          setMessage(
            err instanceof Error
              ? err.message
              : "Could not load your dashboard. Please refresh and try again."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!profile) return;

    setSaving(true);
    setMessage("");

    try {
      const supabase = createClient();

      const { error } = await supabase.from("profiles").upsert({
        id: userId,
        full_name: profile.full_name,
        role: profile.role,
        company: profile.company,
        bio: profile.bio,
        location: profile.location,
        interests: profile.interests || [],
      });

      if (error) throw error;

      setMessage("Profile saved successfully.");
    } catch (err: unknown) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Could not save your profile."
      );
    } finally {
      setSaving(false);
    }
  }

  async function connect(toUser: string) {
    if (!userId || connectingTo.includes(toUser)) return;

    setMessage("");

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("connection_requests")
        .insert({
          from_user: userId,
          to_user: toUser,
          status: "pending",
        });

      if (error) {
        setMessage(
          error.code === "23505"
            ? "You have already sent a request to this member."
            : error.message
        );
        return;
      }

      setConnectingTo((current) => [...current, toUser]);
      setMessage("Connection request sent.");
    } catch {
      setMessage("Could not send the request. Please try again.");
    }
  }

  async function respond(
    id: string,
    status: "accepted" | "declined"
  ) {
    setWorkingRequest(id);
    setMessage("");

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("connection_requests")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      setRequests((current) =>
        current.filter((request) => request.id !== id)
      );

      setMessage(
        status === "accepted"
          ? "Connection accepted."
          : "Request declined."
      );
    } catch (err: unknown) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Could not update the request."
      );
    } finally {
      setWorkingRequest("");
    }
  }

  async function logout() {
    const supabase = createClient();

    await supabase.auth.signOut();

    window.location.href = "/";
  }

  const suggestedMembers = useMemo(() => {
    if (!profile) return [];

    const words = (value: string | null | undefined) =>
      (value || "")
        .toLowerCase()
        .split(/[^a-z0-9+#]+/)
        .filter((word) => word.length > 3);

    const myInterests = new Set(
      (profile.interests || []).map((item) =>
        item.toLowerCase().trim()
      )
    );

    const myGoalWords = new Set(words(profile.bio));

    return members
      .map((member) => {
        const sharedInterests = (member.interests || []).filter(
          (item) =>
            myInterests.has(item.toLowerCase().trim())
        );

        const memberGoalWords = words(member.bio);

        const sharedGoalWords = memberGoalWords.filter((word) =>
          myGoalWords.has(word)
        );

        let score = 0;
        const reasons: string[] = [];

        if (member.role === "CEO / Executive") {
          score += 5;
          reasons.push("CEO / executive");
        }

        if (
          profile.role &&
          member.role?.toLowerCase() === profile.role.toLowerCase()
        ) {
          score += 3;
          reasons.push("same role as you");
        }

        score += sharedInterests.length * 4;

        if (sharedInterests.length > 0) {
          reasons.push("shared interests");
        }

        score += Math.min(sharedGoalWords.length, 4);

        if (sharedGoalWords.length >= 2) {
          reasons.push("similar goals");
        }

        return {
          member,
          score,
          reasons: reasons.slice(0, 3),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [members, profile]);

  const filteredMembers = useMemo(() => {
    const search = query.trim().toLowerCase();

    return members.filter((member) => {
      const searchableValues = [
        member.full_name,
        member.company,
        member.bio,
        member.location,
        member.role,
        ...(member.interests || []),
      ];

      const matchesSearch =
        !search ||
        searchableValues.some((value) =>
          (value || "").toLowerCase().includes(search)
        );

      const matchesRole =
        roleFilter === "All roles" ||
        member.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [members, query, roleFilter]);

  if (loading) {
    return (
      <main className="auth-main">
        <div className="auth-form">
          <p>Loading your member workspace...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard">
      <header className="dash-nav">
        <nav className="nav wrap">
          <Link
            className="brand"
            href="/"
            aria-label="TYACDI BRIDGE home"
          >
            <Image
              src="/tyacdi-logo.png"
              alt="TYACDI BRIDGE — Learn, Build, Grow"
              width={180}
              height={90}
              priority
              style={{
                width: "145px",
                height: "auto",
                objectFit: "contain",
              }}
            />
          </Link>

          <div className="nav-actions">
            <span style={{ fontSize: 12, color: "#6c7b70" }}>
              {profile?.full_name || "Member"}
            </span>

            <Link
              href="/messages"
              className="btn btn-dark"
              style={{ textDecoration: "none" }}
            >
              Messages
            </Link>

            <button
              className="logout-btn"
              type="button"
              onClick={logout}
            >
              Log out
            </button>
          </div>
        </nav>
      </header>

      <div className="wrap dashboard-content">
        <section className="dash-hero">
          <p className="eyebrow">YOUR PROFESSIONAL NETWORK</p>

          <h1>
            Welcome back,{" "}
            <span>{profile?.full_name || "Member"}</span>
          </h1>

          <p>
            Learn from experience, build meaningful connections, and
            grow with people who share your ambitions.
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              marginTop: 20,
            }}
          >
            <a className="btn btn-dark" href="#suggestions">
              Discover people
            </a>

            <a className="btn btn-light" href="#directory">
              Explore all members
            </a>
          </div>
        </section>

        {message && (
          <div
            role="status"
            style={{
              padding: "12px 16px",
              marginBottom: 18,
              borderRadius: 12,
              background: "#edf6ee",
              color: "#28583b",
              overflowWrap: "anywhere",
            }}
          >
            {message}
          </div>
        )}

        {/* PERSONALIZED MEMBER SUGGESTIONS */}
        <section
          className="dash-panel"
          id="suggestions"
          style={{ marginBottom: 22 }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
              marginBottom: 18,
            }}
          >
            <div>
              <p className="eyebrow">MADE FOR YOUR AMBITIONS</p>

              <h2>People You Should Meet</h2>

              <p className="panel-sub">
                Discover CEOs, professionals in your field, and members
                whose interests and ambitions may align with yours.
              </p>
            </div>

            <a className="mini-btn" href="#directory">
              View directory
            </a>
          </div>

          {suggestedMembers.length === 0 ? (
            <div className="empty-state">
              There are no other member profiles to recommend yet.
              As more people join TYACDI BRIDGE, recommendations will
              appear here.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(100%, 230px), 1fr))",
                gap: 16,
              }}
            >
              {suggestedMembers.map(
                ({ member, reasons, score }) => (
                  <article
                    key={member.id}
                    style={{
                      border: "1px solid #e1e9df",
                      borderRadius: 16,
                      padding: 18,
                      background:
                        score >= 5
                          ? "linear-gradient(145deg, #ffffff, #f0f7ef)"
                          : "#ffffff",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      minWidth: 0,
                    }}
                  >
                    <div
                      className="portrait"
                      aria-hidden="true"
                      style={{ marginBottom: 12 }}
                    >
                      {(member.full_name || "Member")
                        .split(" ")
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </div>

                    <h3
                      style={{
                        fontSize: 17,
                        margin: "0 0 5px",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {member.full_name || "Member"}
                    </h3>

                    <p
                      style={{
                        color: "#54705b",
                        fontSize: 13,
                        margin: "0 0 8px",
                      }}
                    >
                      {member.role || "Professional"}
                    </p>

                    {member.company && (
                      <p
                        style={{
                          fontSize: 13,
                          color: "#66736a",
                          margin: "0 0 8px",
                        }}
                      >
                        {member.company}
                      </p>
                    )}

                    {member.location && (
                      <p
                        style={{
                          fontSize: 12,
                          color: "#758078",
                          margin: "0 0 10px",
                        }}
                      >
                        {member.location}
                      </p>
                    )}

                    {member.bio && (
                      <p
                        style={{
                          fontSize: 13,
                          lineHeight: 1.6,
                          color: "#526057",
                          margin: "0 0 12px",
                        }}
                      >
                        {member.bio.length > 115
                          ? `${member.bio.slice(0, 115)}…`
                          : member.bio}
                      </p>
                    )}

                    {reasons.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 6,
                          marginBottom: 14,
                        }}
                      >
                        {reasons.map((reason) => (
                          <span
                            key={reason}
                            style={{
                              fontSize: 11,
                              color: "#28583b",
                              background: "#e4f0e5",
                              borderRadius: 999,
                              padding: "5px 8px",
                            }}
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    )}

                    <div style={{ marginTop: "auto", width: "100%" }}>
                      <button
                        className="mini-btn"
                        type="button"
                        disabled={connectingTo.includes(member.id)}
                        onClick={() => connect(member.id)}
                      >
                        {connectingTo.includes(member.id)
                          ? "Request sent"
                          : "Connect"}
                      </button>
                    </div>
                  </article>
                )
              )}
            </div>
          )}
        </section>

        <div className="dash-grid">
          <section className="dash-panel" id="directory">
            <h2>Discover your network</h2>

            <p className="panel-sub">
              Find people with shared ambitions and send a request to
              connect.
            </p>

            <div
              className="form-row"
              style={{ marginBottom: 14 }}
            >
              <input
                aria-label="Search members"
                placeholder="Search name, company, bio, or interests..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />

              <select
                aria-label="Filter by role"
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
              >
                <option>All roles</option>

                {roles.map((role) => (
                  <option key={role}>{role}</option>
                ))}
              </select>
            </div>

            {filteredMembers.length === 0 ? (
              <div className="empty-state">
                No members match this search yet. Invite others to join
                and grow the community.
              </div>
            ) : (
              filteredMembers.map((member) => (
                <article className="member-row" key={member.id}>
                  <div className="portrait" aria-hidden="true">
                    {(member.full_name || "Member")
                      .split(" ")
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>

                  <div className="member-info">
                    <strong>{member.full_name || "Member"}</strong>

                    <small>
                      {member.role}
                      {member.company ? ` · ${member.company}` : ""}
                      {member.location ? ` · ${member.location}` : ""}
                    </small>

                    {member.bio && <small>{member.bio}</small>}

                    {!!member.interests?.length && (
                      <div className="member-tags">
                        {member.interests
                          .slice(0, 4)
                          .map((interest) => (
                            <span key={interest}>{interest}</span>
                          ))}
                      </div>
                    )}
                  </div>

                  <div className="member-actions">
                    <button
                      className="mini-btn"
                      type="button"
                      disabled={connectingTo.includes(member.id)}
                      onClick={() => connect(member.id)}
                    >
                      {connectingTo.includes(member.id)
                        ? "Request sent"
                        : "Connect"}
                    </button>
                  </div>
                </article>
              ))
            )}
          </section>

          <aside
            style={{
              display: "grid",
              gap: 18,
              alignContent: "start",
            }}
          >
            <section className="dash-panel">
              <h2>Your profile</h2>

              <p className="panel-sub">
                Help other members understand who you are and what you
                are building.
              </p>

              {profile && (
                <form className="profile-edit" onSubmit={saveProfile}>
                  <label htmlFor="pf-name">Full name</label>

                  <input
                    id="pf-name"
                    required
                    value={profile.full_name || ""}
                    onChange={(event) =>
                      setProfile({
                        ...profile,
                        full_name: event.target.value,
                      })
                    }
                  />

                  <label htmlFor="pf-role">Role</label>

                  <select
                    id="pf-role"
                    value={profile.role || "Professional"}
                    onChange={(event) =>
                      setProfile({
                        ...profile,
                        role: event.target.value,
                      })
                    }
                  >
                    {roles.map((role) => (
                      <option key={role}>{role}</option>
                    ))}
                  </select>

                  <label htmlFor="pf-company">
                    Company / project
                  </label>

                  <input
                    id="pf-company"
                    value={profile.company || ""}
                    onChange={(event) =>
                      setProfile({
                        ...profile,
                        company: event.target.value,
                      })
                    }
                    placeholder="Company or project name"
                  />

                  <label htmlFor="pf-location">Location</label>

                  <input
                    id="pf-location"
                    value={profile.location || ""}
                    onChange={(event) =>
                      setProfile({
                        ...profile,
                        location: event.target.value,
                      })
                    }
                    placeholder="City, country"
                  />

                  <label htmlFor="pf-bio">Introduction and goals</label>

                  <textarea
                    id="pf-bio"
                    rows={3}
                    value={profile.bio || ""}
                    onChange={(event) =>
                      setProfile({
                        ...profile,
                        bio: event.target.value,
                      })
                    }
                    placeholder="Describe your ambitions, goals, and what you are building."
                  />

                  <label htmlFor="pf-interests">
                    Interests (comma-separated)
                  </label>

                  <input
                    id="pf-interests"
                    value={(profile.interests || []).join(", ")}
                    onChange={(event) =>
                      setProfile({
                        ...profile,
                        interests: event.target.value
                          .split(",")
                          .map((item) => item.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="Startups, technology, investing"
                  />

                  <button
                    className="btn btn-dark"
                    type="submit"
                    disabled={saving}
                  >
                    {saving ? "Saving profile..." : "Save profile"}
                  </button>
                </form>
              )}
            </section>

            <section className="dash-panel">
              <h2>Connection requests</h2>

              <p className="panel-sub">
                Review people who have asked to connect with you.
              </p>

              {requests.length === 0 ? (
                <div className="empty-state">
                  No pending requests right now. Keep exploring the
                  directory to build your network.
                </div>
              ) : (
                requests.map((request) => (
                  <article className="member-row" key={request.id}>
                    <div className="member-info">
                      <strong>
                        {request.profiles?.full_name || "Member"}
                      </strong>

                      <small>
                        {request.profiles?.role || "Member"}
                        {request.profiles?.company
                          ? ` · ${request.profiles.company}`
                          : ""}
                      </small>
                    </div>

                    <div className="member-actions">
                      <button
                        className="mini-btn"
                        type="button"
                        disabled={workingRequest === request.id}
                        onClick={() =>
                          respond(request.id, "accepted")
                        }
                      >
                        Accept
                      </button>

                      <button
                        className="mini-btn"
                        type="button"
                        disabled={workingRequest === request.id}
                        onClick={() =>
                          respond(request.id, "declined")
                        }
                      >
                        Decline
                      </button>
                    </div>
                  </article>
                ))
              )}
            </section>
          </aside>
        </div>
      </div>

      <footer className="wrap dash-footer">
        TYACDI BRIDGE · Learn. Build. Grow.
        <span style={{ float: "right" }}>
          Be respectful. Build trust.
        </span>
      </footer>
    </main>
  );
}
