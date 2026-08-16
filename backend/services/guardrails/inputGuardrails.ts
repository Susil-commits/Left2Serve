import { GuardrailRule, GuardrailCheckResult } from './guardrailTypes.js';

// Common Prompt Injection & Jailbreak Patterns
const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /disregard\s+(all\s+)?(previous|prior|system)\s+(instructions|rules|prompts)/i,
  /you\s+are\s+now\s+(in\s+)?(developer\s+mode|dan\s+mode|unrestricted|god\s+mode)/i,
  /bypass\s+(all\s+)?(safety|content|security)\s+filters/i,
  /system\s+override/i,
  /reveal\s+(your\s+)?(system\s+prompt|instructions|secret\s+key|api\s+key)/i,
  /print\s+(your\s+)?(system\s+prompt|instructions|initial\s+prompt)/i,
  /act\s+as\s+an\s+unfiltered\s+(ai|assistant|model)/i,
  /simulate\s+(a\s+)?(jailbreak|unrestricted\s+mode)/i,
  /\bDAN\b\s+mode/i,
  /\[system\][\s\S]*?:/i,
  /<\|im_start\|>system/i,
];

export const PromptInjectionGuard: GuardrailRule = {
  name: 'PromptInjectionGuard',
  validate: (text: string): GuardrailCheckResult => {
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(text)) {
        return {
          passed: false,
          category: 'INJECTION',
          reason: 'I cannot process this request because it violates safety and prompt integrity guidelines.',
        };
      }
    }
    return { passed: true, sanitizedText: text };
  },
};

// PII Detection & Anonymization
const PII_RULES = [
  // US SSN
  { regex: /\b\d{3}-\d{2}-\d{4}\b/g, label: '[REDACTED_SSN]' },
  // Credit Card Numbers (13 to 19 digits)
  { regex: /\b(?:\d[ -]*?){13,19}\b/g, label: '[REDACTED_CARD]' },
  // Email Addresses
  { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g, label: '[REDACTED_EMAIL]' },
  // Phone numbers (formats like +1 555-123-4567, (555) 123-4567, 555-123-4567)
  { regex: /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, label: '[REDACTED_PHONE]' },
];

export const PiiMaskingGuard: GuardrailRule = {
  name: 'PiiMaskingGuard',
  validate: (text: string): GuardrailCheckResult => {
    let sanitized = text;
    let modified = false;

    for (const { regex, label } of PII_RULES) {
      if (regex.test(sanitized)) {
        sanitized = sanitized.replace(regex, label);
        modified = true;
      }
    }

    return {
      passed: true,
      category: modified ? 'PII' : undefined,
      sanitizedText: sanitized,
    };
  },
};

// Out-of-Scope / Harmful Topics Guard
const PROHIBITED_TOPICS: { keywords: RegExp[]; reason: string }[] = [
  {
    keywords: [/\b(hack|exploit|ddos|sql\s+injection|malware|ransomware|keylogger)\b/i],
    reason: 'Cybersecurity exploits and malicious tools are prohibited.',
  },
  {
    keywords: [/\b(crypto\s+investment|bitcoin\s+arbitrage|forex\s+signals|get\s+rich\s+quick)\b/i],
    reason: 'Financial and speculative investment advice is out of scope.',
  },
  {
    keywords: [/\b(weapon|bomb\s+making|firearm\s+assembly|explosive\s+recipe)\b/i],
    reason: 'Weapons and dangerous materials are strictly prohibited.',
  },
  {
    keywords: [/\b(poison|toxic\s+food\s+tampering|contaminate\s+water)\b/i],
    reason: 'Harmful instructions and hazardous contamination are prohibited.',
  },
];

export const TopicScopeGuard: GuardrailRule = {
  name: 'TopicScopeGuard',
  validate: (text: string): GuardrailCheckResult => {
    for (const topic of PROHIBITED_TOPICS) {
      for (const kw of topic.keywords) {
        if (kw.test(text)) {
          return {
            passed: false,
            category: 'OUT_OF_SCOPE',
            reason: `I am specialized to assist with food surplus donation, community sharing, food safety, and platform support. ${topic.reason}`,
          };
        }
      }
    }
    return { passed: true, sanitizedText: text };
  },
};

// Sanitization & Input Length Guard
export const InputSanitizationGuard: GuardrailRule = {
  name: 'InputSanitizationGuard',
  validate: (text: string): GuardrailCheckResult => {
    if (!text || typeof text !== 'string') {
      return {
        passed: false,
        category: 'LENGTH_VIOLATION',
        reason: 'Input message cannot be empty.',
      };
    }

    const trimmed = text.trim();
    if (trimmed.length === 0) {
      return {
        passed: false,
        category: 'LENGTH_VIOLATION',
        reason: 'Input message cannot be empty.',
      };
    }

    if (trimmed.length > 2000) {
      return {
        passed: false,
        category: 'LENGTH_VIOLATION',
        reason: 'Message exceeds the maximum allowable length of 2000 characters.',
      };
    }

    // Strip null bytes and dangerous script tags
    const sanitized = trimmed
      .replace(/\0/g, '')
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    return {
      passed: true,
      sanitizedText: sanitized,
    };
  },
};
