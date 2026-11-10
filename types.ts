
export type ReadingTypeId = 'dominant' | 'non_dominant' | 'both' | 'couples' | 'love_future' | 'career_path';

export interface ReadingTypeOption {
  id: ReadingTypeId;
  title: string;
  description: string;
  imageSrc: string;
  requiredImages: string[];
}

export type FocusAreaId = 'career' | 'love' | 'spiritual' | 'general';

export interface FocusAreaOption {
  id: FocusAreaId;
  // Added missing label property to resolve constants.ts errors
  label: string;
}

export interface UploadedImages {
  [key: string]: string; // key -> base64 string
}

export interface ReadingSection {
  title: string;
  content: string; // Markdown formatted content
}

export interface PartnerDetails {
  name: string;
  age?: string;
  pronouns?: string;
}

export interface PalmReadingResult {
  result_summary: string;
  sections: ReadingSection[];
  mantra?: string; // Specific to dominant hand reading
  integration_prompt?: string; // Specific to non-dominant
}

export enum AppState {
  CREATE = 'CREATE',
  LOADING = 'LOADING',
  RESULT = 'RESULT',
  ERROR = 'ERROR',
}
