export interface Env {
  ASSETS: Fetcher;
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
