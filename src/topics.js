import { readFileSync } from 'node:fs';

export function parseTopicLine(line) {
  const [title, ...contextParts] = line.split('::');

  return {
    raw: line,
    title: title.trim(),
    context: contextParts.join('::').trim()
  };
}

export function loadTopics(path = 'topics.txt') {
  const content = readFileSync(path, 'utf8');

  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map(parseTopicLine);
}

export function chooseTopic({ override, topics }) {
  if (override?.trim()) {
    return parseTopicLine(override.trim());
  }

  if (!topics.length) {
    throw new Error('No topics found in topics.txt');
  }

  const index = Math.floor(Math.random() * topics.length);
  return topics[index];
}
