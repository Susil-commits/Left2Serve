export type GuardrailCategory =
  | 'INJECTION'
  | 'PII'
  | 'OUT_OF_SCOPE'
  | 'TOXICITY'
  | 'SECRET_LEAK'
  | 'LENGTH_VIOLATION';

export interface GuardrailCheckResult {
  passed: boolean;
  category?: GuardrailCategory;
  reason?: string;
  sanitizedText?: string;
}

export interface GuardrailRule {
  name: string;
  validate: (
    text: string,
    context?: Record<string, unknown>
  ) => Promise<GuardrailCheckResult> | GuardrailCheckResult;
}

export interface ChatMessage {
  role: 'user' | 'model' | 'assistant' | 'system';
  text: string;
}

export interface GuardedChatResponse {
  text: string;
  guardrailTriggered: boolean;
  category?: GuardrailCategory;
  reason?: string;
  sanitized?: boolean;
}
