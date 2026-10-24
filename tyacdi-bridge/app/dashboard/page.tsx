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
  const [isEditingProfile, setIsEditingProfile] = useState(true);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [workingRequest, setWorkingRequest] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
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
            location: "",
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

        if (!active) return;

        setProfile(currentProfile as Profile);
        setMembers((people || []) as Profile[]);
        setRequests((pendingRequests || []) as ConnectionRequest[]);
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

      const { data: savedProfile, error } = await supabase
        .from("profiles")
        .upsert(
          {
            id: userId,
            full_name: profile.full_name.trim(),
            role: profile.role,
            company: profile.company?.trim() || null,
            bio: profile.bio?.trim() || null,
            location: profile.location?.trim() || null,
            interests: profile.interests || [],
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        )
        .select("*")
        .single();

      if (error) throw error;

      if (!savedProfile) {
        throw new Error("Your profile could not be retrieved after saving.");
      }

      setProfile(savedProfile as Profile);
      setIsEditingProfile(false);
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

  async function deleteAccount() {
    if (deletingAccount) return;

    const confirmation = window.prompt(
      'This permanently deletes your account. Type DELETE to confirm.'
    );

    if (confirmation !== "DELETE") return;

    const finalConfirmation = window.confirm(
      "Are you absolutely sure? Your account deletion cannot be undone."
    );

    if (!finalConfirmation) return;

    setDeletingAccount(true);
    setMessage("Deleting your account...");

    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Account deletion failed. Please try again."
        );
      }

      const supabase = createClient();
      await supabase.auth.signOut();

      window.location.replace("/");
    } catch (err: unknown) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Could not delete your account. Please try again."
      );

      setDeletingAccount(false);
    }
  }

  async function logout() {
    const supabase = createClient();

    await supabase.auth.signOut();

    window.location.href = "/";
  }

  const filteredMembers = useMemo(() => {
    const search = query.trim().toLowerCase();

    return members.filter((member) => {
      const searchableValues = [
        member.full_name,
        member.company,
        member.bio,
        member.location,
        ...(member.interests || []),
      ];

      const matchesSearch =
        !search ||
        searchableValues.some((value) =>
          (value || "").toLowerCase().includes(search)
        );

      const matchesRole =
        roleFilter === "All roles" || member.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [members, query, roleFilter]);

  const recommendedMembers = useMemo(() => {
    if (!profile) return [];

    const myInterests = (profile.interests || []).map((interest) =>
      interest.toLowerCase()
    );

    return [...filteredMembers]
      .map((member) => {
        const sharedInterests = (member.interests || []).filter(
          (interest) => myInterests.includes(interest.toLowerCase())
        ).length;

        const roleBonus =
          profile.role !== member.role ? 1 : 0;

        return {
          member,
          score: sharedInterests * 3 + roleBonus,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((item) => item.member);
  }, [filteredMembers, profile]);

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

            <button
              type="button"
              onClick={deleteAccount}
              disabled={deletingAccount}
              style={{
                background: "#fff0ef",
                color: "#a32121",
                border: "1px solid #e5b4b4",
                borderRadius: 8,
                padding: "10px 14px",
                fontWeight: 600,
                cursor: deletingAccount ? "not-allowed" : "pointer",
                opacity: deletingAccount ? 0.6 : 1,
              }}
            >
              {deletingAccount ? "Deleting..." : "Delete account"}
            </button>
          </div>
        </nav>
      </header>

      <div className="wrap dash-content">
        <section className="dash-heading">
          <p className="eyebrow">YOUR TYACDI BRIDGE WORKSPACE</p>

          <h1>
            Welcome back, {profile?.full_name || "Member"}.
          </h1>

          <p>
            Meet ambitious people, connect with experienced leaders, and
            keep building your future.
          </p>
        </section>

        {message && (
          <div
            role="status"
            aria-live="polite"
            style={{
              marginBottom: 20,
              padding: "12px 16px",
              borderRadius: 8,
              background: "#f0f7f1",
              color: "#254d34",
              overflowWrap: "anywhere",
            }}
          >
            {message}
          </div>
        )}

        <div
          className="dashboard-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.5fr) minmax(280px, 1fr)",
            gap: 24,
            alignItems: "start",
          }}
        >
          <section className="dash-panel">
            <h2>Member directory</h2>

            <p className="panel-sub">
              Search entrepreneurs, mentors, executives, and other members
              of the TYACDI BRIDGE community.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) minmax(130px, 0.6fr)",
                gap: 10,
                marginBottom: 20,
              }}
            >
              <input
                aria-label="Search members"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, company, interests..."
              />

              <select
                aria-label="Filter members by role"
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
                No members match your search yet. Try a different search
                or role.
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
                      {member.role || "Professional"}
                      {member.company ? ` · ${member.company}` : ""}
                      {member.location ? ` · ${member.location}` : ""}
                    </small>

                    {member.bio && <small>{member.bio}</small>}

                    {!!member.interests?.length && (
                      <div className="member-tags">
                        {member.interests.slice(0, 4).map((interest) => (
                          <span key={interest}>{interest}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="member-actions">
                    <button
                      className="mini-btn"
                      type="button"
                      onClick={() => connect(member.id)}
                    >
                      Connect
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
              <h2>People you should meet</h2>

              <p className="panel-sub">
                Discover members whose interests may align with yours.
              </p>

              {recommendedMembers.length === 0 ? (
                <div className="empty-state">
                  No recommendations yet. Complete your profile and
                  explore the member directory.
                </div>
              ) : (
                recommendedMembers.map((member) => (
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
                        {member.role || "Professional"}
                        {member.company ? ` · ${member.company}` : ""}
                      </small>
                    </div>

                    <div className="member-actions">
                      <button
                        className="mini-btn"
                        type="button"
                        onClick={() => connect(member.id)}
                      >
                        Connect
                      </button>
                    </div>
                  </article>
                ))
              )}
            </section>

            <section className="dash-panel">
              <h2>Your profile</h2>

              <p className="panel-sub">
                Help other members understand who you are and what you
                are building.
              </p>

              {profile && !isEditingProfile && (
                <div className="profile-summary">
                  <div
                    className="member-row"
                    style={{
                      paddingLeft: 0,
                      paddingRight: 0,
                    }}
                  >
                    <div className="portrait" aria-hidden="true">
                      {(profile.full_name || "Member")
                        .split(" ")
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </div>

                    <div className="member-info">
                      <strong>{profile.full_name || "Member"}</strong>
                      <small>{profile.role || "Professional"}</small>
                      {profile.company && <small>{profile.company}</small>}
                      {profile.location && <small>{profile.location}</small>}
                    </div>
                  </div>

                  {profile.bio && (
                    <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                      {profile.bio}
                    </p>
                  )}

                  {!!profile.interests?.length && (
                    <div
                      className="member-tags"
                      style={{ marginBottom: 16 }}
                    >
                      {profile.interests.map((interest) => (
                        <span key={interest}>{interest}</span>
                      ))}
                    </div>
                  )}

                  <button
                    className="btn btn-dark"
                    type="button"
                    onClick={() => {
                      setMessage("");
                      setIsEditingProfile(true);
                    }}
                  >
                    Edit profile
                  </button>
                </div>
              )}

              {profile && isEditingProfile && (
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

                  <label htmlFor="pf-company">Company / project</label>

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

                  <label htmlFor="pf-bio">Introduction</label>

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
                    placeholder="What are you working toward?"
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

                  <button
                    className="mini-btn"
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setMessage("");
                      setIsEditingProfile(false);
                    }}
                    style={{ marginTop: 10 }}
                  >
                    Cancel
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
                        onClick={() => respond(request.id, "accepted")}
                      >
                        {workingRequest === request.id
                          ? "Updating..."
                          : "Accept"}
                      </button>

                      <button
                        className="mini-btn"
                        type="button"
                        disabled={workingRequest === request.id}
                        onClick={() => respond(request.id, "declined")}
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

      <style jsx>{`
        @media (max-width: 760px) {
          .dashboard-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }

          .nav-actions {
            flex-wrap: wrap;
            justify-content: flex-end;
          }
        }
      `}</style>
    </main>
  );
}
