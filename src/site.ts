// Site-wide constants.
//
// Images live in public/images/.
const LOCAL = '/images';

export const IMAGES = {
  logo: `${LOCAL}/palm-readings-ai-logo.png`,
  bothHands: `${LOCAL}/both-hands.png`,
  couples: `${LOCAL}/couples.png`,
  loveFuture: `${LOCAL}/love-and-future.png`,
  careerPath: `${LOCAL}/career-path.png`,
  icon: `${LOCAL}/palm-readings-ai-icon.png`,
  favicon: `${LOCAL}/favicon-32.png`,
  appleTouchIcon: `${LOCAL}/apple-touch-icon.png`,
};

export const CONTACT_EMAIL = 'hello@palmreadings.ai';
export const GA_ID = 'G-LW61254S51';

/** Cloudflare Turnstile site key (public). Leave unset locally to skip the bot check. */
export const TURNSTILE_SITE_KEY: string = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY ?? '';
