import OpenAI from 'openai';
import type { Env } from '../env';
import { ProviderError, type JsonRequest, type Provider } from './types';

export function openaiProvider(env: Env): Provider {
  if (!env.OPENAI_API_KEY) throw new ProviderError('OPENAI_API_KEY is not set');
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  return {
    name: 'openai',
    async generateJson<T>(req: JsonRequest): Promise<T> {
      const model = req.step === 'observe' ? env.OBSERVE_MODEL : env.INTERPRET_MODEL;
      if (!model) throw new ProviderError('Set OBSERVE_MODEL and INTERPRET_MODEL for the OpenAI provider');

      const response = await client.responses.create({
        model,
        instructions: req.system,
        max_output_tokens: req.maxTokens,
        input: [
          {
            role: 'user',
            content: req.parts.map((p) =>
              p.type === 'text'
                ? { type: 'input_text' as const, text: p.text }
                : { type: 'input_image' as const, image_url: `data:image/jpeg;base64,${p.data}`, detail: 'high' as const },
            ),
          },
        ],
        text: { format: { type: 'json_schema', name: req.schemaName, schema: req.schema, strict: true } },
      });
      if (response.status === 'incomplete') throw new ProviderError(`Incomplete response: ${response.incomplete_details?.reason}`);
      return JSON.parse(response.output_text) as T;
    },
  };
}
