import fs from 'node:fs';
import { openSync } from 'fontkit';
import { layoutLine, renderLineSVG } from './line.mjs';

// The sign: lam + alef + beh. Lam and alef join into one stroke, so the
// line is two glyphs (133, 50) with a total advance of 2973, not the
// three isolated widths (1407 + 592 + 1593 = 3592).
const font = openSync(
  new URL('../test/data/NotoSans/NotoKufiArabic-Regular.ttf', import.meta.url),
);
const text = 'لاب';

const line = layoutLine(font, text);
const svg = renderLineSVG(line, {
  title: `${text} (${line.glyphs.length} glyphs)`,
});
fs.writeFileSync(new URL('./out.svg', import.meta.url), svg);

const summary = line.glyphs
  .map(({ id, advance }) => `${id}+${advance}`)
  .join('|');
console.log(
  `wrote preview/out.svg ${text}: ${line.glyphs.length} glyphs, ` +
    `${summary}, total ${line.advanceWidth}`,
);
