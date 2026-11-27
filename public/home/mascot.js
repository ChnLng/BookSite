import { catArtSize, catFeet, catLogoFace, drawKitten } from './mascot-art.js';
import { drawTexturedKitten, loadKitten } from './mascot-texture.js';

export function startMascot(root) {
  const controller = new AbortController();
  const listen = (target, name, handler, options) =>
    target.addEventListener(name, handler, { ...options, signal: controller.signal });

  const logo = root.querySelector('.brand img');
  const canvas = root.querySelector('#visd-kitten');
  const context = canvas.getContext('2d');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const smallScreen = matchMedia('(max-width: 720px)');
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const mix = (a, b, t) => a + (b - a) * t;
  const ease = (t) => t * t * (3 - 2 * t);
  const random = (a, b) => mix(a, b, Math.random());
  const neutral = {
    direction: 1, front: 1, gazeX: 0, gazeY: 0, blink: 0,
    gait: 0, stridePhase: 0, strideLength: 34, crouch: 0, rest: 0,
    lift: 0, jump: 0, reach: 0, airborne: 0, opacity: 1, logoBlend: 0, face: 0, profile: 0, tail: .68,
  };

  let ready = false;
  let frame = 0;
  let lastPaint = 0;
  let pointer = null;
  let pose = null;
  let mode = 'intro';
  let modeStart = 0;
  let action = 'idle';
  let idleLook = { x: -.62, y: .46 };
  let actionUntil = 0;
  let travel = null;
  let homeBase = null;
  let nextBlink = 0;
  let pendingURL = null;
  let handoffTimer = 0;
  let departure = null;
  let leaving = false;
  let texture = null;

  function enabled() {
    return ready && !reducedMotion.matches && !root.classList.contains('motion-paused');
  }

  function logoPose() {
    const rect = logo.getBoundingClientRect();
    const scale = rect.width / catLogoFace.size;
    return {
      anchor: rect,
      x: rect.left + rect.width / 2 - catLogoFace.x * scale,
      y: rect.top + rect.height / 2 - catLogoFace.y * scale,
      scale,
    };
  }

  function screenPose() {
    const w = document.documentElement.clientWidth;
    return { x: w * .56, y: Math.min(innerHeight - 42, 390) };
  }

  function perchFor(element, fraction, inset = 2) {
    const rect = element.getBoundingClientRect();
    return { element, fraction, inset, x: rect.left + rect.width * fraction, y: rect.top + inset };
  }

  function screenMargin() {
    return smallScreen.matches ? 70 : 88;
  }

  function followPerch(point, fallback = point) {
    if (!point.element?.isConnected || point.element.getAttribute('aria-hidden') === 'true') return fallback;
    const next = perchFor(point.element, point.fraction, point.inset);
    const width = document.documentElement.clientWidth;
    return next.x > screenMargin() && next.x < width - screenMargin() ? next : fallback;
  }

  function perches() {
    const width = document.documentElement.clientWidth;
    const choices = [];
    for (const card of root.querySelectorAll('.wheel-card[aria-hidden="false"]')) {
      const rect = card.getBoundingClientRect();
      if (rect.top > 145 && rect.top < innerHeight - 45 && rect.left >= 32 && rect.right <= width - 32) {
        const point = perchFor(card, .56);
        if (point.x > screenMargin() && point.x < width - screenMargin()) choices.push(point);
      }
    }
    if (!smallScreen.matches) {
      for (const railCard of root.querySelectorAll('.rail-item')) {
        const rect = railCard.getBoundingClientRect();
        if (rect.top > 126 && rect.top < innerHeight - 36) choices.push(perchFor(railCard, .72));
      }
    }
    const footer = root.querySelector('.external');
    const footerTop = footer?.getBoundingClientRect().top;
    if (footerTop > 145 && footerTop < innerHeight - 38) choices.push(perchFor(footer, .37), perchFor(footer, .62));
    if (choices.length) return choices;
    return [perchFor(logo, .5, logo.getBoundingClientRect().height)];
  }

  const onCarousel = (point) => point?.element?.classList.contains('wheel-card');

  function choosePerch(origin) {
    const all = perches();
    const nearby = all.map((point) => ({ point, distance: Math.hypot(point.x - origin.x, point.y - origin.y) }))
      .filter(({ distance }) => distance > 45)
      .sort((a, b) => a.distance - b.distance);
    const fixed = nearby.find(({ point, distance }) => !onCarousel(point) && point.element !== homeBase?.element &&
      (distance < 265 || (point.y > origin.y && point.y - origin.y < 360 && Math.abs(point.x - origin.x) < 95)));
    if (onCarousel(homeBase) && fixed && Math.random() < .7) return fixed.point;
    if (homeBase?.element?.matches('.wheel-card, .external') && Math.random() < .30) {
      const next = followPerch({ ...homeBase, fraction: homeBase.fraction < .52 ? .67 : .34 });
      if (Math.abs(next.x - origin.x) > 25) return next;
    }
    const reachable = nearby.filter(({ point, distance }) => distance < (point.element === homeBase?.element ? 340 : 270)).slice(0, 3);
    if (reachable.length) return reachable[Math.floor(Math.random() * reachable.length)].point;
    return null;
  }

  function roamScale() {
    return smallScreen.matches ? .62 : .76;
  }

  function blendLocation(from, to, progress) {
    return { x: mix(from.x, to.x, progress), y: mix(from.y, to.y, progress), scale: mix(from.scale, to.scale, progress) };
  }

  function render(current, time, seam = null) {
    const left = current.x - catFeet.x * current.scale;
    const top = current.y - catFeet.y * current.scale;
    const size = catArtSize * current.scale;
    canvas.hidden = false;
    canvas.dataset.phase = mode;
    canvas.dataset.action = mode === 'roam' ? action : mode;
    canvas.dataset.feet = current.airborne > 0 ? 'air' : 'ground';
    canvas.dataset.art = texture ? 'reference' : 'illustration';
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    canvas.style.transform = `translate3d(${left}px,${top}px,0)`;
    canvas.style.opacity = String(current.opacity);
    if (seam) {
      const { rect, progress } = seam;
      const inset = (n) => (mix(n, 0, progress)).toFixed(2) + 'px';
      canvas.style.clipPath = `inset(${inset(rect.top - top)} ${inset(left + size - rect.right)} ${inset(top + size - rect.bottom)} ${inset(rect.left - left)} round ${8 * (1 - progress)}px)`;
    } else {
      canvas.style.clipPath = '';
    }

    const dpr = Math.min(devicePixelRatio || 1, 2);
    const pixels = Math.round(catArtSize * dpr);
    if (canvas.width !== pixels) {
      canvas.width = pixels;
      canvas.height = pixels;
    }
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    const artPose = { time: time / 1000, ...current, atLogo: seam?.progress === 0 };
    if (texture) {
      drawTexturedKitten(context, texture, logo, artPose);
      canvas.dataset.sprite = texture.pose;
    } else drawKitten(context, logo, artPose);
    pose = current;
  }

  function settle(now, next, minimum, maximum) {
    action = next;
    actionUntil = now + random(minimum, maximum);
    idleLook = { x: pose.direction * random(-.91, -.52), y: random(.24, .65) };
  }

  function beginAction(now) {
    const choice = Math.random();
    if (choice < (onCarousel(homeBase) ? .29 : .17) && pose.rest < .2) {
      const goal = choosePerch(pose);
      if (goal) {
        const distance = Math.hypot(goal.x - pose.x, goal.y - pose.y);
        const walk = goal.element && goal.element === homeBase?.element && Math.abs(goal.y - pose.y) < 15;
        action = walk ? 'walk' : 'jump';
        travel = {
          start: now, duration: walk ? clamp(distance * 9, 620, 1750) : clamp(distance * 2 + 390, 540, 1000),
          from: pose, goal, lastGoal: goal,
          direction: goal.x < pose.x ? 1 : -1,
        };
        return;
      }
    }
    if (choice > .76 && action !== 'sleep') settle(now, 'sleep', 6300, 13000);
    else if (choice > .59 && choice < .70 && pointer) settle(now, 'pointer', 900, 1900);
    else if (choice > .70 && choice <= .76) settle(now, 'screen', 1100, 2000);
    else settle(now, 'idle', 3300, 7800);
  }

  function roam(now) {
    if (action === 'walk' || action === 'jump') {
      const { start, duration, from, goal, direction } = travel;
      travel.lastGoal = followPerch(goal, travel.lastGoal);
      const t = clamp((now - start) / duration, 0, 1);
      const walking = action === 'walk';
      const launch = .22;
      const landing = .80;
      const jump = clamp((t - launch) / (landing - launch), 0, 1);
      const isAirborne = !walking && t > launch && t < landing;
      const u = walking ? ease(t) : jump;
      const destination = { ...travel.lastGoal, scale: roamScale() };
      const distance = Math.abs(destination.x - from.x) / destination.scale;
      const strideCount = Math.max(1, Math.round(distance / 40));
      const reach = ease(clamp((distance * destination.scale - 85) / 145, 0, 1));
      const envelope = Math.min(1, t * 7, (1 - t) * 7);
      const heightGap = Math.abs(destination.y - from.y) / destination.scale;
      const lift = isAirborne ? 4 * jump * (1 - jump) * clamp(Math.max(31 + distance * .14, heightGap * .31), 35, 78) : 0;
      const crouch = walking ? 0 : t < launch
        ? .7 * Math.sin(Math.PI * t / launch)
        : .52 * Math.sin(Math.PI * clamp((t - landing) / (1 - landing), 0, 1));
      render({
        ...neutral, ...blendLocation(from, destination, u),
        direction, front: 1 - .58 * envelope, gait: walking ? envelope : 0,
        stridePhase: u * strideCount * Math.PI * 2, strideLength: distance / strideCount,
        crouch, lift, jump, reach, airborne: isAirborne ? 1 : 0,
        profile: envelope, tail: .44,
      }, now);
      if (t === 1) {
        homeBase = travel.lastGoal;
        const sleep = !onCarousel(homeBase) && Math.random() < .62;
        settle(now, sleep ? 'sleep' : 'idle', sleep ? 8000 : 4100, sleep ? 14000 : 8200);
      }
      return;
    }

    if (now >= actionUntil) {
      beginAction(now);
      if (action === 'walk' || action === 'jump') return roam(now);
    }
    const goal = homeBase ? followPerch(homeBase) : screenPose();
    homeBase = goal;
    const point = { x: clamp(goal.x, screenMargin(), document.documentElement.clientWidth - screenMargin()), y: clamp(goal.y, 112, innerHeight - 15) };
    const sleeping = action === 'sleep';
    const tracking = action === 'pointer' && pointer;
    const gx = tracking ? clamp((pointer.x - point.x) / 125, -.95, .95) : action === 'screen' || sleeping ? 0 : idleLook.x;
    const gy = tracking ? clamp((pointer.y - (point.y - 65)) / 120, -.85, .85) : action === 'screen' ? 0 : idleLook.y;
    const rest = mix(pose.rest, sleeping ? 1 : 0, .078);
    const blink = Math.max(ease(rest), 1 - Math.abs(now - nextBlink) / 100);
    if (now > nextBlink + 100) nextBlink = now + random(2400, 5200);
    render({
      ...neutral, ...point, scale: roamScale(), direction: pose.direction,
      front: mix(pose.front, action === 'screen' ? .99 : sleeping ? .72 : .86, .12),
      face: mix(pose.face, action === 'screen' ? 1 : 0, .15),
      profile: mix(pose.profile, action === 'idle' ? .58 : 0, .10),
      tail: mix(pose.tail, sleeping ? 1 : .68, .08),
      gazeX: mix(pose.gazeX, gx, .12), gazeY: mix(pose.gazeY, gy, .12),
      blink, crouch: mix(pose.crouch, sleeping ? .76 : 0, .078), rest,
    }, now);
  }

  function arrive(now) {
    const start = logoPose();
    const elapsed = now - modeStart;
    if (!homeBase) {
      const positions = perches();
      homeBase = positions.reduce((nearest, point) => Math.abs(point.x - innerWidth * .42) < Math.abs(nearest.x - innerWidth * .42) ? point : nearest);
    }
    const travelTime = clamp((elapsed - 430) / 810, 0, 1);
    const u = clamp((travelTime - .1) / .81, 0, 1);
    const moving = u > 0 && u < 1;
    const target = followPerch(homeBase);
    const direction = target.x < start.x ? 1 : -1;
    render({
      ...neutral, ...blendLocation(start, { ...target, scale: roamScale() }, u),
      opacity: ease(clamp(elapsed / 390, 0, 1)),
      logoBlend: 1 - ease(clamp(travelTime * 4.7, 0, 1)),
      direction: travelTime > .09 ? direction : 1,
      front: 1 - .55 * Math.sin(travelTime * Math.PI),
      lift: 46 * 4 * u * (1 - u), jump: u, reach: .85, airborne: moving ? 1 : 0,
      profile: moving ? .88 : 0,
      crouch: travelTime > .91 ? .45 * Math.sin(Math.PI * (travelTime - .91) / .09) : 0,
    }, now, u < .9 ? { rect: start.anchor, progress: ease(clamp(travelTime * 4.7, 0, 1)) } : null);
    if (travelTime >= 1) {
      mode = 'roam';
      settle(now, 'idle', 4900, 8000);
      nextBlink = now + 2100;
    }
  }

  function leaveSite() {
    clearTimeout(handoffTimer);
    if (leaving || !pendingURL) return;
    leaving = true;
    window.location.assign(pendingURL);
  }

  function returnToLogo(now) {
    const t = clamp((now - modeStart) / 560, 0, 1);
    const move = ease(clamp(t / .81, 0, 1));
    if (departure.scrollY > 0 && t < .66) {
      window.scrollTo({ top: departure.scrollY * (1 - ease(clamp(t / .6, 0, 1))), behavior: 'instant' });
    }
    const mark = logoPose();
    const facing = ease(clamp((t - .3) / .42, 0, 1));
    const fold = 1 - ease(clamp((t - .66) / .16, 0, 1));
    const towardsLogo = mark.x < departure.pose.x ? 1 : -1;
    render({
      ...neutral, ...blendLocation(departure.pose, mark, move),
      direction: facing < .55 ? towardsLogo : 1,
      front: mix(.22, 1, facing), face: facing, profile: 1 - facing, jump: move, reach: .72, airborne: move > 0 && move < 1 ? 1 : 0,
      lift: Math.sin(Math.PI * move) * 27, logoBlend: ease(clamp((t - .71) / .21, 0, 1)),
      opacity: 1 - ease(clamp((t - .76) / .24, 0, 1)),
    }, now, t >= .66 ? { rect: mark.anchor, progress: fold } : null);
    if (t >= 1) leaveSite();
  }

  function tick(now) {
    frame = 0;
    if (document.hidden || (mode !== 'exit' && !enabled())) {
      canvas.hidden = true;
      return;
    }
    if (now - lastPaint >= 1000 / 36) {
      lastPaint = now;
      if (mode === 'intro') arrive(now);
      else if (mode === 'exit') returnToLogo(now);
      else roam(now);
    }
    if (!leaving) frame = requestAnimationFrame(tick);
  }

  function wake() {
    if (!controller.signal.aborted && !frame && !document.hidden && (mode === 'exit' || enabled())) frame = requestAnimationFrame(tick);
  }

  listen(document, 'pointermove', (event) => {
    if (event.pointerType === 'mouse') pointer = { x: event.clientX, y: event.clientY };
  }, { passive: true });
  listen(document.documentElement, 'pointerleave', () => { pointer = null; });

  listen(document, 'click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target instanceof Element && event.target.closest('a[href]');
    if (!anchor || !root.contains(anchor) || (anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) return;
    const destination = new URL(anchor.href);
    if (destination.origin !== window.location.origin || !/^\/(?:outils\/[^/]+|livres\/[^/]+|catalogue|account|admin)\/?$/.test(destination.pathname)) return;
    if (!enabled() || !pose || canvas.hidden) return;
    event.preventDefault();
    pendingURL = destination.href;
    if (mode === 'exit') return;
    departure = { pose, scrollY: scrollY };
    mode = 'exit';
    modeStart = performance.now();
    handoffTimer = setTimeout(leaveSite, 680);
    wake();
  });

  const pauseObserver = new MutationObserver(() => {
    if (enabled()) wake();
    else if (mode !== 'exit') canvas.hidden = true;
  });
  pauseObserver.observe(root, { attributes: true, attributeFilter: ['class'] });
  listen(reducedMotion, 'change', wake);
  listen(document, 'visibilitychange', wake);
  listen(window, 'pageshow', (event) => {
    if (!event.persisted) return;
    clearTimeout(handoffTimer);
    pendingURL = null;
    departure = null;
    leaving = false;
    mode = 'intro';
    modeStart = performance.now();
    homeBase = null;
    wake();
  });

  if (context && logo) {
    void loadKitten().then((asset) => { texture = asset; }).catch(() => {});
    void logo.decode().then(() => {
      ready = true;
      modeStart = performance.now();
      wake();
    }).catch(() => {});
  }
  return () => {
    controller.abort();
    pauseObserver.disconnect();
    cancelAnimationFrame(frame);
    clearTimeout(handoffTimer);
    canvas.hidden = true;
  };
}
