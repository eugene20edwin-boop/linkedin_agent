import { env, requiredEnv } from './env.js';

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`Gemini did not return JSON. Response: ${text}`);
  }

  return JSON.parse(candidate.slice(start, end + 1));
}

export async function generateLinkedInPost(topic) {
  const apiKey = requiredEnv('GEMINI_API_KEY');
  const model = env('GEMINI_MODEL', 'gemini-2.5-flash');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const steering = topic.context ? `\nSteering context: ${topic.context}` : '';

  const prompt = `Write one original LinkedIn post for Digital Scholar.

Topic: ${topic.title}${steering}

Requirements:
- Sound useful, credible, and human.
- Avoid hype, clickbait, generic AI jargon, and fake statistics.
- Use 120-180 words.
- Start with a strong practical hook.
- Include 3-5 short paragraphs.
- End with a thoughtful question.
- Include 3-5 relevant hashtags.
- Return only JSON with keys "post", "bannerTitle", and "bannerSubtitle".
- "bannerTitle" must be 3-7 words.
- "bannerSubtitle" must be 5-11 words.`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.85,
        responseMimeType: 'application/json'
      }
    })
  });

  const body = await response.text();

  if (!response.ok) {
    throw new Error(`Gemini request failed (${response.status}): ${body}`);
  }

  const data = JSON.parse(body);
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text).join('\n')?.trim();

  if (!text) {
    throw new Error(`Gemini returned no text: ${body}`);
  }

  const result = extractJson(text);

  if (!result.post || !result.bannerTitle || !result.bannerSubtitle) {
    throw new Error(`Gemini JSON is missing required keys: ${text}`);
  }

  return {
    post: String(result.post).trim(),
    bannerTitle: String(result.bannerTitle).trim(),
    bannerSubtitle: String(result.bannerSubtitle).trim()
  };
}
