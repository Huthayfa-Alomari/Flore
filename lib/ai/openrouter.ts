// Unified AI Provider via OpenRouter
// Supports: Claude, GPT-4, Gemini, and more

import { conciergeSystemPrompt } from './prompts'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

export async function chatWithAI(messages: { role: string; content: string }[]) {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://flore.jo',
      'X-Title': 'FLORÉ Luxury',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-3.5-sonnet',
      messages: [{ role: 'system', content: conciergeSystemPrompt }, ...messages],
      max_tokens: 500,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenRouter error: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || 'عذراً، لم أفهم سؤالك.'
}
