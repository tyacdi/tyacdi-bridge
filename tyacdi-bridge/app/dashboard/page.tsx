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
  qualifications: string[] | null;
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

function parseList(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function deleteButtonStyle(disabled: boolean) {
  return {
    display: "block",
    width: "100%",
    marginTop: 12,
    padding: "12px 14px",
    background: "#fff0ef",
    color: "#a32121",
    border: "1px solid #e5b4b4",
    borderRadius: 8,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
  } as const;
}

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

    async function loadDashboard() {
      try {
        const supabase = createClient();

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          window.location.replace("/login");
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

          const { data: createdProfile, error: createError } =
            await supabase
              .from("profiles")
              .upsert({
                id: user.id,
                full_name:
                  metadata.full_name ||
                  user.email?.split("@")[0] ||
                  "Member",
                role: metadata.role || "Professional",
                company: metadata.company || null,
                bio: metadata.bio || null,
                location: null,
                interests: [],
                qualifications: [],
              })
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
      } catch (error: unknown) {
        if (active) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Could not load your dashboard."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  async function saveProfile(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!profile || saving) return;

    setSaving(true);
    setMessage("");

    try {
      const supabase = createClient();

      const { data, error } = await supabase
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
            qualifications: profile.qualifications || [],
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        )
        .select("*")
        .single();

      if (error) throw error;

      setProfile(data as Profile);
      setIsEditingProfile(false);
      setMessage("Your profile has been saved.");
    } catch (error: unknown) {
      setMessage(
        error instanceof Error
          ? error.message
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
      setMessage("Could not send the connection request.");
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
        .eq("id", id)
        .eq("to_user", userId);

      if (error) throw error;

      setRequests((current) =>
        current.filter((request) => request.id !== id)
      );

      setMessage(
        status === "accepted"
          ? "Connection accepted."
          : "Request declined."
      );
    } catch (error: unknown) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not update the connection request."
      );
    } finally {
      setWorkingRequest("");
    }
  }

  async function deleteAccount() {
    if (deletingAccount) return;

    const confirmation = window.prompt(
      "To permanently delete your account, type DELETE in capital letters:"
    );

    if (confirmation === null) {
      setMessage("Account deletion cancelled.");
      return;
    }

    if (confirmation.trim() !== "DELETE") {
      setMessage(
        'Confirmation did not match. Type "DELETE" in capital letters.'
      );
      return;
    }

    const finalConfirmation = window.confirm(
      "Are you absolutely sure? Your account deletion cannot be undone."
    );

    if (!finalConfirmation) {
      setMessage("Account deletion cancelled.");
      return;
    }

    setDeletingAccount(true);
    setMessage("Deleting your account...");

    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.error ||
            `Account deletion failed. Server returned ${response.status}.`
        );
      }

      const supabase = createClient();
      await supabase.auth.signOut();

      window.location.replace("/");
    } catch (error: unknown) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Account deletion failed. Please try again."
      );

      setDeletingAccount(false);
    }
  }

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.replace("/");
  }

  const filteredMembers = useMemo(() => {
    const search = query.trim().toLowerCase();

    return members.filter((member) => {
      const values = [
        member.full_name,
        member.role,
        member.company,
        member.bio,
        member.location,
        ...(member.interests || []),
        ...(member.qualifications || []),
      ];

      const matchesSearch =
        !search ||
        values.some((value) =>
          (value || "").toLowerCase().includes(search)
        );

      const matchesRole =
        roleFilter === "All roles" || member.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [members, query, roleFilter]);

  const recommendations = useMemo(() => {
    if (!profile) return [];

    const myInterests = (profile.interests || []).map((interest) =>
      interest.toLowerCase()
    );

    return [...filteredMembers]
      .map((member) => {
        const sharedInterests = (member.interests || []).filter(
          (interest) => myInterests.includes(interest.toLowerCase())
        ).length;

        return {
          member,
          score:
            sharedInterests * 3 +
            (member.role !== profile.role ? 1 : 0),
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
          <p>Loading your TYACDI BRIDGE dashboard...</p>
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
            <span>{profile?.full_name || "Member"}</span>

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

      <div className="wrap dash-content">
        <section className="dash-heading">
          <p className="eyebrow">YOUR TYACDI BRIDGE WORKSPACE</p>

          <h1>
            Welcome back, {profile?.full_name || "Member"}.
          </h1>

          <p>
            Meet ambitious people, connect with experienced leaders,
            and keep building your future.
          </p>
        </section>

        {message && (
          <div
            role="status"
            aria-live="polite"
            style={{
              marginBottom: 20,
              padding: 14,
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
            gridTemplateColumns:
              "minmax(0, 1.5fr) minmax(280px, 1fr)",
            gap: 24,
            alignItems: "start",
          }}
        >
          <section className="dash-panel" id="directory">
            <h2>Member directory</h2>

            <p className="panel-sub">
              Search entrepreneurs, mentors, executives, and other
              members of the community.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(0, 1fr) minmax(130px, 0.6fr)",
                gap: 10,
                marginBottom: 20,
              }}
            >
              <input
                type="search"
                aria-label="Search members"
                placeholder="Search members or qualifications..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
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
              <p>No members found. Try another search.</p>
            ) : (
              filteredMembers.map((member) => (
                <article className="member-row" key={member.id}>
                  <div className="portrait">
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

                    {!!member.qualifications?.length && (
                      <div style={{ marginTop: 8 }}>
                        <small>
                          <strong>Qualifications:</strong>{" "}
                          {member.qualifications.join(" · ")}
                        </small>
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
              <h2>Your profile</h2>

              <p className="panel-sub">
                Manage your information, interests, qualifications, and
                account settings.
              </p>

              {profile && !isEditingProfile && (
                <div>
                  <div className="member-row">
                    <div className="portrait">
                      {(profile.full_name || "Member")
                        .split(" ")
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </div>

                    <div className="member-info">
                      <strong>{profile.full_name}</strong>
                      <small>{profile.role}</small>

                      {profile.company && (
                        <small>{profile.company}</small>
                      )}

                      {profile.location && (
                        <small>{profile.location}</small>
                      )}
                    </div>
                  </div>

                  {profile.bio && (
                    <p style={{ lineHeight: 1.6 }}>{profile.bio}</p>
                  )}

                  {!!profile.interests?.length && (
                    <div style={{ marginTop: 12 }}>
                      <strong>Interests</strong>
                      <div className="member-tags">
                        {profile.interests.map((interest) => (
                          <span key={interest}>{interest}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {!!profile.qualifications?.length && (
                    <div style={{ marginTop: 14 }}>
                      <strong>Qualifications</strong>
                      <div className="member-tags">
                        {profile.qualifications.map((qualification) => (
                          <span key={qualification}>{qualification}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    className="btn btn-dark"
                    type="button"
                    style={{ marginTop: 16, width: "100%" }}
                    onClick={() => {
                      setMessage("");
                      setIsEditingProfile(true);
                    }}
                  >
                    Edit profile
                  </button>

                  <button
                    type="button"
                    onClick={deleteAccount}
                    disabled={deletingAccount}
                    style={deleteButtonStyle(deletingAccount)}
                  >
                    {deletingAccount
                      ? "Deleting account..."
                      : "Delete account"}
                  </button>
                </div>
              )}

              {profile && isEditingProfile && (
                <form
                  onSubmit={saveProfile}
                  style={{ display: "grid", gap: 10 }}
                >
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
                    Interests (separate with commas)
                  </label>

                  <input
                    id="pf-interests"
                    value={(profile.interests || []).join(", ")}
                    onChange={(event) =>
                      setProfile({
                        ...profile,
                        interests: parseList(event.target.value),
                      })
                    }
                    placeholder="Startups, technology, investing"
                  />

                  <label htmlFor="pf-qualifications">
                    Qualifications (separate with commas)
                  </label>

                  <input
                    id="pf-qualifications"
                    value={(profile.qualifications || []).join(", ")}
                    onChange={(event) =>
                      setProfile({
                        ...profile,
                        qualifications: parseList(event.target.value),
                      })
                    }
                    placeholder="BSc in Business, Project Management Certificate"
                  />

                  <p className="panel-sub" style={{ marginTop: 0 }}>
                    Add degrees, certificates, professional training, or
                    relevant industry credentials.
                  </p>

                  <button
                    className="btn btn-dark"
                    type="submit"
                    disabled={saving || deletingAccount}
                  >
                    {saving ? "Saving..." : "Save profile"}
                  </button>

                  <button
                    type="button"
                    onClick={deleteAccount}
                    disabled={deletingAccount || saving}
                    style={deleteButtonStyle(
                      deletingAccount || saving
                    )}
                  >
                    {deletingAccount
                      ? "Deleting account..."
                      : "Delete account"}
                  </button>

                  <button
                    className="mini-btn"
                    type="button"
                    disabled={saving || deletingAccount}
                    onClick={() => {
                      setMessage("");
                      setIsEditingProfile(false);
                    }}
                  >
                    Cancel editing
                  </button>
                </form>
              )}
            </section>

            <section className="dash-panel">
              <h2>People you should meet</h2>

              <p className="panel-sub">
                Members whose interests may align with yours.
              </p>

              {recommendations.length === 0 ? (
                <p>No recommendations available yet.</p>
              ) : (
                recommendations.map((member) => (
                  <article className="member-row" key={member.id}>
                    <div className="member-info">
                      <strong>{member.full_name}</strong>
                      <small>
                        {member.role}
                        {member.company ? ` · ${member.company}` : ""}
                      </small>
                    </div>

                    <button
                      className="mini-btn"
                      type="button"
                      onClick={() => connect(member.id)}
                    >
                      Connect
                    </button>
                  </article>
                ))
              )}
            </section>

            <section className="dash-panel">
              <h2>Connection requests</h2>

              <p className="panel-sub">
                Review people who want to connect with you.
              </p>

              {requests.length === 0 ? (
                <p>No pending connection requests.</p>
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
                        Accept
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
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }
        }
      `}</style>
    </main>
  );
}
