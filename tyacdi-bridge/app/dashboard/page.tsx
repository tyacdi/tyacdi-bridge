"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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

type Notification = {
  id: string;
  user_id: string;
  actor_id: string | null;
  type:
    | "connection_request"
    | "connection_accepted"
    | "new_message";
  title: string;
  body: string;
  link: string;
  is_read: boolean;
  created_at: string;
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

function formatNotificationDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All roles");
  const [saving, setSaving] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(true);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [workingRequest, setWorkingRequest] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [markingNotification, setMarkingNotification] = useState("");

  const [interestInput, setInterestInput] = useState("");
  const [qualificationInput, setQualificationInput] = useState("");

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications]
  );

  const loadNotifications = useCallback(async (currentUserId: string) => {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("notifications")
      .select(
        "id,user_id,actor_id,type,title,body,link,is_read,created_at"
      )
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Could not load notifications:", error.message);
      return;
    }

    setNotifications((data || []) as Notification[]);
  }, []);

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

        await loadNotifications(user.id);
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

    void loadDashboard();

    return () => {
      active = false;
    };
  }, [loadNotifications]);

  // Keep notifications updated while the dashboard is open.
  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`tyacdi-notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void loadNotifications(userId);
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error("Notification realtime subscription failed.");
        }
      });

    // Refresh periodically as a fallback.
    const interval = window.setInterval(() => {
      void loadNotifications(userId);
    }, 30000);

    return () => {
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [userId, loadNotifications]);

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
      setInterestInput("");
      setQualificationInput("");
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

  function addInterest() {
    if (!profile) return;

    const value = interestInput.trim();

    if (!value) return;

    const existing = profile.interests || [];

    if (
      existing.some(
        (item) => item.toLowerCase() === value.toLowerCase()
      )
    ) {
      setMessage("That interest has already been added.");
      return;
    }

    setProfile({
      ...profile,
      interests: [...existing, value],
    });

    setInterestInput("");
    setMessage("");
  }

  function removeInterest(interest: string) {
    if (!profile) return;

    setProfile({
      ...profile,
      interests: (profile.interests || []).filter(
        (item) => item !== interest
      ),
    });
  }

  function addQualification() {
    if (!profile) return;

    const value = qualificationInput.trim();

    if (!value) return;

    const existing = profile.qualifications || [];

    if (
      existing.some(
        (item) => item.toLowerCase() === value.toLowerCase()
      )
    ) {
      setMessage("That qualification has already been added.");
      return;
    }

    setProfile({
      ...profile,
      qualifications: [...existing, value],
    });

    setQualificationInput("");
    setMessage("");
  }

  function removeQualification(qualification: string) {
    if (!profile) return;

    setProfile({
      ...profile,
      qualifications: (profile.qualifications || []).filter(
        (item) => item !== qualification
      ),
    });
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

  async function markNotificationRead(notification: Notification) {
    if (notification.is_read || markingNotification) return;

    setMarkingNotification(notification.id);

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notification.id)
        .eq("user_id", userId);

      if (error) throw error;

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, is_read: true }
            : item
        )
      );
    } catch (error: unknown) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not mark notification as read."
      );
    } finally {
      setMarkingNotification("");
    }
  }

  async function markAllNotificationsRead() {
    if (!userId || unreadCount === 0 || markingAllRead) return;

    setMarkingAllRead(true);

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (error) throw error;

      setNotifications((current) =>
        current.map((item) => ({ ...item, is_read: true }))
      );

      setMessage("All notifications marked as read.");
    } catch (error: unknown) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not update notifications."
      );
    } finally {
      setMarkingAllRead(false);
    }
  }

  async function openNotification(notification: Notification) {
    await markNotificationRead(notification);
    setNotificationsOpen(false);

    const allowedLinks = ["/dashboard", "/messages"];
    const destination = allowedLinks.includes(notification.link)
      ? notification.link
      : "/dashboard";

    window.location.assign(destination);
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
      const response = await fetch("/api/delete-account", {
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
              alt="TYACDI BRIDGE 鈥� Learn, Build, Grow"
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

            <div className="notification-wrapper">
              <button
                type="button"
                className="notification-bell"
                aria-label={
                  unreadCount > 0
                    ? `Notifications, ${unreadCount} unread`
                    : "Notifications"
                }
                aria-expanded={notificationsOpen}
                onClick={() =>
                  setNotificationsOpen((open) => !open)
                }
              >
                <span className="bell-icon" aria-hidden="true">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="21"
                    height="21"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                    <path d="M10 21h4" />
                  </svg>
                </span>
                <span className="bell-label">Notifications</span>

                {unreadCount > 0 && (
                  <span className="notification-count">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <section
                  className="notification-popover"
                  aria-label="Your notifications"
                >
                  <div className="notification-heading">
                    <div>
                      <strong>Notifications</strong>
                      <small>
                        {unreadCount === 0
                          ? "You're all caught up."
                          : `${unreadCount} unread`}
                      </small>
                    </div>

                    <button
                      type="button"
                      className="notification-close"
                      aria-label="Close notifications"
                      onClick={() => setNotificationsOpen(false)}
                    >
                      脳
                    </button>
                  </div>

                  {unreadCount > 0 && (
                    <button
                      type="button"
                      className="mark-all-read"
                      disabled={markingAllRead}
                      onClick={markAllNotificationsRead}
                    >
                      {markingAllRead
                        ? "Updating..."
                        : "Mark all as read"}
                    </button>
                  )}

                  <div className="notification-list">
                    {notifications.length === 0 ? (
                      <p className="notification-empty">
                        No notifications yet. New messages and connection
                        activity will appear here.
                      </p>
                    ) : (
                      notifications.map((notification) => (
                        <button
                          type="button"
                          key={notification.id}
                          className={`notification-item ${
                            notification.is_read ? "" : "unread"
                          }`}
                          onClick={() =>
                            void openNotification(notification)
                          }
                          disabled={
                            markingNotification === notification.id
                          }
                        >
                          <span className="notification-dot">
                            {!notification.is_read ? "鈼�" : "鈼�"}
                          </span>

                          <span className="notification-copy">
                            <strong>{notification.title}</strong>
                            <span>{notification.body}</span>
                            <small>
                              {formatNotificationDate(
                                notification.created_at
                              )}
                            </small>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </section>
              )}
            </div>

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
                      {member.company ? ` 路 ${member.company}` : ""}
                      {member.location ? ` 路 ${member.location}` : ""}
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
                          {member.qualifications.join(" 路 ")}
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
                          <span key={qualification}>
                            {qualification}
                          </span>
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

                  <label htmlFor="pf-interests">Interests</label>

                  <div className="tag-input-row">
                    <input
                      id="pf-interests"
                      value={interestInput}
                      onChange={(event) =>
                        setInterestInput(event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addInterest();
                        }
                      }}
                      placeholder="Enter an interest"
                    />

                    <button
                      type="button"
                      className="mini-btn"
                      onClick={addInterest}
                    >
                      Add
                    </button>
                  </div>

                  <div className="member-tags editable-tags">
                    {(profile.interests || []).map((interest) => (
                      <span key={interest}>
                        {interest}
                        <button
                          type="button"
                          aria-label={`Remove ${interest}`}
                          onClick={() => removeInterest(interest)}
                        >
                          脳
                        </button>
                      </span>
                    ))}
                  </div>

                  <label htmlFor="pf-qualifications">
                    Qualifications
                  </label>

                  <div className="tag-input-row">
                    <input
                      id="pf-qualifications"
                      value={qualificationInput}
                      onChange={(event) =>
                        setQualificationInput(event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addQualification();
                        }
                      }}
                      placeholder="Enter a qualification"
                    />

                    <button
                      type="button"
                      className="mini-btn"
                      onClick={addQualification}
                    >
                      Add
                    </button>
                  </div>

                  <div className="member-tags editable-tags">
                    {(profile.qualifications || []).map(
                      (qualification) => (
                        <span key={qualification}>
                          {qualification}
                          <button
                            type="button"
                            aria-label={`Remove ${qualification}`}
                            onClick={() =>
                              removeQualification(qualification)
                            }
                          >
                            脳
                          </button>
                        </span>
                      )
                    )}
                  </div>

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
                        {member.company ? ` 路 ${member.company}` : ""}
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
                          ? ` 路 ${request.profiles.company}`
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

            <section className="dash-panel founder-panel" id="contact-founder">
              <p className="eyebrow">NEED HELP OR HAVE AN IDEA?</p>
              <h2>Reach out to the founder</h2>
              <p className="panel-sub">
                Questions, feedback, or partnership ideas? Contact the TYACDI
                BRIDGE team through any of these email addresses.
              </p>
              <div className="founder-email-list">
                <a href="mailto:weyaajayivictor2007@gmail.com">
                  weyaajayivictor2007@gmail.com
                </a>
                <a href="mailto:weyaajayivictor2009@gmail.com">
                  weyaajayivictor2009@gmail.com
                </a>
                <a href="mailto:kondoclarc49@gmail.com">
                  kondoclarc49@gmail.com
                </a>
              </div>
              <p className="founder-signoff">Founder: WEYA-AJAYI VICTOR and Co.</p>
            </section>
          </aside>
        </div>
      </div>

      <footer className="wrap dash-footer">
        TYACDI BRIDGE 路 LEARN. BUILD. GROW.
        <span className="footer-right">Be respectful. Build trust.</span>
      </footer>

      <style jsx>{`
        .founder-panel {
          border: 1px solid #d9e5d8;
          background: linear-gradient(145deg, #ffffff 0%, #f3f8ef 100%);
        }

        .founder-email-list {
          display: grid;
          gap: 9px;
          margin-top: 16px;
        }

        .founder-email-list a {
          display: block;
          padding: 11px 12px;
          border: 1px solid #dce6da;
          border-radius: 9px;
          background: #fff;
          color: #24583c;
          font-size: 13px;
          font-weight: 600;
          overflow-wrap: anywhere;
          text-decoration: none;
        }

        .founder-email-list a:hover {
          border-color: #8eaf8d;
          background: #f8fbf5;
          text-decoration: underline;
        }

        .founder-signoff {
          margin: 16px 0 0;
          color: #526557;
          font-size: 12px;
          font-weight: 600;
        }

        .notification-wrapper {
          position: relative;
        }

        .notification-bell {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 42px;
          padding: 9px 13px;
          border: 1px solid #d7dce3;
          border-radius: 10px;
          background: #fff;
          color: #172033;
          font: inherit;
          font-weight: 600;
          cursor: pointer;
          transition:
            background 0.2s ease,
            border-color 0.2s ease,
            transform 0.2s ease;
        }

        .notification-bell:hover {
          background: #f0f5fc;
          border-color: #9aafce;
        }

        .notification-bell:focus-visible {
          outline: 2px solid #3269b2;
          outline-offset: 3px;
        }

        .bell-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .notification-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 20px;
          height: 20px;
          padding: 0 5px;
          border: 2px solid #fff;
          border-radius: 999px;
          background: #bd3030;
          color: #fff;
          font-size: 11px;
          font-weight: 700;
        }

        .notification-popover {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          z-index: 100;
          width: min(370px, calc(100vw - 28px));
          max-height: 440px;
          overflow: hidden;
          border: 1px solid #e1e5eb;
          border-radius: 13px;
          background: #fff;
          color: #172033;
          box-shadow: 0 14px 40px rgba(16, 24, 40, 0.16);
        }

        .notification-heading {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          border-bottom: 1px solid #edf0f4;
        }

        .notification-heading > div {
          display: grid;
          gap: 4px;
        }

        .notification-heading strong {
          font-size: 16px;
        }

        .notification-heading small {
          color: #657084;
          font-size: 12px;
        }

        .notification-close {
          border: 0;
          background: transparent;
          color: #667085;
          font-size: 25px;
          cursor: pointer;
        }

        .mark-all-read {
          display: block;
          width: 100%;
          padding: 10px 16px;
          border: 0;
          border-bottom: 1px solid #edf0f4;
          background: #f7f9fc;
          color: #244f83;
          text-align: left;
          font: inherit;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .notification-list {
          max-height: 320px;
          overflow-y: auto;
        }

        .notification-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          width: 100%;
          padding: 13px 15px;
          border: 0;
          border-bottom: 1px solid #edf0f4;
          background: #fff;
          color: inherit;
          text-align: left;
          cursor: pointer;
        }

        .notification-item:hover {
          background: #f7f9fc;
        }

        .notification-item.unread {
          background: #f0f6ff;
        }

        .notification-dot {
          padding-top: 3px;
          color: #3269b2;
          font-size: 11px;
        }

        .notification-copy {
          display: grid;
          gap: 5px;
          min-width: 0;
        }

        .notification-copy strong {
          font-size: 13px;
        }

        .notification-copy > span {
          color: #525e70;
          font-size: 12px;
          line-height: 1.5;
          overflow-wrap: anywhere;
        }

        .notification-copy small {
          color: #7a8494;
          font-size: 11px;
        }

        .notification-empty {
          margin: 0;
          padding: 20px 16px;
          color: #657084;
          font-size: 13px;
          line-height: 1.6;
        }

        .tag-input-row {
          display: flex;
          gap: 8px;
          align-items: stretch;
        }

        .editable-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .editable-tags span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .editable-tags button {
          padding: 0;
          border: 0;
          background: transparent;
          font-weight: bold;
          cursor: pointer;
        }

        .footer-right {
          float: right;
        }

        @media (max-width: 760px) {
          .dashboard-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }

          .nav-actions {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 8px;
          }

          .bell-label {
            display: none;
          }

          .notification-popover {
            position: fixed;
            top: 80px;
            right: 12px;
            max-height: min(75vh, 500px);
          }

          .footer-right {
            float: none;
            display: block;
            margin-top: 8px;
          }
        }
      `}</style>
    </main>
  );
}
