"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
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
  type: string;
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

const founderEmails = [
  "weyaajayivictor2007@gmail.com",
  "weyaajayivictor2009@gmail.com",
  "kondoclarc49@gmail.com",
];

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function initials(name: string) {
  return (name || "Member")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDate(value: string) {
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
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [workingRequest, setWorkingRequest] = useState("");

  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [markingNotification, setMarkingNotification] = useState("");

  const [interestInput, setInterestInput] = useState("");
  const [qualificationInput, setQualificationInput] = useState("");

  const [isEditingProfile, setIsEditingProfile] = useState(true);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
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
        () => void loadNotifications(userId)
      )
      .subscribe();

    const interval = window.setInterval(
      () => void loadNotifications(userId),
      30000
    );

    return () => {
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [userId, loadNotifications]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
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

    if (existing.some((item) => normalize(item) === normalize(value))) {
      setMessage("That interest has already been added.");
      return;
    }

    setProfile({ ...profile, interests: [...existing, value] });
    setInterestInput("");
    setMessage("");
  }

  function removeInterest(value: string) {
    if (!profile) return;

    setProfile({
      ...profile,
      interests: (profile.interests || []).filter(
        (item) => item !== value
      ),
    });
  }

  function addQualification() {
    if (!profile) return;

    const value = qualificationInput.trim();

    if (!value) return;

    const existing = profile.qualifications || [];

    if (existing.some((item) => normalize(item) === normalize(value))) {
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

  function removeQualification(value: string) {
    if (!profile) return;

    setProfile({
      ...profile,
      qualifications: (profile.qualifications || []).filter(
        (item) => item !== value
      ),
    });
  }

  async function connect(toUser: string) {
    if (!userId || toUser === userId) return;

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
    setMenuOpen(false);

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
      setMessage('Confirmation did not match. Type "DELETE" in capitals.');
      return;
    }

    if (
      !window.confirm(
        "Are you absolutely sure? Your account deletion cannot be undone."
      )
    ) {
      setMessage("Account deletion cancelled.");
      return;
    }

    setDeletingAccount(true);
    setMessage("Deleting your account...");

    try {
      const response = await fetch("/api/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    const search = normalize(query);

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
        values.some((value) => normalize(value || "").includes(search));

      const matchesRole =
        roleFilter === "All roles" || member.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [members, query, roleFilter]);

  const recommendations = useMemo(() => {
    if (!profile) return [];

    const myInterests = (profile.interests || [])
      .map(normalize)
      .filter(Boolean);

    return members
      .filter((member) => member.id !== profile.id)
      .map((member) => {
        const memberInterests = (member.interests || [])
          .map(normalize)
          .filter(Boolean);

        const sharedInterests = memberInterests.filter((interest) =>
          myInterests.includes(interest)
        );

        const similarInterests = memberInterests.filter((interest) => {
          if (myInterests.includes(interest)) return false;

          return myInterests.some(
            (mine) =>
              mine !== interest &&
              (mine.includes(interest) || interest.includes(mine))
          );
        });

        const sameLocation =
          !!profile.location &&
          !!member.location &&
          normalize(profile.location) === normalize(member.location);

        const score =
          sharedInterests.length * 4 +
          similarInterests.length * 2 +
          (member.role !== profile.role ? 1 : 0) +
          (sameLocation ? 1 : 0);

        return { member, sharedInterests, similarInterests, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }, [members, profile]);

  if (loading) {
    return (
      <main className="loading-page">
        <div className="loading-card">
          <div className="loading-mark">T</div>
          <h2>TYACDI BRIDGE</h2>
          <p>Preparing your workspace...</p>
        </div>

        <style jsx>{`
          .loading-page {
            min-height: 100vh;
            display: grid;
            place-items: center;
            background: #f6f8f3;
            color: #183b30;
            padding: 20px;
          }

          .loading-card {
            text-align: center;
            padding: 36px;
            background: white;
            border: 1px solid #e1e9df;
            border-radius: 22px;
            box-shadow: 0 15px 40px rgba(25, 55, 35, 0.07);
          }

          .loading-mark {
            width: 54px;
            height: 54px;
            margin: auto;
            display: grid;
            place-items: center;
            border-radius: 17px;
            background: #183b30;
            color: white;
            font-size: 25px;
            font-weight: 800;
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="dashboard">
      <header className="dash-nav">
        <nav className="nav wrap">
          <Link className="brand" href="/" aria-label="TYACDI BRIDGE home">
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
            <span className="nav-name">
              {profile?.full_name || "Member"}
            </span>

            <button
              type="button"
              className="menu-toggle"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className="menu-symbol" aria-hidden="true">
                {menuOpen ? "×" : "☰"}
              </span>
              <span>{menuOpen ? "Close" : "Menu"}</span>
              {unreadCount > 0 && (
                <span className="menu-badge">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            <div className={`nav-menu ${menuOpen ? "nav-menu-open" : ""}`}>
              <div className="notification-wrapper">
                <button
                  type="button"
                  className="menu-item"
                  aria-expanded={notificationsOpen}
                  onClick={() =>
                    setNotificationsOpen((open) => !open)
                  }
                >
                  <span aria-hidden="true">♧</span>
                  Notifications
                  {unreadCount > 0 && (
                    <span className="menu-badge">
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
                        ×
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
                              {notification.is_read ? "○" : "●"}
                            </span>

                            <span className="notification-copy">
                              <strong>{notification.title}</strong>
                              <span>{notification.body}</span>
                              <small>
                                {formatDate(notification.created_at)}
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
                className="menu-item menu-link"
                onClick={() => setMenuOpen(false)}
              >
                <span aria-hidden="true">✉</span>
                Messages
              </Link>

              <button
                className="menu-item logout-menu-item"
                type="button"
                onClick={logout}
              >
                <span aria-hidden="true">↪</span>
                Log out
              </button>
            </div>
          </div>
        </nav>
      </header>

      <div className="wrap dash-content">
        <section className="dash-heading">
          <p className="eyebrow">YOUR TYACDI BRIDGE WORKSPACE</p>
          <h1>Welcome back, {profile?.full_name || "Member"}.</h1>
          <p>
            Meet ambitious people, connect with experienced leaders, and
            keep building your future.
          </p>
        </section>

        {message && (
          <div className="status-message" role="status" aria-live="polite">
            <span>{message}</span>
            <button
              type="button"
              aria-label="Dismiss message"
              onClick={() => setMessage("")}
            >
              ×
            </button>
          </div>
        )}

        <div className="dashboard-grid">
          <div className="dashboard-main">
            <section className="dash-panel" id="directory">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">THE COMMUNITY</span>
                  <h2>Member directory</h2>
                  <p className="panel-sub">
                    Discover entrepreneurs, mentors, CEOs, executives and
                    professionals in the TYACDI BRIDGE community.
                  </p>
                </div>
                <span className="panel-icon" aria-hidden="true">⌕</span>
              </div>

              <div className="directory-controls">
                <label className="member-search">
                  <svg
                    className="search-icon"
                    width="21"
                    height="21"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m16 16 4 4" />
                  </svg>

                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search names, CEOs, companies, interests..."
                    aria-label="Search members"
                  />

                  {query && (
                    <button
                      type="button"
                      className="clear-search"
                      aria-label="Clear search"
                      onClick={() => setQuery("")}
                    >
                      ×
                    </button>
                  )}
                </label>

                <label className="role-filter-wrap">
                  <span>Filter by role</span>
                  <select
                    className="role-filter"
                    value={roleFilter}
                    onChange={(event) => setRoleFilter(event.target.value)}
                    aria-label="Filter members by role"
                  >
                    <option>All roles</option>
                    {roles.map((role) => (
                      <option key={role}>{role}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="results-line">
                <span>{filteredMembers.length} members found</span>
                {(query || roleFilter !== "All roles") && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setRoleFilter("All roles");
                    }}
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {filteredMembers.length === 0 ? (
                <div className="empty-state">
                  <span aria-hidden="true">⌕</span>
                  <strong>No members found</strong>
                  <p>Try a different name, company, interest or role.</p>
                </div>
              ) : (
                <div className="member-list">
                  {filteredMembers.map((member) => (
                    <article className="member-row" key={member.id}>
                      <div className="portrait">
                        {initials(member.full_name)}
                      </div>

                      <div className="member-info">
                        <strong>{member.full_name || "TYACDI Member"}</strong>
                        <span className="member-role">
                          {member.role || "Professional"}
                          {member.company ? ` · ${member.company}` : ""}
                        </span>

                        {member.location && (
                          <span className="member-location">
                            {member.location}
                          </span>
                        )}

                        {member.bio && (
                          <p className="member-bio">{member.bio}</p>
                        )}

                        {(member.interests || []).length > 0 && (
                          <div className="member-tags">
                            {(member.interests || []).slice(0, 3).map(
                              (interest) => (
                                <span key={interest}>{interest}</span>
                              )
                            )}
                          </div>
                        )}

                        {(member.qualifications || []).length > 0 && (
                          <small className="qualifications-preview">
                            <strong>Qualifications:</strong>{" "}
                            {(member.qualifications || [])
                              .slice(0, 2)
                              .join(", ")}
                          </small>
                        )}
                      </div>

                      <button
                        className="connect-btn"
                        type="button"
                        onClick={() => void connect(member.id)}
                      >
                        Connect <span aria-hidden="true">↗</span>
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="dash-panel profile-panel" id="profile">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">YOUR IDENTITY</span>
                  <h2>Your profile</h2>
                  <p className="panel-sub">
                    Manage your information, interests, qualifications and
                    account settings.
                  </p>
                </div>
                <span className="panel-icon" aria-hidden="true">✎</span>
              </div>

              {!isEditingProfile && profile ? (
                <div className="profile-summary">
                  <div className="profile-summary-top">
                    <div className="portrait large-portrait">
                      {initials(profile.full_name)}
                    </div>
                    <div>
                      <h3>{profile.full_name}</h3>
                      <span className="role-pill">{profile.role}</span>
                      {profile.company && <p>{profile.company}</p>}
                      {profile.location && <p>{profile.location}</p>}
                    </div>
                  </div>

                  {profile.bio && (
                    <div className="summary-block">
                      <h4>About me</h4>
                      <p>{profile.bio}</p>
                    </div>
                  )}

                  <div className="summary-block">
                    <h4>Interests</h4>
                    <div className="member-tags">
                      {(profile.interests || []).length ? (
                        (profile.interests || []).map((interest) => (
                          <span key={interest}>{interest}</span>
                        ))
                      ) : (
                        <small>No interests added yet.</small>
                      )}
                    </div>
                  </div>

                  <div className="summary-block">
                    <h4>Qualifications</h4>
                    <div className="member-tags qualification-tags">
                      {(profile.qualifications || []).length ? (
                        (profile.qualifications || []).map((item) => (
                          <span key={item}>{item}</span>
                        ))
                      ) : (
                        <small>No qualifications added yet.</small>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-dark full-width"
                    onClick={() => setIsEditingProfile(true)}
                  >
                    Edit profile
                  </button>
                </div>
              ) : profile ? (
                <form className="profile-form" onSubmit={saveProfile}>
                  <label htmlFor="pf-name">
                    Full name
                    <input
                      id="pf-name"
                      required
                      maxLength={100}
                      value={profile.full_name}
                      onChange={(event) =>
                        setProfile({
                          ...profile,
                          full_name: event.target.value,
                        })
                      }
                      placeholder="Enter your full name"
                    />
                  </label>

                  <label htmlFor="pf-role">
                    Professional role
                    <select
                      id="pf-role"
                      required
                      value={profile.role}
                      onChange={(event) =>
                        setProfile({ ...profile, role: event.target.value })
                      }
                    >
                      {roles.map((role) => (
                        <option key={role}>{role}</option>
                      ))}
                    </select>
                  </label>

                  <label htmlFor="pf-company">
                    Company or organization
                    <input
                      id="pf-company"
                      value={profile.company || ""}
                      onChange={(event) =>
                        setProfile({
                          ...profile,
                          company: event.target.value,
                        })
                      }
                      placeholder="e.g. Your company or organization"
                    />
                  </label>

                  <label htmlFor="pf-location">
                    Location
                    <input
                      id="pf-location"
                      value={profile.location || ""}
                      onChange={(event) =>
                        setProfile({
                          ...profile,
                          location: event.target.value,
                        })
                      }
                      placeholder="e.g. Lagos, Nigeria"
                    />
                  </label>

                  <label htmlFor="pf-bio">
                    About you
                    <textarea
                      id="pf-bio"
                      rows={4}
                      maxLength={1000}
                      value={profile.bio || ""}
                      onChange={(event) =>
                        setProfile({ ...profile, bio: event.target.value })
                      }
                      placeholder="Tell the community about your experience, goals and what you are building..."
                    />
                  </label>

                  <div className="form-field">
                    <label htmlFor="pf-interests">Your interests</label>
                    <p className="field-hint">
                      Add interests so we can suggest relevant people.
                    </p>

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
                        placeholder="e.g. Entrepreneurship, technology"
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
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="form-field">
                    <label htmlFor="pf-qualifications">
                      Qualifications
                    </label>
                    <p className="field-hint">
                      Add degrees, certificates, training or industry
                      credentials.
                    </p>

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
                      {(profile.qualifications || []).map((item) => (
                        <span key={item}>
                          {item}
                          <button
                            type="button"
                            aria-label={`Remove ${item}`}
                            onClick={() => removeQualification(item)}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    className="btn btn-dark full-width"
                    type="submit"
                    disabled={saving || deletingAccount}
                  >
                    {saving ? "Saving profile..." : "Save profile"}
                  </button>

                  <button
                    type="button"
                    className="btn btn-light full-width"
                    disabled={saving || deletingAccount}
                    onClick={() => {
                      setMessage("");
                      setIsEditingProfile(false);
                    }}
                  >
                    Cancel editing
                  </button>

                  <button
                    type="button"
                    className="delete-btn"
                    disabled={deletingAccount || saving}
                    onClick={() => void deleteAccount()}
                  >
                    {deletingAccount
                      ? "Deleting account..."
                      : "Delete account"}
                  </button>
                </form>
              ) : (
                <p>Profile information is not available.</p>
              )}
            </section>
          </div>

          <aside className="dashboard-sidebar">
            <section className="dash-panel suggestions-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">YOUR NETWORK</span>
                  <h2>People you should meet</h2>
                </div>
                <span className="panel-icon" aria-hidden="true">✦</span>
              </div>

              <p className="panel-sub">
                Suggestions use common interests, related interests,
                professional roles and location.
              </p>

              {recommendations.length === 0 ? (
                <div className="empty-state compact-empty">
                  <span aria-hidden="true">✦</span>
                  <strong>Your network starts here</strong>
                  <p>
                    Add interests to your profile to discover relevant
                    people.
                  </p>
                </div>
              ) : (
                recommendations.map(
                  ({ member, sharedInterests, similarInterests }) => (
                    <article className="recommendation-card" key={member.id}>
                      <div className="portrait small-portrait">
                        {initials(member.full_name)}
                      </div>

                      <div className="member-info">
                        <strong>{member.full_name}</strong>
                        <span className="member-role">
                          {member.role}
                          {member.company ? ` · ${member.company}` : ""}
                        </span>

                        {member.location && (
                          <span className="member-location">
                            {member.location}
                          </span>
                        )}

                        {sharedInterests.length > 0 ? (
                          <div className="match-note">
                            <strong>Common interests</strong>
                            <div className="match-tags">
                              {sharedInterests.slice(0, 3).map((interest) => (
                                <span key={interest}>{interest}</span>
                              ))}
                            </div>
                          </div>
                        ) : similarInterests.length > 0 ? (
                          <div className="match-note">
                            <strong>Related interests</strong>
                            <div className="match-tags">
                              {similarInterests.slice(0, 3).map((interest) => (
                                <span key={interest}>{interest}</span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <small className="field-hint">
                            Suggested based on your professional profile
                          </small>
                        )}

                        <button
                          className="mini-btn recommendation-connect"
                          type="button"
                          onClick={() => void connect(member.id)}
                        >
                          Connect
                        </button>
                      </div>
                    </article>
                  )
                )
              )}
            </section>

            <section className="dash-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">BUILD CONNECTIONS</span>
                  <h2>Connection requests</h2>
                </div>
                <span className="request-count">{requests.length}</span>
              </div>

              <p className="panel-sub">
                Review people who want to connect with you.
              </p>

              {requests.length === 0 ? (
                <p className="empty-state">
                  No pending connection requests.
                </p>
              ) : (
                requests.map((request) => (
                  <article className="request-card" key={request.id}>
                    <strong>
                      {request.profiles?.full_name || "TYACDI Member"}
                    </strong>
                    <span className="member-role">
                      {request.profiles?.role || "Member"}
                      {request.profiles?.company
                        ? ` · ${request.profiles.company}`
                        : ""}
                    </span>

                    <div className="request-actions">
                      <button
                        className="mini-btn"
                        type="button"
                        disabled={workingRequest === request.id}
                        onClick={() => void respond(request.id, "accepted")}
                      >
                        Accept
                      </button>
                      <button
                        className="mini-btn decline-btn"
                        type="button"
                        disabled={workingRequest === request.id}
                        onClick={() => void respond(request.id, "declined")}
                      >
                        Decline
                      </button>
                    </div>
                  </article>
                ))
              )}
            </section>

            <section className="community-card">
              <span className="community-icon" aria-hidden="true">✦</span>
              <p className="eyebrow">THE TYACDI MINDSET</p>
              <h2>Learn. Build. Grow.</h2>
              <p>
                Growth is gradual. With us, exponential. Build meaningful
                connections and keep moving forward.
              </p>
            </section>
          </aside>
        </div>
      </div>

      <section className="wrap founder-panel" id="founder">
        <div className="founder-copy">
          <span className="section-kicker">LET'S BUILD TOGETHER</span>
          <h2>Reach out to the founder</h2>
          <p>
            Have a question, suggestion, partnership idea, or feedback for
            TYACDI BRIDGE? Send a message using any of the email addresses
            below.
          </p>
          <span className="founder-signature">
            Founder · WEYA-AJAYI VICTOR and Co.
          </span>
        </div>

        <div className="founder-emails">
          {founderEmails.map((email) => (
            <a href={`mailto:${email}`} key={email}>
              <span className="email-icon" aria-hidden="true">✉</span>
              <span>{email}</span>
              <span className="email-arrow" aria-hidden="true">↗</span>
            </a>
          ))}
        </div>
      </section>

      <footer className="wrap dash-footer">
        <span>TYACDI BRIDGE · LEARN. BUILD. GROW.</span>
        <span className="footer-right">
          Growth is gradual. With us, exponential.
        </span>
      </footer>

      <style jsx>{`
        .dashboard {
          min-height: 100vh;
          background: #f6f8f3;
          color: #1d3029;
          padding-bottom: 28px;
        }

        .wrap {
          width: min(1180px, calc(100% - 40px));
          margin-inline: auto;
        }

        .dash-nav {
          position: sticky;
          top: 0;
          z-index: 120;
          border-bottom: 1px solid #e4e9e1;
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(16px);
        }

        .nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          min-height: 90px;
          padding-block: 10px;
        }

        .brand {
          display: inline-flex;
          align-items: center;
          min-width: 0;
          flex-shrink: 0;
        }

        .nav-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          min-width: 0;
        }

        .nav-name {
          max-width: 180px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #203b34;
          font-size: 14px;
          font-weight: 750;
        }

        .menu-toggle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 44px;
          padding: 10px 14px;
          border: 1px solid #d4e1d7;
          border-radius: 12px;
          background: #f4f8f2;
          color: #183b30;
          font: inherit;
          font-weight: 750;
          cursor: pointer;
          transition: background 0.2s ease, border-color 0.2s ease;
        }

        .menu-toggle:hover {
          background: #eaf3e8;
          border-color: #a7c5ac;
        }

        .menu-symbol {
          font-size: 20px;
          line-height: 1;
        }

        .nav-menu {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .menu-item {
          display: inline-flex;
          align-items: center;
          justify-content: flex-start;
          gap: 10px;
          min-height: 43px;
          padding: 10px 13px;
          border: 1px solid #e0e8e1;
          border-radius: 10px;
          background: #fff;
          color: #203b34;
          font: inherit;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
        }

        .menu-item:hover {
          border-color: #a8c5ae;
          background: #f3f8f2;
        }

        .menu-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 20px;
          min-height: 20px;
          padding: 0 5px;
          border-radius: 999px;
          background: #b83232;
          color: #fff;
          font-size: 11px;
          font-weight: 800;
        }

        .logout-menu-item {
          color: #963333;
          background: #fff8f7;
        }

        .dash-content {
          padding-top: 45px;
        }

        .dash-heading {
          margin-bottom: 30px;
        }

        .eyebrow,
        .section-kicker {
          margin: 0 0 10px;
          color: #718176;
          font-size: 11px;
          font-weight: 850;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .dash-heading h1 {
          margin: 0;
          color: #183b30;
          font-size: clamp(29px, 4vw, 45px);
          font-weight: 800;
          letter-spacing: -0.045em;
          line-height: 1.15;
        }

        .dash-heading > p:last-child {
          max-width: 720px;
          margin-top: 14px;
          color: #64736a;
          font-size: clamp(15px, 2vw, 18px);
          line-height: 1.7;
        }

        .status-message {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 20px;
          padding: 14px 16px;
          border: 1px solid #d1e8d7;
          border-radius: 13px;
          background: #f0f7f1;
          color: #254d34;
          overflow-wrap: anywhere;
        }

        .status-message button {
          flex-shrink: 0;
          border: 0;
          background: transparent;
          color: inherit;
          font-size: 20px;
          cursor: pointer;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.5fr) minmax(280px, 1fr);
          gap: 24px;
          align-items: start;
        }

        .dashboard-main,
        .dashboard-sidebar {
          display: grid;
          gap: 22px;
          align-content: start;
          min-width: 0;
        }

        .dash-panel {
          min-width: 0;
          padding: clamp(20px, 3vw, 30px);
          border: 1px solid #e4e9e1;
          border-radius: 20px;
          background: #fff;
          box-shadow: 0 7px 24px rgba(30, 60, 35, 0.035);
        }

        .panel-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 16px;
        }

        .panel-heading h2 {
          margin: 0;
          color: #203b31;
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.025em;
        }

        .panel-sub {
          margin: 9px 0 0;
          color: #7b877f;
          font-size: 13px;
          line-height: 1.7;
        }

        .panel-icon {
          display: grid;
          place-items: center;
          flex-shrink: 0;
          width: 40px;
          height: 40px;
          border: 1px solid #e0eadf;
          border-radius: 13px;
          background: #f2f7ef;
          color: #315a40;
          font-size: 23px;
        }

        .directory-controls {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(145px, 0.45fr);
          gap: 12px;
          margin: 22px 0 12px;
        }

        .member-search {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
          padding: 0 14px;
          border: 1px solid #d9e3d9;
          border-radius: 15px;
          background: linear-gradient(135deg, #fff, #f4f8f2);
          box-shadow: 0 4px 14px rgba(20, 42, 30, 0.045);
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .member-search:focus-within {
          border-color: #578b68;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(75, 135, 91, 0.12);
        }

        .search-icon {
          flex-shrink: 0;
          color: #69806e;
        }

        .member-search input {
          width: 100%;
          min-width: 0;
          padding: 15px 0;
          border: 0;
          outline: none;
          background: transparent;
          color: #203b34;
          font: inherit;
          font-size: 14px;
          box-shadow: none;
        }

        .member-search input:focus {
          outline: none;
          box-shadow: none;
        }

        .member-search input::placeholder {
          color: #8a988c;
        }

        .clear-search {
          display: grid;
          place-items: center;
          flex-shrink: 0;
          width: 28px;
          height: 28px;
          border: 0;
          border-radius: 50%;
          background: #e8f0e6;
          color: #344b39;
          font-size: 20px;
          cursor: pointer;
        }

        .role-filter-wrap {
          display: grid;
          gap: 7px;
          min-width: 0;
        }

        .role-filter-wrap > span {
          color: #637366;
          font-size: 11px;
          font-weight: 800;
        }

        .role-filter {
          width: 100%;
          min-width: 0;
          min-height: 48px;
          padding: 12px;
          border: 1px solid #d9e3d9;
          border-radius: 13px;
          background: #f8fbf7;
          color: #254333;
          font: inherit;
          font-size: 13px;
          font-weight: 650;
        }

        .role-filter:focus {
          outline: none;
          border-color: #578b68;
          box-shadow: 0 0 0 4px rgba(75, 135, 91, 0.12);
        }

        .results-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin: 10px 0 14px;
          color: #879188;
          font-size: 12px;
        }

        .results-line button {
          border: 0;
          background: transparent;
          color: #376847;
          font: inherit;
          font-weight: 750;
          cursor: pointer;
        }

        .member-list {
          border-top: 1px solid #edf0eb;
        }

        .member-row {
          display: flex;
          align-items: flex-start;
          gap: 13px;
          padding: 19px 0;
          border-bottom: 1px solid #edf0eb;
        }

        .member-row:last-child {
          border-bottom: 0;
          padding-bottom: 0;
        }

        .portrait {
          display: grid;
          place-items: center;
          flex-shrink: 0;
          width: 48px;
          height: 48px;
          border: 1px solid #d9e8d8;
          border-radius: 16px;
          background: linear-gradient(145deg, #e6f1e3, #d5e6d4);
          color: #315941;
          font-size: 14px;
          font-weight: 850;
        }

        .member-info {
          display: grid;
          gap: 5px;
          flex: 1;
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .member-info > strong {
          color: #243b30;
          font-size: 14px;
          font-weight: 800;
          line-height: 1.5;
        }

        .member-role,
        .member-location {
          color: #879087;
          font-size: 12px;
          line-height: 1.6;
        }

        .member-bio {
          margin: 4px 0;
          color: #65746a;
          font-size: 13px;
          line-height: 1.65;
          overflow-wrap: anywhere;
        }

        .member-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 5px;
        }

        .member-tags > span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 9px;
          border: 1px solid #dce9d9;
          border-radius: 999px;
          background: #f1f7ef;
          color: #42694b;
          font-size: 11px;
          font-weight: 700;
          overflow-wrap: anywhere;
        }

        .qualifications-preview {
          margin-top: 5px;
          color: #6b786e;
          font-size: 11px;
          line-height: 1.6;
        }

        .qualifications-preview strong {
          color: #3d5845;
        }

        .connect-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          flex-shrink: 0;
          padding: 10px 13px;
          border: 1px solid #d4e3d2;
          border-radius: 11px;
          background: #f5f9f2;
          color: #315c3e;
          font: inherit;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          transition: background 0.2s ease, transform 0.2s ease;
        }

        .connect-btn:hover {
          background: #e5f1e2;
          transform: translateY(-1px);
        }

        .empty-state {
          display: grid;
          justify-items: center;
          gap: 8px;
          padding: 30px 12px;
          color: #718176;
          text-align: center;
        }

        .empty-state > span {
          display: grid;
          place-items: center;
          width: 43px;
          height: 43px;
          border-radius: 15px;
          background: #eff6ec;
          color: #40694a;
          font-size: 23px;
        }

        .empty-state strong {
          color: #3b5040;
          font-size: 14px;
        }

        .empty-state p {
          margin: 0;
          font-size: 12px;
          line-height: 1.6;
        }

        .compact-empty {
          padding: 22px 8px;
        }

        .profile-form {
          display: grid;
          gap: 17px;
        }

        .profile-form label,
        .form-field > label {
          display: grid;
          gap: 8px;
          color: #294333;
          font-size: 13px;
          font-weight: 800;
        }

        .profile-form input,
        .profile-form select,
        .profile-form textarea,
        .tag-input-row input {
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
          padding: 13px 14px;
          border: 1px solid #d7e3d7;
          border-radius: 12px;
          background: #fbfdf9;
          color: #203b34;
          font: inherit;
          font-size: 14px;
          box-shadow: inset 0 1px 2px rgba(20, 50, 30, 0.025);
          transition: border-color 0.2s ease, box-shadow 0.2s ease,
            background 0.2s ease;
        }

        .profile-form input:focus,
        .profile-form select:focus,
        .profile-form textarea:focus,
        .tag-input-row input:focus {
          outline: none;
          border-color: #578b68;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(75, 135, 91, 0.12);
        }

        .profile-form input::placeholder,
        .profile-form textarea::placeholder,
        .tag-input-row input::placeholder {
          color: #9aa69b;
        }

        .profile-form textarea {
          min-height: 115px;
          resize: vertical;
          line-height: 1.65;
        }

        .profile-form select {
          cursor: pointer;
        }

        .form-field {
          display: grid;
          gap: 8px;
        }

        .field-hint {
          margin: 0;
          color: #879188;
          font-size: 11px;
          line-height: 1.6;
        }

        .tag-input-row {
          display: flex;
          align-items: stretch;
          gap: 8px;
          min-width: 0;
        }

        .tag-input-row input {
          flex: 1;
          min-width: 0;
        }

        .editable-tags {
          margin-top: 5px;
        }

        .editable-tags > span {
          padding-right: 5px;
        }

        .editable-tags button {
          display: grid;
          place-items: center;
          width: 21px;
          height: 21px;
          border: 0;
          border-radius: 50%;
          background: #e0eddd;
          color: #315941;
          font-size: 16px;
          cursor: pointer;
        }

        .btn,
        .mini-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 11px 15px;
          border: 1px solid transparent;
          border-radius: 11px;
          font: inherit;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          transition: background 0.2s ease, transform 0.2s ease;
        }

        .btn:disabled,
        .mini-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-dark {
          background: #183b30;
          color: #fff;
        }

        .btn-dark:hover:not(:disabled) {
          background: #24513f;
          transform: translateY(-1px);
        }

        .btn-light {
          border-color: #dce6db;
          background: #f7faf5;
          color: #315941;
        }

        .btn-light:hover:not(:disabled) {
          background: #eaf3e7;
        }

        .full-width {
          width: 100%;
        }

        .delete-btn {
          width: 100%;
          margin-top: 2px;
          padding: 12px 14px;
          border: 1px solid #edcccc;
          border-radius: 11px;
          background: #fff7f6;
          color: #9d3737;
          font: inherit;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .delete-btn:hover:not(:disabled) {
          background: #ffedeb;
        }

        .delete-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .profile-summary {
          display: grid;
          gap: 20px;
        }

        .profile-summary-top {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 16px;
          border: 1px solid #e0eade;
          border-radius: 15px;
          background: #f7faf5;
        }

        .large-portrait {
          width: 64px;
          height: 64px;
          border-radius: 20px;
          font-size: 18px;
        }

        .profile-summary-top h3 {
          margin: 0 0 7px;
          color: #203b31;
          font-size: 19px;
          overflow-wrap: anywhere;
        }

        .profile-summary-top p {
          margin: 6px 0 0;
          color: #7b877e;
          font-size: 12px;
          overflow-wrap: anywhere;
        }

        .role-pill {
          display: inline-flex;
          padding: 5px 9px;
          border-radius: 999px;
          background: #e4f0e1;
          color: #356344;
          font-size: 11px;
          font-weight: 800;
        }

        .summary-block {
          display: grid;
          gap: 7px;
        }

        .summary-block h4 {
          margin: 0;
          color: #294333;
          font-size: 13px;
        }

        .summary-block p {
          margin: 0;
          color: #66746a;
          font-size: 13px;
          line-height: 1.7;
          overflow-wrap: anywhere;
        }

        .qualification-tags > span {
          border-color: #dce3f0;
          background: #f3f6fc;
          color: #4a5f80;
        }

        .small-portrait {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          font-size: 12px;
        }

        .recommendation-card {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          padding: 16px 0;
          border-bottom: 1px solid #edf0eb;
        }

        .recommendation-card:last-child {
          padding-bottom: 0;
          border-bottom: 0;
        }

        .match-note {
          display: grid;
          gap: 7px;
          margin-top: 6px;
          color: #49654e;
          font-size: 11px;
        }

        .match-note > strong {
          font-size: 11px;
        }

        .match-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }

        .match-tags span {
          padding: 5px 8px;
          border: 1px solid #dce9d9;
          border-radius: 999px;
          background: #f0f7ed;
          color: #416849;
          font-size: 10px;
          font-weight: 750;
          overflow-wrap: anywhere;
        }

        .recommendation-connect {
          margin-top: 7px;
          border-color: #d4e3d2;
          background: #f5f9f2;
          color: #315c3e;
        }

        .recommendation-connect:hover,
        .mini-btn:hover:not(:disabled) {
          background: #e6f1e2;
        }

        .request-count {
          display: grid;
          place-items: center;
          flex-shrink: 0;
          min-width: 31px;
          height: 31px;
          padding-inline: 6px;
          border-radius: 11px;
          background: #edf5e9;
          color: #315941;
          font-size: 12px;
          font-weight: 850;
        }

        .request-card {
          display: grid;
          gap: 7px;
          padding: 14px 0;
          border-bottom: 1px solid #edf0eb;
        }

        .request-card:last-child {
          border-bottom: 0;
        }

        .request-card > strong {
          color: #294333;
          font-size: 13px;
          overflow-wrap: anywhere;
        }

        .request-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 5px;
        }

        .mini-btn {
          padding: 9px 12px;
          border-color: #d9e5d7;
          background: #f3f8f0;
          color: #315941;
        }

        .decline-btn {
          border-color: #edcccc;
          background: #fff7f6;
          color: #9d3737;
        }

        .community-card {
          position: relative;
          overflow: hidden;
          padding: 25px;
          border: 1px solid #244b3a;
          border-radius: 20px;
          background: linear-gradient(145deg, #183b30, #28533e);
          color: #fff;
        }

        .community-card::after {
          position: absolute;
          right: -35px;
          bottom: -55px;
          width: 145px;
          height: 145px;
          border: 1px solid rgba(255, 255, 255, 0.13);
          border-radius: 50%;
          content: "";
        }

        .community-icon {
          display: grid;
          place-items: center;
          width: 38px;
          height: 38px;
          margin-bottom: 18px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 13px;
          background: rgba(255, 255, 255, 0.08);
          font-size: 19px;
        }

        .community-card .eyebrow {
          color: #c5d9c4;
          font-size: 10px;
        }

        .community-card h2 {
          margin: 0;
          font-size: 25px;
          letter-spacing: -0.04em;
        }

        .community-card > p:last-child {
          margin-bottom: 0;
          color: #d8e5d8;
          font-size: 13px;
          line-height: 1.75;
        }

        .notification-wrapper {
          position: relative;
        }

        .notification-popover {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          z-index: 200;
          width: min(370px, calc(100vw - 28px));
          max-height: 440px;
          overflow: hidden;
          border: 1px solid #dfe7dc;
          border-radius: 15px;
          background: #fff;
          color: #203b34;
          box-shadow: 0 14px 40px rgba(16, 40, 25, 0.16);
        }

        .notification-heading {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          border-bottom: 1px solid #edf0eb;
        }

        .notification-heading > div {
          display: grid;
          gap: 4px;
        }

        .notification-heading strong {
          font-size: 15px;
        }

        .notification-heading small {
          color: #7a877d;
          font-size: 12px;
        }

        .notification-close {
          border: 0;
          background: transparent;
          color: #66756a;
          font-size: 25px;
          cursor: pointer;
        }

        .mark-all-read {
          display: block;
          width: 100%;
          padding: 11px 16px;
          border: 0;
          border-bottom: 1px solid #edf0eb;
          background: #f5f9f2;
          color: #315941;
          text-align: left;
          font: inherit;
          font-size: 12px;
          font-weight: 800;
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
          border-bottom: 1px solid #edf0eb;
          background: #fff;
          color: inherit;
          text-align: left;
          cursor: pointer;
        }

        .notification-item:hover {
          background: #f7faf5;
        }

        .notification-item.unread {
          background: #eff6eb;
        }

        .notification-dot {
          padding-top: 3px;
          color: #4e8058;
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
          color: #5c6c60;
          font-size: 12px;
          line-height: 1.5;
          overflow-wrap: anywhere;
        }

        .notification-copy small {
          color: #8a958c;
          font-size: 11px;
        }

        .notification-empty {
          margin: 0;
          padding: 20px 16px;
          color: #778479;
          font-size: 13px;
          line-height: 1.6;
        }

        .founder-panel {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
          gap: 28px;
          align-items: center;
          margin-top: 26px;
          padding: clamp(22px, 4vw, 38px);
          border: 1px solid #dce8dc;
          border-radius: 22px;
          background: linear-gradient(135deg, #edf6e9, #fff 72%);
          box-shadow: 0 10px 30px rgba(24, 51, 45, 0.05);
        }

        .founder-copy h2 {
          margin: 5px 0 12px;
          color: #183b30;
          font-size: clamp(25px, 3vw, 34px);
          font-weight: 850;
          letter-spacing: -0.04em;
        }

        .founder-copy p {
          max-width: 520px;
          margin: 0;
          color: #637369;
          font-size: 14px;
          line-height: 1.8;
        }

        .founder-signature {
          display: inline-block;
          margin-top: 16px;
          color: #315941;
          font-size: 12px;
          font-weight: 800;
        }

        .founder-emails {
          display: grid;
          gap: 10px;
          min-width: 0;
        }

        .founder-emails a {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          padding: 14px;
          border: 1px solid #d7e5d8;
          border-radius: 13px;
          background: #fff;
          color: #28563a;
          font-size: 12px;
          font-weight: 750;
          text-decoration: none;
          transition: background 0.2s ease, transform 0.2s ease;
        }

        .founder-emails a:hover {
          background: #edf6e9;
          transform: translateY(-1px);
        }

        .founder-emails a > span:nth-child(2) {
          min-width: 0;
          flex: 1;
          overflow-wrap: anywhere;
        }

        .email-icon {
          display: grid;
          place-items: center;
          flex-shrink: 0;
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background: #edf6e9;
          font-size: 15px;
        }

        .email-arrow {
          flex-shrink: 0;
          color: #78907b;
          font-size: 17px;
        }

        .dash-footer {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          margin-top: 30px;
          padding-block: 18px;
          border-top: 1px solid #e2e9df;
          color: #7d897e;
          font-size: 11px;
          line-height: 1.7;
        }

        .footer-right {
          text-align: right;
        }

        @media (min-width: 761px) {
          .nav-menu {
            display: flex;
          }
        }

        @media (max-width: 760px) {
          .wrap {
            width: calc(100% - 28px);
          }

          .nav {
            flex-wrap: wrap;
            gap: 10px;
            min-height: 78px;
            padding-block: 10px;
          }

          .brand {
            max-width: 45%;
          }

          .brand :global(img) {
            width: 100% !important;
            max-width: 145px;
          }

          .nav-actions {
            position: relative;
            flex: 1;
            justify-content: flex-end;
            gap: 8px;
          }

          .nav-name {
            max-width: 85px;
            font-size: 12px;
          }

          .menu-toggle {
            padding: 9px 11px;
            font-size: 12px;
          }

          .nav-menu {
            display: none;
            position: absolute;
            top: calc(100% + 10px);
            right: 0;
            z-index: 150;
            width: min(290px, calc(100vw - 32px));
            padding: 10px;
            border: 1px solid #dfe8e0;
            border-radius: 16px;
            background: #fff;
            box-shadow: 0 18px 45px rgba(15, 40, 25, 0.18);
            align-items: stretch;
            flex-direction: column;
          }

          .nav-menu.nav-menu-open {
            display: flex;
          }

          .nav-menu .menu-item,
          .nav-menu .notification-wrapper {
            width: 100%;
            box-sizing: border-box;
          }

          .nav-menu .menu-item {
            min-height: 46px;
          }

          .notification-popover {
            position: fixed;
            top: 95px;
            right: 12px;
            max-height: min(70vh, 480px);
          }

          .dash-content {
            padding-top: 30px;
          }

          .dash-heading {
            margin-bottom: 22px;
          }

          .dashboard-grid {
            grid-template-columns: minmax(0, 1fr);
            gap: 18px;
          }

          .directory-controls {
            grid-template-columns: minmax(0, 1fr);
          }

          .founder-panel {
            grid-template-columns: minmax(0, 1fr);
            gap: 20px;
          }

          .dash-footer {
            flex-direction: column;
            gap: 5px;
          }

          .footer-right {
            text-align: left;
          }
        }

        @media (max-width: 420px) {
          .dash-panel {
            padding: 18px 15px;
            border-radius: 17px;
          }

          .panel-heading h2 {
            font-size: 20px;
          }

          .member-row {
            flex-wrap: wrap;
          }

          .member-row .member-info {
            flex-basis: calc(100% - 65px);
          }

          .connect-btn {
            margin-left: 60px;
          }

          .tag-input-row {
            flex-wrap: wrap;
          }

          .tag-input-row input {
            flex-basis: 100%;
          }

          .tag-input-row .mini-btn {
            width: 100%;
          }

          .profile-summary-top {
            align-items: flex-start;
            padding: 12px;
          }

          .founder-emails a {
            font-size: 11px;
            padding: 11px;
          }

          .request-actions {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}
