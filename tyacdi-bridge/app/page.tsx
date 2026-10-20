"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Founder");
  const [company, setCompany] = useState("");
  const [bio, setBio] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const supabase = createClient();
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name, role, company, bio } },
      });

      if (signupError) throw signupError;

      if (data.session) {
        window.location.href = "/dashboard";
      } else {
        setNotice("Account created. Check your email to confirm your address, then log in.");
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not create your account. Please check your details and try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <aside className="auth-side">
        <Link className="brand" href="/" aria-label="TYACDI BRIDGE home">
          <Image
            src="/tyacdi-logo.png"
            alt="TYACDI BRIDGE — Learn, Build, Grow"
            width={180}
            height={90}
            priority
            style={{ width: "150px", height: "auto", objectFit: "contain" }}
          />
        </Link>

        <div className="auth-side-copy">
          <div className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</div>
          <h1>
            Make room for
            <br />
            the <em>right people.</em>
          </h1>
          <p>
            Meet ambitious builders and experienced leaders. Share what you
            know, learn what you need, and make introductions matter.
          </p>
        </div>

        <div className="auth-side-foot">
          Learn. Build. Grow. A thoughtful network for people moving things forward.
        </div>
      </aside>

      <main className="auth-main">
        <form className="auth-form" onSubmit={submit}>
          <h2>Join TYACDI BRIDGE</h2>
          <p className="auth-intro">
            Create your member account. Every member signs in to access the network.
          </p>

          {error && <div className="auth-error" role="alert">{error}</div>}
          {notice && (
            <div className="auth-message" role="status">
              {notice} <Link href="/login">Log in</Link>
            </div>
          )}

          <label htmlFor="name">Full name</label>
          <input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            autoComplete="name"
          />

          <label htmlFor="email">Work or professional email</label>
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
              <select id="role" value={role} onChange={(e) => setRole(e.target.value)}>
                <option>Founder</option>
                <option>Mentor</option>
                <option>CEO / Executive</option>
                <option>Operator</option>
                <option>Professional</option>
                <option>Student / Emerging talent</option>
                <option>Investor</option>
              </select>
            </div>
            <div>
              <label htmlFor="company">Company / project</label>
              <input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <label htmlFor="bio">What are you working toward? (optional)</label>
          <textarea
            id="bio"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A short introduction or goal..."
          />

          <label htmlFor="password">Create password</label>
          <input
            id="password"
            type="password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />

          <button className="btn btn-dark" type="submit" disabled={busy}>
            {busy ? "Creating account..." : "Create my account"}
          </button>

          <p className="auth-switch">
            Already a member? <Link href="/login">Log in</Link>
          </p>
          <p className="form-note">
            By joining, you agree to treat members respectfully and protect
            private information shared through the network.
          </p>
        </form>
      </main>
    </div>
  );
}
