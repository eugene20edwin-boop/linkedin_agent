import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const rl = readline.createInterface({ input, output });

async function ask(name, message, fallback = '') {
  const answer = await rl.question(`${message}${fallback ? ` (${fallback})` : ''}: `);
  return [name, answer.trim() || fallback];
}

if (existsSync('.env')) {
  const overwrite = await rl.question('.env already exists. Overwrite it? Type yes to continue: ');

  if (overwrite.trim().toLowerCase() !== 'yes') {
    rl.close();
    console.log('Setup cancelled.');
    process.exit(0);
  }
}

const values = [];

values.push(await ask('GEMINI_API_KEY', 'Gemini API key'));
values.push(await ask('GEMINI_MODEL', 'Gemini model', 'gemini-2.5-flash'));
values.push(await ask('LINKEDIN_ACCESS_TOKEN', 'LinkedIn access token'));
values.push(await ask('LINKEDIN_ORGANIZATION_ID', 'LinkedIn organization ID, blank for personal posting'));
values.push(await ask('LINKEDIN_AUTHOR_URN', 'LinkedIn author URN, optional fallback'));
values.push(await ask('LINKEDIN_PERSON_ID', 'LinkedIn person ID, optional fallback'));
values.push(await ask('LINKEDIN_VERSION', 'LinkedIn API version', '202606'));
values.push(await ask('LINKEDIN_CLIENT_ID', 'LinkedIn client ID for token helper, optional'));
values.push(await ask('LINKEDIN_CLIENT_SECRET', 'LinkedIn client secret for token helper, optional'));
values.push(await ask('LINKEDIN_REDIRECT_URI', 'LinkedIn redirect URI for token helper', 'http://localhost:8745/callback'));
values.push(await ask('LINKEDIN_SCOPES', 'LinkedIn OAuth scopes', 'openid profile w_member_social w_organization_social'));

rl.close();

const content = values.map(([key, value]) => `${key}=${value}`).join('\n') + '\n';
await writeFile('.env', content, { mode: 0o600 });

console.log('Wrote .env');
