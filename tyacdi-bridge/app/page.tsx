import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const samplePeople = [
  { initials: "WV", name: "Weya-Ajayi Victor", title: "Founder, TYACDI Initiatives", location: "Ekiti, Nigeria", tags: ["Mentorship", "Entrepreneurship"], type: "Founder", color: "lav" },
  { initials: "DK", name: "David Kimani", title: "CEO, Meridian Group", location: "Nairobi, Kenya", tags: ["Leadership", "Scale-up"], type: "CEO", color: "gold" },
  { initials: "SO", name: "Sofia Okafor", title: "Product builder & operator", location: "Accra, Ghana", tags: ["Product", "Growth"], type: "Builder", color: "blue" },
];

export default async function Home() {
  let user = null;
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Keep the public homepage available if auth cannot be checked.
  }
  if (user) redirect("/dashboard");

  return (
    <main>
      <nav className="nav wrap">
        <Link className="brand" href="/" aria-label="TYACDI BRIDGE home">
          <Image src="/tyacdi-logo.png" alt="TYACDI BRIDGE — Learn, Build, Grow" width={180} height={90} priority style={{ width: "150px", height: "auto", objectFit: "contain" }} />
        </Link>
        <div className="nav-links"><a href="#how">How it works</a><a href="#network">The network</a></div>
        <div className="nav-actions"><Link className="login-link" href="/login">Log in</Link><Link className="btn btn-dark btn-small" href="/signup">Join the network <span></span></Link></div>
      </nav>

      <section className="hero wrap">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> THE NEXT CHAPTER STARTS WITH A CONNECTION</div>
          <h1>Ambition deserves<br />a <em>better network.</em></h1>
          <p className="hero-lede">A professional community where ambitious builders meet experienced CEOs, mentors, operators, and people who have been there before.</p>
          <div className="hero-actions"><Link className="btn btn-dark" href="/signup">Find your people <span></span></Link><Link className="text-link" href="#how">See how it works <span>↓</span></Link></div>
          <div className="social-proof"><div className="avatar-stack"><span className="av av1">AM</span><span className="av av2">DK</span><span className="av av3">SO</span><span className="av av4">+</span></div><div><strong>Built for people who build.</strong><small>Founders · CEOs · Operators · Rising talent</small></div></div>
        </div>
        <div className="hero-art" aria-label="Illustration of professionals connecting">
          <div className="art-glow" /><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="network-line line-a" /><div className="network-line line-b" /><div className="network-line line-c" />
          <div className="profile-card card-main"><div className="profile-top"><span className="status-dot" /> OPEN TO CONNECTIONS <span className="more">···</span></div><div className="person-row"><div className="portrait portrait-main">JM</div><div><strong>Jordan Mensah</strong><small>CEO · Atlas Ventures</small><small className="verified">✓ Verified professional</small></div></div><div className="quote">“The right conversation can change the direction of a business.”</div><div className="chip-row"><span>Strategy</span><span>Mentorship</span></div></div>
          <div className="profile-card card-float"><div className="portrait portrait-small">TK</div><div><strong>Tomi K.</strong><small>Founder · Early stage</small><span className="match">Shared interests · 3</span></div><span className="connect-icon"></span></div>
          <div className="floating-note"><span className="note-icon">✳</span><div><strong>Better introductions.</strong><small>More meaningful progress.</small></div></div>
          <div className="art-label label-one">EXPERIENCE</div><div className="art-label label-two">POTENTIAL</div>
        </div>
      </section>

      <section className="trust-bar"><div className="wrap trust-inner"><span>ONE NETWORK, MANY PERSPECTIVES</span><div><b>01</b> Founders</div><div><b>02</b> CEOs &amp; executives</div><div><b>03</b> Operators</div><div><b>04</b> Rising talent</div></div></section>

      <section className="section wrap" id="how">
        <div className="section-heading"><div><div className="eyebrow">A NETWORK WITH INTENTION</div><h2>Not another feed.<br /><em>A starting point.</em></h2></div><p>Skip the noise. Find people whose experience, goals, and perspective can help you take the next step.</p></div>
        <div className="value-grid">
          <article className="value-card"><div className="value-num">01 / DISCOVER</div><div className="value-icon">⌕</div><h3>Find your next connection</h3><p>Explore a directory of founders, leaders, and professionals by role, industry, and what they can share.</p><Link href="/signup">Explore the network </Link></article>
          <article className="value-card value-featured"><div className="value-num">02 / CONNECT</div><div className="value-icon"></div><h3>Make introductions count</h3><p>Send thoughtful connection requests and explain what brings you together. No cold-message chaos.</p><Link href="/signup">Start a conversation </Link></article>
          <article className="value-card"><div className="value-num">03 / GROW</div><div className="value-icon">⌁</div><h3>Turn insight into momentum</h3><p>Build relationships around mentorship, collaboration, advice, and opportunities that move your work forward.</p><Link href="/signup">Build your circle </Link></article>
        </div>
      </section>

      <section className="people-section" id="network"><div className="wrap">
        <div className="people-head"><div><div className="eyebrow">A FEW OF THE PEOPLE YOU COULD MEET</div><h2>Different journeys.<br /><em>Shared ambition.</em></h2></div><Link className="btn btn-light" href="/signup">Meet the network </Link></div>
        <div className="people-grid">{samplePeople.map((p) => <article className="person-card" key={p.name}><div className="person-card-top"><span className={`portrait ${p.color}`}>{p.initials}</span><span className="person-type">{p.type}</span></div><h3>{p.name}</h3><p className="person-title">{p.title}</p><p className="person-location">⌖ {p.location}</p><div className="person-tags">{p.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><Link href="/signup" className="person-cta">View profile <span></span></Link></article>)}</div>
        <p className="demo-note">Illustrative profiles shown for preview. Real member profiles require an account.</p>
      </div></section>

      <section className="cta-section wrap"><div className="cta-box"><div className="cta-decoration">b.</div><div className="eyebrow">YOUR NEXT INTRODUCTION STARTS HERE</div><h2>Your ambition is personal.<br /><em>Your network can be powerful.</em></h2><p>Join a community built around real people, shared knowledge, and meaningful progress.</p><Link href="/signup" className="btn btn-light">Create your account <span></span></Link><small>Growth is gradual — but with us, exponential.</small></div></section>

      <footer className="footer wrap">
        <Link className="brand" href="/" aria-label="TYACDI BRIDGE home"><Image src="/tyacdi-logo.png" alt="TYACDI BRIDGE — Learn, Build, Grow" width={180} height={90} style={{ width: "125px", height: "auto", objectFit: "contain" }} /></Link>
        <span>Ambition meets experience.</span><div><Link href="/login">Log in</Link><Link href="/signup">Join</Link></div>
        <small>© {new Date().getFullYear()} TYACDI BRIDGE</small><p className="footer-motto">Tosi says: You also can do it.</p>
      </footer>
    </main>
  );
}
