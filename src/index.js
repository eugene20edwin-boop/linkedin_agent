import { writeFile } from 'node:fs/promises';
import { loadEnvFile } from './env.js';
import { renderBanner } from './banner.js';
import { generateLinkedInPost } from './gemini.js';
import { publishPost, resolveAuthorUrn, uploadImage } from './linkedin.js';
import { chooseTopic, loadTopics } from './topics.js';

loadEnvFile();

const mode = process.argv[2] || 'preview';

if (!['preview', 'post'].includes(mode)) {
  throw new Error(`Unknown mode "${mode}". Use "preview" or "post".`);
}

const topic = chooseTopic({
  override: process.env.TOPIC,
  topics: loadTopics()
});

console.log(`Selected topic: ${topic.title}`);

const generated = await generateLinkedInPost(topic);
const bannerPath = mode === 'preview' ? 'preview-banner.png' : 'linkedin-banner.png';
const postPath = mode === 'preview' ? 'preview-post.txt' : 'linkedin-post.txt';

await renderBanner({
  title: generated.bannerTitle,
  subtitle: generated.bannerSubtitle,
  topic: topic.title
}, bannerPath);

await writeFile(postPath, `${generated.post}\n`);

console.log(`Wrote ${bannerPath}`);
console.log(`Wrote ${postPath}`);

if (mode === 'preview') {
  console.log('Preview complete. Nothing was published.');
} else {
  const authorUrn = await resolveAuthorUrn();
  const imageUrn = await uploadImage({ authorUrn, imagePath: bannerPath });
  const result = await publishPost({
    authorUrn,
    postText: generated.post,
    imageUrn,
    title: generated.bannerTitle
  });

  console.log(`Published LinkedIn post${result.id ? `: ${result.id}` : '.'}`);
}
