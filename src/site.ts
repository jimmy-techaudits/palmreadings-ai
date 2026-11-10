// Site-wide constants.
//
// IMAGES still point at the WordPress media library. Before EasyWP is cancelled,
// copy these files into public/images/ and switch IMAGE_BASE to '/images'.
const IMAGE_BASE = 'https://palmreadings.ai/wp-content/uploads/2025/12';

export const IMAGES = {
  logo: `${IMAGE_BASE}/palm-readings-ai-logo.png`,
  icon: `${IMAGE_BASE}/palm-readings-ai-icon.png`,
  favicon: `${IMAGE_BASE}/cropped-palm-readings-ai-icon.png`,
  appScreens: `${IMAGE_BASE}/palm-readings-app-screenshots.png`,
  bothHands: `${IMAGE_BASE}/both-hands.png`,
  loveFuture: `${IMAGE_BASE}/love-and-future.png`,
  careerPath: `${IMAGE_BASE}/career-path.png`,
  couples: `${IMAGE_BASE}/couples.png`,
};

export const CONTACT_EMAIL = 'hello@palmreadings.ai';
export const GA_ID = 'G-LW61254S51';
