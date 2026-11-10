
// Always use GoogleGenAI from @google/genai and Type for schemas
import { GoogleGenAI, Type } from "@google/genai";
import { PalmReadingResult, ReadingTypeId, UploadedImages, PartnerDetails } from "../types";

const getSystemInstruction = (type: ReadingTypeId, partners?: { partnerA: PartnerDetails, partnerB: PartnerDetails }) => {
  const base = "You are a world-class palmist. Use Markdown for content. Be specific, psychological, and encouraging. Avoid vague genericities. When asked for bullet highlights, ensure EVERY item starts with a '-' character.";
  
  let pronounInstructions = "Always use neutral 'they/them' pronouns unless specific preferences are provided.";
  if (partners) {
    const pA = partners.partnerA;
    const pB = partners.partnerB;
    pronounInstructions = `Strictly adhere to these pronoun preferences: For ${pA.name}, use '${pA.pronouns || 'they/them'}'. For ${pB.name}, use '${pB.pronouns || 'they/them'}'. **Crucially, do NOT include the pronouns in parentheses next to their names (e.g., avoid writing 'Name (they/them)'). Simply use the correct pronouns naturally within your descriptive sentences.**`;
  }

  const typeSpecifics = {
    dominant: "Focus on the active life, current decisions, and momentum. The tone is practical and decision-oriented.",
    non_dominant: "Focus on the inner self, emotional blueprint, and childhood imprints. The tone is healing and deeply psychological.",
    both: "Focus on comparison and alignment. Contrast the inner needs with outer actions. The tone is diagnostic and roadmap-oriented.",
    love_future: "Focus on romantic potential, attachment styles, and partnership timelines. The tone is warm, insightful, and visionary.",
    career_path: "Focus on professional strengths, work habits, ambition, and potential career shifts. The tone is strategic and motivational.",
    couples: `Focus on compatibility, conflict cycles, and repair. Be neutral and fair to both partners. The tone is relationship-coaching. ${partners ? `The partners are ${partners.partnerA.name} ${partners.partnerA.age ? `(Age: ${partners.partnerA.age})` : ''} and ${partners.partnerB.name} ${partners.partnerB.age ? `(Age: ${partners.partnerB.age})` : ''}. Use these names in the section titles and content.` : ""}`
  };

  return `${base} ${pronounInstructions} ${typeSpecifics[type]}`;
};

// Use any or Type for schema definition as per guidelines
const getResponseSchema = (): any => ({
  type: Type.OBJECT,
  properties: {
    result_summary: {
      type: Type.STRING,
      description: "A profound opening paragraph summarizing the soul of the reading.",
    },
    sections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          content: { type: Type.STRING, description: "Detailed Markdown content for this section. If it's a list, use '-' for every item." },
        },
        required: ["title", "content"],
      },
    },
  },
  required: ["result_summary", "sections"],
});

// Use any or Type for schema definition as per guidelines
const getValidationSchema = (): any => ({
  type: Type.OBJECT,
  properties: {
    validations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          key: { type: Type.STRING, description: "The unique key of the image being validated." },
          isValid: { type: Type.BOOLEAN, description: "True if the image is a clear, identifiable palm suitable for reading." },
          reason: { type: Type.STRING, description: "Brief explanation if invalid (e.g., 'Too blurry', 'Not a hand')." }
        },
        required: ["key", "isValid", "reason"]
      }
    }
  },
  required: ["validations"]
});

export const validateHandImages = async (
  images: UploadedImages
): Promise<{ key: string; isValid: boolean; reason: string }[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("Missing Gemini API Key");

  // Create GoogleGenAI instance with named parameters
  const ai = new GoogleGenAI({ apiKey });
  
  const parts: any[] = [{ text: "Evaluate each of the following images. Determine if each one is a clear, well-lit photo of a human palm or a side-view of a hand suitable for palmistry. For each image, provide its key and a boolean 'isValid'. If not valid, provide a short reason. Image keys ending in '_side' are pinky-side profiles of the hand." }];
  
  Object.entries(images).forEach(([key, base64String]) => {
    const cleanBase64 = base64String.split(',')[1] || base64String;
    parts.push({ text: `Image Key: ${key}` });
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: cleanBase64,
      },
    });
  });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: getValidationSchema(),
      },
    });

    // Extract text from GenerateContentResponse using .text property
    const data = JSON.parse(response.text || "{}");
    return data.validations || [];
  } catch (error) {
    console.error("Validation Error:", error);
    throw error;
  }
};

export const generatePalmReading = async (
  readingType: ReadingTypeId,
  images: UploadedImages,
  partners?: { partnerA: PartnerDetails, partnerB: PartnerDetails }
): Promise<PalmReadingResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("Missing Gemini API Key");

  // Create GoogleGenAI instance with named parameters
  const ai = new GoogleGenAI({ apiKey });

  const typePrompts: Record<ReadingTypeId, string> = {
    dominant: `
      Structure the reading with EXACTLY these sections in order:
      - Snapshot Summary (Exactly 5 bullet points, each starting with '-')
      - Core Personality in Motion
      - Love Style Right Now
      - Career and Money Pattern
      - Your Current Energy and Stress Signals
      - Key Markers Influencing Current Direction (Line analysis)
      - Next 14 Days Action Plan
      - Your Mantra
    `,
    non_dominant: `
      Structure the reading with EXACTLY these sections in order:
      - Inner Self Summary (Exactly 5 bullet points, each starting with '-')
      - Origin Story Themes
      - Attachment and Trust Pattern
      - Intuition and Sensitivity
      - Shadow Pattern and Healing Path
      - Inner Blueprint Markers (Line analysis)
      - Reparenting Toolkit
      - Reflection Question
    `,
    love_future: `
      Structure the reading with EXACTLY these sections in order:
      - Love & Future Overview (Exactly 5 bullet points, each starting with '-')
      - Your Romantic Timeline Pattern
      - Commitment & Partnership Signals
      - Emotional Readiness & Blockers
      - Family & Children Indicators (Include specific indicators for marriage and children based on lines. END this section with exactly this format on separate lines: "COUNT_CHILDREN: [number/range]" and "COUNT_MARRIAGES: [number/range]")
      - The Next Chapter in Love
      - Love & Destiny Markers Observed (Line analysis)
      - Guidance for the Path Ahead
    `,
    career_path: `
      Structure the reading with EXACTLY these sections in order:
      - Career Path Overview (Exactly 5 bullet points, each starting with '-')
      - Your Natural Work Style
      - Motivation, Drive, & Ambition Patterns
      - Decision-Making & Risk Tolerance
      - Success Blockers
      - Career Markers Observed (Line analysis)
      - Near-Term Career Focus
      - Guidance for Forward Momentum
    `,
    both: `
      Structure the reading with EXACTLY these sections in order:
      - At-a-Glance Comparison (Bullets for highlights)
      - The You vs. The You
      - Tension Points
      - Your Evolution Path
      - Love: Needs vs Behaviors
      - Career: Calling vs Practical Path
      - Differences & Alignments Observed (Line analysis)
      - Alignment Plan
      - Reflection Prompt
    `,
    couples: `
      Structure the reading with EXACTLY these sections in order:
      - Compatibility Overview (Bullets for key synergies)
      - ${partners?.partnerA.name || 'Partner A'}: Needs & Patterns
      - ${partners?.partnerB.name || 'Partner B'}: Needs & Patterns
      - The Dynamic Between ${partners?.partnerA.name || 'Partner A'} and ${partners?.partnerB.name || 'Partner B'}
      - Communication Translation Guide
      - Intimacy and Affection Map
      - Long-Term Potential Markers
      - Two-Week Relationship Challenge
      - Compatibility Markers Observed (Line analysis)
    `
  };

  const partnerContext = partners ? `
    Context for reading:
    Partner A: Name: ${partners.partnerA.name}, Age: ${partners.partnerA.age || 'Unknown'}, Pronouns: ${partners.partnerA.pronouns || 'they/them'}.
    Partner B: Name: ${partners.partnerB.name}, Age: ${partners.partnerB.age || 'Unknown'}, Pronouns: ${partners.partnerB.pronouns || 'they/them'}.
  ` : "";

  const promptText = `
    Perform a professional palm reading.
    Reading Type: ${readingType}
    ${partnerContext}
    
    ${typePrompts[readingType]}

    Analyze the attached hand images for lines, mounts, and textures. 
    NOTE: Some images might be 'pinky side views' (keys ending in _side). Use these profiles to better judge line depth and curvature of the palm edge.
  `;

  const parts: any[] = [{ text: promptText }];
  Object.entries(images).forEach(([key, base64String]) => {
    const cleanBase64 = base64String.split(',')[1] || base64String;
    parts.push({ text: `Image Label/Key: ${key}` });
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: cleanBase64,
      },
    });
  });

  try {
    // Upgraded to gemini-3-pro-preview for complex reasoning task as per guidelines
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: { parts },
      config: {
        systemInstruction: getSystemInstruction(readingType, partners),
        responseMimeType: "application/json",
        responseSchema: getResponseSchema(),
      },
    });

    // Extract text from GenerateContentResponse using .text property
    const text = response.text;
    if (!text) throw new Error("No response from Gemini.");
    return JSON.parse(text) as PalmReadingResult;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
