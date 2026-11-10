# Palm Readings AI

The app behind **app.palmreadings.ai**. React + Vite frontend with Cloudflare Pages Functions on the
server. The main site (palmreadings.ai) stays on WordPress / EasyWP.

## How a reading works

1. **Choose** – Full Life, Love, Career, or Couples.
2. **About you** – dominant hand (required), optional name, age, pronouns, and an opt-in toggle for
   marriage & children predictions.
3. **Photos** – both palms are always required. The pinky-side photo of the dominant hand becomes
   required when marriage & children predictions are on (that's where those lines are). Photos are
   resized to ≤1600px JPEG in the browser before upload and are never stored.
4. **Server pipeline** (`functions/_lib/pipeline.ts`), streamed back to the browser as progress events:
   - **Observe** – one vision call per person returns structured data on what is visible (hand shape,
     each line, mounts, markings, relationship/children lines) and flags unusable photos.
   - **Interpret** – one text-only call writes the reading from those observations plus the
     palmistry rulebook (`functions/_lib/rulebook.ts`), in a fixed structure (`functions/_lib/schemas.ts`).
     Each section lists the features it is based on.
5. **Results** – headline, traits, "What we saw in your hands", sections, family predictions (if
   opted in), action steps, mantra, print-to-PDF, feedback.

Sections per reading type live in `shared/plan.ts`. Each has a `free`/`premium` tier for the paid
version (not enforced yet).

## Model providers

Set `AI_PROVIDER` to `anthropic`, `openai`, `gemini`, or `mock` (canned output, no key, for UI work).
`OBSERVE_MODEL` / `INTERPRET_MODEL` choose the model for each step; Anthropic defaults to
`claude-opus-5-5`, OpenAI and Gemini require them to be set.

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars   # add keys, pick AI_PROVIDER
npm run dev:full                 # builds and serves app + API on http://localhost:8788
```

For fast UI iteration: run `npm run preview` (API on :8788) in one terminal and `npm run dev`
(hot reload on :3000, proxies /api) in another.

## Deploying to Cloudflare Pages

1. `npx wrangler login`, then `npm run deploy` (creates the `palmreadings-app` Pages project on first run).
2. In the Cloudflare dashboard → the Pages project → Settings → Variables and Secrets, set
   `AI_PROVIDER`, the matching API key as a **secret**, and optionally `OBSERVE_MODEL`,
   `INTERPRET_MODEL`, `FEEDBACK_WEBHOOK_URL`, `USAGE_WEBHOOK_URL` (the existing Google Apps
   Script URLs can go here; they are now called from the server only).
3. Pages project → Custom domains → add `app.palmreadings.ai`. Cloudflare shows a CNAME target
   (`palmreadings-app.pages.dev`).
4. In Namecheap → Domain List → palmreadings.ai → Advanced DNS, change the `app` record to a
   CNAME pointing at that target. WordPress and the rest of the domain are unaffected.

## Not yet done (later phases)

- Bot protection (Turnstile) and rate limiting – needed before real API keys go live publicly.
- Payments (Stripe), saved/shareable readings, email capture.
- Blind provider comparison on real hand photos.
