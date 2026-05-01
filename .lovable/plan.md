
# Elite NG Modeling OS — Core Flow MVP

A luxury AI-powered modeling marketplace for Nigeria. This plan covers the **core flow first** scope: model signup → AI scoring → brand campaigns → matching → booking → Paystack. Admin CRM and auto content generator are deferred to v2.

## Stack adjustments (vs original spec)
- **React + Vite** (not Next.js — Lovable's framework). Same UX, deploys to Vercel cleanly.
- **Lovable Cloud** for database, auth, storage, edge functions (managed Supabase).
- **Lovable AI Gateway** for scoring (Gemini vision + text). No OpenAI key needed.
- **Firecrawl connector** for Instagram profile scraping.
- **Paystack** via edge function using your test + live secret keys.

---

## Design system

- Background `#0B0B0F`, Primary gold `#D4AF37`, Accent neon green `#00FF99`
- Glassmorphism cards (backdrop blur, subtle gold/green borders, soft glows)
- Fonts: Bebas Neue (display), Montserrat (headings), Inter (body)
- All tokens in `index.css` + `tailwind.config.ts` as HSL semantic variables (`--background`, `--primary`, `--accent`, `--gold`, `--neon`, glass surface tokens)

---

## Pages & flows

### 1. Landing (`/`)
Luxury hero with animated gold/neon gradient, glass cards explaining the flow:
`Model → AI Score → Match → Booking → Payment`
Two CTAs: **Become a Model**, **Book Talent**. Featured Platinum models strip, social proof, FAQ, footer.

### 2. Auth (`/auth`)
- Email + password only (signup + login on one page)
- Role chosen at signup: **Model** or **Brand** (admin role assigned manually in DB)
- Auto-confirm enabled so testing doesn't need email verification
- Redirects to the right onboarding after signup

### 3. Model onboarding (`/onboarding/model`)
Multi-step glass form:
1. Basics — full name, age, gender, phone
2. Location — city, state (Nigeria preset)
3. Socials — Instagram handle (required for scrape), TikTok (optional), bio
4. Photos — upload 3–8 photos to Cloud storage (private bucket, signed URLs)
5. Submit → triggers AI scoring (loading screen with progress)

### 4. Model dashboard (`/dashboard/model`)
- AI score (0–100) with animated dial, category badge (Platinum / Commercial / Influencer / Training)
- Profile preview, edit profile, re-trigger scoring
- Incoming bookings list with status (pending / accepted / paid / completed)

### 5. Brand onboarding + dashboard (`/onboarding/brand`, `/dashboard/brand`)
- Brand: name, industry, location, logo
- Dashboard tabs: **Campaigns**, **Matches**, **Bookings**

### 6. Create campaign (`/campaigns/new`)
Brand defines: title, brief, category needed, location preference, budget (NGN), shoot date, # of models. On save → matching engine runs → list of ranked models shown.

### 7. Marketplace (`/marketplace`)
Public-ish browse of approved models. Filters: category, city, score range. Card grid with glass tiles (photo, name, city, score, category badge). Click → model profile page (`/models/:id`).

### 8. Match results & booking (`/campaigns/:id/matches`)
Ranked list of models with match score breakdown (category +40, location +20, AI score +40). "Book" button → booking modal → Paystack checkout → confirmation page.

---

## AI Scout Engine (edge function: `score-model`)

Triggered after onboarding submit or manual re-score.

1. Fetch model row + signed URLs for uploaded photos.
2. **Firecrawl** scrape Instagram profile URL → extract follower count, post count, bio, recent post engagement signals (best-effort; tolerate failure).
3. Call **Lovable AI Gateway** with `google/gemini-2.5-pro` (vision-capable), passing photos + profile text + IG signals.
4. Use **tool calling** to force structured JSON output:
   ```
   { score: 0-100, category: "Platinum"|"Commercial"|"Influencer"|"Training",
     reasoning: string, strengths: string[], improvements: string[] }
   ```
5. Persist to `models` table; mark `scored_at`.

Handle 429/402 from gateway with friendly toast on the client.

---

## Matching Engine (edge function: `match-models`)

Input: campaign id. Algorithm per model:
- Category fit (campaign.category == model.category) → +40
- Location match (same city +20, same state +10) → +20 max
- AI score normalized → up to +40 (`score * 0.4`)

Returns top 20 ranked models with score breakdown. Cached in `matches` table.

---

## Payments — Paystack

Two edge functions:
- `paystack-init` — creates a transaction, returns authorization URL. Called when brand clicks "Book". Stores pending booking.
- `paystack-verify` — called from success redirect page. Verifies transaction by reference, marks booking as `paid`, computes platform commission (15% default, configurable).

Secrets stored via Lovable Cloud:
- `PAYSTACK_SECRET_KEY` (test)
- `PAYSTACK_PUBLIC_KEY` (test) — exposed to client
- Live keys added before going live (same names, swap in production env)

You'll be prompted to paste the test keys when this runs.

---

## Database schema (Lovable Cloud / Supabase)

```text
profiles            (id=auth.uid, email, display_name, created_at)
user_roles          (id, user_id, role enum: 'model'|'brand'|'admin')   -- separate table, RLS-safe
models              (id, user_id, full_name, age, gender, phone, city, state,
                     instagram, tiktok, bio, score, category, scored_at,
                     ai_reasoning, ai_strengths, ai_improvements, status)
model_photos        (id, model_id, storage_path, position)
brands              (id, user_id, name, industry, city, logo_path)
campaigns           (id, brand_id, title, brief, category, city, budget_ngn,
                     shoot_date, slots, status)
matches             (id, campaign_id, model_id, total_score, breakdown jsonb)
bookings            (id, campaign_id, model_id, brand_id, amount_ngn,
                     commission_ngn, status, paystack_ref, created_at)
```

Storage bucket: `model-photos` (private, signed URLs for display).
RLS on all tables. `has_role()` security-definer function for admin checks.

---

## Build order

1. Design tokens + landing page
2. Auth + role-based routing + profiles/user_roles tables
3. Model onboarding + photo storage + model dashboard shell
4. AI scoring edge function (Firecrawl + AI Gateway, tool-calling JSON)
5. Brand onboarding + campaign creation
6. Matching engine + match results page
7. Marketplace browse + model profile page
8. Paystack init + verify + booking flow
9. Polish: loading states, empty states, error toasts for 429/402

---

## Out of scope (for a v2 follow-up)
- Admin CRM dashboard (analytics, all-users view, revenue charts)
- Auto content generator (TikTok/IG growth posts)
- Subscription tier for brands
- Featured placements purchase

## Deployment
- Click **Publish** in Lovable to deploy to a `*.lovable.app` subdomain immediately.
- Connect `elite.resofit.fit` via Project Settings → Domains. Vercel isn't needed — Lovable hosting handles SPA routing automatically.
- If you specifically need Vercel hosting, you can connect the GitHub repo Lovable creates and deploy from there; env vars for Paystack/Cloud will need to be mirrored in Vercel.

