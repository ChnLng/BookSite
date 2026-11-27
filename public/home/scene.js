import { startMascot } from './mascot.js';

export function startHomeScene(root, { tools, books, activeIndex: initial, select }) {
  const controller = new AbortController();
  const byId = (id) => root.querySelector('#' + id);
  const listen = (target, name, handler, options) =>
    target?.addEventListener(name, handler, { ...options, signal: controller.signal });
  const wheel = byId('wheel');
  const toolCards = Array.from(wheel?.querySelectorAll('.wheel-card') || []);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 720px)');
  const randomBetween = (min, max) => min + Math.random() * (max - min);
  let paused = reducedMotion.matches;
  let position = initial;
  let gesture = null;
  let suppressClickUntil = 0;
  let wheelDistance = 0;
  let lastWheelScroll = 0;
  let bookFrame = 0;

  function element(tag, className) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  function artwork(src) {
    const image = element('img');
    image.src = src;
    image.alt = '';
    image.draggable = false;
    listen(image, 'error', () => { image.src = '/images/logo.png'; }, { once: true });
    return image;
  }

  toolCards.forEach((card, index) => listen(card, 'click', (event) => {
    if (event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (performance.now() < suppressClickUntil) return;
    seekWheel(position + ringDistance(index - position));
    select(tools[index]);
  }));

  function ringDistance(delta) {
    const n = tools.length;
    return ((delta + n / 2) % n + n) % n - n / 2;
  }

  function activeIndex() {
    return ((Math.round(position) % tools.length) + tools.length) % tools.length;
  }

  let wheelSize;
  let displayedIndex = -1;

  function measureWheel() {
    const width = wheel.clientWidth;
    if (!width) return;
    const viewportHeight = document.documentElement.clientHeight;
    const heightLimit = Math.min(360, Math.max(136, viewportHeight * .4));
    const cardWidth = Math.round(Math.min(heightLimit / 1.36, width * (compact.matches ? .36 : .235)));
    const cardHeight = Math.round(cardWidth * 1.36);
    const gap = Math.max(10, Math.min(23, cardWidth * .085));
    const pitch = cardWidth + gap;
    if (wheelSize?.width === width && wheelSize?.cardHeight === cardHeight && wheelSize?.viewportHeight === viewportHeight) return;
    wheelSize = { width, cardWidth, cardHeight, pitch, viewportHeight };
    wheel.style.setProperty('--card-width', cardWidth + 'px');
    wheel.style.setProperty('--card-height', cardHeight + 'px');
    wheel.style.setProperty('--wheel-space', Math.round(Math.max(54, Math.min(106, viewportHeight * .12))) + 'px');
    updateWheel(position);
  }

  function updateWheel(nextPosition) {
    if (!wheelSize) return;
    position = nextPosition;
    const { width, cardWidth, cardHeight, pitch } = wheelSize;
    const halfWidth = width / 2;
    const limit = halfWidth + cardWidth * .35;

    const active = activeIndex();
    toolCards.forEach((card, index) => {
      const delta = ringDistance(index - position);
      const distance = Math.abs(delta);
      const flatX = pitch * delta;
      const depth = Math.min(1.15, Math.abs(flatX) / halfWidth);
      const x = flatX * (1 - .12 * depth);
      const y = cardHeight * .055 * depth;
      const scale = 1 - .2 * depth;
      const yaw = -Math.sign(delta) * 49 * depth;
      const outside = Math.abs(x) > limit;
      const interactive = Math.abs(x) < halfWidth + cardWidth * .11;
      card.style.transform = `translate(-50%, -50%) translate3d(${x}px,${y}px,0) perspective(660px) rotateY(${yaw}deg) scale(${scale})`;
      card.style.opacity = outside ? '0' : String(Math.min(1, (limit - Math.abs(x)) / (cardWidth * .42)) * (1 - .3 * depth));
      card.style.zIndex = String(60 - Math.round(distance * 12));
      card.style.filter = `brightness(${1 - depth * .085})`;
      card.style.pointerEvents = interactive ? 'auto' : 'none';
      card.tabIndex = index === active ? 0 : -1;
      card.setAttribute('aria-hidden', String(!interactive));
      if (card.dataset.front !== String(index === active)) card.dataset.front = String(index === active);
    });
    if (displayedIndex !== active) {
      displayedIndex = active;
      byId('wheel-count').textContent = String(active + 1).padStart(2, '0') + ' / ' + tools.length;
      byId('wheel-status').textContent = tools[active].title;
    }
  }

  let cruiseSpeed = randomBetween(.085, .145); // Cards per second.
  let direction = Math.random() < .5 ? -1 : 1;
  let speed = direction * cruiseSpeed;
  let nextCruiseChange = performance.now() + randomBetween(28000, 48000);
  let seek = null;
  let frameId = 0;
  let lastFrame = 0;
  let wheelVisible = true;

  function animateWheel(now) {
    frameId = 0;
    const seconds = lastFrame ? Math.min((now - lastFrame) / 1000, .05) : 0;
    lastFrame = now;
    if (seek) {
      const progress = Math.min((now - seek.start) / 520, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      updateWheel(seek.from + (seek.to - seek.from) * ease);
      if (progress === 1) {
        byId('wheel-announcement').textContent = tools[activeIndex()].title;
        seek = null;
      }
    } else if (!paused && !gesture && !wheel.matches(':focus-visible') && !wheel.querySelector(':focus-visible')) {
      if (now >= nextCruiseChange) {
        direction = Math.random() < .5 ? -1 : 1;
        cruiseSpeed = randomBetween(.085, .145);
        nextCruiseChange = now + randomBetween(28000, 48000);
      }
      speed += (cruiseSpeed * direction - speed) * (1 - Math.exp(-1.4 * seconds));
      updateWheel(position + speed * seconds);
    }

    if (!document.hidden && (seek || (!paused && wheelVisible))) {
      frameId = requestAnimationFrame(animateWheel);
    } else {
      lastFrame = 0;
    }
  }

  function startWheel() {
    if (wheel && wheelSize && toolCards.length > 1 && !frameId && !document.hidden && (seek || (!paused && wheelVisible))) {
      lastFrame = 0;
      frameId = requestAnimationFrame(animateWheel);
    }
  }

  function seekWheel(target) {
    if (paused || !wheelVisible || !wheelSize) {
      seek = null;
      updateWheel(target);
      byId('wheel-announcement').textContent = tools[activeIndex()].title;
    } else {
      seek = { from: position, to: target, start: performance.now() };
      startWheel();
    }
  }

  function nudgeWheel(step) {
    direction = step;
    nextCruiseChange = performance.now() + randomBetween(28000, 48000);
    speed = step * cruiseSpeed;
    seekWheel(Math.round(seek?.to ?? position) + step);
  }

  function bindWheel() {
    listen(byId('prev'), 'click', () => nudgeWheel(-1));
    listen(byId('next'), 'click', () => nudgeWheel(1));
    listen(wheel, 'keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      nudgeWheel(event.key === 'ArrowRight' ? 1 : -1);
    });

    const dragSpan = () => Math.max(70, wheelSize?.pitch || 0);
    listen(wheel, 'pointerdown', (event) => {
      if (event.button !== 0 || gesture) return;
      seek = null;
      gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, initial: position, samples: [{x: event.clientX, at: performance.now()}], dragging: false };
    });
    listen(wheel, 'pointermove', (event) => {
      if (gesture?.id !== event.pointerId) return;
      const dx = event.clientX - gesture.x;
      if (!gesture.dragging) {
        if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(event.clientY - gesture.y)) return;
        gesture.dragging = true;
        wheel.setPointerCapture(event.pointerId);
      }
      const now = performance.now();
      gesture.samples = gesture.samples.filter((sample) => now - sample.at <= 145);
      gesture.samples.push({ x: event.clientX, at: now });
      updateWheel(gesture.initial - dx / dragSpan());
    });
    function finishGesture(event) {
      if (gesture?.id !== event.pointerId) return;
      const drag = gesture;
      gesture = null;
      if (!drag.dragging) return;
      suppressClickUntil = performance.now() + 240;
      if (paused) {
        updateWheel(Math.round(position));
        return;
      }
      const travel = drag.x - event.clientX;
      const current = drag.samples.at(-1);
      const previous = drag.samples[0];
      direction = Math.sign(travel) || direction;
      if (current && current !== previous && performance.now() - current.at < 140) {
        const flick = (previous.x - current.x) * 1000 / (Math.max(16, current.at - previous.at) * dragSpan());
        if (Math.abs(flick) > .24) direction = Math.sign(flick);
        speed = direction * Math.max(cruiseSpeed, Math.min(3.3, Math.abs(flick) * .73));
      } else {
        speed = direction * cruiseSpeed;
      }
      nextCruiseChange = performance.now() + randomBetween(28000, 48000);
      startWheel();
    }
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(wheel, name, finishGesture);
    listen(wheel, 'pointerleave', () => { if (!gesture?.dragging) gesture = null; });
    listen(wheel, 'wheel', (event) => {
      const delta = event.shiftKey ? (event.deltaX || event.deltaY) : event.deltaX;
      if (!delta || (!event.shiftKey && Math.abs(event.deltaY) > Math.abs(delta))) return;
      event.preventDefault();
      if (!paused) {
        direction = Math.sign(delta);
        nextCruiseChange = performance.now() + randomBetween(28000, 48000);
        speed = direction * Math.min(3.3, Math.max(cruiseSpeed, Math.abs(delta) * .04));
        startWheel();
        return;
      }
      const now = performance.now();
      if (now - lastWheelScroll > 180) wheelDistance = 0;
      wheelDistance += delta * (event.deltaMode === 1 ? 16 : 1);
      lastWheelScroll = now;
      if (Math.abs(wheelDistance) >= 45) {
        nudgeWheel(Math.sign(wheelDistance));
        wheelDistance = 0;
      }
    }, { passive: false });
  }

  const stage = byId('floating-stage');
  const floatable = books.filter((book) => book.pages?.length >= 4);
  let floatTimer;
  let lastFloatingBook = null;

  function scheduleBook(minDelay, maxDelay) {
    clearTimeout(floatTimer);
    if (!paused && !document.hidden && floatable.length) {
      floatTimer = setTimeout(floatBook, randomBetween(minDelay, maxDelay));
    }
  }

  function floatBook() {
    if (paused || document.hidden || stage.firstElementChild) return;
    const candidates = floatable.filter((book) => book !== lastFloatingBook);
    const pool = candidates.length ? candidates : floatable;
    const book = pool[Math.floor(Math.random() * pool.length)];
    if (!book) return;
    lastFloatingBook = book;
    const float = element('div', 'floating-book');
    const pageWidth = document.documentElement.clientWidth;
    const bookWidth = Math.max(68, Math.min(125, innerWidth * .09));
    const minX = bookWidth + 12;
    const maxX = Math.max(minX, pageWidth - bookWidth - 12);
    const minY = innerHeight * .1;
    const maxY = Math.max(minY, innerHeight * .89 - bookWidth * 640 / 427);
    const x = randomBetween(minX, maxX);
    const y = randomBetween(minY, maxY);
    const angle = randomBetween(0, Math.PI * 2);
    const distance = randomBetween(16, 48);
    const endX = Math.max(minX, Math.min(maxX, x + Math.cos(angle) * distance));
    const endY = Math.max(minY, Math.min(maxY, y + Math.sin(angle) * distance));
    float.style.setProperty('--float-x', x + 'px');
    float.style.setProperty('--float-y', y + 'px');
    float.style.setProperty('--drift-x', (endX - x) + 'px');
    float.style.setProperty('--drift-y', (endY - y) + 'px');
    const binding = element('button', 'float-binding');
    binding.type = 'button';
    // The persistent Albums picker provides the same action for keyboard users.
    binding.tabIndex = -1;
    binding.setAttribute('aria-label', 'Afficher l’aperçu : ' + book.title);
    listen(binding, 'click', () => select(book));
    const [insideCover, firstRight, secondLeft, secondRight] = book.pages;
    const base = artwork(secondRight);
    base.className = 'float-base';
    const page = element('div', 'float-sheet second');
    page.append(artwork(firstRight), artwork(secondLeft));
    const cover = element('div', 'float-sheet cover');
    cover.append(artwork(book.image), artwork(insideCover));
    binding.append(base, page, cover);
    float.append(binding);
    listen(float, 'animationend', (event) => {
      if (event.target !== float || event.animationName !== 'visd-float-book' || !float.isConnected) return;
      float.remove();
      scheduleBook(9000, 17000);
    });
    stage.append(float);
    const safeFrame = () => {
      if (!float.isConnected || controller.signal.aborted) return;
      const cat = byId('visd-kitten');
      const bounds = float.getBoundingClientRect();
      const kitten = cat.getBoundingClientRect();
      const overlaps = !cat.hidden && (cat.dataset.phase !== 'roam' || ['jump', 'walk'].includes(cat.dataset.action) ||
        (bounds.left - bounds.width - 22 < kitten.right && bounds.right + 22 > kitten.left &&
          bounds.top - 22 < kitten.bottom && bounds.bottom + 22 > kitten.top));
      float.style.visibility = overlaps ? 'hidden' : '';
      bookFrame = requestAnimationFrame(safeFrame);
    };
    safeFrame();
  }

  const light = byId('pointer-light');
  let pointerAnchor = null;
  let lightTimer;

  function clearPointerLight() {
    clearTimeout(lightTimer);
    pointerAnchor = null;
    light.classList.remove('active');
  }

  function trackPointer(event) {
    if (event.pointerType !== 'mouse' || event.buttons || paused || reducedMotion.matches) return;
    const { clientX: x, clientY: y } = event;
    if (pointerAnchor && Math.hypot(x - pointerAnchor.x, y - pointerAnchor.y) < 4) return;

    clearPointerLight();
    pointerAnchor = { x, y };
    lightTimer = setTimeout(() => {
      light.style.setProperty('--pointer-x', x + 'px');
      light.style.setProperty('--pointer-y', y + 'px');
      light.classList.add('active');
    }, 280);
  }

  function syncMotion() {
    clearPointerLight();
    root.classList.toggle('motion-paused', paused);
    byId('motion').setAttribute('aria-pressed', String(paused));
    const motionLabel = paused ? 'Reprendre les animations' : 'Pause animations';
    byId('motion').setAttribute('aria-label', motionLabel);
    byId('motion').title = motionLabel;
    byId('motion').firstElementChild.textContent = paused ? '▷' : 'Ⅱ';
    cancelAnimationFrame(bookFrame);
    stage.replaceChildren();
    scheduleBook(3500, 6500);
    if (paused && seek) { updateWheel(seek.to); seek = null; }
    if (paused) { cancelAnimationFrame(frameId); frameId = 0; lastFrame = 0; }
    startWheel();
  }
  listen(byId('motion'), 'click', () => { paused = !paused; syncMotion(); });
  listen(reducedMotion, 'change', (event) => { paused = event.matches; syncMotion(); });
  listen(document, 'visibilitychange', () => {
    clearPointerLight();
    cancelAnimationFrame(bookFrame);
    stage.replaceChildren();
    scheduleBook(3500, 6500);
    startWheel();
  });
  listen(document, 'pointermove', trackPointer, { passive: true });
  listen(document, 'pointerdown', clearPointerLight, { passive: true });
  listen(document, 'pointerup', trackPointer, { passive: true });
  listen(document, 'pointercancel', clearPointerLight);
  listen(document.documentElement, 'pointerleave', clearPointerLight);
  listen(window, 'blur', clearPointerLight);
  listen(window, 'scroll', clearPointerLight, { capture: true, passive: true });
  syncMotion();

  const resizeObserver = new ResizeObserver(measureWheel);
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    wheelVisible = entry.isIntersecting;
    startWheel();
  });
  if (wheel) {
    bindWheel();
    measureWheel();
    wheel.dataset.initialized = 'true';
    resizeObserver.observe(wheel);
    intersectionObserver.observe(wheel);
    listen(window, 'resize', measureWheel);
    startWheel();
  }
  const stopMascot = startMascot(root);

  return () => {
    controller.abort();
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    cancelAnimationFrame(frameId);
    cancelAnimationFrame(bookFrame);
    clearTimeout(floatTimer);
    clearPointerLight();
    stage.replaceChildren();
    root.classList.remove('motion-paused');
    stopMascot();
  };
}
