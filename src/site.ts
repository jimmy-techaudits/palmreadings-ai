// Site-wide constants.
//
// Images live in public/images/. The ones still marked WP are loaded from the old WordPress
// media library until their files are added here; they break when EasyWP is cancelled.
const LOCAL = '/images';
const WP = 'https://palmreadings.ai/wp-content/uploads/2025/12';

export const IMAGES = {
  logo: `${LOCAL}/palm-readings-ai-logo.png`,
  bothHands: `${LOCAL}/both-hands.png`,
  couples: `${LOCAL}/couples.png`,
  // Still needed:
  icon: `${WP}/palm-readings-ai-icon.png`,
  favicon: `${WP}/cropped-palm-readings-ai-icon.png`,
  appScreens: `${WP}/palm-readings-app-screenshots.png`,
  loveFuture: `${WP}/love-and-future.png`,
  careerPath: `${WP}/career-path.png`,
};

export const CONTACT_EMAIL = 'hello@palmreadings.ai';
export const GA_ID = 'G-LW61254S51';
