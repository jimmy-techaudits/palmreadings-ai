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
5. **Results** – headline, traits, "What we saw in your hands", sections, family predictions (if opted
   in), action steps, mantra, print-to-PDF, feedback.

Sections per reading type: `shared/plan.ts` (each has a `free`/`premium` tier for the paid version).

## Model providers

`AI_PROVIDER` = `anthropic`, `openai`, `gemini`, or `mock` (canned output, no key, for UI work).
`OBSERVE_MODEL` / `INTERPRET_MODEL` pick the model per step; Anthropic defaults to `claude-opus-5-5`,
OpenAI and Gemini require them.

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars   # keys, AI_PROVIDER, contact delivery
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
4. **Deploy**: `npx wrangler login`, then `npm run deploy`. Set secrets with
   `npx wrangler secret put ANTHROPIC_API_KEY` (etc.) and change `AI_PROVIDER` in `wrangler.jsonc`.
   Test on the `*.workers.dev` URL.
5. **Switch nameservers** at Namecheap to the two Cloudflare gives you. After it's active, uncomment
   the `routes` block in `wrangler.jsonc` and deploy again. That attaches `palmreadings.ai`,
   `www` and `app` to the Worker and replaces the old EasyWP / app records.
6. **Check**: every page, the reading flow, the contact form, an email to and from hello@palmreadings.ai.
7. **Cancel EasyWP** once everything has worked for a few days.

## Before launch

- **Bot protection (Turnstile) and rate limiting** on `/api/reading` and `/api/contact`.
- **Legal review**: the Privacy Policy and Terms were rewritten (Nov 2026) to match how the site handles data
  (photos sent to an AI provider and not stored, 18+, consent for a partner's photos, paid readings).
  Have a legal advisor review them before launch.
- Payments (Stripe), saved/shareable readings, email capture.
