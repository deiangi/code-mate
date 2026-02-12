/**
 * Post-Processor System for Code Mate
 * Handles response transformation pipelines for model outputs
 */

/**
 * Types of post-processors supported
 */
export type PostProcessorType = 'regex-replace' | 'add-prefix' | 'add-suffix';

/**
 * A single post-processor rule
 */
export interface PostProcessor {
  id: string;
  name: string;
  description?: string;
  type: PostProcessorType;
  enabled: boolean;
  
  // regex-replace specific
  pattern?: string;     // regex pattern to match
  replacement?: string; // replacement string
  
  // add-prefix specific
  prefix?: string;
  
  // add-suffix specific
  suffix?: string;
  
  createdAt: string;
  updatedAt: string;
}

/**
 * A collection of post-processors
 */
export interface PostProcessorProfile {
  id: string;
  name: string;
  description?: string;
  postProcessorIds: string[]; // ordered list of processor IDs
  createdAt: string;
  updatedAt: string;
}

/**
 * Executes a post-processor on text
 * @param processor The processor to execute
 * @param text Input text
 * @returns Processed text
 */
export function executePostProcessor(processor: PostProcessor, text: string): string {
  if (!processor.enabled) {
    return text;
  }

  try {
    switch (processor.type) {
      case 'regex-replace':
        if (!processor.pattern) {
          return text;
        }
        try {
          const regex = new RegExp(processor.pattern, 'g');
          return text.replace(regex, processor.replacement || '');
        } catch (e) {
          console.error(`Invalid regex in processor "${processor.name}":`, processor.pattern);
          return text;
        }

      case 'add-prefix':
        if (!processor.prefix) {
          return text;
        }
        return processor.prefix + text;

      case 'add-suffix':
        if (!processor.suffix) {
          return text;
        }
        return text + processor.suffix;

      default:
        return text;
    }
  } catch (error) {
    console.error(`Error executing post-processor "${processor.name}":`, error);
    return text;
  }
}

/**
 * Executes a profile (sequence of processors) on text
 * @param profile The profile containing processors
 * @param processors Map of all available processors
 * @param text Input text
 * @returns Processed text
 */
export function executeProfile(
  profile: PostProcessorProfile,
  processors: Map<string, PostProcessor>,
  text: string
): string {
  let result = text;

  for (const processorId of profile.postProcessorIds) {
    const processor = processors.get(processorId);
    if (processor) {
      result = executePostProcessor(processor, result);
    }
  }

  return result;
}

/**
 * Generates next unique ID
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Validates a post-processor
 */
export function validatePostProcessor(processor: Partial<PostProcessor>): string | null {
  if (!processor.name || !processor.name.trim()) {
    return 'Name is required';
  }

  if (!processor.type) {
    return 'Type is required';
  }

  switch (processor.type) {
    case 'regex-replace':
      if (!processor.pattern || !processor.pattern.trim()) {
        return 'Pattern is required for regex-replace';
      }
      try {
        new RegExp(processor.pattern, 'g');
      } catch (e) {
        return `Invalid regex pattern: ${(e as Error).message}`;
      }
      break;

    case 'add-prefix':
      if (processor.prefix === undefined || processor.prefix === null) {
        return 'Prefix is required for add-prefix';
      }
      break;

    case 'add-suffix':
      if (processor.suffix === undefined || processor.suffix === null) {
        return 'Suffix is required for add-suffix';
      }
      break;
  }

  return null;
}

/**
 * Validates a profile
 */
export function validatePostProcessorProfile(profile: Partial<PostProcessorProfile>): string | null {
  if (!profile.name || !profile.name.trim()) {
    return 'Profile name is required';
  }

  if (!Array.isArray(profile.postProcessorIds)) {
    return 'Processor list is invalid';
  }

  return null;
}
