export type Part = { type: 'text'; text: string } | { type: 'image'; data: string };

export interface JsonRequest {
  /** Which pipeline step is calling, so providers can pick a model per step. */
  step: 'observe' | 'interpret';
  system: string;
  parts: Part[];
  schema: Record<string, unknown>;
  schemaName: string;
  maxTokens: number;
}

export interface Provider {
  name: string;
  generateJson<T>(req: JsonRequest): Promise<T>;
}

export class ProviderError extends Error {}
