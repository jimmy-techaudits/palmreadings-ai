import { GoogleGenAI } from '@google/genai';
import type { Env } from '../env';
import { ProviderError, type JsonRequest, type Provider } from './types';

export function geminiProvider(env: Env): Provider {
  if (!env.GEMINI_API_KEY) throw new ProviderError('GEMINI_API_KEY is not set');
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

  return {
    name: 'gemini',
    async generateJson<T>(req: JsonRequest): Promise<T> {
      const model = req.step === 'observe' ? env.OBSERVE_MODEL : env.INTERPRET_MODEL;
      if (!model) throw new ProviderError('Set OBSERVE_MODEL and INTERPRET_MODEL for the Gemini provider');

      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: req.parts.map((p) =>
              p.type === 'text' ? { text: p.text } : { inlineData: { mimeType: 'image/jpeg', data: p.data } },
            ),
          },
        ],
        config: {
          systemInstruction: req.system,
          maxOutputTokens: req.maxTokens,
          responseMimeType: 'application/json',
          responseJsonSchema: req.schema,
        },
      });
      if (!response.text) throw new ProviderError('Empty response from Gemini');
      return JSON.parse(response.text) as T;
    },
  };
}
