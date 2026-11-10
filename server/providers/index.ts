import type { Env } from '../env';
import { anthropicProvider } from './anthropic';
import { geminiProvider } from './gemini';
import { mockProvider } from './mock';
import { openaiProvider } from './openai';
import { ProviderError, type Provider } from './types';

export function getProvider(env: Env): Provider {
  switch ((env.AI_PROVIDER || 'mock').toLowerCase()) {
    case 'anthropic':
      return anthropicProvider(env);
    case 'openai':
      return openaiProvider(env);
    case 'gemini':
      return geminiProvider(env);
    case 'mock':
      return mockProvider();
    default:
      throw new ProviderError(`Unknown AI_PROVIDER "${env.AI_PROVIDER}"`);
  }
}
