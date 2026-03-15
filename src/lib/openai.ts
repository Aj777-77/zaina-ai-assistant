import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

/**
 * Initialize OpenAI client
 * Uses environment variables for configuration
 */
export function initializeOpenAI(): OpenAI {
  // Return existing client if already initialized
  if (openaiClient) {
    return openaiClient;
  }

  // Validate API key
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    throw new Error(
      'Missing OpenAI API key. Please check your .env.local file.\n' +
      'Required: OPENAI_API_KEY\n' +
      'Get your API key from: https://platform.openai.com/api-keys'
    );
  }

  // Initialize OpenAI client
  openaiClient = new OpenAI({
    apiKey: apiKey,
  });

  console.log('✅ OpenAI client initialized successfully');

  return openaiClient;
}

/**
 * Get OpenAI client instance
 * Initializes OpenAI if not already initialized
 */
export function getOpenAI(): OpenAI {
  if (!openaiClient) {
    return initializeOpenAI();
  }
  return openaiClient;
}

/**
 * Create a chat completion with streaming support
 * @param messages - Array of chat messages
 * @param model - OpenAI model to use (default: gpt-4)
 * @param temperature - Creativity level 0-2 (default: 0.7)
 */
export async function createChatCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  model: string = 'gpt-4',
  temperature: number = 0.7
) {
  const client = getOpenAI();

  const response = await client.chat.completions.create({
    model,
    messages,
    temperature,
  });

  return response;
}

/**
 * Create a streaming chat completion
 * @param messages - Array of chat messages
 * @param model - OpenAI model to use (default: gpt-4)
 * @param temperature - Creativity level 0-2 (default: 0.7)
 */
export async function createStreamingChatCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  model: string = 'gpt-4',
  temperature: number = 0.7
) {
  const client = getOpenAI();

  const stream = await client.chat.completions.create({
    model,
    messages,
    temperature,
    stream: true,
  });

  return stream;
}

/**
 * Generate an embedding for text
 * @param text - Text to generate embedding for
 * @param model - Embedding model to use (default: text-embedding-3-small)
 */
export async function createEmbedding(
  text: string,
  model: string = 'text-embedding-3-small'
) {
  const client = getOpenAI();

  const response = await client.embeddings.create({
    model,
    input: text,
  });

  return response.data[0].embedding;
}

// Export the client getter
export { openaiClient };
