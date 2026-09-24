import { crc32, deflateSync } from "node:zlib";

/**
 * Renders an SVG document to a PNG using nothing but Node.js.
 *
 * Node.js has no SVG or canvas support of its own, and the alternatives are
 * a native or WebAssembly rendering library or a headless browser: a
 * third-party dependency either way, and one that the Cloudflare Workers
 * Builds environment that deploys this site cannot supply for the browser.
 * This module is the dependency-free alternative: a small rasterizer for the
 * subset of SVG that flat icons use.
 *
 * The subset is deliberately strict. Anything the module does not understand
 * (an element, an attribute, a paint, a unit) makes `rasterizeSvg` throw with
 * a message naming it, rather than rendering something subtly wrong. This is
 * what makes it safe to treat the SVG as the source of truth: an icon that
 * builds renders as its markup says, and an icon that uses something outside
 * the subset fails the build instead of shipping a broken PNG. Supported:
 *
 * - `<svg>` with a `viewBox` (or numeric `width` and `height`), containing
 *   `<g>`, `<rect>` (with rounded corners), `<circle>`, `<ellipse>`,
 *   `<line>`, `<polyline>`, `<polygon>` and `<path>`. `<title>`, `<desc>`
 *   and `<metadata>` are ignored.
 * - The full path data grammar: `M`, `L`, `H`, `V`, `C`, `S`, `Q`, `T`, `A`
 *   and `Z`, absolute and relative, with implicit repetition.
 * - `transform` with `matrix`, `translate`, `scale`, `rotate`, `skewX` and
 *   `skewY`, on `<g>` and on shapes.
 * - `fill`, `stroke` and their opacities, `opacity` on shapes, `fill-rule`,
 *   `stroke-width`, `stroke-linecap`, `stroke-linejoin` and
 *   `stroke-miterlimit`, as attributes (not in `style`), inherited from
 *   ancestors as in SVG. Paints are solid colors: `#rgb`, `#rgba`,
 *   `#rrggbb`, `#rrggbbaa`, `rgb()`, `rgba()`, the sixteen basic CSS color
 *   names plus `orange`, `transparent` and `none`.
 * - Lengths are unitless numbers or `px`.
 *
 * Not supported, and rejected: `style` attributes and `<style>` elements,
 * gradients, patterns, `<use>`, `<text>`, `<image>`, clipping, masking,
 * filters, markers, `currentColor`, percentages and other units, and
 * `preserveAspectRatio` values other than the default.
 *
 * The output fits the `viewBox` into the requested size the way a browser
 * does by default (`xMidYMid meet`, i.e. scaled uniformly and centered), on a
 * transparent background, with edges anti-aliased by supersampling. Colors
 * are composited in the usual non-linear sRGB space, as browsers do.
 */
export function rasterizeSvg(svg: string, size: Size): Uint8Array {
  const { width, height } = size;
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1
  ) {
    throw new Error(`Invalid raster size: ${width}x${height}`);
  }
  const root = parseXml(svg);
  if (root.name !== "svg") {
    throw unsupported(`a root element <${root.name}> (expected <svg>)`);
  }
  const viewBox = parseViewBox(root);

  // Map the viewBox onto the canvas: scale uniformly to fit, then center.
  const scale = Math.min(width / viewBox.width, height / viewBox.height);
  const fit: Matrix = [
    scale,
    0,
    0,
    scale,
    (width - viewBox.width * scale) / 2 - viewBox.x * scale,
    (height - viewBox.height * scale) / 2 - viewBox.y * scale,
  ];

  checkAttributes(root);
  const canvas = new Canvas(width, height);
  const painter = new Painter(canvas);
  painter.renderChildren(root, fit, resolveStyle(root, defaultStyle));
  return encodePng(width, height, canvas.toRgba8());
}

/** The pixel size of the raster to produce. */
export interface Size {
  width: number;
  height: number;
}

/** Throws for a feature outside the supported subset, naming it. */
function unsupported(what: string): Error {
  return new Error(
    `Unsupported SVG: ${what}. See rasterize-svg.ts for the supported subset.`,
  );
}

// ---------------------------------------------------------------------------
// XML
// ---------------------------------------------------------------------------

/** An element of the parsed document. Text content is not kept. */
interface XmlElement {
  name: string;
  attributes: Map<string, string>;
  children: XmlElement[];
}

/** The largest SVG the parser accepts; icons are a few kilobytes. */
const maxSourceLength = 1024 * 1024;

/**
 * Parses the small amount of XML an SVG icon needs: nested elements with
 * quoted attributes, plus a prolog, doctype and comments, which are dropped.
 * Elements whose text content is irrelevant to rendering (`<title>`,
 * `<desc>`, `<metadata>`) are dropped whole. Any other text content is an
 * error, since text is not rendered.
 *
 * Security. Node.js has no XML parser of its own (`DOMParser` exists only in
 * browsers), and this project takes no third-party dependencies for the
 * build, so the parser is written here. That is also an opportunity: the
 * classic XML attacks live in the parts of XML this parser does not have.
 * The SVGs it reads are committed to this repository, but it treats them as
 * untrusted data all the same, so that neither a careless edit nor a
 * malicious one can do more than fail the build:
 *
 * - Nothing in the file is ever evaluated, executed, or interpolated into
 *   code, markup or a shell command. The file only ever becomes an element
 *   tree of strings, and from there numbers, colors and pixels. The outputs
 *   of the whole module are a PNG and error messages; a PNG is inert data,
 *   and the messages go to the build log.
 * - Entity expansion attacks ("billion laughs") are impossible: only the
 *   five predefined entities and numeric character references are decoded,
 *   and a DOCTYPE with an internal subset, where entities would be declared,
 *   is rejected outright. So are CDATA sections.
 * - External entity attacks (XXE) are impossible: nothing here reads a file
 *   or a URL. The renderer rejects every element and attribute that could
 *   reference another resource (`<use>`, `<image>`, `href`, `url(...)`).
 * - Element and attribute names only select from allowlists: frozen tables
 *   without a prototype (see `table`) and sets. A name such as `__proto__`
 *   or `constructor` is just an unknown name that fails the build; it
 *   cannot reach a prototype, and the tables cannot be changed.
 * - Resource use is bounded: the input is capped at `maxSourceLength`, the
 *   regular expressions below are anchored by literal delimiters and cannot
 *   backtrack exponentially, the renderer caps how finely each curve is
 *   flattened, and the canvas is the requested size and no larger.
 * - Everything not explicitly understood is an error (see `rasterizeSvg`),
 *   so the parser fails closed rather than guessing.
 */
export function parseXml(source: string): XmlElement {
  if (source.length > maxSourceLength) {
    throw new Error(
      `Malformed SVG: ${source.length} characters is larger than the ${maxSourceLength} allowed.`,
    );
  }
  if (/<!DOCTYPE[^>]*\[/i.test(source)) {
    throw unsupported(
      "a DOCTYPE with an internal subset (entity declarations)",
    );
  }
  if (source.includes("<![CDATA[")) {
    throw unsupported("CDATA sections");
  }
  const text = source
    .replace(/<\?[\s\S]*?\?>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .replace(/<(title|desc|metadata)(?:\s[^>]*)?>[\s\S]*?<\/\1\s*>/g, "")
    .replace(/<(title|desc|metadata)(?:\s[^>]*)?\/>/g, "");

  const tag =
    /<(\/?)([A-Za-z_][\w.:-]*)((?:\s+[A-Za-z_][\w.:-]*\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/g;
  const stack: XmlElement[] = [];
  let root: XmlElement | undefined;
  let last = 0;
  for (const match of text.matchAll(tag)) {
    const between = text.slice(last, match.index).trim();
    if (between !== "") {
      throw unsupported(`text content ${JSON.stringify(between)}`);
    }
    last = match.index + match[0].length;
    const [, closing, name, attributeSource, selfClosing] = match;
    if (closing) {
      const element = stack.pop();
      if (element === undefined || element.name !== name) {
        throw new Error(`Malformed SVG: unexpected closing tag </${name}>.`);
      }
      continue;
    }
    const element: XmlElement = {
      name: name!,
      attributes: parseAttributes(attributeSource!),
      children: [],
    };
    const parent = stack.at(-1);
    if (parent !== undefined) {
      parent.children.push(element);
    } else if (root === undefined) {
      root = element;
    } else {
      throw new Error("Malformed SVG: more than one root element.");
    }
    if (!selfClosing) {
      stack.push(element);
    }
  }
  const trailing = text.slice(last).trim();
  if (trailing !== "") {
    throw new Error(
      `Malformed SVG: could not parse ${JSON.stringify(trailing.slice(0, 40))}.`,
    );
  }
  if (stack.length > 0) {
    throw new Error(`Malformed SVG: <${stack.at(-1)!.name}> is never closed.`);
  }
  if (root === undefined) {
    throw new Error("Malformed SVG: no elements.");
  }
  return root;
}

function parseAttributes(source: string): Map<string, string> {
  const attributes = new Map<string, string>();
  for (const [, name, doubleQuoted, singleQuoted] of source.matchAll(
    /([A-Za-z_][\w.:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g,
  )) {
    attributes.set(name!, decodeEntities(doubleQuoted ?? singleQuoted ?? ""));
  }
  return attributes;
}

function decodeEntities(value: string): string {
  return value.replace(
    /&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);/g,
    (_entity, body: string) => {
      switch (body) {
        case "amp":
          return "&";
        case "lt":
          return "<";
        case "gt":
          return ">";
        case "quot":
          return '"';
        case "apos":
          return "'";
        default: {
          const codePoint =
            body[1] === "x"
              ? parseInt(body.slice(2), 16)
              : parseInt(body.slice(1), 10);
          if (codePoint > 0x10ffff) {
            throw new Error(
              `Malformed SVG: invalid character reference &${body};.`,
            );
          }
          return String.fromCodePoint(codePoint);
        }
      }
    },
  );
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

interface Point {
  x: number;
  y: number;
}

/** A polyline, closed or open, in the coordinates of the element it came from. */
interface Subpath {
  points: Point[];
  closed: boolean;
}

/** An affine transform `[a, b, c, d, e, f]` mapping (x, y) to (ax + cy + e, bx + dy + f). */
type Matrix = readonly [number, number, number, number, number, number];

const identity: Matrix = Object.freeze([1, 0, 0, 1, 0, 0] as const);

/** The transform that applies `n` first and then `m`. */
function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

function apply(m: Matrix, p: Point): Point {
  return {
    x: m[0] * p.x + m[2] * p.y + m[4],
    y: m[1] * p.x + m[3] * p.y + m[5],
  };
}

/** How much `m` scales lengths, on average over directions. */
function scaleOf(m: Matrix): number {
  return Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));
}

/**
 * How many straight segments approximate an arc of `angle` radians and radius
 * `radius` (in device pixels) to within a twentieth of a pixel.
 */
function arcSegments(angle: number, radius: number): number {
  const tolerance = 0.05;
  if (!(radius > tolerance)) {
    return 1;
  }
  const step = 2 * Math.acos(1 - tolerance / radius);
  return Math.min(512, Math.max(1, Math.ceil(Math.abs(angle) / step)));
}

/** How many straight segments approximate a curve of about `length` device pixels. */
function curveSegments(length: number): number {
  return Math.min(512, Math.max(1, Math.ceil(length / 2)));
}

function distance(p: Point, q: Point): number {
  return Math.hypot(q.x - p.x, q.y - p.y);
}

/**
 * Appends to `points` the points along an arc of the ellipse centered at
 * (cx, cy) with radii rx and ry, rotated by `rotation` radians, from angle
 * `start` sweeping by `sweep` radians. The starting point is not appended.
 */
function appendArc(
  points: Point[],
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rotation: number,
  start: number,
  sweep: number,
  scale: number,
): void {
  const n = arcSegments(sweep, Math.max(rx, ry) * scale);
  const cosR = Math.cos(rotation);
  const sinR = Math.sin(rotation);
  for (let k = 1; k <= n; k++) {
    const angle = start + (sweep * k) / n;
    const x = rx * Math.cos(angle);
    const y = ry * Math.sin(angle);
    points.push({ x: cx + x * cosR - y * sinR, y: cy + x * sinR + y * cosR });
  }
}

/** The signed angle from vector `u` to vector `v`. */
function angleBetween(u: Point, v: Point): number {
  const sign = u.x * v.y - u.y * v.x < 0 ? -1 : 1;
  const cos =
    (u.x * v.x + u.y * v.y) / (Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y));
  return sign * Math.acos(Math.min(1, Math.max(-1, cos)));
}

/**
 * Appends the points of an SVG elliptical arc from `from` to `to`, converting
 * the endpoint parameterization to a center and angles as in the SVG
 * specification's implementation notes (section F.6.5).
 */
function appendEndpointArc(
  points: Point[],
  from: Point,
  rx: number,
  ry: number,
  rotation: number,
  largeArc: boolean,
  sweep: boolean,
  to: Point,
  scale: number,
): void {
  if (from.x === to.x && from.y === to.y) {
    return;
  }
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  if (rx === 0 || ry === 0) {
    points.push(to);
    return;
  }
  const cosR = Math.cos(rotation);
  const sinR = Math.sin(rotation);
  const dx = (from.x - to.x) / 2;
  const dy = (from.y - to.y) / 2;
  const x1 = cosR * dx + sinR * dy;
  const y1 = -sinR * dx + cosR * dy;
  const lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
  if (lambda > 1) {
    rx *= Math.sqrt(lambda);
    ry *= Math.sqrt(lambda);
  }
  const numerator = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
  const denominator = rx * rx * y1 * y1 + ry * ry * x1 * x1;
  const coefficient =
    (largeArc === sweep ? -1 : 1) *
    Math.sqrt(Math.max(0, numerator / denominator));
  const cx1 = (coefficient * rx * y1) / ry;
  const cy1 = (-coefficient * ry * x1) / rx;
  const cx = cosR * cx1 - sinR * cy1 + (from.x + to.x) / 2;
  const cy = sinR * cx1 + cosR * cy1 + (from.y + to.y) / 2;
  const startVector = { x: (x1 - cx1) / rx, y: (y1 - cy1) / ry };
  const endVector = { x: (-x1 - cx1) / rx, y: (-y1 - cy1) / ry };
  const start = angleBetween({ x: 1, y: 0 }, startVector);
  let delta = angleBetween(startVector, endVector);
  if (!sweep && delta > 0) {
    delta -= 2 * Math.PI;
  } else if (sweep && delta < 0) {
    delta += 2 * Math.PI;
  }
  appendArc(points, cx, cy, rx, ry, rotation, start, delta, scale);
  // Land exactly on the endpoint rather than on its floating-point neighbor.
  points[points.length - 1] = to;
}

function appendCubic(
  points: Point[],
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  scale: number,
) {
  const n = curveSegments(
    scale * (distance(p0, p1) + distance(p1, p2) + distance(p2, p3)),
  );
  for (let k = 1; k <= n; k++) {
    const t = k / n;
    const s = 1 - t;
    const a = s * s * s;
    const b = 3 * s * s * t;
    const c = 3 * s * t * t;
    const d = t * t * t;
    points.push({
      x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
      y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
    });
  }
}

function appendQuadratic(
  points: Point[],
  p0: Point,
  p1: Point,
  p2: Point,
  scale: number,
) {
  const n = curveSegments(scale * (distance(p0, p1) + distance(p1, p2)));
  for (let k = 1; k <= n; k++) {
    const t = k / n;
    const s = 1 - t;
    const a = s * s;
    const b = 2 * s * t;
    const c = t * t;
    points.push({
      x: a * p0.x + b * p1.x + c * p2.x,
      y: a * p0.y + b * p1.y + c * p2.y,
    });
  }
}

/**
 * Parses SVG path data into flattened subpaths. `scale` is how many device
 * pixels a user unit spans, which decides how finely curves are flattened.
 */
export function parsePathData(data: string, scale: number): Subpath[] {
  const scanner = new PathScanner(data);
  const subpaths: Subpath[] = [];
  let current: Subpath | undefined;
  let point: Point = { x: 0, y: 0 };
  let subpathStart: Point = { x: 0, y: 0 };
  // The last control point of the previous C/S or Q/T command, for S and T.
  let lastCubicControl: Point | undefined;
  let lastQuadraticControl: Point | undefined;

  const begin = (start: Point) => {
    current = { points: [start], closed: false };
    subpaths.push(current);
    point = start;
    subpathStart = start;
  };
  const points = (): Point[] => {
    // A drawing command after Z starts a new subpath at the closed one's start.
    if (current === undefined || current.closed) {
      begin(point);
    }
    return current!.points;
  };
  const absolute = (relative: boolean, x: number, y: number): Point =>
    relative ? { x: point.x + x, y: point.y + y } : { x, y };

  let command = scanner.command();
  if (command === undefined) {
    return subpaths;
  }
  if (command.toUpperCase() !== "M") {
    throw new Error(`Malformed path data: must start with M, not ${command}.`);
  }
  while (command !== undefined) {
    const relative = command === command.toLowerCase();
    let cubicControl: Point | undefined;
    let quadraticControl: Point | undefined;
    switch (command.toUpperCase()) {
      case "M": {
        // The first pair moves; any further pairs are implicit line-tos.
        begin(absolute(relative, scanner.number(), scanner.number()));
        while (scanner.hasNumber()) {
          point = absolute(relative, scanner.number(), scanner.number());
          points().push(point);
        }
        break;
      }
      case "L":
        do {
          point = absolute(relative, scanner.number(), scanner.number());
          points().push(point);
        } while (scanner.hasNumber());
        break;
      case "H":
        do {
          point = {
            x: relative ? point.x + scanner.number() : scanner.number(),
            y: point.y,
          };
          points().push(point);
        } while (scanner.hasNumber());
        break;
      case "V":
        do {
          point = {
            x: point.x,
            y: relative ? point.y + scanner.number() : scanner.number(),
          };
          points().push(point);
        } while (scanner.hasNumber());
        break;
      case "C":
        do {
          const p1 = absolute(relative, scanner.number(), scanner.number());
          const p2 = absolute(relative, scanner.number(), scanner.number());
          const p3 = absolute(relative, scanner.number(), scanner.number());
          appendCubic(points(), point, p1, p2, p3, scale);
          cubicControl = p2;
          point = p3;
        } while (scanner.hasNumber());
        break;
      case "S":
        do {
          const p1 = reflect(lastCubicControl, point);
          const p2 = absolute(relative, scanner.number(), scanner.number());
          const p3 = absolute(relative, scanner.number(), scanner.number());
          appendCubic(points(), point, p1, p2, p3, scale);
          cubicControl = p2;
          lastCubicControl = p2;
          point = p3;
        } while (scanner.hasNumber());
        break;
      case "Q":
        do {
          const p1 = absolute(relative, scanner.number(), scanner.number());
          const p2 = absolute(relative, scanner.number(), scanner.number());
          appendQuadratic(points(), point, p1, p2, scale);
          quadraticControl = p1;
          point = p2;
        } while (scanner.hasNumber());
        break;
      case "T":
        do {
          const p1 = reflect(lastQuadraticControl, point);
          const p2 = absolute(relative, scanner.number(), scanner.number());
          appendQuadratic(points(), point, p1, p2, scale);
          quadraticControl = p1;
          lastQuadraticControl = p1;
          point = p2;
        } while (scanner.hasNumber());
        break;
      case "A":
        do {
          const rx = scanner.number();
          const ry = scanner.number();
          const rotation = (scanner.number() * Math.PI) / 180;
          const largeArc = scanner.flag();
          const sweep = scanner.flag();
          const to = absolute(relative, scanner.number(), scanner.number());
          appendEndpointArc(
            points(),
            point,
            rx,
            ry,
            rotation,
            largeArc,
            sweep,
            to,
            scale,
          );
          point = to;
        } while (scanner.hasNumber());
        break;
      case "Z":
        if (current !== undefined) {
          current.closed = true;
        }
        point = subpathStart;
        break;
      default:
        throw new Error(`Malformed path data: unknown command ${command}.`);
    }
    lastCubicControl = cubicControl;
    lastQuadraticControl = quadraticControl;
    command = scanner.command();
  }
  return subpaths;
}

/** The reflection of `control` through `point`, or `point` itself if there is none. */
function reflect(control: Point | undefined, point: Point): Point {
  return control === undefined
    ? point
    : { x: 2 * point.x - control.x, y: 2 * point.y - control.y };
}

/** Reads the tokens of path data: commands, numbers and arc flags. */
class PathScanner {
  private readonly data: string;
  private index = 0;

  constructor(data: string) {
    this.data = data;
  }

  private skipSeparators(): void {
    while (
      this.index < this.data.length &&
      /[\s,]/.test(this.data[this.index]!)
    ) {
      this.index++;
    }
  }

  command(): string | undefined {
    this.skipSeparators();
    if (this.index >= this.data.length) {
      return undefined;
    }
    const char = this.data[this.index]!;
    if (!/[A-Za-z]/.test(char)) {
      throw new Error(
        `Malformed path data: expected a command at ${JSON.stringify(this.data.slice(this.index, this.index + 20))}.`,
      );
    }
    this.index++;
    return char;
  }

  hasNumber(): boolean {
    this.skipSeparators();
    return (
      this.index < this.data.length && /[-+.0-9]/.test(this.data[this.index]!)
    );
  }

  number(): number {
    this.skipSeparators();
    const match = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/.exec(
      this.data.slice(this.index),
    );
    if (match === null) {
      throw new Error(
        `Malformed path data: expected a number at ${JSON.stringify(this.data.slice(this.index, this.index + 20))}.`,
      );
    }
    this.index += match[0].length;
    return Number(match[0]);
  }

  flag(): boolean {
    this.skipSeparators();
    const char = this.data[this.index];
    if (char !== "0" && char !== "1") {
      throw new Error(
        `Malformed path data: expected an arc flag, got ${JSON.stringify(char)}.`,
      );
    }
    this.index++;
    return char === "1";
  }
}

// ---------------------------------------------------------------------------
// Strokes
// ---------------------------------------------------------------------------

type LineCap = "butt" | "round" | "square";
type LineJoin = "miter" | "round" | "bevel";

/**
 * The outline of a stroke as a set of polygons whose union, filled with the
 * nonzero rule, covers it: a quadrilateral per segment plus the shapes of the
 * joins and caps. Because the union is taken by winding, every polygon must
 * wind the same way; `Painter` normalizes them after transforming.
 */
function strokeOutline(
  subpaths: Subpath[],
  width: number,
  cap: LineCap,
  join: LineJoin,
  miterLimit: number,
  scale: number,
): Point[][] {
  const half = width / 2;
  const polygons: Point[][] = [];
  const circle = (c: Point) => {
    const points: Point[] = [];
    appendArc(points, c.x, c.y, half, half, 0, 0, 2 * Math.PI, scale);
    polygons.push(points);
  };

  for (const subpath of subpaths) {
    // Drop repeated points so that every segment has a direction.
    const points = subpath.points.filter(
      (p, i, all) => i === 0 || p.x !== all[i - 1]!.x || p.y !== all[i - 1]!.y,
    );
    if (subpath.closed && points.length > 1) {
      const first = points[0]!;
      const last = points[points.length - 1]!;
      if (first.x === last.x && first.y === last.y) {
        points.pop();
      }
    }
    if (points.length === 1) {
      // A zero-length subpath is drawn as a dot by round and square caps.
      const p = points[0]!;
      if (cap === "round") {
        circle(p);
      } else if (cap === "square") {
        polygons.push([
          { x: p.x - half, y: p.y - half },
          { x: p.x + half, y: p.y - half },
          { x: p.x + half, y: p.y + half },
          { x: p.x - half, y: p.y + half },
        ]);
      }
      continue;
    }

    const closed = subpath.closed && points.length > 2;
    const segments = closed ? points.length : points.length - 1;
    const direction = (i: number): Point => {
      const p = points[i % points.length]!;
      const q = points[(i + 1) % points.length]!;
      const length = distance(p, q);
      return { x: (q.x - p.x) / length, y: (q.y - p.y) / length };
    };
    for (let i = 0; i < segments; i++) {
      const p = points[i]!;
      const q = points[(i + 1) % points.length]!;
      const d = direction(i);
      // Square caps extend the first and last segments by half the width.
      const extendStart = !closed && i === 0 && cap === "square" ? half : 0;
      const extendEnd =
        !closed && i === segments - 1 && cap === "square" ? half : 0;
      const a = { x: p.x - d.x * extendStart, y: p.y - d.y * extendStart };
      const b = { x: q.x + d.x * extendEnd, y: q.y + d.y * extendEnd };
      const n = { x: -d.y * half, y: d.x * half };
      polygons.push([
        { x: a.x + n.x, y: a.y + n.y },
        { x: b.x + n.x, y: b.y + n.y },
        { x: b.x - n.x, y: b.y - n.y },
        { x: a.x - n.x, y: a.y - n.y },
      ]);
    }

    // Joins, at every vertex between two segments.
    const firstJoin = closed ? 0 : 1;
    const lastJoin = closed ? points.length - 1 : points.length - 2;
    for (let i = firstJoin; i <= lastJoin; i++) {
      const p = points[i]!;
      const incoming = direction(i - 1 + points.length);
      const outgoing = direction(i);
      const cross = incoming.x * outgoing.y - incoming.y * outgoing.x;
      const dot = incoming.x * outgoing.x + incoming.y * outgoing.y;
      if (Math.abs(cross) < 1e-9 && dot > 0) {
        continue; // Straight through: nothing to join.
      }
      if (join === "round") {
        circle(p);
        continue;
      }
      // The outer side of the turn is opposite to the direction turned
      // toward, and the turn is toward the left normal when `cross` > 0.
      const side = cross > 0 ? -1 : 1;
      const n1 = { x: -incoming.y * half * side, y: incoming.x * half * side };
      const n2 = { x: -outgoing.y * half * side, y: outgoing.x * half * side };
      const corner1 = { x: p.x + n1.x, y: p.y + n1.y };
      const corner2 = { x: p.x + n2.x, y: p.y + n2.y };
      // The miter length ratio is 1 / sin(theta / 2), where theta is the
      // angle between the segments at the join; cos(theta) = -dot.
      const halfAngleSine = Math.sqrt(Math.max(0, (1 + dot) / 2));
      if (
        join === "miter" &&
        halfAngleSine > 0 &&
        1 / halfAngleSine <= miterLimit
      ) {
        const bisector = { x: n1.x + n2.x, y: n1.y + n2.y };
        const bisectorLength = Math.hypot(bisector.x, bisector.y);
        const miterLength = half / halfAngleSine;
        const tip = {
          x: p.x + (bisector.x / bisectorLength) * miterLength,
          y: p.y + (bisector.y / bisectorLength) * miterLength,
        };
        polygons.push([p, corner1, tip, corner2]);
      } else {
        polygons.push([p, corner1, corner2]);
      }
    }

    if (!closed && cap === "round") {
      circle(points[0]!);
      circle(points[points.length - 1]!);
    }
  }
  return polygons;
}

// ---------------------------------------------------------------------------
// Style
// ---------------------------------------------------------------------------

/** A color with components in [0, 1]. */
interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** The inherited presentation properties. */
interface Style {
  fill: Color | null;
  fillRule: "nonzero" | "evenodd";
  fillOpacity: number;
  stroke: Color | null;
  strokeOpacity: number;
  strokeWidth: number;
  lineCap: LineCap;
  lineJoin: LineJoin;
  miterLimit: number;
}

const defaultStyle: Readonly<Style> = Object.freeze({
  fill: Object.freeze({ r: 0, g: 0, b: 0, a: 1 }),
  fillRule: "nonzero",
  fillOpacity: 1,
  stroke: null,
  strokeOpacity: 1,
  strokeWidth: 1,
  lineCap: "butt",
  lineJoin: "miter",
  miterLimit: 4,
});

/**
 * A frozen lookup table with no prototype, for keys that come from the SVG:
 * only the table's own entries resolve, so a key such as `__proto__` or
 * `constructor` finds nothing rather than something inherited from
 * `Object.prototype`, and nothing can add or change an entry later. (A `Map`
 * would resolve keys just as safely, but its contents cannot be frozen.)
 */
function table<T>(
  entries: Record<string, T>,
): Readonly<Partial<Record<string, T>>> {
  const result: Partial<Record<string, T>> = Object.create(null);
  for (const [key, value] of Object.entries(entries)) {
    result[key] = Object.freeze(value);
  }
  return Object.freeze(result);
}

const namedColors = table({
  black: "#000000",
  silver: "#c0c0c0",
  gray: "#808080",
  grey: "#808080",
  white: "#ffffff",
  maroon: "#800000",
  red: "#ff0000",
  purple: "#800080",
  fuchsia: "#ff00ff",
  magenta: "#ff00ff",
  green: "#008000",
  lime: "#00ff00",
  olive: "#808000",
  yellow: "#ffff00",
  navy: "#000080",
  blue: "#0000ff",
  teal: "#008080",
  aqua: "#00ffff",
  cyan: "#00ffff",
  orange: "#ffa500",
});

/** Parses a paint value into a color, or `null` for `none`. */
export function parsePaint(value: string): Color | null {
  const paint = value.trim().toLowerCase();
  if (paint === "none") {
    return null;
  }
  if (paint === "transparent") {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  const named = namedColors[paint];
  if (named !== undefined) {
    return parsePaint(named);
  }
  const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(paint);
  if (hex !== null) {
    let digits = hex[1]!;
    if (digits.length <= 4) {
      digits = [...digits].map((d) => d + d).join("");
    }
    const channel = (i: number) => parseInt(digits.slice(i, i + 2), 16) / 255;
    return {
      r: channel(0),
      g: channel(2),
      b: channel(4),
      a: digits.length === 8 ? channel(6) : 1,
    };
  }
  const rgb = /^rgba?\((.*)\)$/.exec(paint);
  if (rgb !== null) {
    const parts = rgb[1]!.trim().split(/\s*[,/]\s*|\s+/);
    if (parts.length === 3 || parts.length === 4) {
      const channel = (part: string, max: number) => {
        const percent = part.endsWith("%");
        const number = Number(percent ? part.slice(0, -1) : part);
        if (Number.isNaN(number)) {
          throw unsupported(`the color ${JSON.stringify(value)}`);
        }
        return Math.min(1, Math.max(0, percent ? number / 100 : number / max));
      };
      return {
        r: channel(parts[0]!, 255),
        g: channel(parts[1]!, 255),
        b: channel(parts[2]!, 255),
        a: parts.length === 4 ? channel(parts[3]!, 1) : 1,
      };
    }
  }
  if (paint.startsWith("url(")) {
    throw unsupported(
      `the paint ${JSON.stringify(value)} (gradients and patterns)`,
    );
  }
  throw unsupported(`the color ${JSON.stringify(value)}`);
}

/** Parses a length, which must be a plain number or in `px`. */
function parseLength(value: string, what: string): number {
  const match = /^\s*([-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)(px)?\s*$/.exec(
    value,
  );
  if (match === null) {
    throw unsupported(
      `${what}=${JSON.stringify(value)} (lengths must be plain numbers)`,
    );
  }
  return Number(match[1]);
}

function parseNumberList(value: string, what: string): number[] {
  const parts = value
    .trim()
    .split(/\s*,\s*|\s+/)
    .filter((part) => part !== "");
  return parts.map((part) => parseLength(part, what));
}

function parseOpacity(value: string, what: string): number {
  const number = Number(value.trim());
  if (Number.isNaN(number)) {
    throw unsupported(`${what}=${JSON.stringify(value)}`);
  }
  return Math.min(1, Math.max(0, number));
}

function parseKeyword<T extends string>(
  value: string,
  what: string,
  allowed: readonly T[],
): T {
  const keyword = value.trim() as T;
  if (!allowed.includes(keyword)) {
    throw unsupported(`${what}=${JSON.stringify(value)}`);
  }
  return keyword;
}

/** Parses a `transform` attribute into a single matrix. */
export function parseTransform(value: string): Matrix {
  let matrix = identity;
  let rest = value.trim();
  while (rest !== "") {
    const match = /^([a-zA-Z]+)\s*\(([^)]*)\)\s*,?\s*/.exec(rest);
    if (match === null) {
      throw unsupported(`transform=${JSON.stringify(value)}`);
    }
    const [, name, argumentSource] = match;
    const args = parseNumberList(argumentSource!, "transform");
    const radians = (degrees: number) => (degrees * Math.PI) / 180;
    let next: Matrix;
    switch (`${name}/${args.length}`) {
      case "matrix/6":
        next = [args[0]!, args[1]!, args[2]!, args[3]!, args[4]!, args[5]!];
        break;
      case "translate/1":
        next = [1, 0, 0, 1, args[0]!, 0];
        break;
      case "translate/2":
        next = [1, 0, 0, 1, args[0]!, args[1]!];
        break;
      case "scale/1":
        next = [args[0]!, 0, 0, args[0]!, 0, 0];
        break;
      case "scale/2":
        next = [args[0]!, 0, 0, args[1]!, 0, 0];
        break;
      case "rotate/1":
      case "rotate/3": {
        const cos = Math.cos(radians(args[0]!));
        const sin = Math.sin(radians(args[0]!));
        const cx = args[1] ?? 0;
        const cy = args[2] ?? 0;
        next = multiply(
          multiply([1, 0, 0, 1, cx, cy], [cos, sin, -sin, cos, 0, 0]),
          [1, 0, 0, 1, -cx, -cy],
        );
        break;
      }
      case "skewX/1":
        next = [1, 0, Math.tan(radians(args[0]!)), 1, 0, 0];
        break;
      case "skewY/1":
        next = [1, Math.tan(radians(args[0]!)), 0, 1, 0, 0];
        break;
      default:
        throw unsupported(`transform=${JSON.stringify(value)}`);
    }
    matrix = multiply(matrix, next);
    rest = rest.slice(match[0].length);
  }
  return matrix;
}

// ---------------------------------------------------------------------------
// Elements
// ---------------------------------------------------------------------------

/** Attributes that never affect rendering and are allowed on any element. */
const inertAttributes: ReadonlySet<string> = new Set([
  "id",
  "class",
  "xml:space",
  "version",
  "role",
]);

const styleAttributes: ReadonlySet<string> = new Set([
  "fill",
  "fill-rule",
  "fill-opacity",
  "stroke",
  "stroke-opacity",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
]);

/** The attributes each element may carry, beyond the inert and style ones. */
const elementAttributes = table<readonly string[]>({
  svg: ["viewBox", "width", "height"],
  g: ["transform", "opacity"],
  rect: ["x", "y", "width", "height", "rx", "ry", "transform", "opacity"],
  circle: ["cx", "cy", "r", "transform", "opacity"],
  ellipse: ["cx", "cy", "rx", "ry", "transform", "opacity"],
  line: ["x1", "y1", "x2", "y2", "transform", "opacity"],
  polyline: ["points", "transform", "opacity"],
  polygon: ["points", "transform", "opacity"],
  path: ["d", "transform", "opacity"],
});

function checkAttributes(element: XmlElement): void {
  const allowed = elementAttributes[element.name];
  if (allowed === undefined) {
    throw unsupported(`the element <${element.name}>`);
  }
  for (const name of element.attributes.keys()) {
    if (
      inertAttributes.has(name) ||
      styleAttributes.has(name) ||
      allowed.includes(name) ||
      name.startsWith("xmlns") ||
      name.startsWith("aria-") ||
      name.startsWith("data-")
    ) {
      continue;
    }
    if (name === "style") {
      throw unsupported(
        `the style attribute on <${element.name}> (use presentation attributes instead)`,
      );
    }
    throw unsupported(`the attribute ${name} on <${element.name}>`);
  }
}

interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

function parseViewBox(root: XmlElement): ViewBox {
  const viewBox = root.attributes.get("viewBox");
  if (viewBox !== undefined) {
    const numbers = parseNumberList(viewBox, "viewBox");
    if (numbers.length !== 4 || !(numbers[2]! > 0) || !(numbers[3]! > 0)) {
      throw unsupported(`viewBox=${JSON.stringify(viewBox)}`);
    }
    return {
      x: numbers[0]!,
      y: numbers[1]!,
      width: numbers[2]!,
      height: numbers[3]!,
    };
  }
  const width = root.attributes.get("width");
  const height = root.attributes.get("height");
  if (width === undefined || height === undefined) {
    throw unsupported("an <svg> without a viewBox or a width and height");
  }
  return {
    x: 0,
    y: 0,
    width: parseLength(width, "width"),
    height: parseLength(height, "height"),
  };
}

/** Applies the style attributes of `element` on top of `inherited`. */
function resolveStyle(element: XmlElement, inherited: Style): Style {
  const style = { ...inherited };
  const get = (name: string) => element.attributes.get(name);
  const fill = get("fill");
  if (fill !== undefined) style.fill = parsePaint(fill);
  const fillRule = get("fill-rule");
  if (fillRule !== undefined) {
    style.fillRule = parseKeyword(fillRule, "fill-rule", [
      "nonzero",
      "evenodd",
    ]);
  }
  const fillOpacity = get("fill-opacity");
  if (fillOpacity !== undefined)
    style.fillOpacity = parseOpacity(fillOpacity, "fill-opacity");
  const stroke = get("stroke");
  if (stroke !== undefined) style.stroke = parsePaint(stroke);
  const strokeOpacity = get("stroke-opacity");
  if (strokeOpacity !== undefined) {
    style.strokeOpacity = parseOpacity(strokeOpacity, "stroke-opacity");
  }
  const strokeWidth = get("stroke-width");
  if (strokeWidth !== undefined) {
    style.strokeWidth = parseLength(strokeWidth, "stroke-width");
    if (style.strokeWidth < 0) {
      throw unsupported(`stroke-width=${JSON.stringify(strokeWidth)}`);
    }
  }
  const lineCap = get("stroke-linecap");
  if (lineCap !== undefined) {
    style.lineCap = parseKeyword(lineCap, "stroke-linecap", [
      "butt",
      "round",
      "square",
    ]);
  }
  const lineJoin = get("stroke-linejoin");
  if (lineJoin !== undefined) {
    style.lineJoin = parseKeyword(lineJoin, "stroke-linejoin", [
      "miter",
      "round",
      "bevel",
    ]);
  }
  const miterLimit = get("stroke-miterlimit");
  if (miterLimit !== undefined) {
    style.miterLimit = parseLength(miterLimit, "stroke-miterlimit");
  }
  return style;
}

/** Walks the document, turning each shape into geometry and painting it. */
class Painter {
  private readonly canvas: Canvas;

  constructor(canvas: Canvas) {
    this.canvas = canvas;
  }

  renderChildren(parent: XmlElement, transform: Matrix, style: Style): void {
    for (const element of parent.children) {
      this.render(element, transform, style);
    }
  }

  private render(
    element: XmlElement,
    parentTransform: Matrix,
    inherited: Style,
  ): void {
    checkAttributes(element);
    if (element.name === "svg") {
      throw unsupported("a nested <svg>");
    }
    const style = resolveStyle(element, inherited);
    const transformAttribute = element.attributes.get("transform");
    const transform =
      transformAttribute === undefined
        ? parentTransform
        : multiply(parentTransform, parseTransform(transformAttribute));
    const opacityAttribute = element.attributes.get("opacity");
    const opacity =
      opacityAttribute === undefined
        ? 1
        : parseOpacity(opacityAttribute, "opacity");

    if (element.name === "g") {
      if (opacity !== 1) {
        // Group opacity composites the whole group at once, which this
        // renderer cannot do; per-shape opacity would differ where children
        // overlap. Move the opacity to the shapes instead.
        throw unsupported("opacity on <g> (set it on the shapes instead)");
      }
      this.renderChildren(element, transform, style);
      return;
    }
    if (element.children.length > 0) {
      throw unsupported(`children of <${element.name}>`);
    }

    const scale = scaleOf(transform);
    const subpaths = shapeGeometry(element, scale);
    const toDevice = (points: Point[]) =>
      points.map((p) => apply(transform, p));

    if (style.fill !== null) {
      const polygons = subpaths
        .filter((s) => s.points.length > 2)
        .map((s) => toDevice(s.points));
      this.canvas.fill(
        polygons,
        style.fillRule === "evenodd",
        style.fill,
        style.fillOpacity * opacity,
      );
    }
    if (style.stroke !== null && style.strokeWidth > 0) {
      const polygons = strokeOutline(
        subpaths,
        style.strokeWidth,
        style.lineCap,
        style.lineJoin,
        style.miterLimit,
        scale,
      ).map((polygon) => windPositive(toDevice(polygon)));
      this.canvas.fill(
        polygons,
        false,
        style.stroke,
        style.strokeOpacity * opacity,
      );
    }
  }
}

/** The subpaths of a basic shape or path element, in its own coordinates. */
function shapeGeometry(element: XmlElement, scale: number): Subpath[] {
  const number = (name: string, fallback = 0): number => {
    const value = element.attributes.get(name);
    return value === undefined ? fallback : parseLength(value, name);
  };
  switch (element.name) {
    case "rect": {
      const x = number("x");
      const y = number("y");
      const width = number("width");
      const height = number("height");
      if (!(width > 0) || !(height > 0)) {
        return [];
      }
      const rxAttribute = element.attributes.get("rx");
      const ryAttribute = element.attributes.get("ry");
      // A missing radius takes the other one's value, and both are clamped
      // to half the rectangle's size, as the specification says.
      let rx =
        rxAttribute === undefined ? undefined : parseLength(rxAttribute, "rx");
      let ry =
        ryAttribute === undefined ? undefined : parseLength(ryAttribute, "ry");
      rx = Math.min(Math.max(0, rx ?? ry ?? 0), width / 2);
      ry = Math.min(Math.max(0, ry ?? rx), height / 2);
      const quarter = Math.PI / 2;
      const points: Point[] = [{ x: x + rx, y }];
      if (rx === 0 || ry === 0) {
        points.push(
          { x: x + width, y },
          { x: x + width, y: y + height },
          { x, y: y + height },
        );
      } else {
        points.push({ x: x + width - rx, y });
        appendArc(
          points,
          x + width - rx,
          y + ry,
          rx,
          ry,
          0,
          -quarter,
          quarter,
          scale,
        );
        points.push({ x: x + width, y: y + height - ry });
        appendArc(
          points,
          x + width - rx,
          y + height - ry,
          rx,
          ry,
          0,
          0,
          quarter,
          scale,
        );
        points.push({ x: x + rx, y: y + height });
        appendArc(
          points,
          x + rx,
          y + height - ry,
          rx,
          ry,
          0,
          quarter,
          quarter,
          scale,
        );
        points.push({ x, y: y + ry });
        appendArc(
          points,
          x + rx,
          y + ry,
          rx,
          ry,
          0,
          2 * quarter,
          quarter,
          scale,
        );
      }
      return [{ points, closed: true }];
    }
    case "circle":
    case "ellipse": {
      const rx = element.name === "circle" ? number("r") : number("rx");
      const ry = element.name === "circle" ? number("r") : number("ry");
      if (!(rx > 0) || !(ry > 0)) {
        return [];
      }
      const points: Point[] = [];
      appendArc(
        points,
        number("cx"),
        number("cy"),
        rx,
        ry,
        0,
        0,
        2 * Math.PI,
        scale,
      );
      return [{ points, closed: true }];
    }
    case "line":
      return [
        {
          points: [
            { x: number("x1"), y: number("y1") },
            { x: number("x2"), y: number("y2") },
          ],
          closed: false,
        },
      ];
    case "polyline":
    case "polygon": {
      const numbers = parseNumberList(
        element.attributes.get("points") ?? "",
        "points",
      );
      if (numbers.length % 2 !== 0) {
        throw unsupported(
          `an odd number of coordinates in points on <${element.name}>`,
        );
      }
      const points: Point[] = [];
      for (let i = 0; i < numbers.length; i += 2) {
        points.push({ x: numbers[i]!, y: numbers[i + 1]! });
      }
      return points.length === 0
        ? []
        : [{ points, closed: element.name === "polygon" }];
    }
    case "path":
      return parsePathData(element.attributes.get("d") ?? "", scale);
    default:
      throw unsupported(`the element <${element.name}>`);
  }
}

/** `polygon` reversed if needed so that its signed area is positive. */
function windPositive(polygon: Point[]): Point[] {
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const p = polygon[i]!;
    const q = polygon[(i + 1) % polygon.length]!;
    area += p.x * q.y - q.x * p.y;
  }
  return area < 0 ? polygon.reverse() : polygon;
}

// ---------------------------------------------------------------------------
// Rasterizing
// ---------------------------------------------------------------------------

/** Samples per pixel along each axis when measuring coverage. */
const supersampling = 8;

/** An RGBA canvas with premultiplied floating-point components. */
class Canvas {
  readonly width: number;
  readonly height: number;
  private readonly data: Float64Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Float64Array(width * height * 4);
  }

  /**
   * Fills the polygons (in pixel coordinates) with `color` at `opacity`,
   * compositing over what is already there. With `evenOdd` false, the
   * nonzero winding rule decides what is inside.
   */
  fill(
    polygons: Point[][],
    evenOdd: boolean,
    color: Color,
    opacity: number,
  ): void {
    const coverage = computeCoverage(
      polygons,
      evenOdd,
      this.width,
      this.height,
    );
    if (coverage === null) {
      return;
    }
    const alpha = color.a * opacity;
    for (let row = 0; row < coverage.height; row++) {
      for (let column = 0; column < coverage.width; column++) {
        const covered = coverage.data[row * coverage.width + column]!;
        if (covered === 0) {
          continue;
        }
        const a = covered * alpha;
        const i = ((coverage.y + row) * this.width + coverage.x + column) * 4;
        this.data[i] = color.r * a + this.data[i]! * (1 - a);
        this.data[i + 1] = color.g * a + this.data[i + 1]! * (1 - a);
        this.data[i + 2] = color.b * a + this.data[i + 2]! * (1 - a);
        this.data[i + 3] = a + this.data[i + 3]! * (1 - a);
      }
    }
  }

  /** The pixels as straight (non-premultiplied) 8-bit RGBA, row by row. */
  toRgba8(): Uint8Array {
    const out = new Uint8Array(this.width * this.height * 4);
    for (let i = 0; i < out.length; i += 4) {
      const a = this.data[i + 3]!;
      if (a > 0) {
        out[i] = Math.round((this.data[i]! / a) * 255);
        out[i + 1] = Math.round((this.data[i + 1]! / a) * 255);
        out[i + 2] = Math.round((this.data[i + 2]! / a) * 255);
        out[i + 3] = Math.round(a * 255);
      }
    }
    return out;
  }
}

/** The fraction of each pixel in a rectangle of the canvas that a shape covers. */
interface Coverage {
  x: number;
  y: number;
  width: number;
  height: number;
  data: Float32Array;
}

interface Edge {
  top: number;
  bottom: number;
  x: number;
  slope: number;
  direction: 1 | -1;
}

/**
 * Measures how much of each pixel the polygons cover by scanning a grid of
 * sample points, `supersampling` squared per pixel: along each sample row,
 * the crossings with the polygons' edges are found and sorted, and the
 * winding number between consecutive crossings decides which samples are
 * inside. Returns `null` if the polygons do not touch the canvas.
 */
function computeCoverage(
  polygons: Point[][],
  evenOdd: boolean,
  width: number,
  height: number,
): Coverage | null {
  const edges: Edge[] = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const polygon of polygons) {
    for (let i = 0; i < polygon.length; i++) {
      const p = polygon[i]!;
      const q = polygon[(i + 1) % polygon.length]!;
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
      if (p.y === q.y) {
        continue;
      }
      const [top, bottom] = p.y < q.y ? [p, q] : [q, p];
      edges.push({
        top: top.y,
        bottom: bottom.y,
        x: top.x,
        slope: (bottom.x - top.x) / (bottom.y - top.y),
        direction: p.y < q.y ? 1 : -1,
      });
    }
  }
  if (edges.length === 0) {
    return null;
  }
  const x0 = Math.max(0, Math.floor(minX));
  const y0 = Math.max(0, Math.floor(minY));
  const x1 = Math.min(width, Math.ceil(maxX));
  const y1 = Math.min(height, Math.ceil(maxY));
  if (x0 >= x1 || y0 >= y1) {
    return null;
  }

  const s = supersampling;
  const weight = 1 / (s * s);
  const coverage: Coverage = {
    x: x0,
    y: y0,
    width: x1 - x0,
    height: y1 - y0,
    data: new Float32Array((x1 - x0) * (y1 - y0)),
  };
  const crossings: { x: number; direction: number }[] = [];
  for (let sampleRow = y0 * s; sampleRow < y1 * s; sampleRow++) {
    const y = (sampleRow + 0.5) / s;
    crossings.length = 0;
    for (const edge of edges) {
      // Half-open in y so that a vertex shared by two edges counts once.
      if (edge.top <= y && y < edge.bottom) {
        crossings.push({
          x: edge.x + (y - edge.top) * edge.slope,
          direction: edge.direction,
        });
      }
    }
    if (crossings.length === 0) {
      continue;
    }
    crossings.sort((a, b) => a.x - b.x);
    const rowOffset = (Math.floor(sampleRow / s) - y0) * coverage.width;
    let winding = 0;
    for (let i = 0; i < crossings.length - 1; i++) {
      winding += crossings[i]!.direction;
      const inside = evenOdd ? winding % 2 !== 0 : winding !== 0;
      if (!inside) {
        continue;
      }
      // The sample columns whose centers lie in [from, to).
      const from = Math.max(x0 * s, Math.ceil(crossings[i]!.x * s - 0.5));
      const to = Math.min(x1 * s, Math.ceil(crossings[i + 1]!.x * s - 0.5));
      for (let sampleColumn = from; sampleColumn < to; sampleColumn++) {
        coverage.data[rowOffset + Math.floor(sampleColumn / s) - x0]! += weight;
      }
    }
  }
  return coverage;
}

// ---------------------------------------------------------------------------
// PNG
// ---------------------------------------------------------------------------

/**
 * Encodes straight 8-bit RGBA pixels as a PNG. Every row uses the "Up"
 * filter (each byte minus the one above it), which turns the large flat
 * areas of an icon into runs of zeros for zlib to compress.
 */
export function encodePng(
  width: number,
  height: number,
  rgba: Uint8Array,
): Uint8Array {
  const stride = width * 4;
  if (rgba.length !== stride * height) {
    throw new Error(
      `Expected ${stride * height} bytes of pixels, got ${rgba.length}.`,
    );
  }
  const filtered = new Uint8Array((stride + 1) * height);
  for (let row = 0; row < height; row++) {
    filtered[row * (stride + 1)] = 2; // The "Up" filter type.
    for (let i = 0; i < stride; i++) {
      const above = row === 0 ? 0 : rgba[(row - 1) * stride + i]!;
      filtered[row * (stride + 1) + 1 + i] =
        (rgba[row * stride + i]! - above) & 0xff;
    }
  }

  const header = new DataView(new ArrayBuffer(13));
  header.setUint32(0, width);
  header.setUint32(4, height);
  header.setUint8(8, 8); // Bit depth.
  header.setUint8(9, 6); // Color type: RGBA.
  header.setUint8(10, 0); // Compression method.
  header.setUint8(11, 0); // Filter method.
  header.setUint8(12, 0); // Interlace method: none.

  const signature = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  return concat([
    signature,
    chunk("IHDR", new Uint8Array(header.buffer)),
    chunk("IDAT", new Uint8Array(deflateSync(filtered, { level: 9 }))),
    chunk("IEND", new Uint8Array(0)),
  ]);
}

/** A PNG chunk: length, type, data, and a CRC of the type and data. */
function chunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(typeBytes, 4);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(data, crc32(typeBytes)));
  return out;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(
    parts.reduce((total, part) => total + part.length, 0),
  );
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
