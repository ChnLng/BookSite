export const catArtSize = 272;
export const catFeet = { x: 136, y: 234 };
export const catLogoFace = { x: 0, y: -79, size: 96 };

const path = (definition) => new Path2D(definition);
const headShape = path('M-39 -15 Q-38 -37 -16 -39 Q-11 -41 -5 -40 L-1 -44 L4 -41 L10 -43 L13 -39 Q34 -39 39 -17 Q43 -7 46 -2 L40 -1 L45 4 L38 6 Q29 24 0 27 Q-28 25 -38 7 L-45 5 L-41 1 L-46 -2 Q-41 -5 -39 -15 Z');
const leftEar = path('M-38 -15 Q-48 -37 -43 -57 Q-42 -62 -36 -60 Q-22 -53 -13 -33 Q-26 -25 -38 -15 Z');
const innerEar = path('M-38 -24 Q-44 -39 -40 -54 Q-37 -58 -31 -51 Q-23 -43 -19 -33 Q-31 -32 -38 -24Z');
const chest = path('M-46 -59 Q-56 -49 -56 -33 L-51 -36 L-52 -28 L-46 -32 L-45 -25 L-39 -30 L-35 -24 L-27 -32 Q-19 -37 -21 -49 Z');
const eyeShape = path('M37 87 Q49 75 62 80 Q73 85 77.5 103 Q69 102 59 100 Q43 100 38 95 Z');
const blinkLine = path('M36 90 Q54 103 75 95');
const furEdge = '#caae9f';

function fill(ctx, shape, color, stroke = null, width = 1.15) {
  ctx.fillStyle = color;
  ctx.fill(shape);
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.stroke(shape);
  }
}

function oval(ctx, x, y, w, h, color, stroke = null) {
  const shape = new Path2D();
  shape.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
  fill(ctx, shape, color, stroke);
}

function gradient(ctx, x0, y0, x1, y1, light, shade) {
  const color = ctx.createLinearGradient(x0, y0, x1, y1);
  color.addColorStop(0, light);
  color.addColorStop(1, shade);
  return color;
}

function drawLeg(ctx, hip, phase, stride, near, crouch, front) {
  const step = Math.cos(phase) * stride;
  const lift = Math.max(0, Math.sin(phase)) * stride * .58;
  const x = hip * (1 - front * .48);
  const hipY = -38 + crouch * 18;
  const footX = x + step - crouch * (hip < 0 ? 10 : -5);
  const footY = -5 - lift + (near ? 0 : -3);
  const w = near ? 7.6 : 6.3;
  const mid = (x + footX) / 2 + (hip > 0 ? 5 : 1);
  const y = (hipY + footY) / 2;
  const shape = path(`M${x-w} ${hipY} Q${mid-w} ${y} ${footX-w} ${footY} Q${footX-12} ${footY+8} ${footX} ${footY+8} Q${footX+8} ${footY+8} ${footX+8} ${footY+3} Q${mid+w} ${y} ${x+w} ${hipY} Z`);
  fill(ctx, shape, near ? '#f8e9df' : '#dbc5bb', near ? furEdge : '#c3a79a');
}

function drawTail(ctx, time, front, crouch) {
  const swing = Math.sin(time * 2.5);
  const curl = Math.sin(time * 1.55 + .7);
  const root = 37 - front * 10;
  const end = 94 - front * 3;
  const z = -57 - swing * 9 + crouch * 20;
  const shape = path(`M${root} ${-42+crouch*19} C57 ${-40+crouch*19} 64 ${z+9} 76 ${z-1} Q${end-6} ${z-16+curl*6} ${end} ${z-5+curl*8} Q${end+4} ${z+3+curl*8} ${end-4} ${z+3+curl*8} C${end-23} ${z-2} 71 ${z+19} 57 ${-31+crouch*19} Q45 ${-26+crouch*19} ${root} ${-29+crouch*19} Z`);
  fill(ctx, shape, gradient(ctx, 50, -66, 73, -25, '#fff6ef', '#d9bdb1'), furEdge);
}

function drawMovingEye(ctx, gazeX, gazeY, blink, mirror) {
  ctx.save();
  if (mirror) { ctx.translate(200, 0); ctx.scale(-1, 1); }
  if (blink > .1) {
    ctx.clip(eyeShape);
    fill(ctx, eyeShape, '#fae9e0');
    ctx.strokeStyle = '#422b2d';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.stroke(blinkLine);
  } else {
    fill(ctx, eyeShape, '#fff9f6', '#392229', 2);
    ctx.clip(eyeShape);
    const x = 56 + gazeX * 5.6 * (mirror ? -1 : 1);
    const y = 91 + gazeY * 4.6;
    oval(ctx, x, y, 11.4, 12.2, '#976035', '#533625');
    oval(ctx, x, y - .5, 6.9, 8.9, '#271c22');
    oval(ctx, x - 3.2, y - 4.5, 2.35, 2.55, '#fffaf3');
  }
  ctx.restore();
}

function drawHead(ctx, logo, front, gazeX, gazeY, blink, crouch, bob) {
  ctx.save();
  ctx.translate(-31 * (1 - front), catLogoFace.y + crouch * 20 + bob);
  ctx.rotate(-.08 * (1 - front) + gazeX * .035);
  ctx.scale(.9 + front * .1, 1);
  const fur = gradient(ctx, -7, -38, 14, 27, '#fffaf4', '#f3ded4');
  for (const side of [1, -1]) {
    ctx.save();
    ctx.scale(side, 1);
    fill(ctx, leftEar, '#fff0e9', furEdge);
    fill(ctx, innerEar, gradient(ctx, -38, -50, -23, -22, '#f5aba8', '#f5c8c1'));
    ctx.restore();
  }
  fill(ctx, headShape, fur, furEdge);
  oval(ctx, -26, 7, 6.5, 3.2, '#f6c4bd90');
  oval(ctx, 26, 7, 6.5, 3.2, '#f6c4bd90');
  ctx.save();
  ctx.clip(headShape);
  const faceSize = catLogoFace.size;
  ctx.translate(-faceSize / 2, -faceSize / 2);
  ctx.scale(faceSize / 200, faceSize / 200);
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(logo, 0, 0, 200, 200);
  ctx.globalCompositeOperation = 'source-over';
  if (Math.hypot(gazeX, gazeY) > .075 || blink > .1) {
    ctx.globalAlpha = blink > .1 ? Math.min(1, blink * 1.4) : Math.min(1, Math.hypot(gazeX, gazeY) * 2.8);
    drawMovingEye(ctx, gazeX, gazeY, blink, false);
    drawMovingEye(ctx, gazeX, gazeY, blink, true);
  }
  ctx.restore();
  ctx.restore();
}

export function drawKitten(ctx, logo, pose) {
  const { time, direction, front, gazeX, gazeY, blink, gait, stridePhase, crouch, lift, opacity, atLogo } = pose;
  ctx.clearRect(0, 0, catArtSize, catArtSize);
  ctx.save();
  ctx.translate(catFeet.x, catFeet.y);
  if (!atLogo) {
    ctx.globalAlpha = .17 * opacity * (1 - Math.min(.65, lift / 45));
    oval(ctx, 3, 3, 42 - front * 9, 5, '#63485b');
    ctx.globalAlpha = 1;
  }
  ctx.translate(0, -lift);
  ctx.scale(direction, 1);
  const bob = atLogo ? 0 : Math.sin(time * 2.2) * .8 - Math.abs(Math.sin(stridePhase)) * gait * 2.3;
  const stride = gait * 16;
  drawTail(ctx, time, front, crouch);
  drawLeg(ctx, -34, stridePhase, stride, false, crouch, front);
  drawLeg(ctx, 31, stridePhase + Math.PI, stride, false, crouch, front);
  const fur = gradient(ctx, -10, -62, 16, -14, '#fff9f1', '#e6ccc2');
  oval(ctx, 8 * (1 - front), -39 + crouch * 19 + bob, 47 - front * 14, 23, fur, furEdge);
  drawLeg(ctx, -20, stridePhase + Math.PI, stride, true, crouch, front);
  drawLeg(ctx, 41, stridePhase, stride, true, crouch, front);
  ctx.save();
  ctx.translate(front * 25, bob + crouch * 18);
  fill(ctx, chest, '#fff5ec', '#e3cabe');
  ctx.restore();
  drawHead(ctx, logo, front, gazeX * direction, gazeY, blink, crouch, bob);
  ctx.restore();
}
