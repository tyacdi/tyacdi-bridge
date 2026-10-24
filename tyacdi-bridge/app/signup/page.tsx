"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type PopupType = "success" | "error" | "info";

type PopupMessage = {
  type: PopupType;
  title: string;
  message: string;
};

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Founder");
  const [company, setCompany] = useState("");
  const [bio, setBio] = useState("");

  const [busy, setBusy] = useState(false);
  const [popup, setPopup] = useState<PopupMessage | null>(null);

  function showPopup(
    type: PopupType,
    title: string,
    message: string
  ) {
    setPopup({ type, title, message });
  }

  function validatePassword(value: string) {
    if (value.length < 8) {
      return "Your password must contain at least 8 characters.";
    }

    if (value.length > 72) {
      return "Your password is too long. Please use 72 characters or fewer.";
    }

    if (!/[a-z]/.test(value)) {
      return "Add at least one lowercase letter to your password.";
    }

    if (!/[A-Z]/.test(value)) {
      return "Add at least one uppercase letter to your password.";
    }

    if (!/[0-9]/.test(value)) {
      return "Add at least one number to your password.";
    }

    return null;
  }

  function getReadableError(error: {
    message?: string;
    code?: string;
    status?: number;
  }) {
    const message = (error.message || "").toLowerCase();
    const code = (error.code || "").toLowerCase();

    if (
      code.includes("email_exists") ||
      code.includes("user_already_exists") ||
      message.includes("user already registered") ||
      message.includes("email address already exists") ||
      message.includes("email already exists") ||
      message.includes("already been registered") ||
      message.includes("already registered")
    ) {
      return {
        title: "Email already in use",
        message:
          "An account may already be registered with this email address. Try logging in or use another email address.",
      };
    }

    if (
      code.includes("weak_password") ||
      message.includes("password should be at least") ||
      message.includes("password is too weak") ||
      message.includes("weak password") ||
      message.includes("password does not meet")
    ) {
      return {
        title: "Password is too weak",
        message:
          "Choose a stronger password with at least 8 characters, including uppercase and lowercase letters and a number. Your Supabase security settings may require additional characters.",
      };
    }

    if (
      message.includes("invalid email") ||
      message.includes("email address is invalid")
    ) {
      return {
        title: "Invalid email address",
        message:
          "Enter a valid email address and try creating your account again.",
      };
    }

    if (
      message.includes("rate limit") ||
      message.includes("too many requests")
    ) {
      return {
        title: "Please wait a moment",
        message:
          "Too many attempts have been made. Wait a little while before trying again.",
      };
    }

    if (
      message.includes("network") ||
      message.includes("fetch failed") ||
      message.includes("failed to fetch")
    ) {
      return {
        title: "Connection problem",
        message:
          "We could not reach the authentication service. Check your internet connection and try again.",
      };
    }

    return {
      title: "Account creation failed",
      message:
        error.message ||
        "We could not create your account. Please try again.",
    };
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (busy) return;

    setPopup(null);

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      showPopup(
        "error",
        "Name required",
        "Enter your full name before creating your account."
      );
      return;
    }

    const passwordError = validatePassword(password);

    if (passwordError) {
      showPopup("error", "Check your password", passwordError);
      return;
    }

    setBusy(true);

    try {
      const supabase = createClient();

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanName,
            role,
            company: company.trim(),
            bio: bio.trim(),
          },
        },
      });

      if (error) {
        const readable = getReadableError(error);

        showPopup(
          "error",
          readable.title,
          readable.message
        );

        return;
      }

      // Supabase may return a user with no identities when
      // an email already exists and email-enumeration protection
      // is enabled.
      if (
        data.user &&
        data.user.identities &&
        data.user.identities.length === 0
      ) {
        showPopup(
          "error",
          "Email may already be registered",
          "We could not register a new account with this email. If you already have an account, try logging in or use the password reset option."
        );

        return;
      }

      // If email confirmation is enabled, Supabase usually
      // returns a user without an active session.
      if (data.user && !data.session) {
        showPopup(
          "success",
          "Verification email sent!",
          `We have submitted your registration for ${cleanEmail}. Check your inbox and spam folder for the verification email from TYACDI BRIDGE. Open the email and follow its instructions before logging in.`
        );

        setPassword("");
        return;
      }

      if (data.session) {
        showPopup(
          "success",
          "Account created successfully!",
          "Welcome to TYACDI BRIDGE. Your account is ready. We are taking you to your dashboard."
        );

        window.setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1800);

        return;
      }

      showPopup(
        "info",
        "Check your email",
        "Your registration has been submitted. Check your inbox for any instructions needed to activate your account."
      );
    } catch (err: unknown) {
      showPopup(
        "error",
        "Something went wrong",
        err instanceof Error
          ? err.message
          : "We could not complete your registration. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  const popupColors = {
    success: {
      background: "#e8f6ec",
      border: "#2d8050",
      text: "#205c37",
    },
    error: {
      background: "#fff0ef",
      border: "#c83e3e",
      text: "#8d2424",
    },
    info: {
      background: "#edf4ff",
      border: "#4a78c2",
      text: "#244d89",
    },
  };

  return (
    <div className="auth-page">
      {/* POPUP MESSAGE */}
      {popup && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="signup-popup-title"
          aria-describedby="signup-popup-message"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            background: "rgba(0, 0, 0, 0.48)",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 420,
              padding: 26,
              borderRadius: 18,
              background: "#ffffff",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
              borderTop: `5px solid ${popupColors[popup.type].border}`,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: popupColors[popup.type].background,
                color: popupColors[popup.type].text,
                fontSize: 25,
                fontWeight: 800,
                marginBottom: 16,
              }}
              aria-hidden="true"
            >
              {popup.type === "success"
                ? "✓"
                : popup.type === "error"
                  ? "!"
                  : "i"}
            </div>

            <h2
              id="signup-popup-title"
              style={{
                fontSize: 23,
                fontWeight: 750,
                color: "#203b32",
                marginBottom: 12,
              }}
            >
              {popup.title}
            </h2>

            <p
              id="signup-popup-message"
              style={{
                fontSize: 15,
                lineHeight: 1.7,
                color: "#58665e",
                marginBottom: 22,
                overflowWrap: "anywhere",
              }}
            >
              {popup.message}
            </p>

            {popup.title === "Email already in use" && (
              <p style={{ marginBottom: 18 }}>
                <Link
                  href="/login"
                  style={{
                    color: "#245b47",
                    fontWeight: 700,
                    textDecoration: "underline",
                  }}
                >
                  Go to login
                </Link>
              </p>
            )}

            {popup.title === "Verification email sent!" && (
              <Link
                href="/login"
                className="btn btn-dark"
                style={{
                  display: "block",
                  textAlign: "center",
                  textDecoration: "none",
                  marginBottom: 10,
                }}
              >
                Go to login
              </Link>
            )}

            <button
              type="button"
              className="btn btn-dark"
              style={{ width: "100%" }}
              onClick={() => setPopup(null)}
              autoFocus
            >
              {popup.type === "success" &&
              popup.title === "Verification email sent!"
                ? "Got it"
                : "Close"}
            </button>
          </div>
        </div>
      )}

      <aside className="auth-side">
        <Link className="brand" href="/">
          <span className="brand-mark">TB</span>
          TYACDI BRIDGE
        </Link>

        <div className="auth-side-copy">
          <div className="eyebrow">
            YOUR NEXT CHAPTER STARTS HERE
          </div>

          <h1>
            Make room for
            <br />
            the <em>right people.</em>
          </h1>

          <p>
            Meet ambitious builders and experienced leaders. Share
            what you know, learn what you need, and make introductions
            matter.
          </p>
        </div>

        <div className="auth-side-foot">
          A thoughtful network for people moving things forward.
        </div>
      </aside>

      <main className="auth-main">
        <form className="auth-form" onSubmit={submit}>
          <h2>Join TYACDI BRIDGE</h2>

          <p className="auth-intro">
            Create your member account. Every member signs in to
            access the network.
          </p>

          <label htmlFor="name">Full name</label>

          <input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            autoComplete="name"
          />

          <label htmlFor="email">
            Work or professional email
          </label>

          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
          />

          <div className="form-row">
            <div>
              <label htmlFor="role">Your current role</label>

              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option>Founder</option>
                <option>CEO / Executive</option>
                <option>Operator</option>
                <option>Professional</option>
                <option>Student / Emerging talent</option>
                <option>Investor</option>
              </select>
            </div>

            <div>
              <label htmlFor="company">
                Company / project
              </label>

              <input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <label htmlFor="bio">
            What are you working toward? (optional)
          </label>

          <textarea
            id="bio"
            rows={2}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A short introduction or goal…"
          />

          <label htmlFor="password">Create password</label>

          <input
            id="password"
            type="password"
            required
            minLength={8}
            maxLength={72}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="8+ characters, uppercase, lowercase and number"
            autoComplete="new-password"
          />

          <p
            style={{
              fontSize: 12,
              color: "#68776e",
              marginTop: -8,
              marginBottom: 16,
              lineHeight: 1.5,
            }}
          >
            Use at least 8 characters, including an uppercase
            letter, a lowercase letter, and a number.
          </p>

          <button
            className="btn btn-dark"
            type="submit"
            disabled={busy}
            style={{
              width: "100%",
              opacity: busy ? 0.7 : 1,
              cursor: busy ? "wait" : "pointer",
            }}
          >
            {busy ? "Creating account…" : "Create my account"}
            {!busy && <span> ↗</span>}
          </button>

          <p className="auth-switch">
            Already a member? <Link href="/login">Log in</Link>
          </p>

          <p className="form-note">
            By joining, you agree to treat members respectfully and
            protect private information shared through the network.
          </p>
        </form>
      </main>
    </div>
  );
}
