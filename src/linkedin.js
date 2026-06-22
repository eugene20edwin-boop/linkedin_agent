import { readFile } from 'node:fs/promises';
import { env, requiredEnv } from './env.js';

function linkedinHeaders(extra = {}) {
  return {
    Authorization: `Bearer ${requiredEnv('LINKEDIN_ACCESS_TOKEN')}`,
    'LinkedIn-Version': env('LINKEDIN_VERSION', '202606'),
    'X-Restli-Protocol-Version': '2.0.0',
    ...extra
  };
}

async function readLinkedInJson(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`LinkedIn request failed (${response.status}) for ${url}: ${body}`);
  }

  return body ? JSON.parse(body) : {};
}

export async function resolveAuthorUrn() {
  const explicitAuthor = env('LINKEDIN_AUTHOR_URN');

  if (explicitAuthor) {
    return explicitAuthor;
  }

  const organizationId = env('LINKEDIN_ORGANIZATION_ID');

  if (organizationId) {
    return `urn:li:organization:${organizationId}`;
  }

  const personId = env('LINKEDIN_PERSON_ID');

  if (personId) {
    return `urn:li:person:${personId}`;
  }

  const profile = await readLinkedInJson('https://api.linkedin.com/v2/userinfo', {
    headers: linkedinHeaders()
  });

  if (!profile.sub) {
    throw new Error('Could not infer LinkedIn person URN. Set LINKEDIN_AUTHOR_URN or LINKEDIN_ORGANIZATION_ID.');
  }

  return `urn:li:person:${profile.sub}`;
}

export async function uploadImage({ authorUrn, imagePath }) {
  const init = await readLinkedInJson('https://api.linkedin.com/rest/images?action=initializeUpload', {
    method: 'POST',
    headers: linkedinHeaders({
      'Content-Type': 'application/json'
    }),
    body: JSON.stringify({
      initializeUploadRequest: {
        owner: authorUrn
      }
    })
  });

  const uploadUrl = init.value?.uploadUrl;
  const imageUrn = init.value?.image;

  if (!uploadUrl || !imageUrn) {
    throw new Error(`LinkedIn image upload initialization returned an unexpected response: ${JSON.stringify(init)}`);
  }

  const image = await readFile(imagePath);
  const upload = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${requiredEnv('LINKEDIN_ACCESS_TOKEN')}`,
      'Content-Type': 'image/png'
    },
    body: image
  });

  const uploadBody = await upload.text();

  if (!upload.ok) {
    throw new Error(`LinkedIn image upload failed (${upload.status}): ${uploadBody}`);
  }

  return imageUrn;
}

export async function publishPost({ authorUrn, postText, imageUrn, title }) {
  const body = {
    author: authorUrn,
    commentary: postText,
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: []
    },
    content: {
      media: {
        title,
        id: imageUrn
      }
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false
  };

  const response = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: linkedinHeaders({
      'Content-Type': 'application/json'
    }),
    body: JSON.stringify(body)
  });

  const responseBody = await response.text();

  if (!response.ok) {
    throw new Error(`LinkedIn post publish failed (${response.status}): ${responseBody}`);
  }

  return {
    id: response.headers.get('x-restli-id') || null,
    body: responseBody
  };
}
