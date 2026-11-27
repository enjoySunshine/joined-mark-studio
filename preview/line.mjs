// Helpers for previewing a shaped line, used by preview/draw.mjs.
//
// A GlyphRun's `glyphs` are already in visual order: the layout engine
// reverses right-to-left runs, and each glyph has its own advance in
// `positions`. The pen positions below therefore come from the run's
// advances, never from the glyphs' isolated widths. For lam + alef that
// means the ligature's 1380 places the next glyph, not 1407 + 592.

export function placeGlyphs(glyphs, positions) {
  let x = 0;
  return glyphs.map((glyph, index) => {
    const position = positions[index];
    const placed = {
      glyph,
      id: glyph.id,
      name: glyph.name,
      x: x + position.xOffset,
      y: position.yOffset,
      advance: position.xAdvance,
    };
    x += position.xAdvance;
    return placed;
  });
}

// Lay out `text` the way the font joins it (e.g. lam + alef -> one glyph).
export function layoutLine(font, text) {
  const run = font.layout(text);
  return {
    direction: run.direction,
    glyphs: placeGlyphs(run.glyphs, run.positions),
    advanceWidth: run.advanceWidth,
  };
}

// Lay out each character on its own, for comparison. These are the isolated
// widths the joined line must NOT use to place its glyphs.
export function layoutSeparate(font, text) {
  const direction = font.layout(text).direction;
  const characters = [...text];
  if (direction === 'rtl') {
    characters.reverse();
  }

  const glyphs = [];
  for (const character of characters) {
    const run = font.layout(character);
    glyphs.push(...placeGlyphs(run.glyphs, run.positions));
  }

  let x = 0;
  return {
    direction,
    glyphs: glyphs.map((placed) => {
      const result = { ...placed, x };
      x += placed.advance;
      return result;
    }),
    advanceWidth: x,
  };
}

export function lineBBox(line) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const { glyph, x, y } of line.glyphs) {
    const box = glyph.bbox;
    minX = Math.min(minX, box.minX + x);
    minY = Math.min(minY, box.minY + y);
    maxX = Math.max(maxX, box.maxX + x);
    maxY = Math.max(maxY, box.maxY + y);
  }

  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: line.advanceWidth, maxY: 0 };
  }

  return { minX, minY, maxX, maxY };
}

export const DEFAULT_COLORS = ['#f4f1ea', '#e8b45a', '#8fb6e8', '#d98ad9'];

// Render a laid-out line as an SVG document. Every glyph keeps its own
// outline and is translated to its pen position; nothing is merged or
// recomposed, so a joined lam-alef is drawn with the ligature's stroke.
export function renderLineSVG(
  line,
  { padding = 48, colors = DEFAULT_COLORS, title = 'shaped line' } = {},
) {
  const box = lineBBox(line);
  const width = box.maxX - box.minX + padding * 2;
  const height = box.maxY - box.minY + padding * 2;

  const paths = line.glyphs
    .map(({ glyph, id, x, y, advance }, index) => {
      const color = colors[index % colors.length];
      return `<path data-glyph-id="${id}" data-advance="${advance}" d="${glyph.path.toSVG()}" transform="translate(${x} ${y})" fill="${color}"/>`;
    })
    .join('\n    ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.minX - padding} ${-box.maxY - padding} ${width} ${height}" width="${Math.ceil(width)}" height="${Math.ceil(height)}">
  <title>${title}</title>
  <rect x="${box.minX - padding}" y="${-box.maxY - padding}" width="${width}" height="${height}" fill="#111"/>
  <g transform="scale(1 -1)">
    ${paths}
  </g>
</svg>
`;
}
