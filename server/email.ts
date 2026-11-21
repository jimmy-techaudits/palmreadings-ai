// Emails sent through the Google Workspace Apps Script: the private reading link, after a free
// reading (to people who gave their email) and after a purchase (to the address used at checkout).
import { BUSINESS } from '../shared/business';
import type { Env } from './env';
import { sendToGoogle } from './google';

function footer(unsubscribeUrl?: string): string {
  return [
    '',
    'Keep this link private: anyone who has it can see your reading. You can delete your reading anytime from the same page.',
    '',
    `${BUSINESS.name}, ${BUSINESS.legalName}`,
    BUSINESS.postalAddress,
    unsubscribeUrl ? `Unsubscribe from our emails: ${unsubscribeUrl}` : '',
  ]
    .filter((l, i, a) => l !== '' || a[i - 1] !== '')
    .join('\n');
}

/** After a free reading, to someone who gave their email (and agreed to marketing emails). */
export function sendFreeReadingEmail(env: Env, to: string, link: string, unsubscribeUrl: string) {
  return sendToGoogle(env, 'email', {
    to,
    subject: 'Your palm reading is ready',
    body: [
      'Thank you for your reading. Here is your private link:',
      link,
      '',
      'Your free reading shows your life at a glance and what each of your hands shows. Whenever you like, you can unlock the full reading (your timeline, love and marriage, career, money and more) from the same link.',
      footer(unsubscribeUrl),
    ].join('\n'),
  });
}

/** After a purchase, to the email used at checkout. Transactional: no marketing consent needed. */
export function sendPaidReadingEmail(env: Env, to: string, link: string) {
  return sendToGoogle(env, 'email', {
    to,
    subject: 'Your full palm reading',
    body: ['Thank you for your purchase. Your full palm reading is at this private link:', link, footer()].join('\n'),
  });
}

/** Keeps the subscriber list in the Google Sheet in step with D1 (for campaigns). */
export function logSubscriber(env: Env, email: string, status: 'subscribed' | 'unsubscribed', consentText?: string) {
  return sendToGoogle(env, 'subscriber', { email, status, consentText: consentText ?? '' });
}
