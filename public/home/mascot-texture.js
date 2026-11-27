import { catArtSize, catFeet, catLogoFace } from './mascot-art.js';

const sourceSize = 1254;
const ground = { x: 562, y: 1030 };
const artScale = .166;
const columns = [125, 150, 180, 225, 250, 270, 290, 306, 322, 339, 357, 378, 399, 419, 436, 451, 467, 485, 504, 525, 551, 583, 619, 645, 656, 670, 684, 698, 743, 785, 829, 872, 918, 973, 1034, 1089, 1147, 1200, 1225];
const rows = [150, 185, 234, 285, 335, 358, 375, 389, 404, 418, 433, 448, 465, 495, 530, 569, 610, 655, 699, 740, 782, 822, 865, 910, 951, 982, 1010, 1053, 1085];
const legs = [
  { hip: 321, paw: 317, contact: 1005, beat: .75, front: true },
  { hip: 465, paw: 450, contact: 1029, beat: .25, front: true },
  { hip: 618, paw: 648, contact: 975, beat: 0, front: false },
  { hip: 771, paw: 826, contact: 1003, beat: .5, front: false },
];
const sprites = {
  angled: { name: 'reference', head: 383, eyes: [{ x: 315, y: 412 }, { x: 452, y: 419 }], ground, scale: artScale, legs },
  profile: { name: 'profile', head: 355, eyes: [{ x: 232, y: 414 }], ground, scale: artScale, legs },
  front: {
    name: 'front', head: 587, eyes: [{ x: 509, y: 416 }, { x: 661, y: 416 }], ground: { x: 587, y: 1062 }, scale: .154,
    legs: [
      { hip: 438, paw: 439, contact: 1025, beat: .5, front: false },
      { hip: 511, paw: 511, contact: 1060, beat: .25, front: true },
      { hip: 662, paw: 658, contact: 1060, beat: .75, front: true },
      { hip: 735, paw: 739, contact: 1025, beat: 0, front: false },
    ],
  },
};
const clamp = (value, low = 0, high = 1) => Math.min(high, Math.max(low, value));
const mix = (a, b, fraction) => a + (b - a) * fraction;
const smooth = (value) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};
const triangleIndices = [0, 1, 2, 1, 3, 2];

function legWeights(x, y, legs) {
  if (y < 695) return [];
  const centers = legs.map(({ hip, paw }) => mix(hip, paw, smooth((y - 715) / 235)));
  const weights = centers.map((center, i) => {
    const left = i ? smooth((x - (centers[i - 1] + center) / 2 + 17) / 34) : 1;
    const right = i + 1 < centers.length ? smooth(((centers[i + 1] + center) / 2 + 17 - x) / 34) : 1;
    return left * right * smooth((y - 695) / (legs[i].contact - 695));
  });
  return weights;
}

function makePoint(x, y, frame) {
  // Lower the full width of the tail together to avoid folding the image near its tip.
  const awayFromRump = smooth((x - 805) / 235);
  const overHindLeg = (1 - smooth((x - 843) / 100)) * smooth((y - 655) / 190);
  return {
    x, y,
    head: 1 - smooth((y - 495) / 158),
    ear: (1 - smooth((y - 189) / 151)) * (1 - smooth((173 - Math.abs(x - frame.head)) / 47)),
    tail: awayFromRump * (1 - overHindLeg),
    legs: legWeights(x, y, frame.legs),
    eyes: frame.eyes.map((eye) => ({
      pupil: 1 - smooth((Math.hypot((x - eye.x) / 32, (y - eye.y) / 34) - .42) / .79),
      lid: (1 - smooth((Math.abs(x - eye.x) - 38) / 21)) * (1 - smooth((Math.abs(y - eye.y) - 27) / 29)),
      dy: y - eye.y - 4,
    })),
  };
}

function makeMesh(frame) {
  const points = rows.flatMap((y) => columns.map((x) => makePoint(x, y, frame)));
  const indices = [];
  const width = columns.length;
  for (let row = 0; row + 1 < rows.length; row++) {
    for (let col = 0; col + 1 < width; col++) {
      const x = columns[col];
      const y = rows[row];
      if ((frame.name !== 'front' && x > 590 && rows[row + 1] < 470) || (x > 896 && y > 700)) continue;
      const topLeft = row * width + col;
      const corners = [topLeft, topLeft + 1, topLeft + width, topLeft + width + 1];
      indices.push(...triangleIndices.map((index) => corners[index]));
    }
  }
  return { points, indices: new Uint16Array(indices), vertices: new Float32Array(points.length * 4) };
}

function pawMotion(pose, leg) {
  if (pose.airborne) {
    const t = clamp(pose.jump + (leg.beat - .5) * .07);
    const bend = Math.sin(Math.PI * t);
    const reach = leg.front ? -mix(57, 119, pose.reach) : mix(73, 135, pose.reach);
    return {
      x: reach * bend - (leg.front ? 32 : 0) * smooth((t - .55) / .41) * (1 - t),
      y: -bend * (leg.front ? mix(54, 38, pose.reach) : mix(112, 82, pose.reach)),
    };
  }
  const phase = ((pose.stridePhase / (Math.PI * 2)) + leg.beat) % 1;
  const stance = .66;
  const stride = Math.min(pose.strideLength, 40) / artScale * pose.gait;
  const rest = pose.crouch * (leg.front ? -49 : 19) + pose.rest * (leg.front ? -40 : -36);
  if (phase < stance) return { x: (phase - stance / 2) * stride + rest, y: 0 };
  const swing = (phase - stance) / (1 - stance);
  return {
    x: Math.cos(Math.PI * swing) * stance / 2 * stride + rest,
    y: -Math.pow(Math.sin(Math.PI * swing), 1.45) * pose.gait * (leg.front ? 53 : 62),
  };
}

function fillVertices(mesh, pose, frame) {
  const feet = frame.legs.map((leg) => pawMotion(pose, leg));
  const gazeX = pose.gazeX * pose.direction;
  const travel = 1 - pose.front;
  const rhythm = pose.gait * Math.sin(pose.stridePhase * 2);
  const breath = Math.sin(pose.time * 2);
  const headAngle = gazeX * .040 + .029 * rhythm - travel * .07;
  const tailSwing = Math.sin(pose.time * 2.05) * (12 + pose.gait * 13);
  const twitch = Math.pow(Math.max(0, Math.sin(pose.time * 1.65)), 14);
  const jumpArch = pose.airborne * Math.sin(Math.PI * pose.jump);
  const pitch = pose.airborne * Math.cos(Math.PI * pose.jump) * jumpArch * .52;
  const cosine = Math.cos(pitch);
  const sine = Math.sin(pitch);
  const { ground, scale } = frame;

  mesh.points.forEach((point, i) => {
    const { x, y, head, ear, tail } = point;
    const torso = 1 - smooth((y - 630) / 392);
    let dx = head * (-34 * travel + (frame.head - x) * travel * .10 + gazeX * 17 - (y - 466) * headAngle);
    let dy = torso * (breath * 3.4 + rhythm * 8 + pose.crouch * 112 + jumpArch * 8 + pose.rest * 66);
    dy += head * ((x - frame.head) * headAngle + pose.gazeY * 8 + travel * 12 + pose.rest * 17);
    dx += ear * (x < 383 ? -1 : 1) * twitch * 9;
    dy -= ear * twitch * 5;
    if (frame.name !== 'front') {
      dx += tail * (breath * 7 - jumpArch * 32 - pose.rest * 23 - pose.tail * 29);
      dy += tail * (tailSwing - jumpArch * 46 + pose.rest * 40 + pose.tail * 145);
    }
    point.legs.forEach((weight, index) => {
      dx += feet[index].x * weight;
      dy += feet[index].y * weight;
    });
    point.eyes.forEach(({ pupil, lid, dy: eyeY }) => {
      dx += pupil * gazeX * 19 * head * (1 - pose.blink);
      dy += pupil * pose.gazeY * 9 * head * (1 - pose.blink) - eyeY * lid * pose.blink * .79;
    });

    const turn = frame.name === 'front' ? (1 - pose.face) * -24 : head * pose.face * 25;
    const px = ((x - ground.x) * (1 + jumpArch * pose.reach * .063 - (frame.name === 'front' ? 0 : pose.face * .28)) + dx) * scale + turn;
    const py = (y - ground.y + dy) * scale + 39;
    const i4 = i * 4;
    mesh.vertices[i4] = catFeet.x + (px * cosine - py * sine) * pose.direction;
    mesh.vertices[i4 + 1] = catFeet.y - 39 + px * sine + py * cosine - pose.lift;
    mesh.vertices[i4 + 2] = x / sourceSize;
    mesh.vertices[i4 + 3] = y / sourceSize;
  });
}

function shader(gl, type, source) {
  const result = gl.createShader(type);
  gl.shaderSource(result, source);
  gl.compileShader(result);
  if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(result));
  return result;
}

function makeTextureSurface(assets) {
  const surface = document.createElement('canvas');
  surface.width = surface.height = catArtSize * Math.min(devicePixelRatio || 1, 2);
  const gl = surface.getContext('webgl', { alpha: true, depth: false, antialias: true });
  if (!gl) return null;
  const vertex = shader(gl, gl.VERTEX_SHADER, `
    attribute vec2 position;
    attribute vec2 imagePosition;
    varying vec2 uv;
    void main() {
      uv = imagePosition;
      gl_Position = vec4(position.x * 2.0 / ${catArtSize}.0 - 1.0, 1.0 - position.y * 2.0 / ${catArtSize}.0, 0.0, 1.0);
    }`);
  const fragment = shader(gl, gl.FRAGMENT_SHADER, `
    precision mediump float;
    uniform sampler2D image;
    varying vec2 uv;
    void main() {
      gl_FragColor = texture2D(image, uv);
    }`);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, assets.angled.mesh.vertices.byteLength, gl.DYNAMIC_DRAW);
  for (const [name, offset] of [['position', 0], ['imagePosition', 8]]) {
    const location = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 16, offset);
  }
  for (const asset of Object.values(assets)) {
    asset.index = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, asset.index);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, asset.mesh.indices, gl.STATIC_DRAW);
    asset.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, asset.texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, asset.image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  gl.clearColor(0, 0, 0, 0);
  return {
    draw(ctx, asset) {
      if (gl.isContextLost()) return false;
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, asset.index);
      gl.bindTexture(gl.TEXTURE_2D, asset.texture);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, asset.mesh.vertices);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawElements(gl.TRIANGLES, asset.mesh.indices.length, gl.UNSIGNED_SHORT, 0);
      ctx.drawImage(surface, 0, 0, catArtSize, catArtSize);
      return true;
    },
  };
}

async function loadImage(name) {
  const image = new Image();
  image.src = new URL(`./assets/visd-kitten-${name}.webp`, import.meta.url);
  await image.decode();
  return image;
}

export async function loadKitten() {
  const [entries, sleeping] = await Promise.all([
    Promise.all(Object.entries(sprites).map(async ([key, frame]) =>
      [key, { frame, image: await loadImage(frame.name), mesh: makeMesh(frame) }])),
    loadImage('sleep'),
  ]);
  const assets = Object.fromEntries(entries);
  let surface;
  try { surface = makeTextureSurface(assets); } catch { surface = null; }
  return { assets, sleeping, surface, pose: 'angled' };
}

export function drawTexturedKitten(ctx, renderer, logo, pose) {
  ctx.clearRect(0, 0, catArtSize, catArtSize);
  // One silhouette per frame keeps the eyes and ears free of ghosting.
  if (pose.logoBlend >= .5) renderer.pose = 'logo';
  else if (pose.rest >= (renderer.pose === 'sleep' ? .61 : .78)) renderer.pose = 'sleep';
  else if (pose.face >= (renderer.pose === 'front' ? .43 : .58)) renderer.pose = 'front';
  else if (pose.profile >= (renderer.pose === 'profile' ? .63 : .74)) renderer.pose = 'profile';
  else renderer.pose = 'angled';

  if (renderer.pose === 'logo') {
    const size = catLogoFace.size;
    const left = catFeet.x + catLogoFace.x - size / 2;
    const top = catFeet.y + catLogoFace.y - size / 2;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(left, top, size, size, 16);
    ctx.clip();
    ctx.drawImage(logo, left, top, size, size);
    ctx.restore();
    return;
  }

  if (renderer.pose === 'sleep') {
    const image = renderer.sleeping;
    const width = 196;
    const height = width * image.naturalHeight / image.naturalWidth;
    ctx.save();
    ctx.translate(catFeet.x, catFeet.y);
    ctx.scale(pose.direction, 1 + Math.sin(pose.time * 1.63) * .018);
    ctx.drawImage(image, -.47 * width, -.868 * height, width, height);
    ctx.restore();
    return;
  }

  const asset = renderer.assets[renderer.pose];
  if (renderer.surface) fillVertices(asset.mesh, pose, asset.frame);
  if (renderer.surface?.draw(ctx, asset)) return;

  const { ground, scale } = asset.frame;
  ctx.save();
  ctx.translate(catFeet.x, catFeet.y - pose.lift);
  ctx.scale(pose.direction, 1 - pose.rest * .17);
  ctx.drawImage(asset.image, -ground.x * scale, -ground.y * scale, sourceSize * scale, sourceSize * scale);
  ctx.restore();
}
