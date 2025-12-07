/**
 * Chat validation utilities for SAVR AI Chef
 * Ensures all chat interactions remain food-focused
 */

// ==================== CONSTANTS ====================

export const MAX_MESSAGE_LENGTH = 1000;
export const MIN_MESSAGE_DELAY_MS = 1500; // 1.5 seconds between messages

// ==================== KEYWORD LISTS ====================

/**
 * TIER 1: DEFINITE BLOCKS - Programming & Academic
 * These are 100% off-topic and should be blocked immediately
 */
const PROGRAMMING_KEYWORDS = [
  'python',
  'javascript',
  'java',
  'c++',
  'coding',
  'programming',
  'algorithm',
  'function',
  'variable',
  'debugging',
  'compile',
  'syntax',
  'api',
  'database',
  'sql',
  'html',
  'css',
  'react',
  'node.js',
  'framework',
  'library',
  'package',
  'npm',
  'git',
  'github',
  'stackoverflow',
  'code review',
  'pull request',
  'merge conflict',
  'repository',
  'commit',
  'branch',
  'deployment',
  'server',
  'backend',
  'frontend',
  'fullstack',
] as const;

const ACADEMIC_KEYWORDS = [
  'homework',
  'assignment',
  'essay',
  'dissertation',
  'thesis',
  'exam',
  'test',
  'quiz',
  'math problem',
  'calculus',
  'algebra',
  'physics',
  'chemistry',
  'biology',
  'history',
  'geography',
  'literature',
  'research paper',
  'citation',
  'bibliography',
  'apa format',
  'mla format',
  'solve for x',
  'prove that',
  'equation',
  'formula',
] as const;

/**
 * TIER 2: JAILBREAK PATTERNS
 * Attempts to override system instructions
 */
const JAILBREAK_PATTERNS = [
  'ignore previous instructions',
  'ignore all previous',
  'disregard previous',
  'forget previous instructions',
  'new instructions',
  'system:',
  'assistant:',
  'developer:',
  'admin:',
  'pretend to be',
  'act as if you are',
  'simulate',
  'you are now',
  'from now on',
  'bypass your',
  'override your',
  'as a large language model',
  'as an ai language model',
  'you are not savr',
  'you are actually',
  'do anything now',
  'dan mode',
  'jailbreak',
  'hack',
  'exploit',
  'vulnerability',
  'give me code',
  'write code for',
  'generate code',
] as const;

/**
 * TIER 3: POTENTIALLY HARMFUL CONTENT
 * Safety-critical keywords
 */
const HARMFUL_KEYWORDS = [
  'how to make a bomb',
  'how to make drugs',
  'how to hack',
  'illegal',
  'weapons',
  'violence',
  'self-harm',
  'suicide',
  'kill',
  'murder',
  'terrorist',
  'scam',
  'fraud',
  'counterfeit',
  'piracy',
  'copyright infringement',
  'explicit content',
  'nsfw',
  'pornography',
] as const;

/**
 * TIER 4: OTHER OFF-TOPIC DOMAINS
 * Financial, legal, medical advice requests
 */
const OFF_TOPIC_DOMAINS = [
  'legal advice',
  'lawsuit',
  'attorney',
  'lawyer',
  'contract',
  'sue',
  'court case',
  'medical diagnosis',
  'am i sick',
  'what disease',
  'prescribe',
  'medication',
  'cure for',
  'treatment for',
  'stock market',
  'invest in',
  'cryptocurrency',
  'bitcoin',
  'trading',
  'mortgage',
  'loan',
  'tax advice',
  'political opinion',
  'vote for',
  'election',
  'government policy',
] as const;

/**
 * FALSE POSITIVE ALLOWLIST
 * Food-related words that might contain blocked keywords
 */
const FOOD_RELATED_EXCEPTIONS = [
  'barcode',           // contains "code" but refers to grocery scanning
  'cod',               // fish
  'coddle',            // egg cooking method
  'java coffee',       // coffee reference
  'javascript plum',   // obscure fruit variety (edge case)
  'coding eggs',       // could mean "coddling eggs"
  'api pepper',        // Peruvian pepper variety
  'compile ingredients', // valid cooking term
  'test kitchen',      // valid cooking reference
  'recipe development', // contains "development" but food-related
] as const;

// ==================== VALIDATION TYPES ====================

export type ValidationResult = {
  isValid: boolean;
  reason?: 'off_topic' | 'jailbreak' | 'harmful' | 'too_long' | 'empty';
  message?: string;
  blockedKeywords?: string[];
};

// ==================== CORE VALIDATION FUNCTIONS ====================

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Smart word boundary detection
 * Ensures "code" doesn't match in "barcode" but does match "write code"
 */
function containsWholeWord(text: string, keyword: string): boolean {
  // Convert to lowercase for case-insensitive matching
  const lowerText = text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();

  // Check for exact word boundaries using regex
  const wordBoundaryPattern = new RegExp(`\\b${escapeRegex(lowerKeyword)}\\b`, 'i');
  return wordBoundaryPattern.test(lowerText);
}

/**
 * Check if text contains exceptions that should bypass keyword blocking
 */
function containsFoodException(text: string): boolean {
  const lowerText = text.toLowerCase();
  return FOOD_RELATED_EXCEPTIONS.some(exception =>
    lowerText.includes(exception.toLowerCase())
  );
}

/**
 * Detect programming-related content
 */
function detectProgrammingContent(text: string): string[] {
  const detected: string[] = [];

  for (const keyword of PROGRAMMING_KEYWORDS) {
    if (containsWholeWord(text, keyword)) {
      // Check if this is a false positive
      if (!containsFoodException(text)) {
        detected.push(keyword);
      }
    }
  }

  return detected;
}

/**
 * Detect academic content
 */
function detectAcademicContent(text: string): string[] {
  const detected: string[] = [];

  for (const keyword of ACADEMIC_KEYWORDS) {
    if (containsWholeWord(text, keyword)) {
      detected.push(keyword);
    }
  }

  return detected;
}

/**
 * Detect jailbreak attempts
 */
function detectJailbreakAttempts(text: string): string[] {
  const detected: string[] = [];
  const lowerText = text.toLowerCase();

  for (const pattern of JAILBREAK_PATTERNS) {
    if (lowerText.includes(pattern)) {
      detected.push(pattern);
    }
  }

  return detected;
}

/**
 * Detect harmful content
 */
function detectHarmfulContent(text: string): string[] {
  const detected: string[] = [];
  const lowerText = text.toLowerCase();

  for (const keyword of HARMFUL_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      detected.push(keyword);
    }
  }

  return detected;
}

/**
 * Detect off-topic domains
 */
function detectOffTopicDomains(text: string): string[] {
  const detected: string[] = [];
  const lowerText = text.toLowerCase();

  for (const keyword of OFF_TOPIC_DOMAINS) {
    if (lowerText.includes(keyword)) {
      detected.push(keyword);
    }
  }

  return detected;
}

// ==================== MAIN VALIDATION FUNCTION ====================

/**
 * Validate chat message for food-related content
 *
 * @param message - User's message to validate
 * @returns ValidationResult with isValid flag and optional error details
 */
export function validateChatMessage(message: string): ValidationResult {
  // 1. Check for empty message
  const trimmed = message.trim();
  if (!trimmed) {
    return {
      isValid: false,
      reason: 'empty',
      message: 'Please enter a message',
    };
  }

  // 2. Check character limit
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return {
      isValid: false,
      reason: 'too_long',
      message: `Message too long. Please keep it under ${MAX_MESSAGE_LENGTH} characters.`,
    };
  }

  // 3. Check for harmful content (HIGHEST PRIORITY)
  const harmfulKeywords = detectHarmfulContent(trimmed);
  if (harmfulKeywords.length > 0) {
    return {
      isValid: false,
      reason: 'harmful',
      message: 'I can only help with food, recipes, and meal planning. Please ask something food-related!',
      blockedKeywords: harmfulKeywords,
    };
  }

  // 4. Check for jailbreak attempts
  const jailbreakPatterns = detectJailbreakAttempts(trimmed);
  if (jailbreakPatterns.length > 0) {
    return {
      isValid: false,
      reason: 'jailbreak',
      message: 'I\'m SAVR AI Chef and I can only help with meals, recipes, and cooking. Try asking something food-related!',
      blockedKeywords: jailbreakPatterns,
    };
  }

  // 5. Check for programming content
  const programmingKeywords = detectProgrammingContent(trimmed);
  if (programmingKeywords.length >= 2) {
    // Require at least 2 programming keywords to reduce false positives
    return {
      isValid: false,
      reason: 'off_topic',
      message: 'I can only assist with food, recipes, groceries, and meal planning. Please ask something food-related!',
      blockedKeywords: programmingKeywords,
    };
  }

  // 6. Check for academic content
  const academicKeywords = detectAcademicContent(trimmed);
  if (academicKeywords.length >= 2) {
    // Require at least 2 academic keywords to reduce false positives
    return {
      isValid: false,
      reason: 'off_topic',
      message: 'I can only help with meals, recipes, and cooking. Please ask something food-related!',
      blockedKeywords: academicKeywords,
    };
  }

  // 7. Check for other off-topic domains
  const offTopicKeywords = detectOffTopicDomains(trimmed);
  if (offTopicKeywords.length >= 1) {
    // Stricter for legal/medical/financial advice
    return {
      isValid: false,
      reason: 'off_topic',
      message: 'I\'m SAVR AI Chef and I specialize in meals, recipes, and food planning. Please ask something food-related!',
      blockedKeywords: offTopicKeywords,
    };
  }

  // 8. All checks passed - message is valid
  return {
    isValid: true,
  };
}

/**
 * Get character count with visual indicator
 * @returns Object with count, limit, isNearLimit, isOverLimit
 */
export function getCharacterCount(message: string) {
  const count = message.length;
  const limit = MAX_MESSAGE_LENGTH;
  const isNearLimit = count > limit * 0.8; // 80% threshold
  const isOverLimit = count > limit;

  return {
    count,
    limit,
    isNearLimit,
    isOverLimit,
    remaining: limit - count,
  };
}
