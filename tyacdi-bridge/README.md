# TYACDI BRIDGE

A polished, responsive full-stack professional networking starter for ambitious individuals, founders, CEOs, executives, operators, investors, and emerging talent.

## Implemented
- Original landing page with responsive desktop/mobile layout.
- Supabase email/password sign-up and sign-in.
- Authentication-aware dashboard; unauthenticated visitors are redirected to log in.
- Member profiles with role, company, location, bio, and interests.
- Member directory with search and role filters.
- Connection requests with accept/decline actions.
- PostgreSQL schema, indexes, auth profile trigger, and row-level security policies.

## Stack
- Next.js 14 / React / TypeScript
- Supabase Auth + PostgreSQL + Row Level Security
- `@supabase/ssr` cookie-based auth helpers

## Setup required for a real deployment
This repo includes the application code, but production authentication/data require a Supabase project and environment variables.

1. Create a project at https://supabase.com/dashboard.
2. Open SQL Editor and run `supabase/schema.sql`.
3. In Authentication > URL Configuration, set your local URL (`http://localhost:3000`) and later your production site URL. Configure email confirmation and your SMTP settings for production.
4. Copy `.env.example` to `.env.local`, then add the Project URL and anon/publishable key from Supabase Project Settings > API.
5. Run:
   ```bash
   npm install
   npm run dev
   ```
6. Deploy to Vercel and set the same two environment variables in Project Settings > Environment Variables. Set the production URL in Supabase Auth URL Configuration.

## Security notes
- Never put the Supabase service-role key in browser code or `NEXT_PUBLIC_*` variables.
- The provided SQL enables RLS. Review policies before launching a public community.
- Profile visibility is currently available to authenticated members. Add verification/moderation, reporting, rate limiting, account deletion, and privacy/legal pages before a public launch.
- This MVP includes member discovery and connection requests, not live chat, payments, or identity verification.
- Sample people on the public landing page are illustrative examples, not real members.

## "AI detectable"
The UI and copy are written as an original product concept rather than generated-content filler. No website can be guaranteed "undetectable" by AI detectors, and detector scores are not reliable proof of authorship.
