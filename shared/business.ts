// Business details shown in emails and policies.
export const BUSINESS = {
  name: 'Palm Readings AI',
  legalName: 'Lotuzen Tech LLC',
  /** Required in every marketing email (CAN-SPAM). */
  postalAddress: '7111 Dixie Hwy #206, Clarkston, MI 48346',
  email: 'hello@palmreadings.ai',
};

/** Shown next to the email box on a free reading, and stored with each subscriber as proof of consent. */
export const EMAIL_CONSENT_TEXT =
  'By entering your email, you agree to receive your reading link and occasional emails from Palm Readings AI. You can unsubscribe anytime.';

/** Default prices in US cents (overridable with PRICE_SOLO_CENTS and PRICE_COUPLE_CENTS). */
export const DEFAULT_PRICES = { solo: 499, couple: 799 };
