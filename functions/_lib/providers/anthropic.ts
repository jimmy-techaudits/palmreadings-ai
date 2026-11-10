import Anthropic from '@anthropic-ai/sdk';
import type { Env } from '../env';
import { ProviderError, type JsonRequest, type Provider } from './types';

const DEFAULT_MODEL = 'claude-opus-5-5';

export function anthropicProvider(env: Env): Provider {
  if (!env.ANTHROPIC_API_KEY) throw new ProviderError('ANTHROPIC_API_KEY is not set');
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  return {
    name: 'anthropic',
    async generateJson<T>(req: JsonRequest): Promise<T> {
      const model = (req.step === 'observe' ? env.OBSERVE_MODEL : env.INTERPRET_MODEL) || DEFAULT_MODEL;
      const content: Anthropic.Beta.BetaContentBlockParam[] = req.parts.map((p) =>
        p.type === 'text'
          ? { type: 'text', text: p.text }
          : { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: p.data } },
      );

      // Streaming avoids HTTP timeouts on long outputs. Server-side fallbacks re-run a
      // request on another model if a safety classifier declines it.
      const stream = client.beta.messages.stream({
        model,
        max_tokens: req.maxTokens,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: req.system,
        output_config: {
          effort: req.step === 'observe' ? 'high' : 'medium',
          format: { type: 'json_schema', schema: req.schema },
        },
        messages: [{ role: 'user', content }],
      });
      const message = await stream.finalMessage();

      if (message.stop_reason === 'refusal') throw new ProviderError('The model declined this request');
      if (message.stop_reason === 'max_tokens') throw new ProviderError('The model ran out of output tokens');
      const text = message.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
      return JSON.parse(text) as T;
    },
  };
}
