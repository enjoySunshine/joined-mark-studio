import * as fontkit from 'fontkit';
import assert from 'assert';
import {
  layoutLine,
  layoutSeparate,
  lineBBox,
  renderLineSVG,
} from '../preview/line.mjs';

describe('preview line helpers', function () {
  let openFont = () =>
    fontkit.openSync(
      new URL('data/NotoSans/NotoKufiArabic-Regular.ttf', import.meta.url),
    );

  it('should place a joined line on the ligature advance, not isolated widths', function () {
    let font = openFont();
    let joined = layoutLine(font, 'لاب');
    let separate = layoutSeparate(font, 'لاب');

    assert.equal(joined.glyphs.length, 2);
    assert.deepEqual(
      joined.glyphs.map((placed) => placed.id),
      [133, 50],
    );
    assert.equal(joined.advanceWidth, 2973);

    // Beh sits first, then the ligature starts where beh's advance ends.
    assert.deepEqual(
      joined.glyphs.map((placed) => placed.x),
      [0, 1593],
    );

    // Laying the three letters out separately is 619 wider, in visual
    // order beh, alef, lam.
    assert.equal(separate.glyphs.length, 3);
    assert.deepEqual(
      separate.glyphs.map((placed) => placed.id),
      [133, 5, 34],
    );
    assert.equal(separate.advanceWidth, 3592);
    assert.equal(separate.advanceWidth - joined.advanceWidth, 619);
    assert.notEqual(separate.glyphs.length, joined.glyphs.length);
  });

  it('should render two paths for the joined line, the second at M92 160', function () {
    let font = openFont();
    let svg = renderLineSVG(layoutLine(font, 'لاب'));

    assert.equal(svg.match(/<path /g).length, 2);
    assert.match(svg, /data-glyph-id="133" data-advance="1593"/);
    assert.match(svg, /data-glyph-id="50" data-advance="1380"/);
    assert.match(svg, /transform="translate\(1593 0\)"/);
    assert.match(svg, /d="M92 160L/);

    // Neither isolated outline is drawn in place of the ligature.
    let lam = font.layout('ل').glyphs[0].path.toSVG();
    let alef = font.layout('ا').glyphs[0].path.toSVG();
    assert(!svg.includes(lam));
    assert(!svg.includes(alef));
  });

  it('should fit the line bbox to the ligature step', function () {
    let font = openFont();
    let line = layoutLine(font, 'لاب');
    let box = lineBBox(line);

    // The run starts at 0 and its last glyph ends before the total advance.
    assert.equal(box.minX, 133);
    assert.ok(box.maxX <= line.advanceWidth);
    assert.equal(box.maxY, 1556);
  });
});
