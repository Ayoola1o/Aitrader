// LLMModerator is now a pass-through to aiProviderManager.generateStructuredDecision
// The full LLM logic lives in src/lib/llm/providers.ts
// This file is kept for backward-compatibility imports

export { aiProviderManager as llmModerator } from './providers';
