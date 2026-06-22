import { writeFile } from 'node:fs/promises';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';

const WIDTH = 1200;
const HEIGHT = 627;

function registerFonts() {
  const candidates = [
    '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
    '/System/Library/Fonts/Supplemental/Arial.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
  ];

  for (const path of candidates) {
    try {
      GlobalFonts.registerFromPath(path, path.includes('Bold') ? 'PosterSansBold' : 'PosterSans');
    } catch {
      // Font availability differs between macOS and GitHub Actions.
    }
  }
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;

    if (ctx.measureText(testLine).width <= maxWidth || !line) {
      line = testLine;
    } else {
      lines.push(line);
      line = word;
    }
  }

  if (line) {
    lines.push(line);
  }

  return lines;
}

function fitFont(ctx, text, maxWidth, startSize, minSize, fontFamily) {
  let size = startSize;

  while (size > minSize) {
    ctx.font = `700 ${size}px ${fontFamily}`;

    if (wrapText(ctx, text, maxWidth).length <= 2) {
      return size;
    }

    size -= 4;
  }

  return minSize;
}

export async function renderBanner({ title, subtitle, topic }, outputPath) {
  registerFonts();

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bg.addColorStop(0, '#071827');
  bg.addColorStop(0.46, '#123B54');
  bg.addColorStop(1, '#F4B83F');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fillRect(72, 76, 1056, 475);

  ctx.fillStyle = '#F4B83F';
  ctx.fillRect(72, 76, 9, 475);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 34px PosterSansBold, Arial, sans-serif';
  ctx.fillText('DIGITAL SCHOLAR', 116, 138);

  ctx.fillStyle = '#F4B83F';
  ctx.font = '700 22px PosterSansBold, Arial, sans-serif';
  ctx.fillText('AI x Marketing x Education', 116, 178);

  const titleFont = fitFont(ctx, title, 920, 82, 50, 'PosterSansBold, Arial, sans-serif');
  ctx.font = `700 ${titleFont}px PosterSansBold, Arial, sans-serif`;
  ctx.fillStyle = '#FFFFFF';

  const titleLines = wrapText(ctx, title, 920).slice(0, 2);
  let y = 302;

  for (const line of titleLines) {
    ctx.fillText(line, 116, y);
    y += titleFont + 12;
  }

  ctx.fillStyle = '#EAF4F8';
  ctx.font = '400 33px PosterSans, Arial, sans-serif';

  for (const line of wrapText(ctx, subtitle, 850).slice(0, 2)) {
    ctx.fillText(line, 116, y + 24);
    y += 43;
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.86)';
  ctx.font = '400 24px PosterSans, Arial, sans-serif';
  ctx.fillText(topic, 116, 506);

  ctx.fillStyle = '#071827';
  ctx.beginPath();
  ctx.roundRect(866, 438, 205, 54, 8);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 23px PosterSansBold, Arial, sans-serif';
  ctx.fillText('LinkedIn Post', 898, 473);

  await writeFile(outputPath, await canvas.encode('png'));
}
