# Palm Readings AI

The whole palmreadings.ai site (marketing pages and the reading app) on Cloudflare Workers.

- **Astro** builds the pages in `src/pages/` to static HTML (home, about, contact, privacy, terms, 404).
- **The reading app** is React (`src/app/`), mounted at `/reading/`.
- **The Worker** (`worker/index.ts`) serves the site and handles `/api/reading`, `/api/feedback`,
  `/api/contact`, plus redirects: `app.palmreadings.ai` → `/reading/`, `www` → bare domain, old
  WordPress-only URLs → home. The WordPress URLs `/about/`, `/contact/`, `/privacy-policy/`, `/terms/`
  are kept as-is.
- **Server code** for readings lives in `server/`; types shared with the app are in `shared/`.

Design: "celestial modern" redesign (Nov 2026). Tokens (colors, palm line colors, radii, shadows) are in
`src/styles/global.css`; shared classes `.btn-gold`, `.btn-ghost`, `.panel`, `.panel-raised`, `.starfield`,
`.hero-glow`, `.accent` (italic gold Cormorant word in a heading) and `.eyebrow`. Fonts: Cinzel (headings),
Cormorant Garamond italic (accents), Outfit (everything else). Rules: nothing smaller than 14px (`text-xs` is
14px), no em dashes in copy, the same color for each palm line everywhere. Legal pages (Privacy Policy, Terms of Use,
Refund Policy) share `src/layouts/Legal.astro`, whose "On this page" list stays in view and highlights the current
section; everything else uses `src/layouts/Base.astro` (header and footer).

## How a reading works

1. **Choose** – Full Life, Love, Career, or Couples.
2. **About you** – dominant hand (required), optional name, age, pronouns, marriage & children
   predictions (on by default, can be unticked), and an optional "What are you most curious about?".
3. **Photos** – both palms are always required. The pinky-side photo of the dominant hand becomes
   required when marriage & children predictions are on (that's where those lines are). Photos are
   resized to ≤1600px JPEG in the browser before upload.
4. **Server pipeline** (`server/pipeline.ts`), streamed to the browser as progress events:
   - **Observe** – one vision call per person returns structured data on what is visible and flags
     unusable photos.
   - **Interpret** – one text-only call writes the reading from those observations plus the
     palmistry rulebook (`server/rulebook.ts`) in a fixed structure (`server/schemas.ts`). Each
     section lists the features it is based on.
5. **Saved at a private link** – the reading (D1) and its photos (R2) are stored and the browser moves to `/r/<id>/` (a 128-bit random id, not indexed by search engines). Anyone with
   the link can view or delete it. No user accounts. Readings are kept until deleted; **photos are
   deleted 3 years after the link was last opened** by a daily cron job (`expireOldPhotos` in
   `server/store.ts`). An optional checkbox records permission to use the photos in marketing; it can
   be changed later on the private link.
6. **Results** (`src/app/components/Results.tsx`), phone-first, in this order:
   - headline and summary (one combined reading of both hands);
   - **Your life at a glance**: Marriage and Children as big numbers or small ranges ("1–2 Marriages",
     "1 Child") from the relationship and children lines, plus Career, Money, Biggest turning point
     and Life path. Each card shows how clearly its features could be seen ("Clearly visible", "Faint
     or partly visible", "Can't assess from this photo") and links to its section; a disclaimer says
     these are traditional interpretations, not guarantees. If the side photo was skipped, Marriage and
     Children say so instead of guessing. Couples readings show named traits instead;
   - **Explore your hands** (`HandExplorer.tsx`): Left/Right cards ("natural tendencies" /
     "developed path", framed as our method), the photo next to a drawn diagram (`HandDiagram.tsx`,
     generated from the observations, not traced), each line with its visibility, and a short note on
     what that hand shows on its own;
   - **Born With vs. Built**: how the two hands compare;
   - **Your life timeline**: 3–5 approximate periods from the palmistry timing scale ("Timing unclear"
     when the palm gives no age);
   - section cards: a short name, 2–3 tags (not all flattering), the lines it is read from, the text,
     **The other side** (a real challenge or trade-off), and what it is based on (faint features
     marked). Career & Success has "Paths that fit"; Marriage & Family shows the numbers with their
     explanations;
   - an optional, collapsed **Personal reflection** (the old "next two weeks"), and the mantra.

   If the person picked what they're **most curious about** during setup (marriage, children, career,
   money or life changes), that card and section come first and the AI goes deepest there.
   Navigation: a sticky left sidebar with section links on desktop; a bar at the bottom of the screen on
   phones. Each line has one color everywhere (`LINE_COLORS` in `observationText.ts`). The reading
   never shows scores, percentages, or health, lifespan or addiction claims (see `server/prompts.ts`).

## Saved readings, deletion requests and stats

Storage code: `server/store.ts`, schema: `migrations/`. Each row has anonymous columns (mode, focus,
age band, dominant hand, element, marriage/children ranges, feedback rating) for statistics, plus the
full reading JSON (which includes any first name given).

**Deleting a reading for someone who emails in.** If they send their link, the id is the part after
`/r/`. Otherwise find it, then delete it (this also deletes its photos):

```bash
npx wrangler d1 execute palmreadings --remote --command \
  "SELECT id, created_at, focus FROM readings WHERE data LIKE '%\"name\":\"Jordan\"%' ORDER BY created_at DESC"
curl -X DELETE https://palmreadings.ai/api/admin/readings/<id> -H "Authorization: Bearer $ADMIN_TOKEN"
```

Set the token once with `npx wrangler secret put ADMIN_TOKEN` (any long random string).

**Photos you may use in marketing** (permission given and photos not yet expired):

```bash
npx wrangler d1 execute palmreadings --remote --command \
  "SELECT id, marketing_consent_at FROM readings WHERE marketing_consent = 1 AND photos_deleted_at IS NULL"
npx wrangler r2 object get palmreadings-photos/readings/<id>/p0-right-palm.jpg --remote --file palm.jpg
```

Re-check consent before each new use; people can withdraw it.

**Marketing stats** (anonymous columns only, never `data`):

```bash
npx wrangler d1 execute palmreadings --remote --command \
  "SELECT marriages, COUNT(*) n FROM readings WHERE include_family = 1 GROUP BY marriages ORDER BY n DESC"
npx wrangler d1 execute palmreadings --remote --command \
  "SELECT age_band, element, COUNT(*) n FROM readings GROUP BY 1, 2 ORDER BY n DESC"
```

Sections per reading type: `shared/plan.ts` (each has a `free`/`premium` tier for the paid version).

## Model providers

`AI_PROVIDER` = `anthropic`, `openai`, `gemini`, or `mock` (canned output, no key, for UI work).
`OBSERVE_MODEL` / `INTERPRET_MODEL` pick the model per step; Anthropic defaults to `claude-opus-5-5`,
OpenAI and Gemini require them.

## Comparing AI providers

`npm run compare` runs real palm photos through Anthropic and OpenAI and writes a blind side-by-side
report to `compare-report/index.html`. Put keys in `.dev.vars` and photos in `test-photos/<person>/`
(`left.jpg`, `right.jpg`, optional `side.jpg` and `person.json`); details at the top of
`scripts/compare.ts`. Both folders are git-ignored so photos are never committed.

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars   # keys, AI_PROVIDER, contact delivery
npx wrangler d1 migrations apply palmreadings --local   # once: local database
npm run dev:full                 # builds and runs site + API on http://localhost:8787
```

`dev:full` and `preview` always run fully locally (local D1, R2 and Worker) with wrangler's keyboard
shortcuts turned off, so a stray key press can't switch to remote mode or open a Cloudflare tunnel.
Stop the server with Ctrl+C.

For hot reload: `npm run preview` (Worker on :8787) in one terminal, `npm run dev` (Astro on :4321,
proxies /api) in another.

## Contact form and Google Workspace

The contact form, feedback and anonymous usage log go through one Google Apps Script in your Google
Workspace (`google-apps-script/Code.gs`). It emails each contact message to hello@palmreadings.ai from
your Workspace account (Reply goes to the visitor) and logs messages, feedback and usage to tabs in a
Google Sheet. The website only needs the script's URL and a shared secret.

1. Signed in to Google Workspace, create a Google Sheet, e.g. "Palm Readings AI log".
2. **Extensions → Apps Script**. Replace the code with `google-apps-script/Code.gs` and save.
3. **Project Settings → Script properties → Add property**: `SECRET` = a long random string
   (`openssl rand -hex 24` makes one). Optional: `CONTACT_TO` if messages should go somewhere other than
   hello@palmreadings.ai.
4. **Deploy → New deployment → Web app**. Execute as: **Me**. Who has access: **Anyone**. Deploy,
   authorize, and copy the web app URL.
5. Locally, put both in `.dev.vars`: `GOOGLE_SCRIPT_URL=...` and `GOOGLE_SCRIPT_SECRET=...`. In
   production: `npx wrangler secret put GOOGLE_SCRIPT_URL` and `npx wrangler secret put GOOGLE_SCRIPT_SECRET`.
6. After changing the script later: **Deploy → Manage deployments → edit → Version: New version** (the
   URL stays the same).

Without these settings, contact messages are only printed in the terminal (fine for local work).

## Launch checklist

Do these in order. Nothing changes for visitors until the nameservers move (step 6).

1. **Back up WordPress**: Tools → Export (done), plus a full EasyWP backup. Images are already self-hosted.
2. **Cloudflare account** (free plan) and `npx wrangler login` on your Mac.
3. **Storage**, once:
   ```bash
   npx wrangler d1 create palmreadings          # paste the database_id into wrangler.jsonc
   npx wrangler r2 bucket create palmreadings-photos
   npx wrangler d1 migrations apply palmreadings --remote
   ```
4. **Bot check**: Cloudflare dashboard → Turnstile → Add widget for `palmreadings.ai` (and the
   `*.workers.dev` host while testing), mode "Managed". Put the site key in `.env` as
   `PUBLIC_TURNSTILE_SITE_KEY` (it's built into the pages).
5. **Secrets** (`npx wrangler secret put NAME` for each), then `npm run deploy` and test everything on the
   `*.workers.dev` address (it is automatically kept out of search engines):
   - `OPENAI_API_KEY` (and `ANTHROPIC_API_KEY` if you switch providers). `AI_PROVIDER` and the models are
     set in `wrangler.jsonc`.
   - `TURNSTILE_SECRET_KEY`, `RATE_LIMIT_SALT` (any long random string), `ADMIN_TOKEN` (for deletion requests).
   - `GOOGLE_SCRIPT_URL`, `GOOGLE_SCRIPT_SECRET` (see above).
   - Set a monthly spending limit in your OpenAI account.
6. **Move the domain**: add palmreadings.ai to Cloudflare, which copies the existing DNS records. Check every
   record against Namecheap's Advanced DNS, especially the **Google Workspace email records**: the MX
   records, the SPF TXT (`v=spf1 include:_spf.google.com ~all`), DKIM (`google._domainkey`), DMARC
   (`_dmarc`) and any Google site-verification TXT. Missing any of these breaks email. Then switch the
   nameservers at Namecheap to Cloudflare's two.
7. **Attach the domain**: once Cloudflare shows the domain as active, uncomment the `routes` block in
   `wrangler.jsonc` and `npm run deploy` again (attaches palmreadings.ai, www and app). In Cloudflare →
   SSL/TLS → Edge Certificates, turn on **Always Use HTTPS**.
8. **Check**: every page, a full reading, the contact form (a message arrives in hello@ and in the Sheet),
   an email to and from hello@palmreadings.ai, and that www.palmreadings.ai and app.palmreadings.ai
   redirect. `https://palmreadings.ai/robots.txt` should show the sitemap line, not "Disallow: /".
9. **Search engines**: in Google Search Console (and Bing Webmaster Tools), submit
   `https://palmreadings.ai/sitemap.xml` and request indexing of the home page. Old WordPress sitemap,
   feed and archive URLs already redirect.
10. **Cancel EasyWP** once everything has worked for a few days.

## SEO

- Titles (under 60 characters) and descriptions are set per page; every public page gets a canonical
  URL, Open Graph/Twitter tags with `public/images/og-palm-readings-ai.jpg`, and JSON-LD (Organization
  with the legal name, WebSite, the page type, breadcrumbs, and the palm reading Service on the home and
  reading pages). All of it is in `src/seo.ts` and `src/layouts/Base.astro`.
- `/sitemap.xml` is generated from `PUBLIC_PAGES` in `src/seo.ts`: **add new public pages there** and bump
  `updated` when a page changes meaningfully. `public/robots.txt` points to it.
- Private reading links (`/r/...`) and the 404 page are `noindex`. Any host other than palmreadings.ai
  (such as `*.workers.dev`) sends `noindex` and a robots.txt that blocks everything.
- Fonts are self-hosted (`@fontsource/*` in `global.css`), so no requests go to Google Fonts.

## Analytics and cookie consent

Google Analytics runs with Consent Mode (`src/layouts/Base.astro`). Its advertising features are off for
everyone. Visitors from the EU/EEA, UK and Switzerland (`shared/consent.ts`) get no analytics cookies until
they accept: the Worker marks their pages with `data-consent="required"` using Cloudflare's country, which
shows the cookie banner. Browsers sending Global Privacy Control get no analytics cookies. The "Cookie
settings" link in the footer reopens the banner for anyone. To see the banner locally, add
`?consent_region=1` to a page address.
- Content ideas with real search volume (US, Semrush, Nov 2026): palm reading lines (12,100/month), palm
  lines meaning (2,400), read my palm (880), palm reading love line (880), palm reading marriage line (720,
  low difficulty), life line (590), fate line (590), heart line (390). Guides on each line would be the
  biggest organic opportunity after launch.

## Bot protection and rate limits

`server/protect.ts`. `/api/reading` and `/api/contact` require a Cloudflare Turnstile token (invisible
for most visitors) and are rate limited per visitor (by hashed IP) and, for readings, by an overall
daily cap that bounds AI spend:

| Limit | Default | Setting |
|---|---|---|
| Readings per visitor per hour | 5 | `READINGS_PER_HOUR_PER_IP` |
| Readings per visitor per day | 15 | `READINGS_PER_DAY_PER_IP` |
| Readings per day, everyone | 500 | `READINGS_PER_DAY_TOTAL` |
| Contact messages per visitor per hour | 5 | – |

Limits are skipped on localhost (set `ENFORCE_LIMITS_LOCALLY=true` to test them). Counters are purged
after two days by the daily cron.

**Turnstile setup:** Cloudflare dashboard → Turnstile → Add widget for `palmreadings.ai` (mode
"Managed"). Put the site key in `.env` as `PUBLIC_TURNSTILE_SITE_KEY` before building, and the secret
with `npx wrangler secret put TURNSTILE_SECRET_KEY`. Also set `RATE_LIMIT_SALT` as a secret. To try it
locally, use Cloudflare's test keys from `.dev.vars.example`.

## Agreed plan for payments and free readings (not built yet)

- **Free reading:** one per visitor. It generates the full reading but shows only a preview (summary,
  traits, 2 sections); paying unlocks the rest of that same reading.
- **Email:** an email box is the main path on the free reading, with a subtle "Continue without email"
  link. Entering an email means agreeing to follow-up and marketing emails (stated plainly, with the
  time and wording stored as proof of consent). Every email has an unsubscribe link and a postal address.
- **Recognizing returning visitors:** email if given, otherwise a long-lived cookie plus a hashed-IP
  backstop (about 3 free readings per IP, for shared networks).
- **Paid readings:** paid up front with Stripe and never blocked: they skip the per-visitor limits, the
  daily cap and the bot check, and can be retried if generation fails. The daily cap applies to free
  readings only.
- **Email sending:** Google Workspace (Business Starter). Reading-link emails go out through the Gmail
  API from a palmreadings.ai address. The subscriber list lives in D1 and is exported to Google Sheets
  for campaigns; upgrading to Business Standard adds Gmail multi-send for newsletters.

## Before launch

- **Legal review** of the Privacy Policy, Terms of Use and Refund Policy (drafts written Nov 2026 to
  match how the site handles data, payments and refunds).
- Payments (Stripe) and the limited free reading.
