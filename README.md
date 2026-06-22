# LinkedIn Auto Poster

A standalone LinkedIn auto-posting tool powered by GitHub Actions, Google Gemini, and a generated banner image.

It has no database, no web server, no dashboard, and no web framework. A scheduled workflow generates one fresh LinkedIn post, renders an on-brand PNG banner, uploads it to LinkedIn, and publishes the post.

## What It Uses

- Node.js 20+
- Plain ES modules
- Built-in `fetch`
- One runtime dependency: `@napi-rs/canvas`
- GitHub Actions for scheduling

## Quick Start

```bash
npm install
npm run setup
npm run preview
```

`npm run preview` generates text and writes `preview-banner.png` without publishing. `npm run post` publishes for real.

## Required Secrets

Set these in GitHub repository settings under Secrets and variables -> Actions:

- `GEMINI_API_KEY`
- `LINKEDIN_ACCESS_TOKEN`
- `LINKEDIN_ORGANIZATION_ID` only if posting as a Company Page

Optional variables:

- `GEMINI_MODEL`, defaults locally to `gemini-2.5-flash`
- `LINKEDIN_AUTHOR_URN`, useful when posting as a person and the token cannot expose profile identity
- `LINKEDIN_PERSON_ID`, converted to `urn:li:person:...` when `LINKEDIN_AUTHOR_URN` is not set
- `LINKEDIN_VERSION`, defaults to `202606`

## Topics

Edit `topics.txt`, one topic per line. Blank lines and `#` comments are ignored.

Use `::` for model-only steering context:

```text
Building trust with AI-generated content::avoid hype and focus on useful safeguards
```

The full line is sent to Gemini. Only the text before `::` appears on the banner.

## Commands

```bash
npm run setup    # interactive local setup
npm run preview  # dry run, writes preview-banner.png and preview-post.txt
npm run post     # publish to LinkedIn
npm run token    # mint a LinkedIn access token
```

## Workflow

The workflow runs daily at `30 3 * * *`, which is 09:00 IST, and can also be triggered manually from the Actions tab with an optional topic override.

LinkedIn access tokens expire periodically. When publishing stops with an authorization error, mint a new token and update `LINKEDIN_ACCESS_TOKEN`.

## Local Credentials

Local runs read `.env`. Copy `.env.example` to `.env`, or run:

```bash
npm run setup
```

For LinkedIn posting, use either:

- `LINKEDIN_ORGANIZATION_ID` for a Company Page
- `LINKEDIN_AUTHOR_URN` for a direct author URN such as `urn:li:person:...`
- `LINKEDIN_PERSON_ID` for personal posting when you know the person ID
- a token with OpenID profile access so the script can infer the person URN
