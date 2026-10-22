import { GuardrailRule, GuardrailCheckResult } from './guardrailTypes.js';

// Detect accidental leakage of secrets, credentials, and API keys
const SECRET_LEAK_PATTERNS: { regex: RegExp; label: string }[] = [
  { regex: /\bAQ\.[A-Za-z0-9-_]{30,}\b/g, label: 'Gemini API Key' },
  { regex: /\bAIza[0-9A-Za-z-_]{35}\b/g, label: 'Google API Key' },
  { regex: /\beyJ[A-Za-z0-9-_]{20,}\.eyJ[A-Za-z0-9-_]{20,}\.[A-Za-z0-9-_]{20,}\b/g, label: 'JWT Token' },
  { regex: /\bsk-[A-Za-z0-9-_]{20,}\b/g, label: 'Secret Key' },
  { regex: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g, label: 'Private Key' },
  { regex: /mongodb(?:\+srv)?:\/\/[^\s]+/gi, label: 'Database Connection String' },
  { regex: /postgres(?:\+pool)?:\/\/[^\s]+/gi, label: 'Database Connection String' },
];

export const SecretLeakageGuard: GuardrailRule = {
  name: 'SecretLeakageGuard',
  validate: (text: string): GuardrailCheckResult => {
    for (const { regex, label } of SECRET_LEAK_PATTERNS) {
      if (regex.test(text)) {
        return {
          passed: false,
          category: 'SECRET_LEAK',
          reason: `Output contained protected credentials (${label}). Response suppressed for security.`,
          sanitizedText: 'I apologize, but this response cannot be displayed due to security and privacy policies.',
        };
      }
    }
    return { passed: true, sanitizedText: text };
  },
};

// Toxic / Profanity Output Filter
const PROFANITY_PATTERN = /\b(fuck|shit|bitch|asshole|cunt|dickhead|motherfucker)\b/i;

export const OutputToxicityGuard: GuardrailRule = {
  name: 'OutputToxicityGuard',
  validate: (text: string): GuardrailCheckResult => {
    if (PROFANITY_PATTERN.test(text)) {
      return {
        passed: false,
        category: 'TOXICITY',
        reason: 'Generated content contained inappropriate language.',
        sanitizedText: 'I am designed to communicate politely and constructively. Please ask another question related to food donation.',
      };
    }
    return { passed: true, sanitizedText: text };
  },
};
