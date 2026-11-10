export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  PHOTOS: R2Bucket;
  /** Bearer token for the admin delete endpoint (deletion requests by email). */
  ADMIN_TOKEN?: string;
  /** Cloudflare Turnstile secret. When unset (local dev), the check is skipped. */
  TURNSTILE_SECRET_KEY?: string;
  /** Secret salt for hashing IP addresses in rate-limit counters. */
  RATE_LIMIT_SALT?: string;
  READINGS_PER_HOUR_PER_IP?: string;
  READINGS_PER_DAY_PER_IP?: string;
  /** Overall daily cap on readings, to bound AI costs. */
  READINGS_PER_DAY_TOTAL?: string;
  /** Set to "true" to apply rate limits on localhost too. */
  ENFORCE_LIMITS_LOCALLY?: string;
  /** Contact form delivery: Resend API key, or a webhook (e.g. a Google Apps Script that emails you). */
  RESEND_API_KEY?: string;
  CONTACT_WEBHOOK_URL?: string;
  CONTACT_TO_EMAIL?: string;
  CONTACT_FROM_EMAIL?: string;
  AI_PROVIDER?: string;
  OBSERVE_MODEL?: string;
  INTERPRET_MODEL?: string;
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
  GEMINI_API_KEY?: string;
  FEEDBACK_WEBHOOK_URL?: string;
  USAGE_WEBHOOK_URL?: string;
}
