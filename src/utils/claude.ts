import type { Recommendation } from '../types/index';

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeResponse {
  content: Array<{
    type: 'thinking' | 'text';
    text?: string;
    thinking?: string;
  }>;
}

function buildPrompt(recommendation: Recommendation): string {
  let description = '';

  if (recommendation.type === 'song') {
    description = recommendation.artistName
      ? `"${recommendation.name}" by ${recommendation.artistName}`
      : `"${recommendation.name}"`;
  } else if (recommendation.type === 'album') {
    description = recommendation.artistName
      ? `the album "${recommendation.name}" by ${recommendation.artistName}`
      : `the album "${recommendation.name}"`;
  } else if (recommendation.type === 'artist') {
    description = `music by ${recommendation.name}`;
  } else if (recommendation.noteText) {
    description = `"${recommendation.noteText}"`;
  } else if (recommendation.name) {
    description = recommendation.artistName
      ? `"${recommendation.name}" by ${recommendation.artistName}`
      : `"${recommendation.name}"`;
  } else {
    description = 'this music recommendation';
  }

  let prompt = `I'm listening to ${description}. Can you give me some recommendations on what I should be listening for?`;

  if (recommendation.type === 'album') {
    prompt += ' Please go into specific tracks on the album and what makes each one notable.';
  }

  prompt += '\n\nPlease provide a concise but insightful paragraph (2-4 sentences) that helps me appreciate and understand what I\'m listening to. Focus on musical elements, historical context, or emotional qualities that make this music special.';

  return prompt;
}

export async function generateListeningGuide(recommendation: Recommendation): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('Anthropic API key not configured. Please add VITE_ANTHROPIC_API_KEY to your .env file.');
  }

  const prompt = buildPrompt(recommendation);

  const messages: ClaudeMessage[] = [
    { role: 'user', content: prompt }
  ];

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 16000,
      thinking: {
        type: 'enabled',
        budget_tokens: 10000,
      },
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${errorText}`);
  }

  const data: ClaudeResponse = await response.json();

  // Extract the text content (not the thinking content)
  const textContent = data.content.find(block => block.type === 'text');

  if (!textContent?.text) {
    throw new Error('No text response from Claude');
  }

  return textContent.text;
}
