# Palm Readings AI

The whole palmreadings.ai site (marketing pages and the reading app) on Cloudflare Workers.

- **Astro** builds the pages in `src/pages/` to static HTML (home, about, contact, privacy, terms, 404).
- **The reading app** is React (`src/app/`), mounted at `/reading/`.
- **The Worker** (`worker/index.ts`) serves the site and handles `/api/reading`, `/api/feedback`,
  `/api/contact`, plus redirects: `app.palmreadings.ai` → `/reading/`, `www` → bare domain, old
  WordPress-only URLs → home. The WordPress URLs `/about/`, `/contact/`, `/privacy-policy/`, `/terms/`
  are kept as-is.
- **Server code** for readings lives in `server/`; types shared with the app are in `shared/`.

Brand: colors and gradients from the WordPress theme (`src/styles/global.css`), Cinzel headings,
Comfortaa UI text, Nunito Sans for long reading text.

## How a reading works

1. **Choose** – Full Life, Love, Career, or Couples.
2. **About you** – dominant hand (required), optional name, age, pronouns, and an opt-in toggle for
   marriage & children predictions.
3. **Photos** – both palms are always required. The pinky-side photo of the dominant hand becomes
   required when marriage & children predictions are on (that's where those lines are). Photos are
   resized to ≤1600px JPEG in the browser and never stored.
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
6. **Results** – headline, traits, "What we saw in your hands", sections, family predictions (if opted
   in), action steps, mantra, print-to-PDF, feedback.

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

For hot reload: `npm run preview` (Worker on :8787) in one terminal, `npm run dev` (Astro on :4321,
proxies /api) in another.

## Moving palmreadings.ai from EasyWP to Cloudflare

Do these in order. Nothing changes for visitors until step 5.

1. **Back up WordPress**: Tools → Export (done), plus a full EasyWP backup.
2. **Copy the images** listed in `src/site.ts` into `public/images/` and set `IMAGE_BASE` to
   `'/images'`. They currently load from the WordPress media library, which disappears with EasyWP.
3. **Add the domain to Cloudflare** (free plan). Cloudflare scans existing DNS; then check every
   record against Namecheap's Advanced DNS, especially the **Google Workspace email records**:
   the MX records, the SPF TXT (`v=spf1 include:_spf.google.com ~all`), DKIM (`google._domainkey`), DMARC
   (`_dmarc`), and any Google site-verification TXT. Missing any of these breaks email.
4. **Deploy**: `npx wrangler login`. Create storage once: `npx wrangler d1 create palmreadings` (paste
   the `database_id` into `wrangler.jsonc`), `npx wrangler r2 bucket create palmreadings-photos`, and
   `npx wrangler d1 migrations apply palmreadings --remote`. Then `npm run deploy`. Set secrets with
   `npx wrangler secret put ANTHROPIC_API_KEY` (etc.) and change `AI_PROVIDER` in `wrangler.jsonc`.
   Test on the `*.workers.dev` URL.
5. **Switch nameservers** at Namecheap to the two Cloudflare gives you. After it's active, uncomment
   the `routes` block in `wrangler.jsonc` and deploy again. That attaches `palmreadings.ai`,
   `www` and `app` to the Worker and replaces the old EasyWP / app records.
6. **Check**: every page, the reading flow, the contact form, an email to and from hello@palmreadings.ai.
7. **Cancel EasyWP** once everything has worked for a few days.

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

- **Legal review**: the Privacy Policy and Terms were rewritten (Nov 2026) to match how the site handles data
  (readings kept until deleted, photos deleted 3 years after last opened, optional marketing
  permission for photos, anonymized stats in marketing, 18+, consent for a partner's photos, paid
  readings). Have a legal advisor review them before launch.
- Payments (Stripe), email capture (e.g. email me my private link).
