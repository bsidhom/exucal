import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { inflateSync } from "node:zlib";
import {
  encodePng,
  parsePaint,
  parsePathData,
  parseTransform,
  parseXml,
  rasterizeSvg,
} from "./rasterize-svg.ts";

/** A decoded PNG, for checking what the encoder and the rasterizer produce. */
interface Image {
  width: number;
  height: number;
  data: Uint8Array;
  pixel(x: number, y: number): [number, number, number, number];
}

/** Decodes the PNGs this module produces: 8-bit RGBA with the None or Up filter. */
function decodePng(png: Uint8Array): Image {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  assert.deepEqual(
    [...png.subarray(0, 8)],
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  );
  let width = 0;
  let height = 0;
  const compressed: Uint8Array[] = [];
  let sawEnd = false;
  for (let offset = 8; offset < png.length;) {
    const length = view.getUint32(offset);
    const type = new TextDecoder().decode(png.subarray(offset + 4, offset + 8));
    const data = png.subarray(offset + 8, offset + 8 + length);
    switch (type) {
      case "IHDR":
        width = view.getUint32(offset + 8);
        height = view.getUint32(offset + 12);
        assert.deepEqual(
          [...data.subarray(8)],
          [8, 6, 0, 0, 0],
          "RGBA8, non-interlaced",
        );
        break;
      case "IDAT":
        compressed.push(data);
        break;
      case "IEND":
        sawEnd = true;
        break;
      default:
        assert.fail(`unexpected chunk ${type}`);
    }
    offset += 12 + length;
  }
  assert.ok(sawEnd, "IEND chunk");

  const raw = inflateSync(Buffer.concat(compressed));
  const stride = width * 4;
  assert.equal(raw.length, (stride + 1) * height);
  const data = new Uint8Array(stride * height);
  for (let row = 0; row < height; row++) {
    const filter = raw[row * (stride + 1)];
    assert.ok(filter === 0 || filter === 2, `filter ${filter}`);
    for (let i = 0; i < stride; i++) {
      const above = filter === 2 && row > 0 ? data[(row - 1) * stride + i]! : 0;
      data[row * stride + i] =
        (raw[row * (stride + 1) + 1 + i]! + above) & 0xff;
    }
  }
  return {
    width,
    height,
    data,
    pixel(x, y) {
      const i = (y * width + x) * 4;
      return [data[i]!, data[i + 1]!, data[i + 2]!, data[i + 3]!];
    },
  };
}

function render(svg: string, width: number, height = width): Image {
  return decodePng(rasterizeSvg(svg, { width, height }));
}

const transparent = [0, 0, 0, 0];
const black = [0, 0, 0, 255];
const white = [255, 255, 255, 255];
const red = [255, 0, 0, 255];

test("a PNG round-trips through the encoder", () => {
  const pixels = new Uint8Array([
    255, 0, 0, 255, 0, 255, 0, 128, 0, 0, 255, 0, 10, 20, 30, 40,
  ]);
  const image = decodePng(encodePng(2, 2, pixels));
  assert.equal(image.width, 2);
  assert.equal(image.height, 2);
  assert.deepEqual([...image.data], [...pixels]);
  assert.throws(() => encodePng(3, 1, pixels), /Expected 12 bytes/);
});

test("the app's icons render at the requested size", () => {
  const icon = render(readFileSync("public/icons/icon.svg", "utf8"), 64);
  assert.equal(icon.width, 64);
  assert.equal(icon.height, 64);
  const blue = [0x3b, 0x5b, 0xdb, 255];
  assert.deepEqual(icon.pixel(0, 0), transparent, "outside the rounded corner");
  assert.deepEqual(icon.pixel(32, 8), blue, "background");
  assert.deepEqual(
    icon.pixel(32, 32),
    white,
    "the middle of the horizontal bar",
  );
  assert.deepEqual(icon.pixel(20, 24), white, "a vertical bar");
  assert.deepEqual(icon.pixel(26, 26), blue, "between the bars");

  const maskable = render(
    readFileSync("public/icons/icon-maskable.svg", "utf8"),
    180,
  );
  assert.deepEqual(
    maskable.pixel(0, 0),
    blue,
    "a maskable icon fills its corners",
  );
  assert.deepEqual(maskable.pixel(90, 90), white);
});

test("the viewBox is fitted uniformly and centered", () => {
  const image = render(
    '<svg viewBox="0 0 20 10"><rect width="20" height="10"/></svg>',
    40,
  );
  assert.deepEqual(image.pixel(20, 5), transparent, "letterboxed above");
  assert.deepEqual(image.pixel(20, 10), black, "the top edge of the content");
  assert.deepEqual(
    image.pixel(20, 29),
    black,
    "the bottom edge of the content",
  );
  assert.deepEqual(image.pixel(20, 34), transparent, "letterboxed below");
  assert.deepEqual(image.pixel(0, 20), black, "flush left");
  assert.deepEqual(image.pixel(39, 20), black, "flush right");
});

test("edges are anti-aliased", () => {
  const image = render(
    '<svg viewBox="0 0 4 4"><rect x="0.5" y="0" width="3" height="4"/></svg>',
    4,
  );
  assert.deepEqual(image.pixel(0, 0), [0, 0, 0, 128], "half covered");
  assert.deepEqual(image.pixel(1, 0), black);
  assert.deepEqual(image.pixel(3, 0), [0, 0, 0, 128]);
});

test("colors composite over each other with their alpha", () => {
  const image = render(
    '<svg viewBox="0 0 2 2"><rect width="2" height="2" fill="#f00"/>' +
      '<rect width="1" height="2" fill="rgba(0, 0, 255, 0.5)"/>' +
      '<rect x="1" width="1" height="2" fill="blue" fill-opacity="0.5" opacity="0.5"/></svg>',
    2,
  );
  assert.deepEqual(image.pixel(0, 0), [128, 0, 128, 255]);
  assert.deepEqual(image.pixel(1, 0), [191, 0, 64, 255]);
});

test("a path arc matches a circle", () => {
  const circle = render(
    '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="15"/></svg>',
    40,
  );
  const arcs = render(
    '<svg viewBox="0 0 40 40"><path d="M5 20a15 15 0 1 0 30 0a15 15 0 1 0-30 0z"/></svg>',
    40,
  );
  const cubics = render(
    // A circle as four cubic Béziers, using S for the second half.
    '<svg viewBox="0 0 40 40"><path d="M5 20C5 11.716 11.716 5 20 5S35 11.716 35 20' +
      's-6.716 15-15 15S5 28.284 5 20z"/></svg>',
    40,
  );
  assert.deepEqual(circle.pixel(20, 20), black);
  assert.deepEqual(circle.pixel(2, 2), transparent);
  for (const [name, image] of [
    ["arcs", arcs],
    ["cubics", cubics],
  ] as const) {
    let worst = 0;
    for (let i = 0; i < circle.data.length; i++) {
      worst = Math.max(worst, Math.abs(circle.data[i]! - image.data[i]!));
    }
    // Curves are flattened to within a twentieth of a pixel, and the three
    // shapes are flattened from different starting points, so the coverage of
    // an edge pixel can differ by up to about that much.
    assert.ok(worst <= 16, `${name} differ from the circle by up to ${worst}`);
  }
});

test("strokes get the caps and joins asked for", () => {
  const line = (extra: string) =>
    render(
      `<svg viewBox="0 0 20 20"><path d="M6 10h8" stroke="#000" stroke-width="4" ${extra}/></svg>`,
      20,
    );
  assert.deepEqual(
    line("").pixel(4, 10),
    transparent,
    "butt caps end at the endpoint",
  );
  assert.deepEqual(line("").pixel(6, 10), black);
  assert.deepEqual(
    line('stroke-linecap="square"').pixel(4, 10),
    black,
    "a square cap extends",
  );
  assert.deepEqual(line('stroke-linecap="square"').pixel(4, 7), transparent);
  assert.deepEqual(
    line('stroke-linecap="round"').pixel(5, 10),
    black,
    "a round cap extends",
  );
  assert.deepEqual(
    line('stroke-linecap="round"').pixel(4, 7),
    transparent,
    "but is rounded",
  );

  const corner = (extra: string) =>
    render(
      `<svg viewBox="0 0 20 20"><path d="M4 16V4h12" fill="none" stroke="#000" stroke-width="4" ${extra}/></svg>`,
      20,
    );
  assert.deepEqual(
    corner("").pixel(2, 2),
    black,
    "a miter join fills the corner",
  );
  assert.deepEqual(corner('stroke-linejoin="bevel"').pixel(2, 2), transparent);
  assert.deepEqual(corner('stroke-linejoin="bevel"').pixel(4, 4), black);
  const roundCorner = corner('stroke-linejoin="round"').pixel(2, 2)[3];
  assert.ok(
    roundCorner > 0 && roundCorner < 255,
    `a round join curves through the corner pixel (alpha ${roundCorner})`,
  );
  assert.deepEqual(corner('stroke-linejoin="round"').pixel(3, 3), black);
  assert.deepEqual(
    corner('stroke-miterlimit="1"').pixel(2, 2),
    transparent,
    "over the limit",
  );
});

test("a dot is drawn for a zero-length subpath with round caps", () => {
  const image = render(
    '<svg viewBox="0 0 10 10"><path d="M5 5" stroke="#000" stroke-width="4" stroke-linecap="round"/></svg>',
    10,
  );
  assert.deepEqual(image.pixel(5, 5), black);
  assert.deepEqual(image.pixel(0, 0), transparent);
});

test("fill rules decide what a self-overlapping shape covers", () => {
  const ring = (rule: string) =>
    render(
      `<svg viewBox="0 0 10 10"><path fill-rule="${rule}" d="M0 0h10v10H0zM3 3h4v4H3z"/></svg>`,
      10,
    );
  assert.deepEqual(ring("nonzero").pixel(5, 5), black);
  assert.deepEqual(ring("evenodd").pixel(5, 5), transparent);
  assert.deepEqual(ring("evenodd").pixel(1, 1), black);
});

test("transforms apply to shapes and groups, strokes included", () => {
  const image = render(
    '<svg viewBox="0 0 20 20"><g transform="translate(10 0)">' +
      '<rect width="5" height="5" transform="scale(2)" fill="red"/></g>' +
      '<line x1="0" y1="15" x2="10" y2="15" stroke="#000" stroke-width="2" transform="rotate(90 5 15)"/></svg>',
    20,
  );
  assert.deepEqual(image.pixel(5, 5), transparent);
  assert.deepEqual(image.pixel(15, 5), red);
  assert.deepEqual(
    image.pixel(5, 12),
    black,
    "the rotated line is vertical through (5, 15)",
  );
  assert.deepEqual(image.pixel(8, 15), transparent);
});

test("presentation attributes inherit from ancestors", () => {
  const image = render(
    '<svg viewBox="0 0 10 10" fill="red"><g stroke="#000" stroke-width="2">' +
      '<rect x="2" y="2" width="6" height="6"/></g></svg>',
    10,
  );
  assert.deepEqual(image.pixel(5, 5), red);
  assert.deepEqual(image.pixel(2, 5), black);
});

test("paints are parsed in every supported notation", () => {
  assert.deepEqual(parsePaint("none"), null);
  assert.deepEqual(parsePaint("#3b5bdb"), {
    r: 0x3b / 255,
    g: 0x5b / 255,
    b: 0xdb / 255,
    a: 1,
  });
  assert.deepEqual(parsePaint("#F00"), { r: 1, g: 0, b: 0, a: 1 });
  assert.deepEqual(parsePaint("#0F08"), { r: 0, g: 1, b: 0, a: 0x88 / 255 });
  assert.deepEqual(parsePaint("#00ff0080"), {
    r: 0,
    g: 1,
    b: 0,
    a: 0x80 / 255,
  });
  assert.deepEqual(parsePaint("rgb(255, 0, 0)"), { r: 1, g: 0, b: 0, a: 1 });
  assert.deepEqual(parsePaint("rgb(100% 0% 0% / 50%)"), {
    r: 1,
    g: 0,
    b: 0,
    a: 0.5,
  });
  assert.deepEqual(parsePaint("rgba(0,0,255,0.25)"), {
    r: 0,
    g: 0,
    b: 1,
    a: 0.25,
  });
  assert.deepEqual(parsePaint(" White "), { r: 1, g: 1, b: 1, a: 1 });
  assert.deepEqual(parsePaint("transparent"), { r: 0, g: 0, b: 0, a: 0 });
  for (const bad of [
    "url(#gradient)",
    "currentColor",
    "hsl(0 100% 50%)",
    "#12345",
    "chartreuse",
  ]) {
    assert.throws(() => parsePaint(bad), /Unsupported SVG/, bad);
  }
});

test("path data is parsed with relative commands and implicit repetition", () => {
  const [first, second] = parsePathData("m1 2 3 4h5v-2l1 1z m0 0L0 0", 1);
  assert.deepEqual(first, {
    closed: true,
    points: [
      { x: 1, y: 2 },
      { x: 4, y: 6 },
      { x: 9, y: 6 },
      { x: 9, y: 4 },
      { x: 10, y: 5 },
    ],
  });
  // After Z the current point is the subpath's start, so `m0 0` is (1, 2).
  assert.deepEqual(second, {
    closed: false,
    points: [
      { x: 1, y: 2 },
      { x: 0, y: 0 },
    ],
  });
  // Arc flags may run together with the numbers that follow them.
  const [arc] = parsePathData("M0 0A5 5 0 015 5", 1);
  assert.deepEqual(arc?.points.at(-1), { x: 5, y: 5 });
  assert.ok(arc!.points.length > 2);
  for (const bad of ["L1 1", "M1", "M0 0 X", "M0 0A1 1 0 2 0 1 1"]) {
    assert.throws(() => parsePathData(bad, 1), /Malformed path data/, bad);
  }
});

test("transform lists compose left to right", () => {
  const m = parseTransform("translate(10, 20) scale(2) rotate(90)");
  const p = (x: number, y: number) => [
    m[0] * x + m[2] * y + m[4],
    m[1] * x + m[3] * y + m[5],
  ];
  const [x, y] = p(1, 0);
  assert.ok(
    Math.abs(x! - 10) < 1e-12 && Math.abs(y! - 22) < 1e-12,
    `${x}, ${y}`,
  );
  assert.deepEqual(parseTransform("matrix(1 2 3 4 5 6)"), [1, 2, 3, 4, 5, 6]);
  assert.throws(() => parseTransform("perspective(1)"), /Unsupported SVG/);
});

test("the XML parser keeps elements and attributes and drops the rest", () => {
  const root = parseXml(
    '<?xml version="1.0"?><!DOCTYPE svg><!-- comment --><svg viewBox="0 0 1 1">' +
      "<title>Icon</title><desc>A test</desc><g id='g' data-x=\"&amp;&#65;\"><rect/></g></svg>",
  );
  assert.equal(root.name, "svg");
  assert.equal(root.attributes.get("viewBox"), "0 0 1 1");
  assert.equal(root.children.length, 1);
  const g = root.children[0]!;
  assert.equal(g.attributes.get("id"), "g");
  assert.equal(g.attributes.get("data-x"), "&A");
  assert.equal(g.children[0]?.name, "rect");
  for (const bad of ["<svg><g></svg>", "<svg/><svg/>", "", "<svg>text</svg>"]) {
    assert.throws(() => parseXml(bad), /Malformed SVG|Unsupported SVG/, bad);
  }
});

test("anything outside the supported subset is rejected by name", () => {
  const cases: [string, RegExp][] = [
    ['<svg viewBox="0 0 1 1"><text>hi</text></svg>', /text content "hi"/],
    [
      '<svg viewBox="0 0 1 1"><image href="x.png"/></svg>',
      /the element <image>/,
    ],
    [
      '<svg viewBox="0 0 1 1"><rect style="fill:red"/></svg>',
      /style attribute/,
    ],
    ['<svg viewBox="0 0 1 1"><rect fill="url(#g)"/></svg>', /gradients/],
    [
      '<svg viewBox="0 0 1 1"><defs><linearGradient id="g"/></defs></svg>',
      /<defs>/,
    ],
    [
      '<svg viewBox="0 0 1 1"><rect width="50%" height="1"/></svg>',
      /width="50%"/,
    ],
    [
      '<svg viewBox="0 0 1 1"><rect clip-path="url(#c)"/></svg>',
      /attribute clip-path/,
    ],
    [
      '<svg viewBox="0 0 1 1"><g opacity="0.5"><rect/></g></svg>',
      /opacity on <g>/,
    ],
    ['<svg viewBox="0 0 1 1"><svg viewBox="0 0 1 1"/></svg>', /nested <svg>/],
    ["<svg><rect/></svg>", /without a viewBox/],
    ['<html><svg viewBox="0 0 1 1"/></html>', /root element <html>/],
  ];
  for (const [svg, message] of cases) {
    assert.throws(
      () => rasterizeSvg(svg, { width: 1, height: 1 }),
      message,
      svg,
    );
  }
  assert.throws(
    () => rasterizeSvg("<svg/>", { width: 0, height: 1 }),
    /Invalid raster size/,
  );
});
