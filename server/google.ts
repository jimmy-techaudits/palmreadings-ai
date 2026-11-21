// Google Workspace connection: one Google Apps Script web app (google-apps-script/Code.gs) that
// emails contact messages and reading links from your Workspace account, and logs messages, feedback,
// usage and email subscribers to a Sheet.
import type { Env } from './env';

export type GoogleAction = 'contact' | 'feedback' | 'usage' | 'email' | 'subscriber';

/**
 * Sends one event to the Apps Script. Returns true only if the script confirmed it ({"ok": true}).
 * Apps Script always answers 200, so success is read from the body. Returns false when not configured.
 */
export async function sendToGoogle(env: Env, action: GoogleAction, data: Record<string, unknown>): Promise<boolean> {
  if (!env.GOOGLE_SCRIPT_URL || !env.GOOGLE_SCRIPT_SECRET) return false;
  const res = await fetch(env.GOOGLE_SCRIPT_URL, {
    method: 'POST',
    // text/plain keeps Apps Script from rejecting the request; the body is JSON.
    headers: { 'content-type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ secret: env.GOOGLE_SCRIPT_SECRET, action, timestamp: new Date().toISOString(), ...data }),
    redirect: 'follow',
  });
  const reply = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
  if (!reply?.ok) throw new Error(`Google Apps Script ${action} failed: ${reply?.error ?? `HTTP ${res.status}, not JSON`}`);
  return true;
}
