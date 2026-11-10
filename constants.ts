import { ReadingTypeOption, FocusAreaOption } from './types';

export const READING_TYPES: ReadingTypeOption[] = [
  {
    id: 'dominant',
    title: 'Dominant Hand',
    description: 'Focuses on your active life, present circumstances, and conscious choices.',
    imageSrc: 'https://palmreadings.ai/wp-content/uploads/2025/12/dominant-hand.png',
    requiredImages: ['dominant_hand'],
  },
  {
    id: 'non_dominant',
    title: 'Non-Dominant Hand',
    description: 'Reveals potential, inherited traits, and your subconscious self.',
    imageSrc: 'https://palmreadings.ai/wp-content/uploads/2025/12/non-dominant-hand.png',
    requiredImages: ['non_dominant_hand'],
  },
  {
    id: 'both',
    title: 'Full Reading',
    description: 'A comprehensive comparison of your potential vs. your reality.',
    imageSrc: 'https://palmreadings.ai/wp-content/uploads/2025/12/both-hands.png',
    requiredImages: ['dominant_hand', 'non_dominant_hand'],
  },
  {
    id: 'couples',
    title: 'Couples Compatibility',
    description: 'Analyze the synergy and challenges between two partners.',
    imageSrc: 'https://palmreadings.ai/wp-content/uploads/2025/12/couples.png',
    requiredImages: [
      'dominant_hand',
      'non_dominant_hand',
      'partner_dominant_hand',
      'partner_non_dominant_hand',
    ],
  },
  {
    id: 'love_future',
    title: 'Love & Future',
    description: 'Explore your romantic timeline, partnership potential, and emotional blueprint.',
    imageSrc: 'https://palmreadings.ai/wp-content/uploads/2025/12/love-and-future.png',
    requiredImages: ['dominant_hand', 'non_dominant_hand'],
  },
  {
    id: 'career_path',
    title: 'Career Path',
    description: 'Uncover your natural work style, ambition patterns, and success indicators.',
    imageSrc: 'https://palmreadings.ai/wp-content/uploads/2025/12/career-path.png',
    requiredImages: ['dominant_hand'],
  },
];

export const FOCUS_AREAS: FocusAreaOption[] = [
  { id: 'general', label: 'General Overview' },
  { id: 'love', label: 'Love & Relationships' },
  { id: 'career', label: 'Career & Ambition' },
  { id: 'spiritual', label: 'Spiritual Growth' },
];